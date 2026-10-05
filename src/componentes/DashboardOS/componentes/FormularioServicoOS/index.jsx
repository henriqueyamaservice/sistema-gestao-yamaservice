import React, { useState, useEffect, useRef, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { 
  X, Save, Plus, Trash2, Calendar, Clock, User, Wrench, AlertCircle, 
  Package, CheckCircle, UserPlus, Car, Camera, Smartphone, Eye, Image, UserCheck,
  Pencil, FileText, Users, ShieldCheck, Tag, AlertTriangle, ArrowRight, Droplet,
  Printer, Sparkles
} from 'lucide-react';
import styles from './index.module.css';
import ImpressaoOS from '../ImpressaoOS';
import { CONCLUIDO, EM_ANDAMENTO, AGUARDANDO_INSUMO, CANCELADO } from '../../../../utils/osStatus';
import { formatarOdometroDisplay, formatarNumeroBR, validarAntiRetrocessoKM } from '../../../../utils/formatadorOdometro';
import InputOdometroInteligente from '../../../DashboardOS/DashboardControleCombustivel/componentes/InputOdometroInteligente';
import { obterBadgeInfo, obterRotuloUnidade } from '../../../../utils/classificadorUnidades';
const mapNomesCamposDiff = {
  requisitante: 'Requisitante',
  setor: 'Setor',
  centroCusto: 'Centro de Custo / Alvo',
  prazo: 'Prazo',
  complexidade: 'Complexidade',
  descricaoProblema: 'Descrição do Problema',
  descricao: 'Descrição do Problema',
  executor: 'Executor Responsável',
  dataInicio: 'Data de Início',
  horaInicio: 'Hora de Início',
  dataFim: 'Data de Término',
  horaFim: 'Hora de Término',
  dataJustificativa: 'Data da Justificativa',
  observacao: 'Observação / Justificativa',
  resultado: 'Resultado / Status',
  motivo: 'Descrição dos Serviços Realizados',
  usouVeiculo: 'Usou Veículo',
  placaVeiculo: 'Placa do Veículo',
  kmRodado: 'KM Rodado',
  descarteBorraLitros: 'Descarte de Borra (Litros)',
  maoDeObra: 'Equipe / Mão de Obra',
  servicosExecutados: 'Diário de Bordo (Turnos & Serviços)',
  consumiveis: 'Peças e Materiais Consumidos',
  veiculos: 'Veículos Utilizados (Frota)',
  valorEstimado: 'Valor Estimado',
  isEmergencia: 'Atendimento de Emergência'
};

const formatarValorDiffHumanizado = (campo, valor) => {
  if (valor === null || valor === undefined || valor === '') {
    return <span style={{ color: 'var(--cor-texto-secundario)', fontStyle: 'italic' }}>(Vazio / Não informado)</span>;
  }

  if (typeof valor === 'boolean') {
    return valor ? 'Sim' : 'Não';
  }

  if (campo === 'valorEstimado') {
    return formatarNumeroBR(valor, true);
  }

  if (campo === 'dataInicio' || campo === 'dataFim' || campo === 'prazo' || campo === 'dataJustificativa') {
    if (typeof valor === 'string' && valor.includes('-')) {
      const parts = valor.split('T')[0].split('-');
      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
  }

  // Mão de Obra / Equipe
  if (campo === 'maoDeObra' && Array.isArray(valor)) {
    if (valor.length === 0) return <span style={{ color: 'var(--cor-texto-secundario)', fontStyle: 'italic' }}>Nenhum membro</span>;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {valor.map((m, idx) => (
          <div key={idx} style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <User size={13} color="var(--cor-destaque)" />
            <strong>{m.nome || m.matricula || 'Sem nome'}</strong> — {m.funcao || 'Executor'} ({m.horas || 0}h)
          </div>
        ))}
      </div>
    );
  }

  // Consumíveis / Peças
  if ((campo === 'consumiveis' || campo === 'pecasUtilizadas') && Array.isArray(valor)) {
    if (valor.length === 0) return <span style={{ color: 'var(--cor-texto-secundario)', fontStyle: 'italic' }}>Nenhuma peça</span>;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {valor.map((p, idx) => (
          <div key={idx} style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Package size={13} color="var(--cor-destaque)" />
            <strong>{p.quantidade || 1}x</strong> {p.descricao || p.codigo} {p.valor_unitario ? `(R$ ${Number(p.valor_unitario).toFixed(2)})` : ''}
          </div>
        ))}
      </div>
    );
  }

  // Veículos
  if ((campo === 'veiculos' || campo === 'veiculosUtilizados') && Array.isArray(valor)) {
    if (valor.length === 0) return <span style={{ color: 'var(--cor-texto-secundario)', fontStyle: 'italic' }}>Nenhum veículo</span>;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {valor.map((v, idx) => (
          <div key={idx} style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
            <Car size={13} color="var(--cor-destaque)" />
            <strong>{v.placa}</strong> (KM: {v.kmInicial || 0} → {v.kmFinal || 0})
            {v.trocouOleo && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', fontSize: '0.72rem', color: '#d97706' }}><Droplet size={11} /> Óleo</span>}
            {v.fezRevisao && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', fontSize: '0.72rem', color: '#2563eb' }}><Wrench size={11} /> Revisão</span>}
          </div>
        ))}
      </div>
    );
  }

  // Diário de Bordo / Serviços Executados
  if (campo === 'servicosExecutados' && Array.isArray(valor)) {
    if (valor.length === 0) return <span style={{ color: 'var(--cor-texto-secundario)', fontStyle: 'italic' }}>Nenhum apontamento</span>;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {valor.map((t, idx) => {
          const dataFmt = t.data ? t.data.split('-').reverse().join('/') : 'Data n/d';
          const horario = t.horaInicio ? `${t.horaInicio} às ${t.horaFim || '--:--'}` : 'Horário não informado';
          return (
            <div key={idx} style={{ padding: '6px 8px', background: 'rgba(0,0,0,0.03)', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.06)' }}>
              <div style={{ fontWeight: 700, color: 'var(--cor-destaque)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Calendar size={13} /> Dia #{idx + 1} ({dataFmt})</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Clock size={13} /> {horario}</span>
              </div>
              {t.descricao && (
                <div style={{ fontSize: '0.78rem', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <FileText size={12} color="var(--cor-texto-secundario)" />
                  <em>{t.descricao}</em>
                </div>
              )}
              {t.maoDeObra?.length > 0 && (
                <div style={{ fontSize: '0.75rem', color: 'var(--cor-texto-secundario)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                  <Users size={12} />
                  Equipe: {t.maoDeObra.map(m => `${m.nome || m.matricula} (${m.horas || 0}h)`).join(', ')}
                </div>
              )}
              {t.pecasUtilizadas?.length > 0 && (
                <div style={{ fontSize: '0.75rem', color: 'var(--cor-texto-secundario)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                  <Package size={12} />
                  Peças: {t.pecasUtilizadas.map(p => `${p.quantidade}x ${p.descricao || p.codigo}`).join(', ')}
                </div>
              )}
              {t.veiculosUtilizados?.length > 0 && (
                <div style={{ fontSize: '0.75rem', color: 'var(--cor-texto-secundario)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                  <Car size={12} />
                  Veículos: {t.veiculosUtilizados.map(v => `${v.placa} (${v.km || 0}km)`).join(', ')}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  if (typeof valor === 'object') {
    return JSON.stringify(valor, null, 2);
  }

  return String(valor);
};

const detectarModoTurno = (t) => {
  if (t?.tipoTurno) return t.tipoTurno;
  if (t?.horaInicio2 || (t?.horaFim1 && t?.horaFim && t?.horaFim1 !== t?.horaFim)) {
    return 'INTEGRAL';
  }
  if (t?.horaInicio && t?.horaFim1 && !t?.horaFim) {
    return 'MANHA';
  }
  if (!t?.horaInicio && t?.horaInicio2 && t?.horaFim) {
    return 'TARDE';
  }
  if (t?.horaInicio && t?.horaFim && !t?.horaFim1 && !t?.horaInicio2) {
    return 'CONTINUO';
  }
  return 'INTEGRAL';
};

const calcularHorasTrabalhadas = (horaInicio, horaAlmocoInicio, horaAlmocoFim, horaFim, tipoTurno = 'INTEGRAL') => {
  const timeToMinutes = (timeStr) => {
    if (!timeStr || typeof timeStr !== 'string' || !timeStr.includes(':')) return null;
    const [h, m] = timeStr.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return null;
    return h * 60 + m;
  };

  const t1 = timeToMinutes(horaInicio);
  const t2 = timeToMinutes(horaAlmocoInicio);
  const t3 = timeToMinutes(horaAlmocoFim);
  const t4 = timeToMinutes(horaFim);

  let minutosTotais = 0;

  if (tipoTurno === 'MANHA') {
    const fimManha = t2 !== null ? t2 : (t4 !== null ? t4 : null);
    if (t1 !== null && fimManha !== null) {
      minutosTotais = Math.max(0, fimManha - t1);
    }
  } else if (tipoTurno === 'TARDE') {
    const iniTarde = t3 !== null ? t3 : (t1 !== null ? t1 : null);
    if (iniTarde !== null && t4 !== null) {
      minutosTotais = Math.max(0, t4 - iniTarde);
    }
  } else if (tipoTurno === 'CONTINUO') {
    const fim = t4 !== null ? t4 : (t2 !== null ? t2 : null);
    if (t1 !== null && fim !== null) {
      minutosTotais = Math.max(0, fim - t1);
    }
  } else {
    // INTEGRAL
    if (t1 !== null && t2 !== null && t3 !== null && t4 !== null) {
      const manha = Math.max(0, t2 - t1);
      const tarde = Math.max(0, t4 - t3);
      minutosTotais = manha + tarde;
    } else if (t1 !== null && t2 !== null && t3 === null && t4 === null) {
      minutosTotais = Math.max(0, t2 - t1);
    } else if (t1 === null && t2 === null && t3 !== null && t4 !== null) {
      minutosTotais = Math.max(0, t4 - t3);
    } else if (t1 !== null && t4 !== null) {
      minutosTotais = Math.max(0, t4 - t1);
    }
  }

  const horasDecimais = parseFloat((minutosTotais / 60).toFixed(2));
  const hDisplay = Math.floor(minutosTotais / 60);
  const mDisplay = minutosTotais % 60;
  const textoFormatado = `${hDisplay}h${mDisplay > 0 ? `${mDisplay.toString().padStart(2, '0')}m` : '00m'}`;

  return { minutosTotais, horasDecimais, textoFormatado };
};

const FormularioServicoOS = ({ os, onClose, onUpdateOS }) => {
  const [isEditandoGeral, setIsEditandoGeral] = useState(false);
  const sitNorm = (os.situacao || '').trim().replace(/\s+/g, '_');
  const isFinalizada = (sitNorm === CONCLUIDO || sitNorm === CANCELADO) && !isEditandoGeral;

  // Declarar listas auxiliares antes dos estados dependentes
  const [produtosEstoque, setProdutosEstoque] = useState([]);
  const [servicosKits, setServicosKits] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [veiculosConfig, setVeiculosConfig] = useState([]);
  const [departamentos, setDepartamentos] = useState([]);
  const [requisitantesList, setRequisitantesList] = useState([]);
  const [fotoVisualizando, setFotoVisualizando] = useState(null);

  // Helper para cálculo de horas no diário de bordo
  const calcularHorasServico = (serv) => {
    const modo = detectarModoTurno(serv);
    const { horasDecimais, textoFormatado } = calcularHorasTrabalhadas(
      serv.horaInicio,
      serv.horaFim1,
      serv.horaInicio2,
      serv.horaFim,
      modo
    );
    return horasDecimais > 0 ? textoFormatado : '';
  };

  // Inicializar estado com dados existentes ou vazios
  const [formData, setFormData] = useState({
    requisitante: os.requisitante || '',
    setor: os.setor || '',
    centroCusto: os.centroCusto || '',
    prazo: os.prazo || '',
    complexidade: os.complexidade || 'NORMAL',
    descricaoProblema: os.descricaoProblema || os.descricao || '',
    executor: os.executor || '',
    dataInicio: os.dataInicio || new Date().toISOString().split('T')[0],
    horaInicio: os.horaInicio || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    dataFim: os.dataFim || new Date().toISOString().split('T')[0],
    horaFim: os.horaFim || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    dataJustificativa: os.dataJustificativa || new Date().toISOString().split('T')[0],
    observacao: os.observacao || '',
    resultado: os.resultado || 'EXECUTADA',
    usouVeiculo: os.usouVeiculo === 'Sim' ? 'Sim' : 'Não',
    placaVeiculo: os.placaVeiculo || '',
    kmRodado: os.kmRodado || '',
    descricaoServico: os.descricaoServico || '',
    motivo: os.motivo || '',
    descarteBorraLitros: os.descarteBorraLitros || ''
  });

  const [isEditandoCabecalho, setIsEditandoCabecalho] = useState(false);
  const [modalEdicaoAberta, setModalEdicaoAberta] = useState(false);
  const [nomeEditor, setNomeEditor] = useState('');
  const [motivoEdicao, setMotivoEdicao] = useState('');
  const [diffVisualizando, setDiffVisualizando] = useState(null);

  const [servicosExecutados, setServicosExecutados] = useState(() => {
    let baseServicos = os.servicosExecutados ? JSON.parse(JSON.stringify(os.servicosExecutados)) : [];
    
    // Migração Legada: se a OS não tiver servicosExecutados mas tiver dados soltos antigos
    if (baseServicos.length === 0 && (os.maoDeObra?.length > 0 || os.consumiveis?.length > 0)) {
      baseServicos.push({
        data: os.dataInicio || new Date().toISOString().split('T')[0],
        horaInicio: os.horaInicio || '',
        horaFim: os.horaFim || '',
        descricao: os.descricaoServico || 'Atendimento de Manutenção',
        isSaved: true,
        maoDeObra: os.maoDeObra ? [...os.maoDeObra] : [],
        pecasUtilizadas: os.consumiveis ? os.consumiveis.map(c => ({
          codigo: c.codigo || (c.tipo === 'EXTERNA' ? 'EXTERNO' : ''),
          descricao: c.descricao,
          quantidade: c.quantidade,
          valor_unitario: c.valor_unitario || 0,
          tipo: c.tipo || (c.codigo === 'EXTERNO' ? 'EXTERNA' : 'ESTOQUE'),
          fotoNota: c.fotoNota || ''
        })) : [],
        veiculosUtilizados: os.veiculos ? [...os.veiculos] : []
      });
    }

    if (baseServicos.length === 0) {
      baseServicos.push({
        data: new Date().toISOString().split('T')[0],
        horaInicio: '',
        horaFim1: '',
        horaInicio2: '',
        horaFim: '',
        descricao: '',
        isSaved: false,
        maoDeObra: [
          { matricula: '', nome: os.tecnicoResponsavel || os.executor || '', funcao: 'Executor', horas: '' }
        ],
        pecasUtilizadas: [],
        veiculosUtilizados: []
      });
    }

    return baseServicos.map(s => {
      let mList = s.maoDeObra ? [...s.maoDeObra] : [];
      if (mList.length === 0) {
        mList = [{ matricula: '', nome: os.tecnicoResponsavel || os.executor || '', funcao: 'Executor', horas: '' }];
      }
      return {
        ...s,
        maoDeObra: mList,
        pecasUtilizadas: (s.pecasUtilizadas || []).map(p => ({
          ...p,
          tipo: p.tipo || (p.codigo === 'EXTERNO' ? 'EXTERNA' : 'ESTOQUE'),
          fotoNota: p.fotoNota || ''
        })),
        veiculosUtilizados: s.veiculosUtilizados || [],
        horaInicio: s.horaInicio || s.hora || '',
        horaFim: s.horaFim || '',
        isSaved: s.isSaved !== undefined ? s.isSaved : false,
        mostrarSegundoPeriodo: !!(s.horaInicio2 || (s.horaFim1 && s.horaFim && s.horaFim1 !== s.horaFim))
      };
    });
  });
  
  // Extrair o veículo sendo mantido (se existir nos registros antigos)
  const veiculoManutencaoInit = os.veiculos?.find(v => v.placa === os.centroCusto && (v.kmInicial === undefined || v.kmInicial === ''));
  const [kmManutencao, setKmManutencao] = useState(veiculoManutencaoInit ? veiculoManutencaoInit.kmFinal : '');
  const [erroRetrocesso, setErroRetrocesso] = useState(false);

  // Função auxiliar para verificar presença de termos de manutenção
  const checarTermosManutencao = (texto) => {
    const t = (texto || '').toUpperCase();
    const trocouOleo = t.includes('TROCA DE ÓLEO') || t.includes('TROCA DE OLEO') || t.includes('TROCOU OLEO') || t.includes('TROCA OLEO') || t.includes('TROCA ÓLEO');
    const fezRevisao = t.includes('REVISÃO') || t.includes('REVISAO');
    return { trocouOleo, fezRevisao };
  };

  const textoInicial = (
    (os.descricaoProblema || os.descricao || '') + ' ' +
    (os.descricaoServico || '') + ' ' +
    (os.observacao || '') + ' ' +
    (os.servicosExecutados || []).map(s => s.descricao || '').join(' ')
  );
  const termsInit = checarTermosManutencao(textoInicial);
  const [marcarTrocaOleo, setMarcarTrocaOleo] = useState(termsInit.trocouOleo);
  const [marcarRevisao, setMarcarRevisao] = useState(termsInit.fezRevisao);

  // Auto-marcar se novas descrições ou serviços forem adicionados com os termos
  useEffect(() => {
    const textoAtual = (
      (os.descricaoProblema || os.descricao || '') + ' ' +
      (formData.descricaoServico || '') + ' ' +
      (formData.observacao || '') + ' ' +
      (servicosExecutados || []).map(s => s.descricao || '').join(' ')
    );
    const { trocouOleo, fezRevisao } = checarTermosManutencao(textoAtual);
    if (trocouOleo) setMarcarTrocaOleo(true);
    if (fezRevisao) setMarcarRevisao(true);
  }, [servicosExecutados, formData.descricaoServico, formData.observacao]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mostrarJustificativa, setMostrarJustificativa] = useState(!!os.observacao);

  // Buscar produtos, fornecedores e veículos para autocomplete/regras
  useEffect(() => {
    fetch(`/api/produtos`)
      .then(res => res.json())
      .then(data => setProdutosEstoque(data))
      .catch(err => console.error('Erro ao buscar produtos:', err));

    fetch(`/api/fornecedores`)
      .then(res => res.json())
      .then(data => setFornecedores(data))
      .catch(err => console.error('Erro ao buscar funcionários:', err));

    fetch(`/api/veiculos`)
      .then(res => res.json())
      .then(data => setVeiculosConfig(data))
      .catch(err => console.error('Erro ao buscar veículos:', err));

    fetch(`/api/departamentos`)
      .then(res => res.json())
      .then(data => setDepartamentos(data))
      .catch(err => console.error('Erro ao buscar departamentos:', err));

    fetch(`/api/requisitantes`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setRequisitantesList(data);
      })
      .catch(err => console.error('Erro ao buscar requisitantes:', err));

    fetch(`/api/servicos-kits`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setServicosKits(data);
        else if (data && Array.isArray(data.kits)) setServicosKits(data.kits);
        else setServicosKits([]);
      })
      .catch(err => console.error('Erro ao buscar kits:', err));
  }, []);

  const kitVinculado = useMemo(() => {
    if (!os || !Array.isArray(servicosKits) || servicosKits.length === 0) return null;
    let kitCorrespondente = null;
    if (os.kitId) {
      kitCorrespondente = servicosKits.find(k => String(k.id) === String(os.kitId));
    }
    if (!kitCorrespondente && os.kitNome) {
      kitCorrespondente = servicosKits.find(k => k.nome === os.kitNome);
    }
    return kitCorrespondente;
  }, [os, servicosKits]);

  const kmInicializadoRef = useRef(false);

  // Pré-preencher o KM/Horímetro Atual com a última marcação cadastrada do veículo caso o campo esteja vazio na inicialização
  useEffect(() => {
    if (!kmInicializadoRef.current && veiculosConfig.length > 0 && os.centroCusto) {
      const vc = veiculosConfig.find(v => v.placa === os.centroCusto);
      if (vc) {
        const kAtual = parseFloat(vc.kmAtual) || 0;
        const kOleo = parseFloat(vc.kmTrocaOleo) || 0;
        const kRev = parseFloat(vc.kmRevisao) || 0;
        const kUltimo = Math.max(kAtual, kOleo, kRev);
        
        if (kUltimo > 0 && (kmManutencao === '' || kmManutencao === undefined)) {
          setKmManutencao(kUltimo);
        }
        kmInicializadoRef.current = true;
      }
    }
  }, [veiculosConfig, os.centroCusto]);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    const isNumberOrDate = type === 'number' || type === 'date' || type === 'time' || name.includes('data') || name.includes('hora');
    const finalValue = (typeof value === 'string' && !isNumberOrDate) ? value.toUpperCase() : value;
    setFormData(prev => ({ ...prev, [name]: finalValue }));
  };

  // Função para calcular o Saldo Restante de Peças Liberadas vs Consumidas nos Turnos
  const calcularSaldosPecas = (targetServicoIndex = null) => {
    const pecasBase = os.pecasSolicitadas || [];
    if (pecasBase.length === 0) return [];

    const liberadasMap = {};
    pecasBase.forEach(p => {
      const statusOK = p.status === 'ENTREGUE' || !p.status || p.status === 'APROVADO' || p.status === 'AUTORIZADO';
      if (statusOK) {
        const key = (p.descricao || '').trim();
        const qtd = parseFloat(p.quantidade) || 0;
        if (key && qtd > 0) {
          if (!liberadasMap[key]) {
            liberadasMap[key] = { codigo: p.codigo, descricao: p.descricao, qtdLiberada: 0 };
          }
          liberadasMap[key].qtdLiberada += qtd;
        }
      }
    });

    const consumidasMap = {};
    (servicosExecutados || []).forEach((serv, idx) => {
      if (targetServicoIndex !== null && idx === targetServicoIndex) return;
      (serv.pecasUtilizadas || []).forEach(peca => {
        const key = (peca.descricao || '').trim();
        const qtd = parseFloat(peca.quantidade) || 0;
        if (key && qtd > 0) {
          consumidasMap[key] = (consumidasMap[key] || 0) + qtd;
        }
      });
    });

    return Object.values(liberadasMap).map(p => {
      const qtdConsumida = consumidasMap[p.descricao] || 0;
      const saldoRestante = Math.max(0, p.qtdLiberada - qtdConsumida);
      return {
        ...p,
        qtdConsumida,
        saldoRestante
      };
    });
  };

  const [pecasDevolvidas, setPecasDevolvidas] = useState(os.pecasDevolvidas || []);

  // Recalcula as pecasDevolvidas com saldo restante a devolver ao Almoxarifado
  useEffect(() => {
    const saldos = calcularSaldosPecas();
    const sobressalentes = saldos.filter(s => s.saldoRestante > 0);
    const devList = sobressalentes.map(s => {
      const exist = (pecasDevolvidas || []).find(pd => (pd.descricao || '').trim().toLowerCase() === (s.descricao || '').trim().toLowerCase());
      return {
        codigo: s.codigo,
        descricao: s.descricao,
        qtdLiberada: s.qtdLiberada,
        qtdConsumida: s.qtdConsumida,
        quantidadeDevolvida: exist ? exist.quantidadeDevolvida : s.saldoRestante,
        motivoDevolucao: exist ? (exist.motivoDevolucao || 'Sobra de manutenção') : 'Sobra de manutenção / Não utilizado'
      };
    });
    setPecasDevolvidas(devList);
  }, [servicosExecutados]);

  const handleAddServico = () => {
    const funcResp = fornecedores?.find(f => (f.razao_social && f.razao_social === os.tecnicoResponsavel) || (f.nome_fantasia && f.nome_fantasia === os.tecnicoResponsavel));
    const matriculaResp = funcResp ? (funcResp.cnpj_cpf || String(funcResp.codigo_cliente_omie)) : '';

    const saldos = calcularSaldosPecas();
    const pecasIniciais = saldos
      .filter(s => s.saldoRestante > 0)
      .map(s => ({
        codigo: s.codigo,
        descricao: s.descricao,
        quantidade: s.saldoRestante
      }));

    setServicosExecutados([...servicosExecutados, {
      data: new Date().toISOString().split('T')[0],
      tipoTurno: 'INTEGRAL',
      horaInicio: '07:30',
      horaFim1: '11:30',
      horaInicio2: '13:00',
      horaFim: '16:20',
      descricao: '',
      isSaved: false,
      maoDeObra: [
        { matricula: matriculaResp, nome: os.tecnicoResponsavel || os.executor || '', funcao: 'Executor', horas: '7.33' }
      ],
      pecasUtilizadas: pecasIniciais,
      veiculosUtilizados: []
    }]);
  };

  const handleUpdateServico = (index, field, value) => {
    const newS = [...servicosExecutados];
    newS[index][field] = value;
    
    // Auto-cálculo de horas se os relógios ou o tipoTurno forem alterados
    if (['horaInicio', 'horaFim1', 'horaInicio2', 'horaFim', 'tipoTurno'].includes(field)) {
      const s = newS[index];
      const modo = s.tipoTurno || detectarModoTurno(s);
      const { horasDecimais } = calcularHorasTrabalhadas(
        s.horaInicio,
        s.horaFim1,
        s.horaInicio2,
        s.horaFim,
        modo
      );

      if (horasDecimais > 0 && newS[index].maoDeObra) {
        newS[index].maoDeObra = newS[index].maoDeObra.map(mao => ({
          ...mao,
          horas: String(horasDecimais)
        }));
      }
    }
    
    setServicosExecutados(newS);
  };

  const handleRemoveServico = (index) => setServicosExecutados(servicosExecutados.filter((_, i) => i !== index));

  const handleAddMaoDeObraSessao = (servicoIndex, funcaoTipo = 'Ajudante') => {
    const newS = [...servicosExecutados];
    const s = newS[servicoIndex];
    const modo = s.tipoTurno || detectarModoTurno(s);
    const { horasDecimais } = calcularHorasTrabalhadas(
      s.horaInicio,
      s.horaFim1,
      s.horaInicio2,
      s.horaFim,
      modo
    );

    const autoHoras = horasDecimais > 0 ? String(horasDecimais) : '';

    newS[servicoIndex].maoDeObra.push({ matricula: '', nome: '', funcao: funcaoTipo, horas: autoHoras });
    setServicosExecutados(newS);
  };

  const handleUpdateMaoDeObraSessao = (servicoIndex, maoIndex, field, value) => {
    const newS = [...servicosExecutados];
    newS[servicoIndex].maoDeObra[maoIndex][field] = value;
    if (field === 'nome') {
      const func = fornecedores.find(f => (f.razao_social && f.razao_social === value) || (f.nome_fantasia && f.nome_fantasia === value));
      if (func) {
        newS[servicoIndex].maoDeObra[maoIndex].matricula = func.cnpj_cpf || String(func.codigo_cliente_omie);
      }
    }
    setServicosExecutados(newS);
  };

  const handleRemoveMaoDeObraSessao = (servicoIndex, maoIndex) => {
    const newS = [...servicosExecutados];
    newS[servicoIndex].maoDeObra = newS[servicoIndex].maoDeObra.filter((_, i) => i !== maoIndex);
    setServicosExecutados(newS);
  };

  const handleAddPecaSessao = (servicoIndex, tipo = 'ESTOQUE') => {
    const newS = [...servicosExecutados];
    newS[servicoIndex].pecasUtilizadas = newS[servicoIndex].pecasUtilizadas || [];
    const isExterna = tipo === 'EXTERNA';
    newS[servicoIndex].pecasUtilizadas.push({
      tipo: isExterna ? 'EXTERNA' : 'ESTOQUE',
      codigo: isExterna ? 'EXTERNO' : '',
      descricao: '',
      quantidade: 1,
      valor_unitario: 0,
      fotoNota: ''
    });
    setServicosExecutados(newS);
  };

  const handleUploadFotoPeca = (servicoIndex, pecaIndex, e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new window.Image();
      img.src = ev.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_DIM = 1000;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_DIM) {
            height *= MAX_DIM / width;
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width *= MAX_DIM / height;
            height = MAX_DIM;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.75);

        const newS = [...servicosExecutados];
        newS[servicoIndex].pecasUtilizadas[pecaIndex].fotoNota = dataUrl;
        setServicosExecutados(newS);
      };
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleUpdatePecaSessao = (servicoIndex, pecaIndex, field, value) => {
    const newS = [...servicosExecutados];
    newS[servicoIndex].pecasUtilizadas[pecaIndex][field] = value;
    if (field === 'descricao') {
      const prod = produtosEstoque.find(p => p.descricao === value);
      if (prod) {
        newS[servicoIndex].pecasUtilizadas[pecaIndex].codigo = prod.codigo;
        newS[servicoIndex].pecasUtilizadas[pecaIndex].valor_unitario = parseFloat(prod.valor_unitario) || 0;
        newS[servicoIndex].pecasUtilizadas[pecaIndex].tipo = 'ESTOQUE';
        newS[servicoIndex].pecasUtilizadas[pecaIndex].unidade = prod.unidade || 'UN';
      }
    } else if (field === 'codigo') {
      const prod = produtosEstoque.find(p => p.codigo === value);
      if (prod) {
        newS[servicoIndex].pecasUtilizadas[pecaIndex].descricao = prod.descricao;
        newS[servicoIndex].pecasUtilizadas[pecaIndex].valor_unitario = parseFloat(prod.valor_unitario) || 0;
        newS[servicoIndex].pecasUtilizadas[pecaIndex].tipo = 'ESTOQUE';
        newS[servicoIndex].pecasUtilizadas[pecaIndex].unidade = prod.unidade || 'UN';
      }
    }
    setServicosExecutados(newS);
  };

  const handleRemovePecaSessao = (servicoIndex, pecaIndex) => {
    const newS = [...servicosExecutados];
    newS[servicoIndex].pecasUtilizadas = newS[servicoIndex].pecasUtilizadas.filter((_, i) => i !== pecaIndex);
    setServicosExecutados(newS);
  };

  const handleAddVeiculoSessao = (servicoIndex) => {
    const newS = [...servicosExecutados];
    newS[servicoIndex].veiculosUtilizados = newS[servicoIndex].veiculosUtilizados || [];
    newS[servicoIndex].veiculosUtilizados.push({ placa: '', kmInicial: '', kmFinal: '', km: '' });
    setServicosExecutados(newS);
  };

  const handleUpdateVeiculoSessao = (servicoIndex, veiculoIndex, field, value) => {
    const newS = [...servicosExecutados];
    newS[servicoIndex].veiculosUtilizados[veiculoIndex][field] = value;

    if (field === 'placa') {
      // 1. Verifica se algum turno anterior já registrou kmFinal para este mesmo veículo
      let kmAnterior = 0;
      for (let sIdx = 0; sIdx < servicoIndex; sIdx++) {
        const vAnterior = (newS[sIdx].veiculosUtilizados || []).find(v => v.placa === value);
        if (vAnterior && vAnterior.kmFinal) {
          const kFim = parseFloat(vAnterior.kmFinal) || 0;
          if (kFim > kmAnterior) kmAnterior = kFim;
        }
      }

      // 2. Se não houver turno anterior, pega do cadastro de veículos
      const vEncontrado = veiculosConfig.find(vc => vc.placa === value);
      let kmCadastrado = 0;
      if (vEncontrado) {
        const k1 = parseFloat(vEncontrado.kmAtual) || 0;
        const k2 = parseFloat(vEncontrado.kmTrocaOleo) || 0;
        const k3 = parseFloat(vEncontrado.kmRevisao) || 0;
        kmCadastrado = Math.max(k1, k2, k3);
      }

      const kmIniCalculado = Math.max(kmAnterior, kmCadastrado);
      newS[servicoIndex].veiculosUtilizados[veiculoIndex].kmInicial = kmIniCalculado > 0 ? kmIniCalculado : '';
    }

    if (field === 'kmInicial' || field === 'kmFinal' || field === 'placa') {
      const ini = parseFloat(newS[servicoIndex].veiculosUtilizados[veiculoIndex].kmInicial) || 0;
      const fim = parseFloat(newS[servicoIndex].veiculosUtilizados[veiculoIndex].kmFinal) || 0;
      if (fim > 0 && fim >= ini) {
        newS[servicoIndex].veiculosUtilizados[veiculoIndex].km = parseFloat((fim - ini).toFixed(1));
      } else {
        newS[servicoIndex].veiculosUtilizados[veiculoIndex].km = '';
      }
    }
    setServicosExecutados(newS);
  };

  const handleRemoveVeiculoSessao = (servicoIndex, veiculoIndex) => {
    const newS = [...servicosExecutados];
    newS[servicoIndex].veiculosUtilizados = newS[servicoIndex].veiculosUtilizados.filter((_, i) => i !== veiculoIndex);
    setServicosExecutados(newS);
  };

  const [contextoModal, setContextoModal] = useState('SALVAR');

  const handlePreSubmit = (e) => {
    if (e) e.preventDefault();
    if (isFinalizada) return;

    if (os.prazo && formData.dataFim > os.prazo) {
      if (!mostrarJustificativa || !formData.observacao.trim()) {
        alert("O serviço foi finalizado com atraso. Você precisa clicar em 'JUSTIFICAR ATRASO' e preencher o motivo.");
        return;
      }
    }
    
    // Salva diretamente sem abrir modal de autorização
    handleSubmit();
  };

  const handleConfirmarEdicao = () => {
    if (!nomeEditor.trim()) {
      alert("⚠️ Você precisa informar o Nome de quem está editando a O.S. para prosseguir.");
      return;
    }
    setModalEdicaoAberta(false);
    setIsEditandoGeral(true);
  };

  const handleSubmit = async () => {
    // Note: if isEditandoGeral is true, isFinalizada is false, so it passes.
    if (isFinalizada) return;

    setIsSubmitting(true);
    
    try {
      const isGeradorOS = os.centroCusto && (os.centroCusto.toUpperCase().includes('GERADOR') || os.centroCusto.toUpperCase().includes('GRANJA') || os.centroCusto.toUpperCase().startsWith('G. '));
      const veiculoCadastrado = veiculosConfig.find(vc => vc.placa === os.centroCusto);
      const isManutencaoVeiculo = !!veiculoCadastrado || !!isGeradorOS;

      if (isManutencaoVeiculo && erroRetrocesso) {
        alert("Corrija o KM / Horímetro antes de salvar. Não é permitido retroceder o valor da frota.");
        setIsSubmitting(false);
        return;
      }

      let statusFinal = EM_ANDAMENTO;
      if (formData.resultado === 'EXECUTADA') statusFinal = CONCLUIDO;
      else if (formData.resultado === 'EM ANDAMENTO' || formData.resultado === 'EM_ANDAMENTO') statusFinal = EM_ANDAMENTO;
      else if (formData.resultado === 'AGUARDANDO INSUMO' || formData.resultado === 'AGUARDANDO_INSUMO') statusFinal = AGUARDANDO_INSUMO;
      else if (formData.resultado === 'CANCELADA' || formData.resultado === 'CANCELADO') statusFinal = CANCELADO;

      let kmInicialCalculado = '';
      if (veiculoCadastrado) {
        const kAtual = parseFloat(veiculoCadastrado.kmAtual) || 0;
        if (kmManutencao !== '' && parseFloat(kmManutencao) >= kAtual) {
          kmInicialCalculado = kAtual > 0 ? kAtual : '';
        }
      }

      const kmRodadoCalc = (kmManutencao !== '' && kmInicialCalculado !== '' && parseFloat(kmManutencao) >= parseFloat(kmInicialCalculado))
        ? parseFloat((parseFloat(kmManutencao) - parseFloat(kmInicialCalculado)).toFixed(1))
        : '';

      const veiculoManutencaoData = (isManutencaoVeiculo && kmManutencao !== '') 
        ? [{ 
            placa: os.centroCusto, 
            kmInicial: kmInicialCalculado,
            kmFinal: kmManutencao,
            km: kmRodadoCalc,
            trocouOleo: marcarTrocaOleo,
            fezRevisao: marcarRevisao
          }]
        : [];

      // Agregação automática da mão de obra e consumíveis de todos os turnos para retrocompatibilidade
      const maoDeObraConsolidada = [];
      const consumiveisConsolidados = [];

      servicosExecutados.forEach(s => {
        if (s.maoDeObra && Array.isArray(s.maoDeObra)) {
          s.maoDeObra.forEach(m => {
            if (m.nome) {
              const itemExistente = maoDeObraConsolidada.find(x => x.nome === m.nome);
              const hNum = parseFloat(String(m.horas || '0').replace(/h/gi, '').replace(',', '.')) || 0;
              if (itemExistente) {
                const totalH = (parseFloat(String(itemExistente.horas).replace(/h/gi, '')) || 0) + hNum;
                itemExistente.horas = totalH.toFixed(1).replace('.0', '');
              } else {
                maoDeObraConsolidada.push({
                  data: s.data,
                  matricula: m.matricula || '',
                  nome: m.nome,
                  funcao: m.funcao || 'Executor',
                  horas: hNum.toFixed(1).replace('.0', '')
                });
              }
            }
          });
        }

        if (s.pecasUtilizadas && Array.isArray(s.pecasUtilizadas)) {
          s.pecasUtilizadas.forEach(p => {
            if (p.descricao || p.codigo) {
              const itemExistente = consumiveisConsolidados.find(x => x.codigo === p.codigo || x.descricao === p.descricao);
              const qNum = parseFloat(p.quantidade) || 1;
              const prodRef = produtosEstoque.find(x => (p.codigo && x.codigo === p.codigo) || (p.descricao && x.descricao === p.descricao));
              const vUnit = parseFloat(p.valor_unitario || prodRef?.valor_unitario || 0);

              if (itemExistente) {
                itemExistente.quantidade = (parseFloat(itemExistente.quantidade) || 0) + qNum;
                if ((!itemExistente.valor_unitario || itemExistente.valor_unitario === 0) && vUnit > 0) {
                  itemExistente.valor_unitario = vUnit;
                }
                if (p.fotoNota && !itemExistente.fotoNota) {
                  itemExistente.fotoNota = p.fotoNota;
                }
              } else {
                consumiveisConsolidados.push({
                  data: s.data,
                  codigo: p.codigo || (prodRef ? prodRef.codigo : (p.tipo === 'EXTERNA' ? 'EXTERNO' : '')),
                  descricao: p.descricao || (prodRef ? prodRef.descricao : ''),
                  unidade: p.unidade || (prodRef ? prodRef.unidade : ''),
                  quantidade: qNum,
                  valor_unitario: vUnit,
                  tipo: p.tipo || (p.codigo === 'EXTERNO' ? 'EXTERNA' : 'ESTOQUE'),
                  fotoNota: p.fotoNota || ''
                });
              }
            }
          });
        }
      });

      const dInicioCalc = servicosExecutados.length > 0 ? servicosExecutados[0].data : formData.dataInicio;
      const hInicioCalc = servicosExecutados.length > 0 ? (servicosExecutados[0].horaInicio || formData.horaInicio) : formData.horaInicio;
      const dFimCalc = servicosExecutados.length > 0 ? servicosExecutados[servicosExecutados.length - 1].data : formData.dataFim;
      const hFimCalc = servicosExecutados.length > 0 ? (servicosExecutados[servicosExecutados.length - 1].horaFim || formData.horaFim) : formData.horaFim;
      const descCalc = servicosExecutados.map(s => s.descricao).filter(Boolean).join('\n') || formData.descricaoServico;

      const updates = {
        requisitante: formData.requisitante,
        setor: formData.setor,
        centroCusto: formData.centroCusto,
        prazo: formData.prazo,
        complexidade: formData.complexidade,
        descricaoProblema: formData.descricaoProblema,
        executor: os.tecnicoResponsavel || formData.executor,
        maoDeObra: maoDeObraConsolidada,
        servicosExecutados: servicosExecutados,
        dataInicio: dInicioCalc,
        horaInicio: hInicioCalc,
        dataFim: dFimCalc,
        horaFim: hFimCalc,
        usouVeiculo: 'Não',
        veiculos: veiculoManutencaoData,
        descricaoServico: descCalc,
        motivo: formData.motivo,
        dataJustificativa: mostrarJustificativa ? formData.dataJustificativa : null,
        observacao: mostrarJustificativa ? formData.observacao : '',
        resultado: formData.resultado,
        situacao: statusFinal,
        descarteBorraLitros: formData.descarteBorraLitros,
        consumiveis: consumiveisConsolidados,
        pecasDevolvidas: pecasDevolvidas,
        editorResponsavel: nomeEditor,
        motivoEdicao: motivoEdicao
      };
      const codigoOS = os.codigo || os.id;
      const response = await fetch(`/api/os/${encodeURIComponent(codigoOS)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Falha ao atualizar a O.S. no servidor.');
      }

      const result = await response.json();
      if (onUpdateOS) onUpdateOS(result.os);
      if (onClose) onClose();
    } catch (error) {
      console.error('Erro ao salvar O.S.:', error);
      alert(`Erro ao salvar O.S.: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className={styles.overlay}>
        <div className={`${styles.modalCard} ${styles.animateFadeIn}`}>
          {/* Botão Fechar */}
          <button 
            onClick={onClose}
            className={styles.closeButton}
          >
            <X size={24} />
          </button>

        <h2 className={styles.cardTitle}>
          <Wrench size={36} className={styles.logoIcon} />
          {isFinalizada ? `Detalhes da O.S. - ${os.codigo}` : `Fechamento da O.S. - ${os.codigo}`}
        </h2>

        {/* Banner Indicativo se foi preenchida pelo Colaborador */}
        {(os.origemApontamento === 'COLABORADOR' || os.origemApontamento === 'TOTEM' || os.preenchidoNoTotem) && (
          <div className={styles.bannerTotemOrigem}>
            <UserCheck size={24} color="var(--cor-destaque)" />
            <div>
              <strong style={{ fontSize: '0.95rem', color: 'var(--cor-texto-principal)' }}>Apontamento do Colaborador</strong>
              <span style={{ fontSize: '0.8rem', display: 'block', color: 'var(--cor-texto-secundario)', marginTop: '2px' }}>
                Esta Ordem de Serviço foi apontada através do fluxo de Apontamento do Colaborador.
                {os.executor && <strong><br/>Preenchido por: <span style={{ color: 'var(--cor-texto-principal)' }}>{os.executor}</span></strong>}
              </span>
            </div>
          </div>
        )}

        {/* Banner de Desbloqueio de Edição Geral para OS Finalizada */}
        {(sitNorm === CONCLUIDO || sitNorm === CANCELADO) && !isEditandoGeral && (
          <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', padding: '12px', borderRadius: '8px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <AlertTriangle size={20} color="#d97706" />
              <span style={{ color: '#92400e', fontSize: '0.9rem' }}>Esta Ordem de Serviço está finalizada e bloqueada para edições.</span>
            </div>
            <button 
              type="button" 
              onClick={() => {
                setContextoModal('DESBLOQUEAR');
                setModalEdicaoAberta(true);
              }}
              style={{ padding: '6px 12px', backgroundColor: '#d97706', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', gap: '6px', alignItems: 'center' }}
            >
              <Pencil size={14} /> Desbloquear Edição Completa
            </button>
          </div>
        )}

        {/* Resumo da OS (Com Opção de Edição) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h3 style={{ fontSize: '1.05rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--cor-texto-principal)' }}>
            <FileText size={18} color="var(--cor-destaque)" /> Dados do Cabeçalho
          </h3>
          {/* Se estiver finalizada, esconde o botão de editar cabeçalho. Ele só aparece se !isFinalizada */}
          {!isFinalizada && (
            <button 
              type="button" 
              onClick={() => setIsEditandoCabecalho(!isEditandoCabecalho)}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '6px', 
                backgroundColor: isEditandoCabecalho ? '#10b981' : 'transparent', 
                border: '1px solid ' + (isEditandoCabecalho ? '#10b981' : 'var(--cor-destaque)'), 
                color: isEditandoCabecalho ? 'white' : 'var(--cor-destaque)', 
                padding: '4px 10px', 
                borderRadius: '6px', 
                fontSize: '0.8rem', 
                cursor: 'pointer', 
                fontWeight: 600 
              }}
              title="Editar dados iniciais da O.S."
            >
              {isEditandoCabecalho ? <><Save size={14} /> Salvar</> : <><Pencil size={14} /> Editar Cabeçalho</>}
            </button>
          )}
        </div>

        <div className={styles.summaryGrid}>
          {isEditandoCabecalho ? (
            <>
              <div className={styles.inputGroup}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--cor-texto-secundario)', marginBottom: '4px', display: 'block' }}>Requisitante</label>
                <input type="text" className={styles.inputField} value={formData.requisitante} onChange={e => setFormData({...formData, requisitante: e.target.value.toUpperCase()})} list="requisitantes-lista" />
              </div>
              <div className={styles.inputGroup}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--cor-texto-secundario)', marginBottom: '4px', display: 'block' }}>Setor</label>
                <input type="text" className={styles.inputField} value={formData.setor} onChange={e => setFormData({...formData, setor: e.target.value.toUpperCase()})} list="setores-lista" />
              </div>
              <div className={styles.inputGroup}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--cor-texto-secundario)', marginBottom: '4px', display: 'block' }}>Centro de Custo (Alvo)</label>
                <input type="text" className={styles.inputField} value={formData.centroCusto} onChange={e => setFormData({...formData, centroCusto: e.target.value.toUpperCase()})} list="veiculos-placa" />
              </div>
              <div className={styles.inputGroup}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--cor-texto-secundario)', marginBottom: '4px', display: 'block' }}>Prazo Original</label>
                <input type="date" className={styles.inputField} value={formData.prazo} onChange={e => setFormData({...formData, prazo: e.target.value})} />
              </div>
              <div className={styles.inputGroup}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--cor-texto-secundario)', marginBottom: '4px', display: 'block' }}>Complexidade</label>
                <select className={styles.inputField} value={formData.complexidade} onChange={e => setFormData({...formData, complexidade: e.target.value})}>
                  <option value="BAIXA">BAIXA</option>
                  <option value="NORMAL">NORMAL</option>
                  <option value="ALTA">ALTA</option>
                  <option value="URGENTE">URGENTE</option>
                </select>
              </div>
              <div className={styles.inputGroup} style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--cor-texto-secundario)', marginBottom: '4px', display: 'block' }}>Descrição do Problema (Abertura)</label>
                <textarea className={styles.inputField} rows={2} value={formData.descricaoProblema} onChange={e => setFormData({...formData, descricaoProblema: e.target.value.toUpperCase()})} />
              </div>
              <datalist id="setores-lista">
                {departamentos.map((dep, idx) => (
                  <option key={idx} value={dep.descricao} />
                ))}
              </datalist>
              <datalist id="requisitantes-lista">
                {requisitantesList.map((req, idx) => (
                  <option key={idx} value={req} />
                ))}
              </datalist>
              <datalist id="veiculos-placa">
                {veiculosConfig.map((v, idx) => (
                  <option key={idx} value={v.placa}>{v.modelo}</option>
                ))}
              </datalist>
            </>
          ) : (
            <>
              <div><strong>Requisitante:</strong> <div className={styles.summaryItemValue}>{os.requisitante}</div></div>
              <div><strong>Aberto por:</strong> <div className={styles.summaryItemValue}>{os.abertoPor || 'Desconhecido'}</div></div>
              {os.dataHoraFechamentoOficial ? (
                <div><strong>Preenchido no Sistema:</strong> <div className={styles.summaryItemValue}>{new Date(os.dataHoraFechamentoOficial).toLocaleString('pt-BR')}</div></div>
              ) : os.dataHoraPreenchimentoSistema ? (
                <div><strong>Preenchido no Sistema:</strong> <div className={styles.summaryItemValue}>{new Date(os.dataHoraPreenchimentoSistema).toLocaleString('pt-BR')}</div></div>
              ) : null}
              <div><strong>Setor:</strong> <div className={styles.summaryItemValue}>{os.setor}</div></div>
              <div><strong>Centro de Custo:</strong> <div className={styles.summaryItemValue}>{os.centroCusto || '-'}</div></div>
              <div><strong>Prazo Original:</strong> <div className={styles.summaryItemValue}>{os.prazo ? os.prazo.split('-').reverse().join('/') : 'Não definido'}</div></div>
              <div><strong>Complexidade:</strong> <div className={styles.summaryItemValue}>{os.complexidade}</div></div>
              <div className={styles.summaryDesc} style={{ gridColumn: '1 / -1' }}>
                <strong>Descrição do Problema (Abertura):</strong>
                <div className={styles.summaryItemValue}>{os.descricaoProblema || os.descricao || 'Nenhuma descrição fornecida.'}</div>
              </div>
            </>
          )}
        </div>

        <form onSubmit={handlePreSubmit}>
          {/* SALDO DE PEÇAS LIBERADAS / RETIRADAS EM TEMPO REAL */}
          {(() => {
            const saldos = calcularSaldosPecas();
            if (saldos.length === 0) return null;

            return (
              <div className={styles.saldoCard}>
                <h4 className={styles.saldoTitle}>
                  <Package size={16} /> Saldo de Peças Liberadas / Retiradas
                </h4>
                <div className={styles.saldoList}>
                  {saldos.map((item, idx) => (
                    <div key={idx} className={styles.saldoItem}>
                      <div>
                        <strong>{item.qtdLiberada}x</strong> - {item.descricao}
                      </div>
                      <div>
                        {item.saldoRestante === 0 ? (
                          <span className={styles.badgeCompleto}>
                            ✅ 100% Aplicada
                          </span>
                        ) : (
                          <span className={styles.badgePendente}>
                            📦 {item.saldoRestante}x Restantes para aplicar
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* CARD DE REFERÊNCIA DO KIT */}
          {kitVinculado && (
            <div style={{
              marginBottom: '20px',
              marginTop: '16px',
              padding: '16px',
              backgroundColor: 'rgba(255, 107, 0, 0.08)',
              border: '1px solid var(--cor-destaque)',
              borderRadius: '8px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={18} color="var(--cor-destaque)" />
                <span style={{ fontWeight: '800', color: 'var(--cor-destaque)', textTransform: 'uppercase', fontSize: '0.9rem' }}>
                  Receita Padrão do Kit Vinculado: {kitVinculado.nome}
                </span>
              </div>
              {kitVinculado.descricaoPadrao && (
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--cor-texto-secundario)' }}>{kitVinculado.descricaoPadrao}</p>
              )}
              <div style={{ marginTop: '8px' }}>
                <strong style={{ fontSize: '0.8rem', display: 'block', marginBottom: '6px' }}>Peças Previstas para este serviço:</strong>
                <ul style={{ margin: 0, paddingLeft: '24px', fontSize: '0.8rem', color: 'var(--cor-texto-principal)' }}>
                  {(kitVinculado.pecas || []).map((p, idx) => (
                    <li key={idx} style={{ marginBottom: '4px' }}><strong>{p.quantidade} {p.unidade}</strong> - {p.codigo ? `[${p.codigo}] ` : ''}{p.descricao}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* DIÁRIO DE BORDO UNIFICADO POR TURNO */}
          <div className={styles.sectionHeader} style={{ marginTop: '16px', marginBottom: '12px' }}>
            <h3><Wrench size={16} className={styles.sectionHeaderIcon} /> Diário de Bordo / Apontamentos por Turno</h3>
            {!isFinalizada && (
              <button type="button" onClick={handleAddServico} className={`${styles.btnPrimary} ${styles.btnSecondarySmall}`}>
                <Plus size={16} /> Add Serviço
              </button>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
            {servicosExecutados.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '16px', backgroundColor: 'var(--cor-fundo-cartao)', borderRadius: '8px', border: '1px solid var(--cor-borda-cartao)', color: 'var(--cor-texto-secundario)', fontSize: '0.85rem' }}>
                Nenhum serviço ou turno registrado. Clique em "+ Add Serviço" para iniciar.
              </div>
            ) : (
              servicosExecutados.map((serv, servIdx) => (
                <div key={servIdx} className={styles.turnoCard}>
                  {serv.isSaved || isFinalizada ? (
                    <div className={styles.turnoCardSavedContainer}>
                      {/* Cabeçalho do Dia */}
                      <div className={styles.turnoHeaderSavedModern}>
                        <div className={styles.turnoHeaderLeft}>
                          <span className={styles.badgeDiaNumero}>
                            <Calendar size={14} />
                            Dia #{servIdx + 1} - {serv.data ? serv.data.split('-').reverse().join('/') : 'Data não informada'}
                          </span>
                          <span className={styles.badgeHorarioModern}>
                            <Clock size={13} />
                            {(() => {
                              const modo = serv.tipoTurno || detectarModoTurno(serv);
                              if (modo === 'MANHA') {
                                return `Manhã: ${serv.horaInicio || '--:--'} às ${serv.horaFim1 || '--:--'}`;
                              }
                              if (modo === 'TARDE') {
                                return `Tarde: ${serv.horaInicio2 || '--:--'} às ${serv.horaFim || '--:--'}`;
                              }
                              if (modo === 'CONTINUO') {
                                return `Turno Único: ${serv.horaInicio || '--:--'} às ${serv.horaFim || '--:--'}`;
                              }
                              return `${serv.horaInicio || '--:--'} às ${serv.horaFim1 || '--:--'} | ${serv.horaInicio2 || '--:--'} às ${serv.horaFim || '--:--'}`;
                            })()}
                            {calcularHorasServico(serv) && (
                              <span className={styles.badgeHorasDestaque}>({calcularHorasServico(serv)})</span>
                            )}
                          </span>
                        </div>

                        {!isFinalizada && (
                          <button
                            type="button"
                            onClick={() => handleUpdateServico(servIdx, 'isSaved', false)}
                            className={styles.btnEditarTurnoModern}
                          >
                            <Pencil size={13} /> Editar
                          </button>
                        )}
                      </div>

                      {/* Descrição do que foi feito */}
                      <div className={styles.boxDescricaoServico}>
                        <div className={styles.boxDescricaoHeader}>
                          <FileText size={14} color="var(--cor-destaque)" />
                          <span>Serviço Realizado / O que foi feito:</span>
                        </div>
                        <p className={styles.textoDescricaoServico}>
                          {serv.descricao || 'Nenhuma descrição detalhada informada.'}
                        </p>
                      </div>

                      {/* Grid de 2 Colunas: Equipe & Veículos */}
                      <div className={styles.gridEquipeVeiculos}>
                        {/* Coluna Equipe */}
                        <div className={styles.blocoSubCard}>
                          <div className={styles.blocoSubCardHeader}>
                            <Users size={14} color="var(--cor-destaque)" />
                            <span>Equipe no Turno</span>
                          </div>
                          {(!serv.maoDeObra || serv.maoDeObra.length === 0) ? (
                            <div className={styles.itemVazio}>Nenhum membro registrado.</div>
                          ) : (
                            <div className={styles.listaMembrosModern}>
                              {serv.maoDeObra.map((m, mIdx) => (
                                <div key={mIdx} className={styles.pillsMembro}>
                                  <div className={styles.membroInfo}>
                                    <User size={13} className={styles.membroAvatarIcon} />
                                    <span className={styles.membroNome}>{m.nome || 'Não informado'}</span>
                                    <span className={
                                      m.funcao === 'Executor Substituto' ? styles.funcaoBadgeSubstituto : (m.funcao === 'Executor' ? styles.funcaoBadgeExecutor : styles.funcaoBadgeAjudante)
                                    }>
                                      {m.funcao || 'Executor'}
                                    </span>
                                  </div>
                                  {m.horas && (
                                    <span className={styles.membroHoras}>{String(m.horas).replace(/h/gi, '')}H</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Coluna Veículos */}
                        <div className={styles.blocoSubCard}>
                          <div className={styles.blocoSubCardHeader}>
                            <Car size={14} color="var(--cor-destaque)" />
                            <span>Veículos de Deslocamento</span>
                          </div>
                          {(!serv.veiculosUtilizados || serv.veiculosUtilizados.length === 0) ? (
                            <div className={styles.itemVazio}>Nenhum veículo de apoio utilizado.</div>
                          ) : (
                            <div className={styles.listaVeiculosModern}>
                              {serv.veiculosUtilizados.map((v, vIdx) => (
                                <div key={vIdx} className={styles.pillsVeiculo}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Car size={13} color="var(--cor-destaque)" />
                                    <span className={styles.veiculoPlaca}>{v.placa}</span>
                                  </div>
                                  <div className={styles.veiculoKmInfo}>
                                    <span>Ini: <strong>{v.kmInicial || '0'}</strong></span>
                                    <span>Fim: <strong>{v.kmFinal || '0'}</strong></span>
                                    <span className={styles.veiculoKmTotal}><strong>{v.km || '0'} KM</strong></span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Bloco de Peças Consumidas */}
                      <div className={styles.blocoSubCard} style={{ marginTop: '10px' }}>
                        <div className={styles.blocoSubCardHeader}>
                          <Package size={14} color="var(--cor-destaque)" />
                          <span>Peças & Materiais Aplicados</span>
                        </div>

                        {(!serv.pecasUtilizadas || serv.pecasUtilizadas.length === 0) ? (
                          <div className={styles.itemVazio}>Nenhuma peça consumida neste turno.</div>
                        ) : (
                          <div className={styles.listaPecasModern}>
                            {serv.pecasUtilizadas.map((peca, pIdx) => {
                              const isExterna = peca.tipo === 'EXTERNA' || peca.codigo === 'EXTERNO';
                              return (
                                <div key={pIdx} className={styles.cardPecaModern}>
                                  <div className={styles.pecaLeft}>
                                    <span className={styles.pecaQtd} title={obterBadgeInfo(peca.unidade).label}>
                                      {obterBadgeInfo(peca.unidade).icone} {peca.quantidade} {obterRotuloUnidade(peca.unidade)}
                                    </span>
                                    {isExterna ? (
                                      <span className={styles.badgeOrigemExterna}>
                                        <Camera size={11} /> Compra Externa
                                      </span>
                                    ) : (
                                      <span className={styles.badgeOrigemEstoque}>
                                        <Package size={11} /> Estoque Omie
                                      </span>
                                    )}
                                    <span className={styles.pecaDescricao}>{peca.descricao}</span>
                                    {peca.valor_unitario && parseFloat(peca.valor_unitario) > 0 && (
                                      <span className={styles.pecaValor}>
                                        (R$ {Number(peca.valor_unitario).toFixed(2)})
                                      </span>
                                    )}
                                  </div>

                                  {peca.fotoNota && (
                                    <div className={styles.pecaFotoArea}>
                                      <img
                                        src={peca.fotoNota}
                                        alt="NF"
                                        className={styles.miniaturaFotoNota}
                                        onClick={() => setFotoVisualizando(peca.fotoNota)}
                                        title="Clique para ampliar Nota Fiscal"
                                      />
                                      <button
                                        type="button"
                                        className={styles.btnVerNotaModal}
                                        onClick={() => setFotoVisualizando(peca.fotoNota)}
                                      >
                                        <Eye size={12} /> Ver NF
                                      </button>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid var(--cor-borda-cartao)' }}>
                        <div className={styles.turnoHeaderEdit}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Calendar size={18} style={{ color: 'var(--cor-destaque)' }} />
                            <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--cor-texto-principal)' }}>Data do Apontamento:</span>
                            <input 
                              type="date" 
                              value={serv.data} 
                              onChange={e => handleUpdateServico(servIdx, 'data', e.target.value)} 
                              className={styles.input}
                              style={{ width: 'auto', fontWeight: 'bold' }} 
                            />
                          </div>
                          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <button type="button" onClick={() => handleUpdateServico(servIdx, 'isSaved', true)} className={styles.btnSalvarTurno}>
                              <CheckCircle size={15} /> Salvar Turno
                            </button>
                            <button type="button" className={styles.btnDelLine} onClick={() => handleRemoveServico(servIdx)} title="Remover Turno/Sessão"><Trash2 size={18} /></button>
                          </div>
                        </div>

                        {/* Linha de Horários com Seletor de Período (Dia Todo / Só Manhã / Só Tarde / Contínuo) */}
                        {(() => {
                          const modo = serv.tipoTurno || detectarModoTurno(serv);
                          const { horasDecimais, textoFormatado } = calcularHorasTrabalhadas(
                            serv.horaInicio,
                            serv.horaFim1,
                            serv.horaInicio2,
                            serv.horaFim,
                            modo
                          );

                          return (
                            <div className={styles.horariosCardLinha}>
                              {/* Seletor de Período */}
                              <div className={styles.tipoTurnoSelector}>
                                <button
                                  type="button"
                                  className={`${styles.btnTipoTurno} ${modo === 'INTEGRAL' ? styles.btnTipoTurnoActive : ''}`}
                                  onClick={() => {
                                    handleUpdateServico(servIdx, 'tipoTurno', 'INTEGRAL');
                                    if (!serv.horaInicio) handleUpdateServico(servIdx, 'horaInicio', '07:30');
                                    if (!serv.horaFim1) handleUpdateServico(servIdx, 'horaFim1', '11:30');
                                    if (!serv.horaInicio2) handleUpdateServico(servIdx, 'horaInicio2', '13:00');
                                    if (!serv.horaFim) handleUpdateServico(servIdx, 'horaFim', '16:20');
                                  }}
                                  title="Dia todo com pausa para almoço (Manhã + Tarde)"
                                >
                                  Dia Todo (Almoço)
                                </button>
                                <button
                                  type="button"
                                  className={`${styles.btnTipoTurno} ${modo === 'MANHA' ? styles.btnTipoTurnoActive : ''}`}
                                  onClick={() => {
                                    handleUpdateServico(servIdx, 'tipoTurno', 'MANHA');
                                    if (!serv.horaInicio) handleUpdateServico(servIdx, 'horaInicio', '07:30');
                                    if (!serv.horaFim1) handleUpdateServico(servIdx, 'horaFim1', '11:30');
                                  }}
                                  title="Atendimento realizado apenas pela manhã"
                                >
                                  Só Manhã
                                </button>
                                <button
                                  type="button"
                                  className={`${styles.btnTipoTurno} ${modo === 'TARDE' ? styles.btnTipoTurnoActive : ''}`}
                                  onClick={() => {
                                    handleUpdateServico(servIdx, 'tipoTurno', 'TARDE');
                                    if (!serv.horaInicio2) handleUpdateServico(servIdx, 'horaInicio2', '13:00');
                                    if (!serv.horaFim) handleUpdateServico(servIdx, 'horaFim', '16:20');
                                  }}
                                  title="Atendimento realizado apenas pela tarde"
                                >
                                  Só Tarde
                                </button>
                                <button
                                  type="button"
                                  className={`${styles.btnTipoTurno} ${modo === 'CONTINUO' ? styles.btnTipoTurnoActive : ''}`}
                                  onClick={() => {
                                    handleUpdateServico(servIdx, 'tipoTurno', 'CONTINUO');
                                    if (!serv.horaInicio) handleUpdateServico(servIdx, 'horaInicio', '07:00');
                                    if (!serv.horaFim) handleUpdateServico(servIdx, 'horaFim', '13:00');
                                  }}
                                  title="Atendimento em turno único sem almoço"
                                >
                                  Contínuo
                                </button>
                              </div>

                              {/* Campos de Horário de acordo com o modo selecionado */}
                              {modo === 'INTEGRAL' && (
                                <>
                                  <div className={styles.horarioItem}>
                                    <span className={styles.horarioSubLabel}>Manhã:</span>
                                    <input
                                      type="time"
                                      className={styles.input}
                                      style={{ padding: '4px 8px', fontSize: '0.85rem', width: 'auto' }}
                                      value={serv.horaInicio || '07:30'}
                                      onChange={(e) => handleUpdateServico(servIdx, 'horaInicio', e.target.value)}
                                      title="Horário de Entrada (Manhã)"
                                    />
                                    <span className={styles.horarioAte}>até</span>
                                    <input
                                      type="time"
                                      className={styles.input}
                                      style={{ padding: '4px 8px', fontSize: '0.85rem', width: 'auto' }}
                                      value={serv.horaFim1 || '11:30'}
                                      onChange={(e) => handleUpdateServico(servIdx, 'horaFim1', e.target.value)}
                                      title="Saída para Almoço"
                                    />
                                  </div>

                                  <span className={styles.horarioDivisor}>|</span>

                                  <div className={styles.horarioItem}>
                                    <span className={styles.horarioSubLabel}>Tarde:</span>
                                    <input
                                      type="time"
                                      className={styles.input}
                                      style={{ padding: '4px 8px', fontSize: '0.85rem', width: 'auto' }}
                                      value={serv.horaInicio2 || '13:00'}
                                      onChange={(e) => handleUpdateServico(servIdx, 'horaInicio2', e.target.value)}
                                      title="Retorno do Almoço"
                                    />
                                    <span className={styles.horarioAte}>até</span>
                                    <input
                                      type="time"
                                      className={styles.input}
                                      style={{ padding: '4px 8px', fontSize: '0.85rem', width: 'auto' }}
                                      value={serv.horaFim || '16:20'}
                                      onChange={(e) => handleUpdateServico(servIdx, 'horaFim', e.target.value)}
                                      title="Saída Final (Tarde)"
                                    />
                                  </div>
                                </>
                              )}

                              {modo === 'MANHA' && (
                                <div className={styles.horarioItem}>
                                  <span className={styles.horarioSubLabel}>Turno da Manhã:</span>
                                  <input
                                    type="time"
                                    className={styles.input}
                                    style={{ padding: '4px 8px', fontSize: '0.85rem', width: 'auto' }}
                                    value={serv.horaInicio || '07:30'}
                                    onChange={(e) => handleUpdateServico(servIdx, 'horaInicio', e.target.value)}
                                    title="Entrada Manhã"
                                  />
                                  <span className={styles.horarioAte}>até</span>
                                  <input
                                    type="time"
                                    className={styles.input}
                                    style={{ padding: '4px 8px', fontSize: '0.85rem', width: 'auto' }}
                                    value={serv.horaFim1 || '11:30'}
                                    onChange={(e) => handleUpdateServico(servIdx, 'horaFim1', e.target.value)}
                                    title="Término do Atendimento da Manhã"
                                  />
                                </div>
                              )}

                              {modo === 'TARDE' && (
                                <div className={styles.horarioItem}>
                                  <span className={styles.horarioSubLabel}>Turno da Tarde:</span>
                                  <input
                                    type="time"
                                    className={styles.input}
                                    style={{ padding: '4px 8px', fontSize: '0.85rem', width: 'auto' }}
                                    value={serv.horaInicio2 || '13:00'}
                                    onChange={(e) => handleUpdateServico(servIdx, 'horaInicio2', e.target.value)}
                                    title="Início Tarde"
                                  />
                                  <span className={styles.horarioAte}>até</span>
                                  <input
                                    type="time"
                                    className={styles.input}
                                    style={{ padding: '4px 8px', fontSize: '0.85rem', width: 'auto' }}
                                    value={serv.horaFim || '16:20'}
                                    onChange={(e) => handleUpdateServico(servIdx, 'horaFim', e.target.value)}
                                    title="Término do Atendimento da Tarde"
                                  />
                                </div>
                              )}

                              {modo === 'CONTINUO' && (
                                <div className={styles.horarioItem}>
                                  <span className={styles.horarioSubLabel}>Período Único:</span>
                                  <input
                                    type="time"
                                    className={styles.input}
                                    style={{ padding: '4px 8px', fontSize: '0.85rem', width: 'auto' }}
                                    value={serv.horaInicio || '07:00'}
                                    onChange={(e) => handleUpdateServico(servIdx, 'horaInicio', e.target.value)}
                                    title="Horário de Início"
                                  />
                                  <span className={styles.horarioAte}>até</span>
                                  <input
                                    type="time"
                                    className={styles.input}
                                    style={{ padding: '4px 8px', fontSize: '0.85rem', width: 'auto' }}
                                    value={serv.horaFim || '13:00'}
                                    onChange={(e) => handleUpdateServico(servIdx, 'horaFim', e.target.value)}
                                    title="Horário de Término"
                                  />
                                </div>
                              )}

                              {/* Badge de Horas Trabalhadas Calculadas */}
                              <div className={styles.badgeHorasDia} title="Total de Horas Trabalhadas no período">
                                <Clock size={14} />
                                <span>Total Efetivo: {textoFormatado}</span>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                      
                      <div style={{ marginBottom: '12px' }}>
                        <label className={styles.label}>O que foi feito? (Descrição)</label>
                        <textarea 
                          placeholder="Ex: Troca de rolamentos, Limpeza" 
                          value={serv.descricao} 
                          onChange={e => handleUpdateServico(servIdx, 'descricao', e.target.value)} 
                          className={styles.textarea}
                          style={{ minHeight: '60px' }} 
                        />
                      </div>

                      {/* EQUIPE NO TURNO (EDIÇÃO) */}
                      <div className={styles.subSectionBox}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <label className={styles.label}><User size={14}/> Equipe neste turno</label>
                          <button 
                            type="button" 
                            onClick={() => handleAddMaoDeObraSessao(servIdx, 'Ajudante')} 
                            style={{ background: 'transparent', border: 'none', color: 'var(--cor-destaque)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}
                            title="Adicionar novo membro à equipe neste turno"
                          >
                            <UserPlus size={16} /> Adicionar Membro
                          </button>
                        </div>
                        <div style={{ display: 'grid', gap: '6px' }}>
                          {(serv.maoDeObra || []).map((mao, maoIdx) => (
                            <div key={maoIdx} style={{ display: 'grid', gridTemplateColumns: '1fr 140px 80px 30px', gap: '8px', alignItems: 'center' }}>
                              <input type="text" placeholder="Nome" value={mao.nome} onChange={e => handleUpdateMaoDeObraSessao(servIdx, maoIdx, 'nome', e.target.value)} list="funcionarios-nome" className={styles.input} />
                              <select value={mao.funcao || 'Ajudante'} onChange={e => handleUpdateMaoDeObraSessao(servIdx, maoIdx, 'funcao', e.target.value)} className={styles.select}>
                                <option value="Executor">Executor (Principal)</option>
                                <option value="Executor Substituto">Executor Substituto</option>
                                <option value="Ajudante">Ajudante (Auxiliar)</option>
                              </select>
                              <input type="text" placeholder="Horas" value={String(mao.horas || '').replace(/h/gi, '')} onChange={e => handleUpdateMaoDeObraSessao(servIdx, maoIdx, 'horas', e.target.value.replace(/h/gi, ''))} className={styles.input} />
                              <button type="button" onClick={() => handleRemoveMaoDeObraSessao(servIdx, maoIdx)} className={styles.btnDelLine} title="Remover membro"><Trash2 size={16}/></button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* PEÇAS CONSUMIDAS NO TURNO (EDIÇÃO) */}
                      <div className={styles.subSectionBox} style={{ marginTop: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                          <label className={styles.label}><Package size={14}/> Peças Consumidas / Aplicadas</label>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button 
                              type="button" 
                              onClick={() => handleAddPecaSessao(servIdx, 'ESTOQUE')} 
                              className={styles.btnAddPecaEstoque}
                              title="Adicionar Peça do Estoque da Empresa"
                            >
                              <Plus size={13} /> + Peça Estoque
                            </button>
                            <button 
                              type="button" 
                              onClick={() => handleAddPecaSessao(servIdx, 'EXTERNA')} 
                              className={styles.btnAddPecaExterna}
                              title="Adicionar Peça Externa (com Foto de Cupom / Nota Fiscal)"
                            >
                              <Camera size={13} /> + Peça Externa (com NF)
                            </button>
                          </div>
                        </div>

                        {(!serv.pecasUtilizadas || serv.pecasUtilizadas.length === 0) ? (
                          <div className={styles.itemVazio} style={{ padding: '8px', textAlign: 'center', color: 'var(--cor-texto-secundario)', fontSize: '0.75rem' }}>
                            Nenhuma peça consumida neste turno. Use os botões acima para adicionar.
                          </div>
                        ) : (
                          <div style={{ display: 'grid', gap: '8px' }}>
                            {serv.pecasUtilizadas.map((peca, pecaIdx) => {
                              const isExterna = peca.tipo === 'EXTERNA' || peca.codigo === 'EXTERNO';

                              return (
                                <div 
                                  key={pecaIdx} 
                                  className={styles.linhaPecaEdicao}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '8px',
                                    borderRadius: '8px',
                                    backgroundColor: 'var(--cor-fundo-sutil)',
                                    border: isExterna ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid var(--cor-borda-cartao)'
                                  }}
                                >
                                  {/* Badge de Origem */}
                                  <div style={{ flexShrink: 0 }}>
                                    {isExterna ? (
                                      <span className={styles.badgeOrigemExterna} title="Peça adquirida fora com comprovante fiscal">
                                        <Camera size={11} /> Compra Externa
                                      </span>
                                    ) : (
                                      <span className={styles.badgeOrigemEstoque} title="Peça requisitada do estoque Omie">
                                        <Package size={11} /> Estoque
                                      </span>
                                    )}
                                  </div>

                                  {/* Campo de Descrição */}
                                  <div style={{ flex: 1, minWidth: '150px' }}>
                                    {isExterna ? (
                                      <input 
                                        type="text" 
                                        placeholder="Nome da peça externa comprada..." 
                                        value={peca.descricao} 
                                        onChange={e => handleUpdatePecaSessao(servIdx, pecaIdx, 'descricao', e.target.value.toUpperCase())} 
                                        className={styles.input} 
                                      />
                                    ) : (
                                      <input 
                                        type="text" 
                                        placeholder="Buscar peça no estoque..." 
                                        value={peca.descricao} 
                                        onChange={e => handleUpdatePecaSessao(servIdx, pecaIdx, 'descricao', e.target.value)} 
                                        list="produtos-estoque" 
                                        className={styles.input} 
                                      />
                                    )}
                                  </div>

                                  {/* Campo de Quantidade */}
                                  <div style={{ width: '80px', flexShrink: 0 }}>
                                    <input 
                                      type="number" 
                                      placeholder="Qtd" 
                                      value={peca.quantidade} 
                                      onChange={e => handleUpdatePecaSessao(servIdx, pecaIdx, 'quantidade', e.target.value)} 
                                      className={styles.input} 
                                      style={{ textAlign: 'center' }}
                                      step="any"
                                    />
                                  </div>
                                  <div style={{ marginLeft: '4px', marginRight: '8px', fontSize: '0.8rem', color: 'var(--cor-texto-secundario)', alignSelf: 'center' }} title={obterBadgeInfo(peca.unidade).label}>
                                    {obterBadgeInfo(peca.unidade).icone} {obterRotuloUnidade(peca.unidade)}
                                  </div>

                                  {/* Campo de Valor Unitário (para Externa) */}
                                  {isExterna ? (
                                    <div style={{ width: '110px', flexShrink: 0 }}>
                                      <input 
                                        type="number" 
                                        placeholder="R$ Valor Un." 
                                        value={peca.valor_unitario !== undefined ? peca.valor_unitario : ''} 
                                        onChange={e => handleUpdatePecaSessao(servIdx, pecaIdx, 'valor_unitario', e.target.value)} 
                                        className={styles.input} 
                                        style={{ textAlign: 'right', fontWeight: '600' }}
                                        step="0.01"
                                        title="Valor unitário da peça externa"
                                      />
                                    </div>
                                  ) : (
                                    peca.valor_unitario > 0 && (
                                      <div style={{ width: '90px', flexShrink: 0, textAlign: 'right', fontSize: '0.75rem', fontWeight: '600', color: 'var(--cor-texto-secundario)' }} title="Valor unitário do estoque Omie">
                                        R$ {Number(peca.valor_unitario).toFixed(2)}
                                      </div>
                                    )
                                  )}

                                  {/* Área da Foto / Comprovante NF */}
                                  <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    {isExterna ? (
                                      peca.fotoNota ? (
                                        <div className={styles.fotoNotaContainer}>
                                          <img
                                            src={peca.fotoNota}
                                            alt="NF"
                                            className={styles.miniaturaFotoNota}
                                            onClick={() => setFotoVisualizando(peca.fotoNota)}
                                            title="Clique para ver a foto da NF"
                                          />
                                          <button
                                            type="button"
                                            className={styles.btnVerNotaModal}
                                            onClick={() => setFotoVisualizando(peca.fotoNota)}
                                            title="Visualizar Nota Fiscal"
                                            style={{ padding: '4px 6px' }}
                                          >
                                            <Eye size={12} />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleUpdatePecaSessao(servIdx, pecaIdx, 'fotoNota', '')}
                                            className={styles.btnDelLine}
                                            title="Remover foto"
                                            style={{ padding: '4px' }}
                                          >
                                            <Trash2 size={13} color="var(--cor-erro)" />
                                          </button>
                                        </div>
                                      ) : (
                                        <label className={styles.btnFotoNotaAnexo} title="Anexar foto da Nota Fiscal ou Cupom">
                                          <Camera size={13} />
                                          <span>Anexar NF</span>
                                          <input
                                            type="file"
                                            accept="image/*"
                                            capture="environment"
                                            style={{ display: 'none' }}
                                            onChange={(e) => handleUploadFotoPeca(servIdx, pecaIdx, e)}
                                          />
                                        </label>
                                      )
                                    ) : null}
                                  </div>

                                  {/* Botão de Remover Peça */}
                                  <button 
                                    type="button" 
                                    onClick={() => handleRemovePecaSessao(servIdx, pecaIdx)} 
                                    className={styles.btnDelLine} 
                                    title="Remover peça"
                                  >
                                    <Trash2 size={16}/>
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* VEÍCULOS DE DESLOCAMENTO (EDIÇÃO) */}
                      <div className={styles.subSectionBox} style={{ marginTop: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <label className={styles.label}><Car size={14}/> Veículos de Deslocamento (Frota)</label>
                          <button type="button" onClick={() => handleAddVeiculoSessao(servIdx)} style={{ background: 'transparent', border: 'none', color: 'var(--cor-destaque)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Plus size={14} /> Veículo
                          </button>
                        </div>
                        <div style={{ display: 'grid', gap: '6px' }}>
                          {(serv.veiculosUtilizados || []).map((veic, veicIdx) => (
                            <div key={veicIdx} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 80px) 30px', gap: '8px', alignItems: 'center' }}>
                              <select value={veic.placa} onChange={e => handleUpdateVeiculoSessao(servIdx, veicIdx, 'placa', e.target.value)} className={styles.select}>
                                <option value="" disabled>Placa...</option>
                                {veiculosConfig.map(vc => <option key={vc.placa} value={vc.placa}>{vc.placa}</option>)}
                              </select>
                              <input type="number" placeholder="KM Ini" value={veic.kmInicial} onChange={e => handleUpdateVeiculoSessao(servIdx, veicIdx, 'kmInicial', e.target.value)} title="KM Inicial (editável para O.S. antigas)" className={styles.input} style={{ fontWeight: 'bold' }} />
                              <input type="number" placeholder="KM Fim" value={veic.kmFinal} onChange={e => handleUpdateVeiculoSessao(servIdx, veicIdx, 'kmFinal', e.target.value)} className={styles.input} />
                              <input type="text" readOnly placeholder="KM" value={veic.km ? `${veic.km} KM` : ''} className={styles.input} style={{ backgroundColor: 'var(--cor-fundo-secundario)', fontWeight: 'bold' }} />
                              <button type="button" onClick={() => handleRemoveVeiculoSessao(servIdx, veicIdx)} className={styles.btnDelLine} title="Remover veículo"><Trash2 size={16}/></button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
          
          <datalist id="produtos-estoque">
            {produtosEstoque.map(p => (
              <option key={p.codigo} value={p.descricao}>{p.codigo}</option>
            ))}
          </datalist>

          <datalist id="funcionarios-nome">
            {fornecedores.map((f, idx) => (
              <option key={`${f.codigo_cliente_omie || f.cnpj_cpf || 'func'}-${idx}`} value={f.razao_social || f.nome_fantasia}>
                {f.cnpj_cpf ? `CPF: ${f.cnpj_cpf}` : `Cód: ${f.codigo_cliente_omie}`}
              </option>
            ))}
          </datalist>

          {/* PERÍODO DE EXECUÇÃO REAL DA OS */}
          <div className={styles.sectionHeader} style={{ marginTop: '20px' }}>
            <h3><Calendar size={16} className={styles.sectionHeaderIcon} /> Período Real de Atendimento da O.S.</h3>
          </div>
          <small className={styles.ajudaTexto} style={{ marginBottom: '12px', display: 'block', color: 'var(--cor-texto-secundario)' }}>
            Informe a data e hora em que a equipe <strong>de fato iniciou o serviço</strong> (mesmo se for dias após a abertura da O.S.) e quando ele foi <strong>de fato finalizado</strong>.
          </small>

          {/* PERÍODO CALCULADO AUTOMATICAMENTE DO DIÁRIO DE BORDO */}
          {(() => {
            const dIni = servicosExecutados.length > 0 ? servicosExecutados[0].data : formData.dataInicio;
            const hIni = servicosExecutados.length > 0 ? (servicosExecutados[0].horaInicio || formData.horaInicio) : formData.horaInicio;
            const dFim = servicosExecutados.length > 0 ? servicosExecutados[servicosExecutados.length - 1].data : formData.dataFim;
            const hFim = servicosExecutados.length > 0 ? (servicosExecutados[servicosExecutados.length - 1].horaFim || servicosExecutados[servicosExecutados.length - 1].horaFim1 || formData.horaFim) : formData.horaFim;

            return (
              <div className={styles.periodoCalculadoCard}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--cor-texto-secundario)' }}>
                  <Calendar size={16} color="var(--cor-destaque)" /> <strong>Período Calculado do Diário de Bordo:</strong>
                </span>
                <strong style={{ color: 'var(--cor-texto-principal)' }}>
                  {dIni ? `${dIni.split('-').reverse().join('/')} ${hIni}` : '-'}
                  {dFim ? ` até ${dFim.split('-').reverse().join('/')} ${hFim}` : ' (Em Andamento)'}
                </strong>
              </div>
            );
          })()}

          {(() => {
            const isGeradorOS = os.centroCusto && (os.centroCusto.toUpperCase().includes('GERADOR') || os.centroCusto.toUpperCase().includes('GRANJA') || os.centroCusto.toUpperCase().startsWith('G. '));
            const veiculoCadastrado = veiculosConfig.find(vc => vc.placa === os.centroCusto);
            
            if (!veiculoCadastrado && !isGeradorOS) return null;
            
            const isHorimetro = (veiculoCadastrado && veiculoCadastrado.tipoMedicao === 'Horas') || !!isGeradorOS;
            const labelBase = isHorimetro ? 'Horímetro Atual (Fechamento da O.S.)' : 'KM Atual (Fechamento da O.S.)';
            const ultimoRegistro = veiculoCadastrado ? veiculoCadastrado.kmAtual : null;

            return (
              <div className={styles.veiculoManutencaoContainer}>
                <div className={styles.veiculoManutencaoHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <h4 className={styles.veiculoManutencaoTitle} style={{ margin: 0 }}>
                    <Wrench size={18} /> Manutenção da Frota ({os.centroCusto})
                  </h4>
                  {ultimoRegistro && (
                    <span style={{ fontSize: '0.85rem', color: 'var(--cor-texto-secundario)', fontWeight: '600' }}>
                      📌 Último Registro da Frota: <strong style={{ color: 'var(--cor-texto-principal)' }}>{formatarOdometroDisplay(ultimoRegistro, isHorimetro ? 'Horas' : 'KM')}</strong>
                    </span>
                  )}
                </div>
                <div className={styles.veiculoManutencaoBody}>
                  <div style={{ flex: '1 1 100%', display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
                    <InputOdometroInteligente 
                      veiculo={veiculoCadastrado}
                      value={kmManutencao}
                      onChange={setKmManutencao}
                      onError={setErroRetrocesso}
                      label={labelBase}
                    />
                  </div>

                  {isHorimetro && (
                    <div className={`${styles.formGroup} ${styles.maxWidth400}`} style={{ marginTop: '12px' }}>
                      <label className={`${styles.label} ${styles.labelVeiculoManutencao}`}>
                        🗑️ Descarte de Borra / Limpeza de Tanque (Litros)
                      </label>
                      <input 
                        type="number" 
                        name="descarteBorraLitros"
                        className={`${styles.input} ${styles.inputVeiculoManutencao}`} 
                        value={formData.descarteBorraLitros} 
                        onChange={handleChange} 
                        placeholder="Ex: 5.5"
                      />
                    </div>
                  )}

                  <div className={styles.checkboxesGrid}>
                    <label className={`${styles.checkboxItem} ${marcarTrocaOleo ? styles.checkboxItemActive : ''}`}>
                      <input 
                        type="checkbox" 
                        className={styles.checkboxInput} 
                        checked={marcarTrocaOleo} 
                        onChange={(e) => setMarcarTrocaOleo(e.target.checked)} 
                      />
                      <span className={styles.checkboxText}>🛢️ Registrar Troca de Óleo para este veículo</span>
                    </label>

                    <label className={`${styles.checkboxItem} ${marcarRevisao ? styles.checkboxItemActive : ''}`}>
                      <input 
                        type="checkbox" 
                        className={styles.checkboxInput} 
                        checked={marcarRevisao} 
                        onChange={(e) => setMarcarRevisao(e.target.checked)} 
                      />
                      <span className={styles.checkboxText}>🔧 Registrar Revisão Geral para este veículo</span>
                    </label>
                  </div>

                  <div className={styles.avisoContainer}>
                    <p className={styles.avisoTitle}>
                      ⚠️ Automação da Frota:
                    </p>
                    <p className={styles.avisoText}>
                      Informe o KM/Horímetro atual acima e mantenha os marcadores selecionados caso a O.S. envolva Troca de Óleo ou Revisão para atualizar as metas da frota.
                    </p>
                  </div>
                </div>
              </div>
            );
          })()}

          {!isFinalizada && (
            <>
              <div className={styles.formGrid}>
                <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
                  <label className={styles.label}>Motivo / Causa do Serviço (Por que o serviço foi necessário?)</label>
                  <textarea 
                    className={styles.textarea} 
                    name="motivo"
                    value={formData.motivo || ''}
                    onChange={handleChange}
                    placeholder="Ex: Pneu estourou ao passar em cima do canteiro; Peça desgastada por tempo de uso..."
                    disabled={isFinalizada}
                    rows={2}
                  />
                </div>
              </div>

              {/* SEÇÃO DE DEVOLUÇÃO DE MATERIAIS SOBRESSALENTES AO ALMOXARIFADO (SOMENTE SE EXECUTADA / CONCLUÍDA) */}
              {formData.resultado === 'EXECUTADA' && os.pecasSolicitadas && os.pecasSolicitadas.length > 0 && (!pecasDevolvidas || pecasDevolvidas.length === 0) && (
                <div className={styles.saldoCard} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                  <CheckCircle size={18} color="var(--cor-sucesso)" />
                  <span><strong>Devolução de Materiais:</strong> Todas as peças retiradas foram 100% aplicadas nos turnos. Nenhuma devolução pendente ao almoxarifado!</span>
                </div>
              )}

              {formData.resultado === 'EXECUTADA' && pecasDevolvidas && pecasDevolvidas.length > 0 && (
                <div className={styles.devolucaoCard}>
                  <h4 className={styles.devolucaoTitle}>
                    <Package size={16} color="var(--cor-destaque)" /> Devolução de Peças / Insumos Não Utilizados ao Almoxarifado
                  </h4>
                  <p className={styles.devolucaoSubtitle}>
                    As peças abaixo não foram 100% consumidas nos turnos e deverão ser devolvidas fisicamente ao almoxarifado.
                  </p>
                  <div style={{ display: 'grid', gap: '8px' }}>
                    {pecasDevolvidas.map((p, idx) => (
                      <div key={idx} className={styles.devolucaoItem}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                          <strong>{p.descricao}</strong>
                          <span style={{ fontSize: '0.8rem', color: 'var(--cor-texto-secundario)' }}>
                            Retiradas: <strong style={{ color: 'var(--cor-texto-principal)' }}>{p.qtdLiberada}x</strong> | Aplicadas: <strong style={{ color: 'var(--cor-texto-principal)' }}>{p.qtdConsumida}x</strong>
                          </span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: '8px', alignItems: 'center' }}>
                          <div>
                            <label className={styles.label} style={{ marginBottom: '2px' }}>Qtd Devolver</label>
                            <input 
                              type="number" 
                              value={p.quantidadeDevolvida} 
                              onChange={e => {
                                const newDev = [...pecasDevolvidas];
                                newDev[idx].quantidadeDevolvida = parseFloat(e.target.value) || 0;
                                setPecasDevolvidas(newDev);
                              }} 
                              className={styles.devolucaoInput}
                              style={{ fontWeight: 'bold', color: 'var(--cor-destaque)' }}
                            />
                          </div>
                          <div>
                            <label className={styles.label} style={{ marginBottom: '2px' }}>Motivo da Devolução</label>
                            <input 
                              type="text" 
                              value={p.motivoDevolucao} 
                              onChange={e => {
                                const newDev = [...pecasDevolvidas];
                                newDev[idx].motivoDevolucao = e.target.value;
                                setPecasDevolvidas(newDev);
                              }} 
                              placeholder="Ex: Sobra de manutenção"
                              className={styles.devolucaoInput}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className={styles.formGrid}>
                <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
                  <label className={styles.label}>Resultado do Atendimento (Status Final)</label>
                  <select className={styles.select} name="resultado" value={formData.resultado} onChange={handleChange}>
                    <option value="EXECUTADA">Executada / Concluído</option>
                    <option value="EM ANDAMENTO">Em Andamento (Não finalizada)</option>
                    <option value="AGUARDANDO INSUMO">Aguardando Insumo / Peça</option>
                    <option value="CANCELADA">Cancelada</option>
                  </select>
                </div>
              </div>
              
              <div className={styles.formGrid}>
                {!mostrarJustificativa ? (
                  <button 
                    type="button" 
                    onClick={() => setMostrarJustificativa(true)}
                    className={styles.btnJustificar}
                  >
                    <AlertCircle size={18} />
                    JUSTIFICAR ATRASO / ADICIONAR OBSERVAÇÃO
                  </button>
                ) : (
                  <div className={styles.justificativaContainer}>
                    <div className={styles.justificativaHeader}>
                      <h4>
                        <AlertCircle size={18} /> Justificativa de Atraso
                      </h4>
                      <button type="button" onClick={() => setMostrarJustificativa(false)} className={styles.btnCancelLink}>
                        Cancelar
                      </button>
                    </div>
                    <div className={styles.formGrid}>
                      <div className={styles.formGroup}>
                        <label className={styles.label}>Data do Atraso / Justificativa</label>
                        <input 
                          type="date" 
                          className={styles.input} 
                          name="dataJustificativa"
                          value={formData.dataJustificativa}
                          onChange={handleChange}
                          required={mostrarJustificativa}
                        />
                      </div>
                    </div>
                    <div className={`${styles.formGrid} ${styles.mt12}`}>
                      <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
                        <label className={styles.label}>Observação / Motivo do Atraso</label>
                        <textarea 
                          className={styles.textarea} 
                          name="observacao"
                          value={formData.observacao}
                          onChange={handleChange}
                          placeholder="Descreva o motivo do atraso ou detalhes adicionais..."
                          required={mostrarJustificativa}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className={styles.actionsFooter}>
                <button type="button" onClick={onClose} className={styles.btnSecondary} disabled={isSubmitting}>
                  Cancelar
                </button>
                <button type="submit" className={styles.btnPrimary} disabled={isSubmitting}>
                  <Save size={18} />
                  {isSubmitting ? 'Salvando...' : (isFinalizada ? 'Fechar' : 'SALVAR E FECHAR O.S')}
                </button>
              </div>
            </>
          )}

          {isFinalizada && (
            <>
              {formData.observacao && (
                <div className={`${styles.formGrid} ${styles.mt16}`}>
                  <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
                    <label className={styles.label}>Justificativa de Atraso / Observações ({formData.dataJustificativa ? formData.dataJustificativa.split('-').reverse().join('/') : ''})</label>
                    <div className={styles.readonlyBox}>
                      {formData.observacao}
                    </div>
                  </div>
                </div>
              )}
              <div className={styles.actionsFooter}>
                <button type="button" onClick={onClose} className={styles.btnPrimary}>
                  Fechar Visualização
                </button>
              </div>
            </>
          )}

          {/* SEÇÃO DE HISTÓRICO DE EDIÇÕES (SEMPRE VISÍVEL) */}
          {(os.historicoEdicoes && os.historicoEdicoes.length > 0) && (
            <div style={{ marginTop: '24px', backgroundColor: 'var(--cor-fundo-sutil)', padding: '16px', borderRadius: '8px', border: '1px solid var(--cor-borda-cartao)' }}>
              <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: 'var(--cor-texto-principal)', fontSize: '0.95rem' }}>
                <ShieldCheck size={18} color="var(--cor-destaque)" /> 
                Histórico de Edições / Auditoria
              </h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {os.historicoEdicoes.map((ed, idx) => (
                  <li key={idx} style={{ fontSize: '0.82rem', color: 'var(--cor-texto-secundario)', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <strong style={{ color: 'var(--cor-texto-principal)' }}>{ed.editor}</strong> alterou esta O.S. em {new Date(ed.data).toLocaleString('pt-BR')}.
                        {ed.motivo && <><br/>Motivo: <em>{ed.motivo}</em></>}
                      </div>
                      {(ed.alteracoes && ed.alteracoes.length > 0) && (
                        <button 
                          type="button" 
                          onClick={() => setDiffVisualizando(ed.alteracoes)}
                          className={styles.btnDiff}
                        >
                          <Eye size={14} /> Detalhes
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

        </form>

        {/* MODAL DE VISUALIZAÇÃO DE FOTO DA NOTA FISCAL */}
        {fotoVisualizando && (
          <div className={styles.modalFotoBackdrop} onClick={() => setFotoVisualizando(null)}>
            <div className={styles.modalFotoCard} onClick={e => e.stopPropagation()}>
              <div className={styles.modalFotoHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, fontSize: '1.05rem', color: 'var(--cor-texto-principal)' }}>
                  <Camera size={20} color="var(--cor-destaque)" />
                  <span>Comprovante / Nota Fiscal Anexada</span>
                </div>
                <button type="button" onClick={() => setFotoVisualizando(null)} className={styles.closeButton} style={{ position: 'static' }}>
                  <X size={20} />
                </button>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
                <img src={fotoVisualizando} alt="Nota Fiscal" className={styles.modalFotoImg} />
              </div>
            </div>
          </div>
        )}

      </div>
    </div>

      {/* MODAL DE AUTORIZAÇÃO DE EDIÇÃO (AUDITORIA) */}
      {modalEdicaoAberta && (
        <div className={styles.overlay} style={{ zIndex: 9999 }}>
          <div className={`${styles.modalCard} ${styles.animateFadeIn}`} style={{ maxWidth: '400px', padding: '24px' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.2rem', color: 'var(--cor-destaque)', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--cor-borda-cartao)', paddingBottom: '12px', marginBottom: '16px' }}>
              <ShieldCheck size={28} />
              Autorização de Edição
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--cor-texto-secundario)', marginBottom: '16px', lineHeight: '1.4' }}>
              Esta Ordem de Serviço será alterada. Por questões de auditoria, por favor, identifique-se para registrar a edição.
            </p>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Seu Nome (Editor): <span style={{ color: 'red' }}>*</span></label>
              <input 
                type="text" 
                value={nomeEditor} 
                onChange={e => setNomeEditor(e.target.value)}
                placeholder="Ex: João Silva"
                autoFocus
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--cor-borda-cartao)', fontSize: '0.9rem' }}
              />
            </div>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Motivo da Alteração (Opcional):</label>
              <input 
                type="text" 
                value={motivoEdicao} 
                onChange={e => setMotivoEdicao(e.target.value)}
                placeholder="Ex: Corrigi a placa do veículo"
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--cor-borda-cartao)', fontSize: '0.9rem' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button 
                type="button" 
                onClick={() => setModalEdicaoAberta(false)} 
                style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', backgroundColor: '#e2e8f0', color: '#475569', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button 
                type="button" 
                onClick={handleConfirmarEdicao}
                style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', backgroundColor: 'var(--cor-destaque)', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
              >
                Confirmar e Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE DETALHES DE EDIÇÃO (DIFF) */}
      {diffVisualizando && (
        <div className={styles.overlay} style={{ zIndex: 99999 }} onClick={() => setDiffVisualizando(null)}>
          <div className={`${styles.modalCard} ${styles.animateFadeIn}`} style={{ maxWidth: '1000px', width: '92%', maxHeight: '92vh', padding: '28px' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.25rem', color: 'var(--cor-destaque)', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--cor-borda-cartao)', paddingBottom: '14px', marginBottom: '20px' }}>
              <Eye size={24} />
              Detalhes da Alteração (Antes e Depois)
            </h2>
            <div className={styles.diffList}>
              {diffVisualizando.map((diff, i) => (
                <div key={i} className={styles.diffItem}>
                  <div className={styles.diffCampo}>{mapNomesCamposDiff[diff.campo] || diff.campo}</div>
                  <div className={styles.diffComparacao}>
                    <div className={`${styles.diffLado} ${styles.diffAntes}`}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', marginBottom: '6px', textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.04em', color: '#ef4444', fontWeight: 800 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#ef4444', display: 'inline-block' }} />
                        Antes:
                      </span>
                      {formatarValorDiffHumanizado(diff.campo, diff.de)}
                    </div>
                    <div className={styles.diffSeta}>
                      <ArrowRight size={18} />
                    </div>
                    <div className={`${styles.diffLado} ${styles.diffDepois}`}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', marginBottom: '6px', textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.04em', color: '#10b981', fontWeight: 800 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }} />
                        Depois:
                      </span>
                      {formatarValorDiffHumanizado(diff.campo, diff.para)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button 
                type="button" 
                onClick={() => setDiffVisualizando(null)} 
                style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', backgroundColor: '#e2e8f0', color: '#475569', fontWeight: 600, cursor: 'pointer' }}
              >
                Fechar Visualização
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FormularioServicoOS;
