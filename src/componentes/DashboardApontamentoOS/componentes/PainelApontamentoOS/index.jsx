import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X, Save, CheckCircle, Plus, Trash2, Clock, User, Wrench, Package,
  Car, Fuel, ChevronRight, ChevronLeft, Check, FileText, Users, Calendar, AlertCircle,
  Sunrise, Sunset, Pencil, RefreshCw, Droplet, Camera, Eye, Image,
  ShieldCheck, Sparkles, Zap, ArrowRight, AlertTriangle
} from 'lucide-react';
import styles from './PainelApontamentoOS.module.css';
import ModalEdicaoDiaTotem from './ModalEdicaoDiaTotem';
import ModalConferenciaOS from './ModalConferenciaOS';
import { CONCLUIDO } from '../../../../utils/osStatus';
import { formatarOdometroDisplay, formatarNumeroBR, validarAntiRetrocessoKM } from '../../../../utils/formatadorOdometro';

const PainelApontamentoOS = ({ os, onClose, onSucesso, produtosEstoque = [], fornecedores = [], veiculosConfig = [] }) => {
  if (!os) return null;

  const [turnoIndexAtivo, setTurnoIndexAtivo] = useState(0);

  // Detecção se o Alvo da OS é um Veículo, Máquina, Trator ou Gerador da Frota
  const veiculoAlvo = (veiculosConfig || []).find(
    v => (v.placa || '').trim().toUpperCase() === (os.centroCusto || '').trim().toUpperCase()
  );
  const isPlacaVeiculo = os.centroCusto && (
    /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/i.test(os.centroCusto.trim()) ||
    Boolean(veiculoAlvo)
  );
  const isGeradorOS = os.centroCusto && (
    os.centroCusto.toUpperCase().includes('GERADOR') ||
    os.centroCusto.toUpperCase().includes('GRANJA') ||
    os.centroCusto.toUpperCase().startsWith('G. ')
  );
  const isOSDeVeiculo = Boolean(veiculoAlvo || isGeradorOS || isPlacaVeiculo);

  const isHorimetro = (veiculoAlvo && (veiculoAlvo.tipoMedicao === 'Horas' || veiculoAlvo.tipoMedicao === 'HORAS')) || !!isGeradorOS;
  const unidadeMedicao = isHorimetro ? 'Horas' : 'km';
  const labelMedicao = isHorimetro ? 'Horímetro Atual' : 'KM Atual';
  const placeholderMedicao = isHorimetro ? 'Ex: 1250' : 'Ex: 45200';

  // Estado geral do formulário
  const [executorPrincipal, setExecutorPrincipal] = useState(os.executor || os.tecnicoResponsavel || '');
  const [descricaoGeral, setDescricaoGeral] = useState(os.descricaoServico || '');
  const [atualizarKm, setAtualizarKm] = useState(true);
  const [kmManutencao, setKmManutencao] = useState(() => {
    if (os.kmManutencao) return os.kmManutencao;
    const vFromOS = (os.veiculos || []).find(v => (v.placa || '').trim().toUpperCase() === (os.centroCusto || '').trim().toUpperCase());
    if (vFromOS?.kmFinal) return vFromOS.kmFinal;
    return veiculoAlvo?.kmAtual || '';
  });
  const [descarteBorra, setDescarteBorra] = useState(os.descarteBorraLitros || '');

  // Modal de Foto Ampliada
  const [fotoVisualizando, setFotoVisualizando] = useState(null);

  // Justificativa de Atraso
  const [observacaoJustificativa, setObservacaoJustificativa] = useState(os.observacao || '');
  const [dataJustificativa, setDataJustificativa] = useState(os.dataJustificativa || new Date().toISOString().split('T')[0]);

  // Detecção automática se a OS é originalmente de óleo/revisão
  const osTextoDesc = ((os.descricao || '') + ' ' + (os.descricaoServico || '')).toLowerCase();
  const ehOleoDetectado = osTextoDesc.includes('oleo') || osTextoDesc.includes('óleo');
  const ehRevisaoDetectada = osTextoDesc.includes('revisao') || osTextoDesc.includes('revisão');

  const tipoManutencaoInicial = (ehOleoDetectado && ehRevisaoDetectada) ? 'AMBOS' : (ehOleoDetectado ? 'OLEO' : (ehRevisaoDetectada ? 'REVISAO' : 'NAO'));
  const [tipoManutencao, setTipoManutencao] = useState(tipoManutencaoInicial);

  const trocouOleo = tipoManutencao === 'OLEO' || tipoManutencao === 'AMBOS';
  const fezRevisao = tipoManutencao === 'REVISAO' || tipoManutencao === 'AMBOS';

  // Turnos / Diário de Bordo (Múltiplos Dias)
  const [turnos, setTurnos] = useState(() => {
    let base = os.servicosExecutados ? JSON.parse(JSON.stringify(os.servicosExecutados)) : [];
    if (base.length === 0) {
      base = [{
        id: Date.now().toString(),
        data: new Date().toISOString().split('T')[0],
        horaInicio: '',
        horaFim1: '',
        horaInicio2: '',
        horaFim: '',
        descricao: '',
        isSaved: false,
        maoDeObra: [
          { matricula: '', nome: os.executor || os.tecnicoResponsavel || '', funcao: 'Executor', horas: '' }
        ],
        pecasUtilizadas: os.consumiveis ? os.consumiveis.map(c => ({
          codigo: c.codigo || '',
          descricao: c.descricao || '',
          quantidade: c.quantidade || 1,
          valor_unitario: c.valor_unitario || 0
        })) : [],
        veiculosUtilizados: []
      }];
    }
    return base;
  });

  const [salvando, setSalvando] = useState(false);
  const [modalConferenciaAberto, setModalConferenciaAberto] = useState(false);
  const [animandoConferencia, setAnimandoConferencia] = useState(false);
  const [auditPhase, setAuditPhase] = useState(0);

  // Efeito de 7 segundos para auditoria e pré-conferência antes do modal
  useEffect(() => {
    if (animandoConferencia) {
      setAuditPhase(0);
      const t1 = setTimeout(() => setAuditPhase(1), 1800);
      const t2 = setTimeout(() => setAuditPhase(2), 3600);
      const t3 = setTimeout(() => setAuditPhase(3), 5400);
      const tEnd = setTimeout(() => {
        setAnimandoConferencia(false);
        setModalConferenciaAberto(true);
      }, 7000);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
        clearTimeout(tEnd);
      };
    }
  }, [animandoConferencia]);

  const kmInicializadoRef = useRef(false);

  // Auto-preencher KM sugerido do veículo apenas uma vez no carregamento inicial
  useEffect(() => {
    if (!kmInicializadoRef.current && isOSDeVeiculo && veiculosConfig.length > 0 && os.centroCusto) {
      const vc = veiculosConfig.find(v => v.placa === os.centroCusto);
      if (vc) {
        const k = Math.max(parseFloat(vc.kmAtual) || 0, parseFloat(vc.kmTrocaOleo) || 0, parseFloat(vc.kmRevisao) || 0);
        if (k > 0 && !kmManutencao) {
          setKmManutencao(k.toString());
        }
        kmInicializadoRef.current = true;
      }
    }
  }, [veiculosConfig, os.centroCusto, isOSDeVeiculo]);

  // Normalizar e extrair todos os nomes de funcionários/fornecedores da Omie
  const listaFuncionariosTratada = useMemo(() => {
    const nomesMap = new Map();
    (fornecedores || []).forEach(f => {
      const rSocial = (f.razao_social || f.razaoSocial || '').trim();
      const nFantasia = (f.nome_fantasia || f.nomeFantasia || '').trim();
      const nome = (f.nome || '').trim();

      if (rSocial) nomesMap.set(rSocial.toUpperCase(), rSocial);
      if (nFantasia) nomesMap.set(nFantasia.toUpperCase(), nFantasia);
      if (nome) nomesMap.set(nome.toUpperCase(), nome);
    });
    return Array.from(nomesMap.values()).sort((a, b) => a.localeCompare(b));
  }, [fornecedores]);

  const handleExecutorChange = (novoNome) => {
    setExecutorPrincipal(novoNome);
    setTurnos(prev => {
      const copy = [...prev];
      if (copy.length > 0 && copy[0].maoDeObra && copy[0].maoDeObra.length > 0) {
        const vUpper = (novoNome || '').trim().toUpperCase();
        const funcEncontrado = (fornecedores || []).find(f => {
          const r = (f.razao_social || f.razaoSocial || '').trim().toUpperCase();
          const nf = (f.nome_fantasia || f.nomeFantasia || '').trim().toUpperCase();
          const n = (f.nome || '').trim().toUpperCase();
          return r === vUpper || nf === vUpper || n === vUpper;
        });

        copy[0].maoDeObra[0] = {
          ...copy[0].maoDeObra[0],
          nome: novoNome,
          matricula: funcEncontrado ? (funcEncontrado.cnpj_cpf || funcEncontrado.cnpjCpf || funcEncontrado.matricula || '') : copy[0].maoDeObra[0].matricula
        };
      }
      return copy;
    });
  };

  // Cálculo de horas do turno
  const calcularHorasTurno = (t) => {
    if (!t) return '0.0';
    let totalMin = 0;
    const diff = (h1, h2) => {
      if (!h1 || !h2) return 0;
      const [iH, iM] = h1.split(':').map(Number);
      const [fH, fM] = h2.split(':').map(Number);
      return Math.max(0, (fH * 60 + fM) - (iH * 60 + iM));
    };

    if (t.horaInicio && t.horaFim1) totalMin += diff(t.horaInicio, t.horaFim1);
    if (t.horaInicio2 && t.horaFim) totalMin += diff(t.horaInicio2, t.horaFim);
    if (t.horaInicio && t.horaFim && !t.horaFim1 && !t.horaInicio2) totalMin += diff(t.horaInicio, t.horaFim);

    return (totalMin / 60).toFixed(1);
  };

  // Função auxiliar de formatação de data para o padrão brasileiro
  const formatarDataBR = (d) => {
    if (!d) return '--/--/----';
    if (d.includes('/')) return d;
    return d.split('-').reverse().join('/');
  };

  // Detecção de Atraso em relação ao Prazo da O.S.
  const dataHoje = new Date().toISOString().split('T')[0];
  const ultimaDataTurnos = turnos.reduce((max, t) => (t.data && t.data > max ? t.data : max), turnos[0]?.data || dataHoje);
  const dataComparacaoAtraso = ultimaDataTurnos || dataHoje;
  const isAtrasada = Boolean(os.prazo && dataComparacaoAtraso > os.prazo);

  // Lista dinâmica de passos conforme o status de atraso
  const passosLista = useMemo(() => {
    if (isAtrasada) {
      return [
        { id: 1, titulo: 'Executor', icone: User },
        { id: 2, titulo: 'Horários', icone: Clock },
        { id: 3, titulo: 'Descrição', icone: FileText },
        { id: 4, titulo: 'Equipe', icone: Users },
        { id: 5, titulo: 'Peças & Veículos', icone: Package },
        { id: 6, titulo: 'Justificativa', icone: AlertCircle },
        { id: 7, titulo: 'Conclusão', icone: CheckCircle }
      ];
    }
    return [
      { id: 1, titulo: 'Executor', icone: User },
      { id: 2, titulo: 'Horários', icone: Clock },
      { id: 3, titulo: 'Descrição', icone: FileText },
      { id: 4, titulo: 'Equipe', icone: Users },
      { id: 5, titulo: 'Peças & Veículos', icone: Package },
      { id: 6, titulo: 'Conclusão', icone: CheckCircle }
    ];
  }, [isAtrasada]);

  const passoResumoId = isAtrasada ? 7 : 6;
  const passoJustificativaId = isAtrasada ? 6 : null;

  // Calcular o passo inicial inteligente ao abrir (resgatando de onde o usuário parou)
  const passoInicialCalculado = useMemo(() => {
    // 1. Se foi salvo explicitamente o passo durante o "Salvar Parcial"
    const passoSalvo = parseInt(os.passoApontamentoTotem, 10);
    if (passoSalvo && passoSalvo >= 1 && passoSalvo <= (isAtrasada ? 7 : 6)) {
      return passoSalvo;
    }
    // 2. Auto-detecção inteligente baseada nos dados já preenchidos
    const t0 = os.servicosExecutados?.[0];
    const temExecutor = Boolean((os.executor || os.tecnicoResponsavel || '').trim());
    if (temExecutor && t0) {
      if (t0.horaInicio && t0.descricao && t0.maoDeObra?.length > 0 && t0.maoDeObra.some(m => m.nome && m.nome.trim())) {
        return 5; // Vai para Peças & Veículos
      }
      if (t0.horaInicio && t0.descricao) {
        return 4; // Vai para Equipe
      }
      if (t0.horaInicio) {
        return 3; // Vai para Descrição
      }
      return 2; // Vai para Horários
    } else if (temExecutor) {
      return 2; // Vai para Horários
    }
    return 1;
  }, [os, isAtrasada]);

  const [passoAtual, setPassoAtual] = useState(passoInicialCalculado);
  const [passoMaximoAlcancado, setPassoMaximoAlcancado] = useState(passoInicialCalculado);

  // Turno Ativo Atual
  const turnoAtivo = turnos[turnoIndexAtivo] || turnos[0];

  // Manipular Turnos
  const handleTurnoChange = (campo, valor) => {
    setTurnos(prev => {
      const copy = [...prev];
      const tAtualizado = { ...copy[turnoIndexAtivo], [campo]: valor };

      // Se alterou horários, pré-carrega automaticamente as horas da equipe
      if (['horaInicio', 'horaFim1', 'horaInicio2', 'horaFim'].includes(campo)) {
        const horasCalc = calcularHorasTurno(tAtualizado);
        if (parseFloat(horasCalc) > 0) {
          tAtualizado.maoDeObra = (tAtualizado.maoDeObra || []).map(m => ({
            ...m,
            horas: horasCalc
          }));
        }
      }

      copy[turnoIndexAtivo] = tAtualizado;
      return copy;
    });
  };

  // Adicionar Novo Dia de Trabalho (Loop para o próximo dia)
  const handleRegistrarMaisUmDia = () => {
    // Pegar a última data registrada e sugerir o dia seguinte ou hoje
    const ultimaData = turnoAtivo?.data || new Date().toISOString().split('T')[0];
    const dataObj = new Date(ultimaData + 'T12:00:00');
    dataObj.setDate(dataObj.getDate() + 1);
    const proximaData = dataObj.toISOString().split('T')[0];

    const novoTurno = {
      id: Date.now().toString(),
      data: proximaData,
      horaInicio: '',
      horaFim1: '',
      horaInicio2: '',
      horaFim: '',
      descricao: '',
      isSaved: false,
      maoDeObra: [
        { matricula: '', nome: executorPrincipal || '', funcao: 'Executor', horas: '' }
      ],
      pecasUtilizadas: [],
      veiculosUtilizados: []
    };

    const novoIndex = turnos.length;
    setTurnos(prev => [...prev, novoTurno]);
    setTurnoIndexAtivo(novoIndex); // Aponta para o novo dia
    setPassoAtual(2); // Volta para os Horários do novo dia!
    setPassoMaximoAlcancado(2); // Trava os passos futuros para o novo dia!
  };

  // Garantir que o passoAtual nunca ultrapasse o passoResumoId disponível
  useEffect(() => {
    if (passoAtual > passoResumoId) {
      setPassoAtual(passoResumoId);
      setPassoMaximoAlcancado(passoResumoId);
    }
  }, [passoAtual, passoResumoId]);

  const handleRemoveTurno = (index) => {
    if (turnos.length <= 1) return;
    setTurnos(prev => {
      const novos = prev.filter((_, i) => i !== index);
      return novos;
    });
    if (turnoIndexAtivo >= index) {
      setTurnoIndexAtivo(Math.max(0, turnoIndexAtivo - 1));
    }
  };

  // Cancelar/Desistir de um dia extra recém-criado e retornar ao Resumo
  const handleCancelarDiaCriado = (index) => {
    if (turnos.length <= 1) return;
    if (window.confirm(`Deseja cancelar e remover o Dia #${index + 1} e voltar ao resumo da O.S.?`)) {
      const novosTurnos = turnos.filter((_, i) => i !== index);
      setTurnos(novosTurnos);

      const novoIndex = Math.max(0, index - 1);
      setTurnoIndexAtivo(novoIndex);

      // Recalcular novo passo de resumo baseado nos turnos restantes
      const dataHojeLocal = new Date().toISOString().split('T')[0];
      const ultimaDataRestante = novosTurnos.reduce((max, t) => (t.data && t.data > max ? t.data : max), novosTurnos[0]?.data || dataHojeLocal);
      const aindaAtrasada = Boolean(os.prazo && ultimaDataRestante > os.prazo);
      const novoPassoResumo = aindaAtrasada ? 7 : 6;

      setPassoAtual(novoPassoResumo);
      setPassoMaximoAlcancado(novoPassoResumo);
    }
  };

  // Modal de Edição Rápida do Dia no Passo 6
  const [diaEditandoModal, setDiaEditandoModal] = useState(null);
  const [editandoVindoDaConferencia, setEditandoVindoDaConferencia] = useState(false);

  const handleSalvarEdicaoDiaModal = (diaIndex, turnoAtualizado) => {
    setTurnos(prev => {
      const copy = [...prev];
      copy[diaIndex] = turnoAtualizado;
      return copy;
    });
    setDiaEditandoModal(null);
    if (editandoVindoDaConferencia) {
      setEditandoVindoDaConferencia(false);
      setAnimandoConferencia(true);
    }
  };

  const handleRemoverDiaPasso6 = (diaIndex) => {
    if (turnos.length <= 1) {
      alert('⚠️ A Ordem de Serviço deve conter pelo menos 1 dia apontado.');
      return;
    }
    if (window.confirm(`Tem certeza que deseja excluir o Dia #${diaIndex + 1} deste apontamento?`)) {
      const novosTurnos = turnos.filter((_, i) => i !== diaIndex);
      setTurnos(novosTurnos);
      if (turnoIndexAtivo >= diaIndex) {
        setTurnoIndexAtivo(Math.max(0, turnoIndexAtivo - 1));
      }

      const dataHojeLocal = new Date().toISOString().split('T')[0];
      const ultimaDataRestante = novosTurnos.reduce((max, t) => (t.data && t.data > max ? t.data : max), novosTurnos[0]?.data || dataHojeLocal);
      const aindaAtrasada = Boolean(os.prazo && ultimaDataRestante > os.prazo);
      const novoPassoResumo = aindaAtrasada ? 7 : 6;

      setPassoAtual(novoPassoResumo);
      setPassoMaximoAlcancado(novoPassoResumo);
    }
  };

  // Manipular Membros da Equipe no Turno Ativo
  const handleAddMembro = () => {
    setTurnos(prev => {
      const copy = [...prev];
      const t = { ...copy[turnoIndexAtivo] };
      const hCalc = calcularHorasTurno(t);
      t.maoDeObra = [...(t.maoDeObra || []), { matricula: '', nome: '', funcao: 'Ajudante', horas: parseFloat(hCalc) > 0 ? hCalc : '' }];
      copy[turnoIndexAtivo] = t;
      return copy;
    });
  };

  const handleMembroChange = (mIdx, campo, valor) => {
    setTurnos(prev => {
      const copy = [...prev];
      const t = { ...copy[turnoIndexAtivo] };
      const mList = [...(t.maoDeObra || [])];
      mList[mIdx] = { ...mList[mIdx], [campo]: valor };

      if (campo === 'nome') {
        const vUpper = (valor || '').trim().toUpperCase();
        const funcEncontrado = (fornecedores || []).find(f => {
          const r = (f.razao_social || f.razaoSocial || '').trim().toUpperCase();
          const nf = (f.nome_fantasia || f.nomeFantasia || '').trim().toUpperCase();
          const n = (f.nome || '').trim().toUpperCase();
          return r === vUpper || nf === vUpper || n === vUpper;
        });
        if (funcEncontrado) {
          mList[mIdx].matricula = funcEncontrado.cnpj_cpf || funcEncontrado.cnpjCpf || funcEncontrado.matricula || '';
        }
      }

      t.maoDeObra = mList;
      copy[turnoIndexAtivo] = t;
      return copy;
    });
  };

  const handleRemoveMembro = (mIdx) => {
    setTurnos(prev => {
      const copy = [...prev];
      const t = { ...copy[turnoIndexAtivo] };
      t.maoDeObra = (t.maoDeObra || []).filter((_, i) => i !== mIdx);
      copy[turnoIndexAtivo] = t;
      return copy;
    });
  };

  // Estado para busca dinâmica de peças
  const [activePecaSearch, setActivePecaSearch] = useState({ pecaIdx: null, query: '' });

  const handleAddPeca = () => {
    setTurnos(prev => {
      const copy = [...prev];
      const t = { ...copy[turnoIndexAtivo] };
      t.pecasUtilizadas = [...(t.pecasUtilizadas || []), {
        codigo: '',
        descricao: '',
        quantidade: 1,
        valor_unitario: 0,
        tipo: 'ESTOQUE',
        fotoNota: ''
      }];
      copy[turnoIndexAtivo] = t;
      return copy;
    });
  };

  const handleAddPecaExterna = () => {
    setTurnos(prev => {
      const copy = [...prev];
      const t = { ...copy[turnoIndexAtivo] };
      t.pecasUtilizadas = [...(t.pecasUtilizadas || []), {
        codigo: 'EXTERNO',
        descricao: '',
        quantidade: 1,
        valor_unitario: '',
        tipo: 'EXTERNA',
        fotoNota: ''
      }];
      copy[turnoIndexAtivo] = t;
      return copy;
    });
  };

  const handlePecaChange = (pecaIdx, campo, valor) => {
    setTurnos(prev => {
      const copy = [...prev];
      const t = { ...copy[turnoIndexAtivo] };
      const pList = [...(t.pecasUtilizadas || [])];
      const itemAtual = { ...pList[pecaIdx], [campo]: valor };

      if (campo === 'descricao' && itemAtual.tipo !== 'EXTERNA') {
        const prod = (produtosEstoque || []).find(p => p.descricao === valor || p.codigo === valor);
        if (prod) {
          itemAtual.codigo = prod.codigo || '';
          itemAtual.descricao = prod.descricao || valor;
          itemAtual.valor_unitario = prod.valor_unitario || prod.preco_venda || prod.preco_unitario || 0;
          itemAtual.tipo = 'ESTOQUE';
        }
      }

      pList[pecaIdx] = itemAtual;
      t.pecasUtilizadas = pList;
      copy[turnoIndexAtivo] = t;
      return copy;
    });
  };

  const handleUploadFotoNota = (pecaIdx, e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new window.Image();
      img.src = ev.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 900;
        const MAX_HEIGHT = 900;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
        handlePecaChange(pecaIdx, 'fotoNota', dataUrl);
      };
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePeca = (pecaIdx) => {
    setTurnos(prev => {
      const copy = [...prev];
      const t = { ...copy[turnoIndexAtivo] };
      t.pecasUtilizadas = (t.pecasUtilizadas || []).filter((_, i) => i !== pecaIdx);
      copy[turnoIndexAtivo] = t;
      return copy;
    });
  };


  // Manipular Veículos de Deslocamento no Turno Ativo
  const handleAddVeiculo = () => {
    setTurnos(prev => {
      const copy = [...prev];
      const t = { ...copy[turnoIndexAtivo] };
      t.veiculosUtilizados = [...(t.veiculosUtilizados || []), { placa: '', kmInicial: '', kmFinal: '', km: '' }];
      copy[turnoIndexAtivo] = t;
      return copy;
    });
  };

  const handleVeiculoChange = (veicIdx, campo, valor) => {
    setTurnos(prev => {
      const copy = [...prev];
      const t = { ...copy[turnoIndexAtivo] };
      const vList = [...(t.veiculosUtilizados || [])];
      vList[veicIdx] = { ...vList[veicIdx], [campo]: valor };

      if (campo === 'placa') {
        const vEncontrado = veiculosConfig.find(vc => vc.placa === valor);
        if (vEncontrado) {
          const k1 = parseFloat(vEncontrado.kmAtual) || 0;
          const k2 = parseFloat(vEncontrado.kmTrocaOleo) || 0;
          const k3 = parseFloat(vEncontrado.kmRevisao) || 0;
          const kmSugerido = Math.max(k1, k2, k3);
          if (kmSugerido > 0) vList[veicIdx].kmInicial = kmSugerido;
        }
      }

      if (campo === 'kmInicial' || campo === 'kmFinal' || campo === 'placa') {
        const ini = parseFloat(vList[veicIdx].kmInicial) || 0;
        const fim = parseFloat(vList[veicIdx].kmFinal) || 0;
        vList[veicIdx].km = fim >= ini && ini > 0 ? (fim - ini).toFixed(1) : '';
      }

      t.veiculosUtilizados = vList;
      copy[turnoIndexAtivo] = t;
      return copy;
    });
  };

  const handleRemoveVeiculo = (veicIdx) => {
    setTurnos(prev => {
      const copy = [...prev];
      const t = { ...copy[turnoIndexAtivo] };
      t.veiculosUtilizados = (t.veiculosUtilizados || []).filter((_, i) => i !== veicIdx);
      copy[turnoIndexAtivo] = t;
      return copy;
    });
  };

  // Totais Gerais
  const totalHorasGeral = turnos.reduce((acc, t) => acc + parseFloat(calcularHorasTurno(t) || 0), 0);
  const totalItensPecasCount = turnos.reduce((acc, t) => acc + (t.pecasUtilizadas || []).length, 0);

  // Validação Sequencial e Rigorosa por Passo
  const validarPasso = (p) => {
    if (p === 1) {
      if (!executorPrincipal || !executorPrincipal.trim()) {
        alert('⚠️ Por favor, informe ou selecione o nome do Executor Responsável antes de avançar.');
        return false;
      }
    } else if (p === 2) {
      if (!turnoAtivo?.data) {
        alert('⚠️ Por favor, informe a data deste dia de trabalho.');
        return false;
      }
      const horasCalc = parseFloat(calcularHorasTurno(turnoAtivo) || 0);
      if (horasCalc <= 0) {
        alert('⚠️ Por favor, preencha os horários do turno deste dia (o total de horas calculadas deve ser maior que zero).');
        return false;
      }
    } else if (p === 3) {
      if (!turnoAtivo?.descricao || turnoAtivo.descricao.trim().length < 3) {
        alert('⚠️ Por favor, relate o que foi realizado na descrição do serviço deste dia.');
        return false;
      }
    } else if (p === 4) {
      const temMembroValido = (turnoAtivo?.maoDeObra || []).some(m => m.nome && m.nome.trim());
      if (!temMembroValido) {
        alert('⚠️ Por favor, informe pelo menos um membro na equipe de trabalho deste dia.');
        return false;
      }
    } else if (p === 5) {
      if (isOSDeVeiculo && (!kmManutencao || parseFloat(kmManutencao) <= 0)) {
        alert(`⚠️ Por favor, informe o ${labelMedicao} no atendimento do veículo/equipamento (${os.centroCusto || 'Alvo'}) para avançar.`);
        return false;
      }
      if (isOSDeVeiculo && kmManutencao && veiculoAlvo?.kmAtual) {
        const validacaoKm = validarAntiRetrocessoKM(kmManutencao, veiculoAlvo.kmAtual, unidadeMedicao);
        if (validacaoKm.retrocedeu) {
          const confirmar = window.confirm(
            `ℹ️ REGISTRO DE ODÔMETRO:\n\n` +
            `O valor informado (${formatarNumeroBR(kmManutencao)} ${unidadeMedicao}) é menor que o odômetro atual da frota (${formatarNumeroBR(veiculoAlvo.kmAtual)} ${unidadeMedicao}).\n\n` +
            `Se esta O.S. for referente a um serviço ou dia anterior, este valor será registrado com sucesso nesta O.S. sem alterar o KM atual do veículo no cadastro.\n\n` +
            `Deseja confirmar e prosseguir?`
          );
          if (!confirmar) return false;
        }
      }
      if (!turnoAtivo?.semPecas) {
        const pecasIncompletas = (turnoAtivo?.pecasUtilizadas || []).some(p => (!p.descricao && !p.codigo) || (parseFloat(p.quantidade) || 0) <= 0);
        if (pecasIncompletas) {
          alert('⚠️ Existem peças adicionadas sem descrição ou com quantidade zero. Por favor, preencha, remova a linha ou marque a opção de apenas mão de obra.');
          return false;
        }
      }
      if (!turnoAtivo?.semVeiculo) {
        const veicIncompletos = (turnoAtivo?.veiculosUtilizados || []).some(v => !v.placa || !v.placa.trim());
        if (veicIncompletos) {
          alert('⚠️ Existem veículos adicionados sem placa informada. Por favor, informe a placa, remova a linha ou marque a opção de não utilização de veículo.');
          return false;
        }
      }
    } else if (isAtrasada && p === 6) {
      if (!observacaoJustificativa || observacaoJustificativa.trim().length < 5) {
        alert(`⚠️ Esta Ordem de Serviço ultrapassou a data limite do prazo previsto (${formatarDataBR(os.prazo)}).\nPor favor, informe a Justificativa detalhada do atraso para poder avançar.`);
        return false;
      }
    }
    return true;
  };

  const handleAvancar = () => {
    if (!validarPasso(passoAtual)) return;
    const proximo = Math.min(passoResumoId, passoAtual + 1);
    setPassoAtual(proximo);
    setPassoMaximoAlcancado(prev => Math.max(prev, proximo));
  };

  const handleCliquePasso = (targetId) => {
    if (targetId === passoAtual) return;

    // Se o usuário quer voltar para um passo anterior, permite voltar livremente
    if (targetId < passoAtual) {
      setPassoAtual(targetId);
      return;
    }

    // Se o usuário quer ir para um passo à frente (mesmo que já tenha alcançado antes):
    // Obrigatoriamente valida todos os passos intermediários do dia atual!
    for (let p = passoAtual; p < targetId; p++) {
      if (!validarPasso(p)) {
        return; // Interrompe e exibe o alerta do passo pendente!
      }
    }

    setPassoAtual(targetId);
    setPassoMaximoAlcancado(prev => Math.max(prev, targetId));
  };

  const handleVoltar = () => {
    if (passoAtual === 2 && turnoIndexAtivo > 0) {
      // Se o usuário está no Passo 2 de um dia adicional (ex: Dia #2) e clica em Voltar, retorna ao resumo
      setTurnoIndexAtivo(turnoIndexAtivo - 1);
      setPassoAtual(passoResumoId);
      setPassoMaximoAlcancado(passoResumoId);
      return;
    }
    setPassoAtual(prev => Math.max(1, prev - 1));
  };

  // Salvar Apontamento
  const handleSalvar = async (concluir = false) => {
    setSalvando(true);
    try {
      const consumiveisConsolidados = [];
      const equipeConsolidada = [];

      const turnosTratados = turnos.map(t => {
        const horasCalculadas = calcularHorasTurno(t);
        const mTratada = (t.maoDeObra || []).map(m => ({
          ...m,
          horas: m.horas || horasCalculadas
        }));

        mTratada.forEach(m => {
          if (m.nome && !equipeConsolidada.find(x => x.nome === m.nome)) {
            equipeConsolidada.push(m);
          }
        });

        (t.pecasUtilizadas || []).forEach(p => {
          if (p.descricao || p.codigo) {
            const ext = consumiveisConsolidados.find(x => (p.codigo && x.codigo === p.codigo) || (p.descricao && x.descricao === p.descricao));
            if (ext) {
              ext.quantidade += parseFloat(p.quantidade) || 0;
              if (p.fotoNota && !ext.fotoNota) ext.fotoNota = p.fotoNota;
              if (p.valor_unitario && !ext.valor_unitario) ext.valor_unitario = parseFloat(p.valor_unitario);
            } else {
              consumiveisConsolidados.push({
                codigo: p.codigo || (p.tipo === 'EXTERNA' ? 'EXTERNO' : ''),
                descricao: p.descricao,
                quantidade: parseFloat(p.quantidade) || 0,
                valor_unitario: parseFloat(p.valor_unitario) || 0,
                tipo: p.tipo || (p.codigo === 'EXTERNO' ? 'EXTERNA' : 'ESTOQUE'),
                fotoNota: p.fotoNota || ''
              });
            }
          }
        });

        const temDoisPeriodos = Boolean(t.horaInicio2 || t.temSegundoPeriodo);
        const horaFim1Tratada = temDoisPeriodos ? (t.horaFim1 || '') : '';
        const horaInicio2Tratada = temDoisPeriodos ? (t.horaInicio2 || '') : '';
        const horaFimTratada = temDoisPeriodos ? (t.horaFim || '') : (t.horaFim || t.horaFim1 || '');

        return {
          ...t,
          horaInicio: t.horaInicio || '',
          horaFim1: horaFim1Tratada,
          horaInicio2: horaInicio2Tratada,
          horaFim: horaFimTratada,
          isSaved: true,
          maoDeObra: mTratada
        };
      });

      const payload = {
        ...os,
        origemApontamento: 'COLABORADOR',
        dataApontamentoColaborador: new Date().toISOString(),
        preenchidoNoTotem: true,
        passoApontamentoTotem: concluir ? 1 : passoAtual,
        executor: executorPrincipal,
        descricaoServico: descricaoGeral || (turnos[0]?.descricao || os.descricaoServico || ''),
        situacao: concluir ? CONCLUIDO : os.situacao,
        resultado: concluir ? 'EXECUTADA' : (os.resultado || 'EM ANDAMENTO'),
        dataFim: concluir ? new Date().toISOString().split('T')[0] : os.dataFim,
        horaFim: concluir ? new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : os.horaFim,
        servicosExecutados: turnosTratados,
        consumiveis: consumiveisConsolidados,
        maoDeObra: equipeConsolidada,
        descarteBorraLitros: trocouOleo && descarteBorra ? descarteBorra : null,
        observacao: isAtrasada ? observacaoJustificativa : (os.observacao || ''),
        dataJustificativa: isAtrasada ? dataJustificativa : (os.dataJustificativa || null),
        veiculos: isOSDeVeiculo && os.centroCusto ? [
          {
            placa: os.centroCusto,
            kmFinal: atualizarKm ? (kmManutencao || '') : '',
            trocouOleo: trocouOleo,
            fezRevisao: fezRevisao
          }
        ] : (os.veiculos || [])
      };

      const codigoOS = os.codigo || os.id;
      const res = await fetch(`/api/os/${encodeURIComponent(codigoOS)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error('Falha ao salvar apontamento da O.S.');
      }

      if (concluir) {
        if (onSucesso) onSucesso(true);
      } else {
        alert(`💾 Apontamento salvo com sucesso no Passo ${passoAtual}! Quando você reabrir, continuará exatamente deste ponto.`);
        if (onSucesso) onSucesso(false);
      }
      onClose();
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar apontamento: ' + err.message);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className={styles.painelOverlay}>
      <div className={styles.painelContainer}>

        {/* Cabeçalho */}
        <div className={styles.painelHeader}>
          <div className={styles.headerTitle}>
            <span>Ordem de Serviço #{os.codigo}</span>
            <span className={styles.badgeSetor} style={{ backgroundColor: 'var(--cor-destaque)', color: '#fff' }}>
              {os.setor || 'GERAL'}
            </span>
          </div>
          <button type="button" onClick={onClose} className={styles.btnFechar} title="Fechar">
            <X size={22} />
          </button>
        </div>

        {/* STEPPER / BARRA PASSO A PASSO DINÂMICA */}
        <div className={styles.stepperHeader}>
          {passosLista.map((passo) => {
            const Icone = passo.icone;
            const isCompleted = passoAtual > passo.id;
            const isActive = passoAtual === passo.id;
            const isClickable = passo.id <= passoMaximoAlcancado;
            return (
              <div
                key={passo.id}
                className={`${styles.stepperItem} ${isActive ? styles.active : ''} ${isCompleted ? styles.completed : ''} ${!isClickable ? styles.disabled : ''}`}
                onClick={() => handleCliquePasso(passo.id)}
                title={!isClickable ? 'Preencha os passos anteriores para desbloquear' : `Ir para o Passo ${passo.id}`}
              >
                <div className={styles.stepCircle}>
                  {isCompleted ? <Check size={16} /> : passo.id}
                </div>
                <div className={styles.stepLabel}>
                  <span className={styles.stepNumber}>Passo {passo.id}</span>
                  <span className={styles.stepTitle}>{passo.titulo}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Informações da O.S. (Banner Superior) */}
        <div style={{ padding: '12px 24px 0 24px' }}>
          <div className={styles.bannerOSInfo}>
            <div>Requisitante: <strong>{os.requisitante}</strong></div>
            <div>Alvo / C. Custo: <strong>{os.centroCusto}</strong></div>
            <div>Problema Inicial: <strong>{os.descricao}</strong></div>
          </div>
        </div>

        {/* SELETOR DE DIAS (Aparece se houver mais de 1 dia e nos passos de turno) */}
        {passoAtual >= 2 && passoAtual <= 5 && turnos.length > 1 && (
          <div style={{ padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div className={styles.diaSelectorRow}>
              <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--cor-texto-principal)' }}>
                Dias de Trabalho:
              </span>
              {turnos.map((t, idx) => (
                <button
                  key={t.id || idx}
                  type="button"
                  className={`${styles.diaBadgeBtn} ${turnoIndexAtivo === idx ? styles.active : ''}`}
                  onClick={() => setTurnoIndexAtivo(idx)}
                >
                  <Calendar size={14} />
                  Dia #{idx + 1} ({formatarDataBR(t.data)})
                </button>
              ))}
            </div>

            {turnoIndexAtivo > 0 && (
              <button
                type="button"
                onClick={() => handleCancelarDiaCriado(turnoIndexAtivo)}
                className={styles.btnCancelarDiaAdicional}
                title="Desistir deste dia adicional e voltar ao resumo da O.S."
                style={{ padding: '6px 12px', fontSize: '0.8rem' }}
              >
                <Trash2 size={14} />
                <span>Cancelar Dia #{turnoIndexAtivo + 1}</span>
              </button>
            )}
          </div>
        )}

        {/* CORPO DINÂMICO CONFORME O PASSO ATUAL */}
        <div className={styles.painelBody}>

          {/* ========================================================= */}
          {/* PASSO 1: IDENTIFICAÇÃO DO EXECUTOR                        */}
          {/* ========================================================= */}
          {passoAtual === 1 && (
            <div className={styles.secaoCartao}>
              <div className={styles.secaoTitulo}>
                <User size={20} color="var(--cor-destaque)" />
                Passo 1: Identificação do Executor Responsável
              </div>

              {/* Campo Principal: Executor */}
              <div className={styles.campoGrupo} style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '0.9rem', fontWeight: '800', color: 'var(--cor-texto-principal)' }}>
                  Nome do Executor (Quem realizou e está apontando o serviço) *
                </label>
                <input
                  type="text"
                  className={styles.inputField}
                  list="listaFuncionariosTotem"
                  placeholder="Selecione ou digite seu nome..."
                  value={executorPrincipal}
                  onChange={e => handleExecutorChange(e.target.value)}
                  style={{ fontSize: '1.05rem', padding: '14px 16px', fontWeight: '700' }}
                  autoFocus
                />
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* PASSO 2: HORÁRIOS DO TURNO (ESTILO APP MODERNO)           */}
          {/* ========================================================= */}
          {passoAtual === 2 && (
            <div className={styles.secaoCartao}>
              <div className={styles.secaoHeader}>
                <div className={styles.secaoTitulo}>
                  <Clock size={20} color="var(--cor-destaque)" />
                  Passo 2: Horários de Trabalho (Dia #{turnoIndexAtivo + 1})
                </div>
              </div>

              <div className={styles.appTurnoContainer}>
                <div className={styles.appTurnoHeader}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Calendar size={18} color="var(--cor-destaque)" />
                    <span style={{ fontWeight: '800', fontSize: '0.95rem', color: 'var(--cor-texto-principal)' }}>
                      Data do Turno #{turnoIndexAtivo + 1}:
                    </span>
                    <input
                      type="date"
                      className={styles.inputField}
                      style={{ width: 'auto', padding: '6px 12px', fontWeight: '700' }}
                      value={turnoAtivo?.data || ''}
                      onChange={e => handleTurnoChange('data', e.target.value)}
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div className={styles.displayHorasDigital}>
                      <Clock size={18} />
                      <span>{calcularHorasTurno(turnoAtivo)} horas calculadas</span>
                    </div>
                    {turnos.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleCancelarDiaCriado(turnoIndexAtivo)}
                        className={styles.btnCancelarDiaAdicional}
                        title="Desistir deste dia adicional e voltar ao resumo da O.S."
                      >
                        <Trash2 size={16} />
                        <span>Desistir / Cancelar Dia #{turnoIndexAtivo + 1}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Cards dos Períodos estilo App */}
                <div className={styles.periodosGridApp}>

                  {/* 1º Período */}
                  <div className={styles.periodoCardApp}>
                    <div className={styles.periodoHeaderApp}>
                      <div className={styles.periodoIconBox} style={{ background: 'rgba(249, 115, 22, 0.15)', color: '#f97316' }}>
                        <Sunrise size={18} />
                      </div>
                      <span>
                        {turnoAtivo?.horaInicio2 || turnoAtivo?.temSegundoPeriodo
                          ? '1º Período (Entrada & Almoço)'
                          : '1º Período (Entrada & Saída)'}
                      </span>
                    </div>

                    <div className={styles.horasCamposRowApp}>
                      <div className={styles.campoHoraApp}>
                        <label>Entrada</label>
                        <input
                          type="time"
                          className={styles.inputHoraApp}
                          value={turnoAtivo?.horaInicio || ''}
                          onChange={e => handleTurnoChange('horaInicio', e.target.value)}
                        />
                      </div>
                      <div className={styles.campoHoraApp}>
                        <label>
                          {turnoAtivo?.horaInicio2 || turnoAtivo?.temSegundoPeriodo ? 'Saída Almoço' : 'Saída'}
                        </label>
                        <input
                          type="time"
                          className={styles.inputHoraApp}
                          value={turnoAtivo?.horaFim1 || (!turnoAtivo?.horaInicio2 && !turnoAtivo?.temSegundoPeriodo ? turnoAtivo?.horaFim : '') || ''}
                          onChange={e => {
                            const val = e.target.value;
                            if (turnoAtivo?.horaInicio2 || turnoAtivo?.temSegundoPeriodo) {
                              handleTurnoChange('horaFim1', val);
                            } else {
                              handleTurnoChange('horaFim1', val);
                              handleTurnoChange('horaFim', val);
                            }
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* 2º Período (Aparece se estiver ativo) */}
                  {(turnoAtivo?.horaInicio2 || turnoAtivo?.temSegundoPeriodo) && (
                    <div className={styles.periodoCardApp}>
                      <div className={styles.periodoHeaderApp} style={{ justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div className={styles.periodoIconBox} style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
                            <Sunset size={18} />
                          </div>
                          <span>2º Período (Retorno & Final)</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            handleTurnoChange('horaInicio2', '');
                            handleTurnoChange('temSegundoPeriodo', false);
                          }}
                          className={styles.btnRemoverItem}
                          title="Remover 2º Período"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      <div className={styles.horasCamposRowApp}>
                        <div className={styles.campoHoraApp}>
                          <label>Retorno Almoço</label>
                          <input
                            type="time"
                            className={styles.inputHoraApp}
                            value={turnoAtivo?.horaInicio2 || ''}
                            onChange={e => handleTurnoChange('horaInicio2', e.target.value)}
                            autoFocus
                          />
                        </div>
                        <div className={styles.campoHoraApp}>
                          <label>Saída Final</label>
                          <input
                            type="time"
                            className={styles.inputHoraApp}
                            value={turnoAtivo?.horaFim || ''}
                            onChange={e => handleTurnoChange('horaFim', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                </div>

                {/* Botão de Adicionar 2º Período se não estiver ativo */}
                {(!turnoAtivo?.horaInicio2 && !turnoAtivo?.temSegundoPeriodo) && (
                  <button
                    type="button"
                    className={styles.btnAddSegundoPeriodo}
                    onClick={() => handleTurnoChange('temSegundoPeriodo', true)}
                  >
                    <Plus size={18} />
                    Adicionar 2º Período (Tarde / Retorno do Almoço)
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* PASSO 3: O QUE FOI REALIZADO (DESCRIÇÃO DO SERVIÇO)       */}
          {/* ========================================================= */}
          {passoAtual === 3 && (
            <div className={styles.secaoCartao}>
              <div className={styles.secaoTitulo}>
                <FileText size={20} color="var(--cor-destaque)" />
                Passo 3: Descrição do Serviço (Dia #{turnoIndexAtivo + 1})
              </div>

              {/* Banner Informativo com os Horários do Dia */}
              <div className={styles.bannerHorasDiaInfo}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Calendar size={16} color="var(--cor-destaque)" />
                  <span>Data: <strong>{formatarDataBR(turnoAtivo?.data)}</strong></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Clock size={16} color="var(--cor-destaque)" />
                  <span>
                    Horários: <strong>
                      {turnoAtivo?.horaInicio2 || turnoAtivo?.temSegundoPeriodo
                        ? `${turnoAtivo?.horaInicio || '--:--'} às ${turnoAtivo?.horaFim1 || '--:--'} | ${turnoAtivo?.horaInicio2 || '--:--'} às ${turnoAtivo?.horaFim || '--:--'}`
                        : `${turnoAtivo?.horaInicio || '--:--'} às ${turnoAtivo?.horaFim || turnoAtivo?.horaFim1 || '--:--'}`}
                    </strong>
                  </span>
                </div>
                <div className={styles.badgeHorasDestaque}>
                  <Clock size={16} />
                  <span>{calcularHorasTurno(turnoAtivo)} horas calculadas</span>
                </div>
              </div>

              <div className={styles.campoGrupo}>
                <label>O que foi realizado neste dia de trabalho? (Descrição detalhada) *</label>
                <textarea
                  className={styles.textareaField}
                  placeholder="Relate detalhadamente os procedimentos executados nesta data (ex: troca de correias, reparo na fiação, solda)..."
                  value={turnoAtivo?.descricao || ''}
                  onChange={e => handleTurnoChange('descricao', e.target.value)}
                  autoFocus
                />
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* PASSO 4: EQUIPE & AJUDANTES                               */}
          {/* ========================================================= */}
          {passoAtual === 4 && (
            <div className={styles.secaoCartao}>
              <div className={styles.secaoHeader}>
                <div className={styles.secaoTitulo}>
                  <Users size={20} color="var(--cor-destaque)" />
                  Passo 4: Equipe & Ajudantes (Dia #{turnoIndexAtivo + 1})
                </div>
                <button type="button" onClick={handleAddMembro} className={styles.btnAdicionarItem}>
                  <Plus size={14} /> Adicionar Membro
                </button>
              </div>

              {/* Banner Informativo com os Horários do Dia */}
              <div className={styles.bannerHorasDiaInfo}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Calendar size={16} color="var(--cor-destaque)" />
                  <span>Data: <strong>{formatarDataBR(turnoAtivo?.data)}</strong></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Clock size={16} color="var(--cor-destaque)" />
                  <span>
                    Horários: <strong>
                      {turnoAtivo?.horaInicio2 || turnoAtivo?.temSegundoPeriodo
                        ? `${turnoAtivo?.horaInicio || '--:--'} às ${turnoAtivo?.horaFim1 || '--:--'} | ${turnoAtivo?.horaInicio2 || '--:--'} às ${turnoAtivo?.horaFim || '--:--'}`
                        : `${turnoAtivo?.horaInicio || '--:--'} às ${turnoAtivo?.horaFim || turnoAtivo?.horaFim1 || '--:--'}`}
                    </strong>
                  </span>
                </div>
                <div className={styles.badgeHorasDestaque}>
                  <Clock size={16} />
                  <span>{calcularHorasTurno(turnoAtivo)} horas calculadas</span>
                </div>
              </div>

              <div className={styles.subTabelaContainer}>
                <table className={styles.subTabela}>
                  <thead>
                    <tr>
                      <th>Nome do Funcionário</th>
                      <th style={{ width: '150px' }}>Função</th>
                      <th style={{ width: '100px', textAlign: 'center' }}>Horas</th>
                      <th style={{ width: '45px', textAlign: 'center' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(turnoAtivo?.maoDeObra || []).map((m, mIdx) => (
                      <tr key={mIdx}>
                        <td>
                          <input
                            type="text"
                            className={styles.subTabelaInput}
                            list="listaFuncionariosTotem"
                            placeholder="Nome do membro..."
                            value={m.nome || ''}
                            onChange={e => handleMembroChange(mIdx, 'nome', e.target.value)}
                          />
                        </td>
                        <td>
                          <select
                            className={styles.subTabelaInput}
                            value={m.funcao || 'Ajudante'}
                            onChange={e => handleMembroChange(mIdx, 'funcao', e.target.value)}
                          >
                            <option value="Executor">Executor</option>
                            <option value="Ajudante">Ajudante</option>
                          </select>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <input
                            type="number"
                            step="0.1"
                            className={styles.subTabelaInput}
                            style={{ textAlign: 'center', fontWeight: '700' }}
                            placeholder="Horas"
                            value={m.horas !== undefined && m.horas !== '' ? m.horas : calcularHorasTurno(turnoAtivo)}
                            onChange={e => handleMembroChange(mIdx, 'horas', e.target.value)}
                          />
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button type="button" onClick={() => handleRemoveMembro(mIdx)} className={styles.btnRemoverItem} title="Remover membro">
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* PASSO 5: PEÇAS DA OMIE & VEÍCULOS DE APOIO                */}
          {/* ========================================================= */}
          {passoAtual === 5 && (
            <div className={styles.secaoCartao}>
              <div className={styles.secaoTitulo}>
                <Package size={20} color="var(--cor-destaque)" />
                Passo 5: Peças Utilizadas & Veículos (Dia #{turnoIndexAtivo + 1})
              </div>

              {/* Banner Informativo com os Horários do Dia */}
              <div className={styles.bannerHorasDiaInfo}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Calendar size={16} color="var(--cor-destaque)" />
                  <span>Data: <strong>{formatarDataBR(turnoAtivo?.data)}</strong></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Clock size={16} color="var(--cor-destaque)" />
                  <span>
                    Horários: <strong>
                      {turnoAtivo?.horaInicio2 || turnoAtivo?.temSegundoPeriodo
                        ? `${turnoAtivo?.horaInicio || '--:--'} às ${turnoAtivo?.horaFim1 || '--:--'} | ${turnoAtivo?.horaInicio2 || '--:--'} às ${turnoAtivo?.horaFim || '--:--'}`
                        : `${turnoAtivo?.horaInicio || '--:--'} às ${turnoAtivo?.horaFim || turnoAtivo?.horaFim1 || '--:--'}`}
                    </strong>
                  </span>
                </div>
                <div className={styles.badgeHorasDestaque}>
                  <Clock size={16} />
                  <span>{calcularHorasTurno(turnoAtivo)} horas calculadas</span>
                </div>
              </div>

              {/* ========================================================= */}
              {/* MANUTENÇÃO DO VEÍCULO / MÁQUINA / FROTA                   */}
              {/* ========================================================= */}
              {isOSDeVeiculo && (
                <div className={styles.cardVeiculoAtendido}>
                  <div className={styles.cardVeiculoAtendidoHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {isHorimetro ? <Wrench size={18} color="var(--cor-destaque)" /> : <Car size={18} color="var(--cor-destaque)" />}
                      <span>Manutenção do Equipamento / Frota ({os.centroCusto || 'Alvo'})</span>
                    </div>
                    {veiculoAlvo?.kmAtual && (
                      <span style={{ fontSize: '0.85rem', color: 'var(--cor-texto-secundario)', fontWeight: '600' }}>
                        📌 Último Registro da Frota: <strong style={{ color: 'var(--cor-texto-principal)' }}>{formatarOdometroDisplay(veiculoAlvo.kmAtual, unidadeMedicao)}</strong>
                      </span>
                    )}
                  </div>
                  <div className={styles.cardVeiculoAtendidoCorpo}>
                    {(() => {
                      const ultimoRegistro = veiculoAlvo?.kmAtual;
                      const validacaoKm = ultimoRegistro ? validarAntiRetrocessoKM(kmManutencao, ultimoRegistro, unidadeMedicao) : { valido: true, retrocedeu: false };

                      return (
                        <div style={{ flex: '1 1 100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div className={styles.campoGrupo} style={{ maxWidth: '380px', marginTop: '2px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                              <label style={{ fontSize: '0.88rem', fontWeight: '800', color: 'var(--cor-texto-principal)', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                                <RefreshCw size={15} color="var(--cor-destaque)" />
                                {labelMedicao} no Atendimento: <span style={{ color: 'var(--cor-erro, #ef4444)' }}>*</span>
                              </label>
                              {kmManutencao && (
                                <span style={{ fontSize: '0.85rem', fontWeight: '800', color: validacaoKm.retrocedeu ? 'var(--cor-erro, #ef4444)' : 'var(--cor-destaque)' }}>
                                  👀 {formatarOdometroDisplay(kmManutencao, unidadeMedicao)}
                                </span>
                              )}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <input
                                type="number"
                                step="0.1"
                                className={styles.inputField}
                                style={{ 
                                  fontWeight: '800', 
                                  fontSize: '1.05rem', 
                                  color: validacaoKm.retrocedeu ? 'var(--cor-erro, #ef4444)' : 'var(--cor-destaque)', 
                                  borderColor: validacaoKm.retrocedeu ? 'var(--cor-erro, #ef4444)' : undefined,
                                  minWidth: '160px' 
                                }}
                                placeholder={placeholderMedicao}
                                value={kmManutencao}
                                onChange={e => setKmManutencao(e.target.value)}
                                required
                              />
                              <span style={{ fontSize: '0.88rem', fontWeight: '700', color: 'var(--cor-texto-secundario)' }}>{unidadeMedicao}</span>
                            </div>
                            {validacaoKm.retrocedeu && (
                              <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--cor-erro, #ef4444)', borderRadius: '6px', padding: '6px 10px', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--cor-erro, #ef4444)', fontSize: '0.8rem', fontWeight: '700' }}>
                                <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                                <span>{validacaoKm.mensagem}</span>
                              </div>
                            )}
                            <span style={{ fontSize: '0.78rem', color: 'var(--cor-texto-secundario)', marginTop: validacaoKm.retrocedeu ? '4px' : '2px' }}>
                              Obrigatório para atualização automática do odômetro deste veículo/máquina.
                            </span>
                          </div>
                        </div>
                      );
                    })()}

                    <div className={styles.checkboxesVeiculoAtendido}>
                      <label className={`${styles.checkboxItemVeiculo} ${trocouOleo ? styles.checked : ''}`}>
                        <input
                          type="checkbox"
                          checked={trocouOleo}
                          onChange={e => {
                            const checked = e.target.checked;
                            if (checked && fezRevisao) setTipoManutencao('AMBOS');
                            else if (checked) setTipoManutencao('OLEO');
                            else if (fezRevisao) setTipoManutencao('REVISAO');
                            else setTipoManutencao('NAO');
                          }}
                        />
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <Droplet size={15} color="#3b82f6" />
                          Registrar Troca de Óleo para este veículo/equipamento
                        </span>
                      </label>

                      {trocouOleo && (
                        <div className={styles.campoGrupo} style={{ maxWidth: '340px', marginLeft: '12px', marginTop: '4px', marginBottom: '4px' }}>
                          <label style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--cor-texto-principal)', display: 'block', marginBottom: '4px' }}>
                            Descarte de Óleo Usado / Borra (Litros):
                          </label>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input
                              type="number"
                              step="0.5"
                              className={styles.inputField}
                              placeholder="Ex: 20 L"
                              value={descarteBorra}
                              onChange={e => setDescarteBorra(e.target.value)}
                            />
                            <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--cor-texto-secundario)' }}>Litros</span>
                          </div>
                        </div>
                      )}

                      <label className={`${styles.checkboxItemVeiculo} ${fezRevisao ? styles.checked : ''}`}>
                        <input
                          type="checkbox"
                          checked={fezRevisao}
                          onChange={e => {
                            const checked = e.target.checked;
                            if (checked && trocouOleo) setTipoManutencao('AMBOS');
                            else if (checked) setTipoManutencao('REVISAO');
                            else if (trocouOleo) setTipoManutencao('OLEO');
                            else setTipoManutencao('NAO');
                          }}
                        />
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <Wrench size={15} color="#f59e0b" />
                          Registrar Revisão Geral / Periódica
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* 1. SEÇÃO DE PEÇAS & INSUMOS */}
              <div style={{ marginBottom: '20px' }}>
                {/* Opção Checkbox: Não Usou Peças */}
                <label className={`${styles.checkboxOptionRow} ${turnoAtivo?.semPecas ? styles.checked : ''}`}>
                  <input
                    type="checkbox"
                    className={styles.customCheckboxInput}
                    checked={Boolean(turnoAtivo?.semPecas)}
                    onChange={e => {
                      const checked = e.target.checked;
                      handleTurnoChange('semPecas', checked);
                      if (checked) {
                        handleTurnoChange('pecasUtilizadas', []);
                      }
                    }}
                  />
                  <span>Serviço apenas com Mão de Obra (Não foram utilizadas peças/materiais neste dia)</span>
                </label>

                {turnoAtivo?.semPecas ? (
                  <div className={styles.avisoMaoDeObraPura}>
                    <CheckCircle size={16} />
                    <span>Confirmado: Este serviço foi realizado apenas com mão de obra, sem consumo de peças.</span>
                  </div>
                ) : (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                      <label style={{ fontSize: '0.88rem', fontWeight: '700' }}>Peças / Insumos Consumidos:</label>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button type="button" onClick={handleAddPeca} className={styles.btnAdicionarItem} title="Buscar peça no estoque da Omie">
                          <Package size={14} /> + Peça Estoque
                        </button>
                        <button type="button" onClick={handleAddPecaExterna} className={styles.btnAdicionarItemExterna} title="Inserir compra externa / local com foto da Nota Fiscal">
                          <Camera size={14} /> + Peça Externa / NF
                        </button>
                      </div>
                    </div>

                    <div className={styles.subTabelaContainer}>
                      <table className={styles.subTabela}>
                        <thead>
                          <tr>
                            <th style={{ width: '110px', textAlign: 'center' }}>Tipo</th>
                            <th>Descrição da Peça / Insumo</th>
                            <th style={{ width: '90px', textAlign: 'center' }}>Qtd</th>
                            <th style={{ width: '130px', textAlign: 'right' }}>Valor Un. (R$)</th>
                            <th style={{ width: '190px', textAlign: 'center' }}>Comprovante / NF</th>
                            <th style={{ width: '45px', textAlign: 'center' }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {(turnoAtivo?.pecasUtilizadas || []).length === 0 ? (
                            <tr>
                              <td colSpan={6} style={{ textAlign: 'center', color: 'var(--cor-texto-secundario)', padding: '16px' }}>
                                Nenhuma peça adicionada. Clique em "+ Peça Estoque", "+ Peça Externa / NF" ou marque a opção de mão de obra acima.
                              </td>
                            </tr>
                          ) : (
                            turnoAtivo.pecasUtilizadas.map((p, pIdx) => {
                              const isExterna = p.tipo === 'EXTERNA' || p.codigo === 'EXTERNO';

                              return (
                                <tr key={pIdx}>
                                  <td style={{ textAlign: 'center' }}>
                                    {isExterna ? (
                                      <span className={styles.badgeOrigemExterna}>
                                        <Camera size={11} /> Externa
                                      </span>
                                    ) : (
                                      <span className={styles.badgeOrigemEstoque}>
                                        <Package size={11} /> Estoque
                                      </span>
                                    )}
                                  </td>

                                  <td>
                                    {isExterna ? (
                                      <input
                                        type="text"
                                        className={styles.subTabelaInput}
                                        placeholder="Nome da peça comprada fora..."
                                        value={p.descricao || ''}
                                        onChange={e => handlePecaChange(pIdx, 'descricao', e.target.value)}
                                      />
                                    ) : (
                                      <input
                                        type="text"
                                        className={styles.subTabelaInput}
                                        list="listaProdutosTotem"
                                        placeholder="Buscar ou selecionar peça do estoque..."
                                        value={p.descricao || ''}
                                        onChange={e => handlePecaChange(pIdx, 'descricao', e.target.value)}
                                      />
                                    )}
                                  </td>

                                  <td style={{ textAlign: 'center' }}>
                                    <input
                                      type="number"
                                      min="0.01"
                                      step="any"
                                      className={styles.subTabelaInput}
                                      style={{ textAlign: 'center', fontWeight: '700' }}
                                      value={p.quantidade !== undefined && p.quantidade !== null ? p.quantidade : ''}
                                      onChange={e => handlePecaChange(pIdx, 'quantidade', e.target.value)}
                                      onWheel={e => e.target.blur()}
                                    />
                                  </td>

                                  <td style={{ textAlign: 'right' }}>
                                    {isExterna ? (
                                      <input
                                        type="number"
                                        min="0"
                                        step="any"
                                        placeholder="0,00"
                                        className={styles.subTabelaInput}
                                        style={{ textAlign: 'right', fontWeight: '700', color: 'var(--cor-destaque)' }}
                                        value={p.valor_unitario !== undefined && p.valor_unitario !== null ? p.valor_unitario : ''}
                                        onChange={e => handlePecaChange(pIdx, 'valor_unitario', e.target.value)}
                                        onWheel={e => e.target.blur()}
                                      />
                                    ) : (
                                      <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--cor-texto-secundario)', paddingRight: '6px' }}>
                                        {p.valor_unitario ? `R$ ${formatarNumeroBR(p.valor_unitario, 2)}` : '—'}
                                      </span>
                                    )}
                                  </td>

                                  <td style={{ textAlign: 'center' }}>
                                    {isExterna ? (
                                      p.fotoNota ? (
                                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                                          <img
                                            src={p.fotoNota}
                                            alt="NF"
                                            className={styles.miniaturaFotoNota}
                                            onClick={() => setFotoVisualizando(p.fotoNota)}
                                            title="Clique para ampliar"
                                            style={{ cursor: 'pointer' }}
                                          />
                                          <button
                                            type="button"
                                            className={styles.btnFotoNotaVer}
                                            onClick={() => setFotoVisualizando(p.fotoNota)}
                                          >
                                            <Eye size={12} /> Ver NF
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handlePecaChange(pIdx, 'fotoNota', '')}
                                            title="Remover Foto da NF"
                                            style={{ background: 'none', border: 'none', color: 'var(--cor-erro)', cursor: 'pointer', padding: '4px' }}
                                          >
                                            <Trash2 size={13} />
                                          </button>
                                        </div>
                                      ) : (
                                        <label className={styles.btnFotoNotaAnexo}>
                                          <Camera size={13} /> Anexar NF/Cupom
                                          <input
                                            type="file"
                                            accept="image/*"
                                            capture="environment"
                                            style={{ display: 'none' }}
                                            onChange={e => handleUploadFotoNota(pIdx, e)}
                                          />
                                        </label>
                                      )
                                    ) : (
                                      <span style={{ fontSize: '0.78rem', color: 'var(--cor-texto-secundario)', fontStyle: 'italic' }}>
                                        Almoxarifado
                                      </span>
                                    )}
                                  </td>

                                  <td style={{ textAlign: 'center' }}>
                                    <button type="button" onClick={() => handleRemovePeca(pIdx)} className={styles.btnRemoverItem} title="Remover item">
                                      <Trash2 size={15} />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* 2. SEÇÃO DE VEÍCULOS DE APOIO */}
              <div style={{ marginTop: '16px' }}>
                {/* Opção Checkbox: Não Usou Veículo */}
                <label className={`${styles.checkboxOptionRow} ${turnoAtivo?.semVeiculo ? styles.checked : ''}`}>
                  <input
                    type="checkbox"
                    className={styles.customCheckboxInput}
                    checked={Boolean(turnoAtivo?.semVeiculo)}
                    onChange={e => {
                      const checked = e.target.checked;
                      handleTurnoChange('semVeiculo', checked);
                      if (checked) {
                        handleTurnoChange('veiculosUtilizados', []);
                      }
                    }}
                  />
                  <span>Não utilizei veículo de deslocamento da frota neste dia</span>
                </label>

                {turnoAtivo?.semVeiculo ? (
                  <div className={styles.avisoMaoDeObraPura}>
                    <CheckCircle size={16} />
                    <span>Confirmado: Nenhum veículo de deslocamento utilizado neste dia.</span>
                  </div>
                ) : (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <label style={{ fontSize: '0.88rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Car size={16} color="var(--cor-destaque)" />
                        Veículo de Deslocamento (Frota da Empresa):
                      </label>
                      <button type="button" onClick={handleAddVeiculo} className={styles.btnAdicionarItem}>
                        <Plus size={14} /> Adicionar Veículo
                      </button>
                    </div>

                    <div className={styles.subTabelaContainer}>
                      <table className={styles.subTabela}>
                        <thead>
                          <tr>
                            <th>Placa do Veículo</th>
                            <th style={{ width: '130px', textAlign: 'center' }}>KM Inicial</th>
                            <th style={{ width: '130px', textAlign: 'center' }}>KM Final</th>
                            <th style={{ width: '110px', textAlign: 'center' }}>KM Rodado</th>
                            <th style={{ width: '45px', textAlign: 'center' }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {(turnoAtivo?.veiculosUtilizados || []).length === 0 ? (
                            <tr>
                              <td colSpan={5} style={{ textAlign: 'center', color: 'var(--cor-texto-secundario)', padding: '16px' }}>
                                Nenhum veículo de apoio adicionado. Clique em "+ Adicionar Veículo" ou confirme na opção acima.
                              </td>
                            </tr>
                          ) : (
                            turnoAtivo.veiculosUtilizados.map((v, vIdx) => (
                              <tr key={vIdx}>
                                <td>
                                  <input
                                    type="text"
                                    className={styles.subTabelaInput}
                                    list="listaVeiculosTotem"
                                    placeholder="Selecione a placa..."
                                    value={v.placa || ''}
                                    onChange={e => handleVeiculoChange(vIdx, 'placa', e.target.value)}
                                  />
                                </td>
                                  <td style={{ textAlign: 'center' }}>
                                    <input
                                      type="number"
                                      step="0.1"
                                      className={styles.subTabelaInput}
                                      placeholder="KM Inicial"
                                      value={v.kmInicial || ''}
                                      onChange={e => handleVeiculoChange(vIdx, 'kmInicial', e.target.value)}
                                      title="KM Inicial do veículo (editável para O.S. antigas)"
                                      style={{ textAlign: 'center', fontWeight: '700' }}
                                    />
                                  </td>
                                <td style={{ textAlign: 'center' }}>
                                  <input
                                    type="number"
                                    step="0.1"
                                    className={styles.subTabelaInput}
                                    placeholder="KM Final"
                                    value={v.kmFinal || ''}
                                    onChange={e => handleVeiculoChange(vIdx, 'kmFinal', e.target.value)}
                                    style={{ textAlign: 'center', fontWeight: '700' }}
                                  />
                                </td>
                                <td style={{ textAlign: 'center', fontWeight: '800', color: 'var(--cor-destaque)' }}>
                                  {v.km ? `${v.km} km` : '-'}
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  <button type="button" onClick={() => handleRemoveVeiculo(vIdx)} className={styles.btnRemoverItem} title="Remover veículo">
                                    <Trash2 size={15} />
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* ========================================================= */}
          {/* PASSO DE JUSTIFICATIVA DE ATRASO (SE ATRASADA)            */}
          {/* ========================================================= */}
          {isAtrasada && passoAtual === passoJustificativaId && (
            <div className={styles.secaoCartao}>
              <div className={styles.secaoTitulo}>
                <AlertCircle size={20} color="var(--cor-erro, #ef4444)" />
                Passo {passoJustificativaId}: Justificativa de Atraso da Ordem de Serviço
              </div>

              <div className={styles.cardJustificativaAtraso}>
                <div className={styles.bannerAtrasoInfo}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Calendar size={16} color="var(--cor-destaque)" />
                    <span>Prazo Previsto: <strong>{formatarDataBR(os.prazo)}</strong></span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Clock size={16} color="var(--cor-destaque)" />
                    <span>Data do Apontamento: <strong>{formatarDataBR(dataComparacaoAtraso)}</strong></span>
                  </div>
                  <div className={styles.badgeAtrasoAlerta}>
                    <AlertCircle size={14} />
                    <span>O.S. Ultrapassou o Prazo</span>
                  </div>
                </div>

                <div className={styles.campoGrupo}>
                  <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--cor-texto-principal)' }}>
                    Data da Ocorrência / Justificativa *
                  </label>
                  <input
                    type="date"
                    className={styles.inputField}
                    style={{ width: 'auto', padding: '8px 14px' }}
                    value={dataJustificativa}
                    onChange={e => setDataJustificativa(e.target.value)}
                  />
                </div>

                <div className={styles.campoGrupo}>
                  <label style={{ fontSize: '0.88rem', fontWeight: '800', color: 'var(--cor-texto-principal)' }}>
                    Motivo do Atraso da O.S. (Descreva o que motivou a prorrogação) *
                  </label>
                  <textarea
                    className={styles.textareaField}
                    rows={4}
                    placeholder="Explique o motivo do atraso desta ordem de serviço (ex: aguardando peças de reposição da fábrica, equipamento em uso prioritário na granja, atraso na liberação da área)..."
                    value={observacaoJustificativa}
                    onChange={e => setObservacaoJustificativa(e.target.value)}
                    autoFocus
                  />
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* PASSO FINAL: RESUMO & CONFERÊNCIA GERAL / MULTI-DIAS      */}
          {/* ========================================================= */}
          {passoAtual === passoResumoId && (
            <div className={styles.secaoCartao}>
              <div className={styles.secaoTitulo}>
                <CheckCircle size={20} color="var(--cor-sucesso)" />
                Passo {passoResumoId}: Resumo dos {turnos.length} {turnos.length === 1 ? 'Dia Apontado' : 'Dias Apontados'}
              </div>

              <div className={styles.cardResumo}>
                <div className={styles.resumoItem}>
                  <span>Executor Responsável:</span>
                  <strong>{executorPrincipal || 'Não informado'}</strong>
                </div>
                <div className={styles.resumoItem}>
                  <span>Total Geral de Horas Trabalhadas:</span>
                  <strong style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={16} color="var(--cor-sucesso)" />
                    {totalHorasGeral.toFixed(1)} horas ({turnos.length} turnos)
                  </strong>
                </div>
                <div className={styles.resumoItem}>
                  <span>Total Geral de Peças Consumidas:</span>
                  <strong>{totalItensPecasCount} itens apontados</strong>
                </div>
                {isOSDeVeiculo && (
                  <>
                    <div className={styles.resumoItem}>
                      <span>{labelMedicao} ({os.centroCusto}):</span>
                      <strong style={{ color: 'var(--cor-destaque)' }}>
                        {atualizarKm && kmManutencao ? `${kmManutencao} ${unidadeMedicao}` : (atualizarKm ? 'Não informado' : 'Não atualizado')}
                      </strong>
                    </div>
                    {(trocouOleo || fezRevisao) && (
                      <div className={styles.resumoItem}>
                        <span>Manutenções Especiais Registradas:</span>
                        <strong>
                          {[
                            trocouOleo && (descarteBorra ? `Óleo Trocado (${descarteBorra} L)` : 'Óleo Trocado'),
                            fezRevisao && 'Revisão Feita'
                          ].filter(Boolean).join(' | ')}
                        </strong>
                      </div>
                    )}
                  </>
                )}
                {isAtrasada && (
                  <div className={styles.resumoItem} style={{ borderTop: '1px dashed var(--cor-borda-cartao)', paddingTop: '8px', marginTop: '6px' }}>
                    <span style={{ color: 'var(--cor-erro, #ef4444)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <AlertCircle size={14} />
                      Justificativa de Atraso Registrada:
                    </span>
                    <strong style={{ color: 'var(--cor-texto-principal)', fontStyle: 'italic' }}>
                      "{observacaoJustificativa || 'Não informada'}" ({formatarDataBR(dataJustificativa)})
                    </strong>
                  </div>
                )}
              </div>

              {/* Lista Detalhada de Cada Dia Apontado com Ícones Lucide-React */}
              <div style={{ marginTop: '10px' }}>
                <strong style={{ fontSize: '0.9rem', color: 'var(--cor-texto-principal)', display: 'block', marginBottom: '8px' }}>
                  Detalhamento por Dia:
                </strong>
                {turnos.map((t, idx) => (
                  <div key={t.id || idx} className={styles.cardDiaResumo}>
                    <div className={styles.cardDiaResumoHeader}>
                      <span style={{ fontWeight: '800', color: 'var(--cor-destaque)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Calendar size={16} />
                        Dia #{idx + 1} - {formatarDataBR(t.data)}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className={styles.horasBadge} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <Clock size={15} />
                          {calcularHorasTurno(t)} horas
                        </span>
                        <button
                          type="button"
                          className={styles.btnEditarDiaCard}
                          onClick={() => setDiaEditandoModal({ index: idx, turno: JSON.parse(JSON.stringify(t)) })}
                          title="Editar todos os dados deste dia (horários, descrição, equipe e peças)"
                        >
                          <Pencil size={13} />
                          <span>Editar Dia</span>
                        </button>
                        {turnos.length > 1 && (
                          <button
                            type="button"
                            className={styles.btnExcluirDiaCard}
                            onClick={() => handleRemoverDiaPasso6(idx)}
                            title="Excluir este dia de trabalho"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--cor-texto-secundario)', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                      <FileText size={15} style={{ marginTop: '2px', flexShrink: 0 }} />
                      <span><strong>Serviço:</strong> {t.descricao || 'Sem descrição'}</span>
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--cor-texto-secundario)', display: 'flex', flexWrap: 'wrap', gap: '16px', marginTop: '2px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Users size={14} color="var(--cor-destaque)" />
                        Equipe: {(t.maoDeObra || []).length} membro(s)
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Package size={14} color="var(--cor-destaque)" />
                        Peças: {(t.pecasUtilizadas || []).length} item(ns)
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Car size={14} color="var(--cor-destaque)" />
                        Veículos: {(t.veiculosUtilizados || []).length}
                      </span>
                    </div>

                    {/* Lista das Peças do Dia com Miniatura e Botão de Ver NF */}
                    {t.pecasUtilizadas && t.pecasUtilizadas.length > 0 && (
                      <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed var(--cor-borda-cartao)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--cor-texto-principal)' }}>
                          Peças / Insumos Consumidos:
                        </span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {t.pecasUtilizadas.map((p, pIdx) => {
                            const isExterna = p.tipo === 'EXTERNA' || p.codigo === 'EXTERNO';
                            return (
                              <div
                                key={pIdx}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  backgroundColor: 'var(--cor-fundo-secundario)',
                                  border: '1px solid var(--cor-borda-cartao)',
                                  padding: '4px 8px',
                                  borderRadius: '8px',
                                  fontSize: '0.78rem'
                                }}
                              >
                                {isExterna ? (
                                  <span className={styles.badgeOrigemExterna} style={{ fontSize: '0.62rem', padding: '1px 4px' }}>
                                    <Camera size={10} /> Externa
                                  </span>
                                ) : (
                                  <span className={styles.badgeOrigemEstoque} style={{ fontSize: '0.62rem', padding: '1px 4px' }}>
                                    <Package size={10} /> Estoque
                                  </span>
                                )}
                                <span>{p.quantidade}x <strong>{p.descricao || p.codigo}</strong></span>
                                {isExterna && p.valor_unitario && parseFloat(p.valor_unitario) > 0 && (
                                  <span style={{ color: 'var(--cor-destaque)', fontWeight: '700' }}>
                                    R$ {(Number(p.valor_unitario) * Number(p.quantidade || 1)).toFixed(2)}
                                  </span>
                                )}
                                {p.fotoNota && (
                                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginLeft: '4px' }}>
                                    <img
                                      src={p.fotoNota}
                                      alt="NF"
                                      className={styles.miniaturaFotoNota}
                                      style={{ width: '22px', height: '22px', cursor: 'pointer' }}
                                      onClick={() => setFotoVisualizando(p.fotoNota)}
                                      title="Clique para ampliar Nota Fiscal"
                                    />
                                    <button
                                      type="button"
                                      className={styles.btnFotoNotaVer}
                                      style={{ padding: '2px 6px', fontSize: '0.7rem' }}
                                      onClick={() => setFotoVisualizando(p.fotoNota)}
                                    >
                                      <Eye size={10} /> Ver NF
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Botão de Adicionar Mais um Dia */}
              <button
                type="button"
                className={styles.botaoAddNovoDia}
                onClick={handleRegistrarMaisUmDia}
              >
                <Plus size={18} />
                Registrar Mais um Dia de Trabalho para esta O.S.
              </button>

            </div>
          )}

        </div>

        {/* ========================================================= */}
        {/* RODAPÉ COM NAVEGAÇÃO PASSO A PASSO                        */}
        {/* ========================================================= */}
        <div className={styles.painelFooter}>
          {passoAtual > 1 ? (
            <button type="button" className={styles.btnVoltar} onClick={handleVoltar}>
              <ChevronLeft size={18} />
              Voltar Passo
            </button>
          ) : (
            <div />
          )}

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="button"
              className={styles.btnSalvarParcial}
              disabled={salvando}
              onClick={() => handleSalvar(false)}
            >
              <Save size={18} />
              Salvar Parcial
            </button>

            {passoAtual < passoResumoId ? (
              <button type="button" className={styles.btnAvancar} onClick={handleAvancar}>
                Avançar Passo
                <ChevronRight size={18} />
              </button>
            ) : (
              <button
                type="button"
                className={styles.btnConcluirOS}
                disabled={salvando || animandoConferencia}
                onClick={() => {
                  if (!validarPasso(passoAtual)) return;
                  setAnimandoConferencia(true);
                }}
              >
                <CheckCircle size={20} />
                Concluir e Finalizar O.S.
              </button>
            )}
          </div>
        </div>

        {/* OVERLAY DE AUDITORIA & PRÉ-CONFERÊNCIA (15 SEGUNDOS) */}
        {animandoConferencia && (
          <div className={styles.overlayAuditoria}>
            <div className={styles.cardAuditoria}>
              <div className={styles.scannerScene}>
                <div className={styles.auditOrbit1} />
                <div className={styles.auditOrbit2} />
                <div className={styles.auditCore}>
                  <ShieldCheck size={38} />
                </div>
                <div className={styles.satelliteAudit1}>
                  <Zap size={20} />
                </div>
                <div className={styles.satelliteAudit2}>
                  <Sparkles size={22} />
                </div>
              </div>

              <div className={styles.auditBadgeLive}>
                <span className={styles.liveDot} />
                <span>
                  {auditPhase === 0 && '🔍 Auditoria de Apontamento da O.S.'}
                  {auditPhase === 1 && '⚠️ Atenção: Verifique o preenchimento da Ordem de Serviço'}
                  {auditPhase === 2 && '⚠️ Atenção: Está tudo correto para confirmar?'}
                  {auditPhase === 3 && '⚠️ Atenção: Obrigado pela atenção!'}
                </span>
              </div>

              <h3 className={styles.auditTitle}>
                {auditPhase === 0 && 'Verificando se o Preenchimento da O.S. está Correto...'}
                {auditPhase === 1 && 'Checando Peças do Estoque e Notas Fiscais...'}
                {auditPhase === 2 && 'Validando KM/Horímetro e Serviços Executados...'}
                {auditPhase === 3 && 'Gerando Relatório de Conferência da O.S...'}
              </h3>

              <p className={styles.auditSubtitle}>
                {auditPhase === 0 && 'Analisando horários apontados, executor responsável e membros da equipe informados.'}
                {auditPhase === 1 && 'Verifique se todas as peças do estoque e notas fiscais de compras externas foram lançadas corretamente.'}
                {auditPhase === 2 && 'Confira a quilometragem atual do veículo, descarte de óleo e manutenções complementares.'}
                {auditPhase === 3 && 'Apresentando o espelho de conferência final antes do encerramento definitivo desta O.S.'}
              </p>

              <div className={styles.auditProgressTrack}>
                <div className={styles.auditProgressBar15s} />
              </div>

              <button
                type="button"
                className={styles.btnPularAuditoria}
                onClick={() => {
                  setAnimandoConferencia(false);
                  setModalConferenciaAberto(true);
                }}
              >
                <span>Avançar para o Espelho Agora</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* DATALISTS GLOBAIS DE AUTOCOMPLETE */}
        <datalist id="listaFuncionariosTotem">
          {listaFuncionariosTratada.map((nome, i) => (
            <option key={i} value={nome} />
          ))}
        </datalist>

        <datalist id="listaProdutosTotem">
          {(produtosEstoque || []).map((pr, i) => (
            <option key={i} value={pr.descricao}>
              {pr.codigo}
            </option>
          ))}
        </datalist>

        <datalist id="listaVeiculosTotem">
          {(veiculosConfig || []).map((vc, i) => (
            <option key={i} value={vc.placa}>
              {vc.placa} - {vc.modelo || vc.marca || 'Frota'}
            </option>
          ))}
        </datalist>

        {/* MODAL DE CONFERÊNCIA FINAL / ESPELHO DA O.S. ANTES DE CONCLUIR */}
        {modalConferenciaAberto && (
          <ModalConferenciaOS
            os={os}
            executorPrincipal={executorPrincipal}
            turnos={turnos}
            totalHorasGeral={totalHorasGeral}
            isOSDeVeiculo={isOSDeVeiculo}
            labelMedicao={labelMedicao}
            kmManutencao={kmManutencao}
            unidadeMedicao={unidadeMedicao}
            trocouOleo={trocouOleo}
            descarteBorra={descarteBorra}
            fezRevisao={fezRevisao}
            isAtrasada={isAtrasada}
            observacaoJustificativa={observacaoJustificativa}
            dataJustificativa={dataJustificativa}
            calcularHorasTurno={calcularHorasTurno}
            formatarDataBR={formatarDataBR}
            onConfirmar={() => {
              handleSalvar(true);
            }}
            onVoltarParaEditar={() => setModalConferenciaAberto(false)}
            onEditarDia={(idx, t) => {
              setModalConferenciaAberto(false);
              setEditandoVindoDaConferencia(true);
              setDiaEditandoModal({ index: idx, turno: JSON.parse(JSON.stringify(t)) });
            }}
            onVerFotoNota={(foto) => setFotoVisualizando(foto)}
            salvando={salvando}
          />
        )}

        {/* MODAL DE EDIÇÃO RÁPIDA DE UM DIA ESPECÍFICO NO PASSO 6 */}
        {diaEditandoModal && (
          <ModalEdicaoDiaTotem
            diaIndex={diaEditandoModal.index}
            turnoInicial={diaEditandoModal.turno}
            onSalvar={handleSalvarEdicaoDiaModal}
            onClose={() => setDiaEditandoModal(null)}
            produtosEstoque={produtosEstoque}
            fornecedores={fornecedores}
            veiculosConfig={veiculosConfig}
            calcularHorasTurno={calcularHorasTurno}
          />
        )}

        {/* MODAL DE VISUALIZAÇÃO DE FOTO DA NOTA FISCAL */}
        {fotoVisualizando && (
          <div className={styles.modalFotoBackdrop} onClick={() => setFotoVisualizando(null)}>
            <div className={styles.modalFotoCard} onClick={e => e.stopPropagation()}>
              <div className={styles.modalFotoHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, fontSize: '1.05rem', color: 'var(--cor-texto-principal)' }}>
                  <Camera size={20} color="var(--cor-destaque)" />
                  <span>Comprovante / Nota Fiscal Anexada</span>
                </div>
                <button type="button" onClick={() => setFotoVisualizando(null)} className={styles.btnFechar}>
                  <X size={22} />
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
  );
};

export default PainelApontamentoOS;
