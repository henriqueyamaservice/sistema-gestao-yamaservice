import React, { useState, useEffect, useRef } from 'react';
import { Calendar, User, FileText, Wrench, AlertCircle, Trash2, Plus, CheckCircle, Package, UserPlus, Car, Save, X, ChevronLeft, RefreshCw, Info, AlertTriangle, Pencil, ShieldCheck } from 'lucide-react';
import styles from './FormularioServicoTecnico.module.css';
import { CONCLUIDO, EM_ANDAMENTO, AGUARDANDO_INSUMO, CANCELADO } from '../../../../utils/osStatus';
import { formatarOdometroDisplay, formatarNumeroBR, validarAntiRetrocessoKM } from '../../../../utils/formatadorOdometro';

const FormularioServicoTecnico = ({ os, produtosEstoque, fornecedores, veiculosConfig, onClose, onSave, onRequestMoreParts }) => {
  const [dataInicio, setDataInicio] = useState(os.dataInicio || new Date().toISOString().split('T')[0]);
  const [horaInicio, setHoraInicio] = useState(os.horaInicio || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
  const [dataFim, setDataFim] = useState(os.dataFim || '');
  const [horaFim, setHoraFim] = useState(os.horaFim || '');

  const [servicosExecutados, setServicosExecutados] = useState(() => {
    let baseServicos = os.servicosExecutados ? JSON.parse(JSON.stringify(os.servicosExecutados)) : [];

    // Migração Legada: Se a OS tiver maoDeObra solta, joga pro primeiro apontamento
    if (os.maoDeObra && os.maoDeObra.length > 0 && baseServicos.length > 0) {
      if (!baseServicos[0].maoDeObra || baseServicos[0].maoDeObra.length === 0) {
        baseServicos[0].maoDeObra = [...os.maoDeObra];
      }
    }

    // Se baseServicos estiver totalmente vazio ao abrir o formulário, auto-cria 1º turno com o Técnico Executor Principal preenchido!
    if (baseServicos.length === 0) {
      const funcResp = fornecedores?.find(f => (f.razao_social && f.razao_social === (os.tecnicoResponsavel || os.executor)) || (f.nome_fantasia && f.nome_fantasia === (os.tecnicoResponsavel || os.executor)));
      const matriculaResp = funcResp ? (funcResp.cnpj_cpf || String(funcResp.codigo_cliente_omie)) : '';
      let pecasIniciais = [];
      if (os.pecasSolicitadas && os.pecasSolicitadas.length > 0) {
        pecasIniciais = os.pecasSolicitadas.map(p => ({
          codigo: p.codigo,
          descricao: p.descricao,
          quantidade: p.quantidade
        }));
      }

      baseServicos.push({
        data: new Date().toISOString().split('T')[0],
        horaInicio: '',
        horaFim1: '',
        horaInicio2: '',
        horaFim: '',
        descricao: '',
        isSaved: false,
        maoDeObra: [
          { matricula: matriculaResp, nome: os.tecnicoResponsavel || os.executor || '', funcao: 'Executor', horas: '' }
        ],
        pecasUtilizadas: pecasIniciais,
        veiculosUtilizados: []
      });
    }

    return baseServicos.map(s => {
      let mList = s.maoDeObra ? [...s.maoDeObra] : [];
      if (mList.length === 0) {
        const funcResp = fornecedores?.find(f => (f.razao_social && f.razao_social === (os.tecnicoResponsavel || os.executor)) || (f.nome_fantasia && f.nome_fantasia === (os.tecnicoResponsavel || os.executor)));
        const matriculaResp = funcResp ? (funcResp.cnpj_cpf || String(funcResp.codigo_cliente_omie)) : '';
        mList = [{ matricula: matriculaResp, nome: os.tecnicoResponsavel || os.executor || '', funcao: 'Executor', horas: '' }];
      }
      return {
        ...s,
        maoDeObra: mList,
        pecasUtilizadas: s.pecasUtilizadas || [],
        veiculosUtilizados: s.veiculosUtilizados || [],
        horaInicio: s.horaInicio || s.hora || '',
        horaFim: s.horaFim || '',
        isSaved: s.isSaved !== undefined ? s.isSaved : false
      };
    });
  });

  const [motivo, setMotivo] = useState(os.motivo || '');
  const [resultado, setResultado] = useState(os.resultado || 'EXECUTADA');

  const isAtrasado = os.prazo && new Date().toISOString().split('T')[0] > os.prazo;
  const [mostrarJustificativa, setMostrarJustificativa] = useState(isAtrasado || !!os.observacao);
  const [dataJustificativa, setDataJustificativa] = useState(os.dataJustificativa || new Date().toISOString().split('T')[0]);
  const [observacao, setObservacao] = useState(os.observacao || '');

  const [cabecalhoData, setCabecalhoData] = useState({
    requisitante: os.requisitante || '',
    setor: os.setor || '',
    centroCusto: os.centroCusto || '',
    prazo: os.prazo || '',
    complexidade: os.complexidade || 'NORMAL',
    descricaoProblema: os.descricaoProblema || os.descricao || '',
  });

  const [isEditandoCabecalho, setIsEditandoCabecalho] = useState(false);
  const [modalEdicaoAberta, setModalEdicaoAberta] = useState(false);
  const [nomeEditor, setNomeEditor] = useState('');
  const [motivoEdicao, setMotivoEdicao] = useState('');

  // Detecção de Manutenção de Veículo da Frota
  const isSetorMecanica = (os.setor || '').toUpperCase().includes('MECANICA') || (os.setor || '').toUpperCase().includes('LOGISTICA');
  const veiculoConfigAlvo = (veiculosConfig || []).find(v => (v.placa || '').trim().toUpperCase() === (os.centroCusto || '').trim().toUpperCase());
  const isPlacaVeiculo = os.centroCusto && (
    /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/i.test(os.centroCusto.trim()) ||
    Boolean(veiculoConfigAlvo)
  );
  const isGeradorOS = os.centroCusto && (
    os.centroCusto.toUpperCase().includes('GERADOR') || 
    os.centroCusto.toUpperCase().includes('GRANJA') || 
    os.centroCusto.toUpperCase().startsWith('G. ')
  );
  const isVeiculo = Boolean(veiculoConfigAlvo || isGeradorOS || isPlacaVeiculo);

  const veiculoRelacionado = os.veiculos?.find(v => v.placa === os.centroCusto);
  const isHorimetro = (veiculoConfigAlvo && (veiculoConfigAlvo.tipoMedicao === 'Horas' || veiculoConfigAlvo.tipoMedicao === 'HORAS')) || !!isGeradorOS;
  const unidadeMedicao = isHorimetro ? 'Horas' : 'km';
  const labelMedicao = isHorimetro ? 'Horímetro Atual' : 'Odômetro / KM Atual';
  const placeholderMedicao = isHorimetro ? 'Ex: 1250' : 'Ex: 45200';

  const [atualizarKm, setAtualizarKm] = useState(true);
  const [kmManutencao, setKmManutencao] = useState(veiculoRelacionado ? (veiculoRelacionado.kmFinal || veiculoRelacionado.kmInicial || '') : '');

  const kmInicializadoRef = useRef(false);

  // Carregar KM atual da frota se não informado na OS apenas na inicialização
  useEffect(() => {
    if (!kmInicializadoRef.current && isVeiculo && veiculosConfig && veiculosConfig.length > 0 && os.centroCusto) {
      const vc = veiculosConfig.find(v => (v.placa || '').trim().toUpperCase() === os.centroCusto.trim().toUpperCase());
      if (vc && !kmManutencao) {
        const k = Math.max(parseFloat(vc.kmAtual) || 0, parseFloat(vc.kmTrocaOleo) || 0, parseFloat(vc.kmRevisao) || 0);
        if (k > 0) setKmManutencao(k.toString());
        kmInicializadoRef.current = true;
      }
    }
  }, [veiculosConfig, os.centroCusto, isVeiculo]);

  // Sincronização Automática das Datas/Horas a partir do Diário de Bordo
  useEffect(() => {
    if (servicosExecutados && servicosExecutados.length > 0) {
      const servicosValidos = servicosExecutados.filter(s => s.data);
      if (servicosValidos.length > 0) {
        const primeiroTurno = servicosValidos[0];
        const ultimoTurno = servicosValidos[servicosValidos.length - 1];

        // 1. Data e Hora de Início vêm do primeiro turno registrado
        if (primeiroTurno.data) setDataInicio(primeiroTurno.data);
        if (primeiroTurno.horaInicio) setHoraInicio(primeiroTurno.horaInicio);

        // 2. Data e Hora de Término vêm do último turno registrado
        if (ultimoTurno.data) {
          setDataFim(ultimoTurno.data);
        }
        const horaFimCapturada = ultimoTurno.horaFim || ultimoTurno.horaFim1 || '';
        if (horaFimCapturada) {
          setHoraFim(horaFimCapturada);
        }
      }
    }
  }, [servicosExecutados]);

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
    // Preenche no novo turno apenas as peças que ainda possuem saldo restante a aplicar
    const saldos = calcularSaldosPecas();
    const pecasIniciais = saldos
      .filter(s => s.saldoRestante > 0)
      .map(s => ({
        codigo: s.codigo,
        descricao: s.descricao,
        quantidade: s.saldoRestante
      }));

    const funcResp = fornecedores?.find(f => (f.razao_social && f.razao_social === os.tecnicoResponsavel) || (f.nome_fantasia && f.nome_fantasia === os.tecnicoResponsavel));
    const matriculaResp = funcResp ? (funcResp.cnpj_cpf || String(funcResp.codigo_cliente_omie)) : '';

    setServicosExecutados([...servicosExecutados, {
      data: new Date().toISOString().split('T')[0],
      horaInicio: '',
      horaFim1: '',
      horaInicio2: '',
      horaFim: '',
      descricao: '',
      isSaved: false, // Novo card sempre vem aberto para edição
      maoDeObra: [
        { matricula: matriculaResp, nome: os.tecnicoResponsavel || '', funcao: 'Executor', horas: '' }
      ],
      pecasUtilizadas: pecasIniciais,
      veiculosUtilizados: []
    }]);
  };

  const handleUpdateServico = (index, field, value) => {
    const newS = [...servicosExecutados];
    newS[index][field] = value;

    // Auto-cálculo de horas se os relógios estiverem preenchidos (suportando 4 relógios)
    if (field === 'horaInicio' || field === 'horaFim1' || field === 'horaInicio2' || field === 'horaFim') {
      const hIni = newS[index].horaInicio;
      const hFim1 = newS[index].horaFim1;
      const hIni2 = newS[index].horaInicio2;
      const hFim = newS[index].horaFim;

      let totalMinutes = 0;

      if (hIni && hFim1) {
        const [h1, m1] = hIni.split(':').map(Number);
        const [h2, m2] = hFim1.split(':').map(Number);
        const m = (h2 * 60 + m2) - (h1 * 60 + m1);
        if (m > 0) totalMinutes += m;
      }

      if (hIni2 && hFim) {
        const [h3, m3] = hIni2.split(':').map(Number);
        const [h4, m4] = hFim.split(':').map(Number);
        const m = (h4 * 60 + m4) - (h3 * 60 + m3);
        if (m > 0) totalMinutes += m;
      }

      if (!hFim1 && !hIni2 && hIni && hFim) {
        const [h1, m1] = hIni.split(':').map(Number);
        const [h4, m4] = hFim.split(':').map(Number);
        const m = (h4 * 60 + m4) - (h1 * 60 + m1);
        if (m > 0) totalMinutes = m;
      }

      if (totalMinutes > 0) {
        const hoursNum = (totalMinutes / 60).toFixed(1).replace('.0', '');
        // Atualiza as horas de toda a equipe neste turno com o número limpo (sem 'H')
        if (newS[index].maoDeObra) {
          newS[index].maoDeObra = newS[index].maoDeObra.map(mao => ({
            ...mao,
            horas: hoursNum
          }));
        }
      }
    }

    setServicosExecutados(newS);
  };

  const handleRemoveServico = (index) => setServicosExecutados(servicosExecutados.filter((_, i) => i !== index));

  const handleAddMaoDeObraSessao = (servicoIndex, funcaoTipo = 'Ajudante') => {
    const newS = [...servicosExecutados];

    let autoHoras = '';
    const s = newS[servicoIndex];
    let totalMinutes = 0;

    if (s.horaInicio && s.horaFim1) {
      const [h1, m1] = s.horaInicio.split(':').map(Number);
      const [h2, m2] = s.horaFim1.split(':').map(Number);
      const m = (h2 * 60 + m2) - (h1 * 60 + m1);
      if (m > 0) totalMinutes += m;
    }

    if (s.horaInicio2 && s.horaFim) {
      const [h3, m3] = s.horaInicio2.split(':').map(Number);
      const [h4, m4] = s.horaFim.split(':').map(Number);
      const m = (h4 * 60 + m4) - (h3 * 60 + m3);
      if (m > 0) totalMinutes += m;
    }

    if (!s.horaFim1 && !s.horaInicio2 && s.horaInicio && s.horaFim) {
      const [h1, m1] = s.horaInicio.split(':').map(Number);
      const [h4, m4] = s.horaFim.split(':').map(Number);
      const m = (h4 * 60 + m4) - (h1 * 60 + m1);
      if (m > 0) totalMinutes = m;
    }

    if (totalMinutes > 0) {
      autoHoras = (totalMinutes / 60).toFixed(1).replace('.0', '');
    }

    newS[servicoIndex].maoDeObra.push({ matricula: '', nome: '', funcao: funcaoTipo, horas: autoHoras });
    setServicosExecutados(newS);
  };

  const handleUpdateMaoDeObraSessao = (servicoIndex, maoIndex, field, value) => {
    const newS = [...servicosExecutados];
    newS[servicoIndex].maoDeObra[maoIndex][field] = value;
    if (field === 'nome') {
      const func = fornecedores.find(f => (f.razao_social && f.razao_social === value) || (f.nome_fantasia && f.nome_fantasia === value));
      if (func) newS[servicoIndex].maoDeObra[maoIndex].matricula = func.cnpj_cpf || String(func.codigo_cliente_omie);
    }
    setServicosExecutados(newS);
  };

  const handleRemoveMaoDeObraSessao = (servicoIndex, maoIndex) => {
    const newS = [...servicosExecutados];
    newS[servicoIndex].maoDeObra = newS[servicoIndex].maoDeObra.filter((_, i) => i !== maoIndex);
    setServicosExecutados(newS);
  };

  const handleAddPecaSessao = (servicoIndex) => {
    const newS = [...servicosExecutados];
    newS[servicoIndex].pecasUtilizadas = newS[servicoIndex].pecasUtilizadas || [];
    newS[servicoIndex].pecasUtilizadas.push({ codigo: '', descricao: '', quantidade: 1, valor_unitario: 0 });
    setServicosExecutados(newS);
  };

  const handleUpdatePecaSessao = (servicoIndex, pecaIndex, field, value) => {
    const newS = [...servicosExecutados];
    newS[servicoIndex].pecasUtilizadas[pecaIndex][field] = value;
    if (field === 'descricao') {
      const prod = produtosEstoque.find(p => p.descricao === value);
      if (prod) {
        newS[servicoIndex].pecasUtilizadas[pecaIndex].codigo = prod.codigo;
        newS[servicoIndex].pecasUtilizadas[pecaIndex].valor_unitario = parseFloat(prod.valor_unitario) || 0;
      }
    } else if (field === 'codigo') {
      const prod = produtosEstoque.find(p => p.codigo === value);
      if (prod) {
        newS[servicoIndex].pecasUtilizadas[pecaIndex].descricao = prod.descricao;
        newS[servicoIndex].pecasUtilizadas[pecaIndex].valor_unitario = parseFloat(prod.valor_unitario) || 0;
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



  const [isEditandoGeral, setIsEditandoGeral] = useState(false);
  const sitNorm = (os.situacao || '').trim().replace(/\s+/g, '_');
  const isFinalizada = (sitNorm === CONCLUIDO || sitNorm === CANCELADO) && !isEditandoGeral;

  const veiculoAtual = veiculosConfig.find(vc => vc.placa === os.centroCusto);

  const [acaoPendente, setAcaoPendente] = useState(null);
  const [contextoModal, setContextoModal] = useState('SALVAR');

  const onSaveClick = (isFinalizar = false, isParaRequisicao = false) => {
    if (isFinalizada) return;
    
    if (nomeEditor.trim()) {
      executeSave(isFinalizar, isParaRequisicao);
    } else {
      setAcaoPendente({ isFinalizar, isParaRequisicao });
      setContextoModal('SALVAR');
      setModalEdicaoAberta(true);
    }
  };

  const handleConfirmarEdicao = async () => {
    if (!nomeEditor.trim()) {
      alert("⚠️ Você precisa informar o Nome de quem está editando a O.S. para prosseguir.");
      return;
    }
    setModalEdicaoAberta(false);
    if (contextoModal === 'DESBLOQUEAR') {
      setIsEditandoGeral(true);
    } else if (acaoPendente) {
      await executeSave(acaoPendente.isFinalizar, acaoPendente.isParaRequisicao);
    }
  };

  const executeSave = async (isFinalizar = false, isParaRequisicao = false) => {
    // 1. Extração dinâmica das datas do Diário de Bordo
    let dIni = dataInicio;
    let hIni = horaInicio;
    let dFim = dataFim;
    let hFim = horaFim;

    if (servicosExecutados && servicosExecutados.length > 0) {
      const comData = servicosExecutados.filter(s => s.data);
      if (comData.length > 0) {
        dIni = comData[0].data || dIni;
        hIni = comData[0].horaInicio || hIni;
        dFim = comData[comData.length - 1].data || dFim;
        hFim = comData[comData.length - 1].horaFim || comData[comData.length - 1].horaFim1 || hFim;
      }
    }

    // Validação 1: Data de Início e Hora de Início são SEMPRE OBRIGATÓRIAS
    if (!dIni || !hIni) {
      alert('⚠️ Preencha a Data de Início e Hora de Início no Diário de Bordo para registrar a O.S.!');
      return;
    }

    if (isVeiculo && atualizarKm && kmManutencao !== '' && veiculoConfigAlvo?.kmAtual) {
      const validacaoKm = validarAntiRetrocessoKM(kmManutencao, veiculoConfigAlvo.kmAtual, unidadeMedicao);
      if (validacaoKm.retrocedeu) {
        const confirmar = window.confirm(
          `ℹ️ REGISTRO DE ODÔMETRO:\n\n` +
          `O valor informado (${formatarNumeroBR(kmManutencao)} ${unidadeMedicao}) é menor que o odômetro atual da frota (${formatarNumeroBR(veiculoConfigAlvo.kmAtual)} ${unidadeMedicao}).\n\n` +
          `Se esta O.S. for referente a um serviço ou dia anterior, este valor será gravado com sucesso nesta O.S. sem alterar o KM atual do veículo no cadastro.\n\n` +
          `Deseja confirmar e salvar?`
        );
        if (!confirmar) return;
      }
    }

    let statusFinal = EM_ANDAMENTO;
    if (isFinalizar) {
      if (resultado === 'EXECUTADA') statusFinal = CONCLUIDO;
      else if (resultado === 'EM_ANDAMENTO') statusFinal = EM_ANDAMENTO;
      else if (resultado === 'AGUARDANDO_INSUMO') statusFinal = AGUARDANDO_INSUMO;
      else if (resultado === 'CANCELADA') statusFinal = CANCELADO;
    } else {
      statusFinal = EM_ANDAMENTO;
    }

    // Validação 2: Quando o resultado é Concluir/Executada ou status CONCLUIDO, Data de Término e Hora de Término são OBRIGATÓRIAS
    if (statusFinal === CONCLUIDO || (isFinalizar && resultado === 'EXECUTADA')) {
      if (!dFim || !hFim) {
        alert('⚠️ Para concluir e fechar a O.S., o último turno do Diário de Bordo deve conter a Hora de Saída (Término)!');
        return;
      }
      if (!motivo || !motivo.trim()) {
        alert('⚠️ Preencha o Motivo / Causa (Por que quebrou?) para concluir a O.S.!');
        return;
      }
    }

    const isVeiculo = veiculosConfig.some(vc => vc.placa === os.centroCusto);
    // Detectar manutenção de óleo/revisão a partir da descrição da OS e dos turnos
    const textoCompleto = [
      (os.descricao || ''),
      (os.descricaoServico || ''),
      ...servicosExecutados.map(s => s.descricao || '')
    ].join(' ').toUpperCase();
    const trocouOleoDetectado = textoCompleto.includes('TROCA DE ÓLEO') || textoCompleto.includes('TROCA DE OLEO') || textoCompleto.includes('TROCOU OLEO') || textoCompleto.includes('TROCA OLEO');
    const fezRevisaoDetectado = textoCompleto.includes('REVISÃO') || textoCompleto.includes('REVISAO');

    const veiculosAtualizados = (isVeiculo && atualizarKm && kmManutencao) ? [{
      placa: os.centroCusto,
      kmFinal: kmManutencao,
      trocouOleo: trocouOleoDetectado,
      fezRevisao: fezRevisaoDetectado
    }] : [];
    // Legado: não mandamos mais o veiculosDeslocamento global
    const todosVeiculos = [...veiculosAtualizados];


    try {
      const res = await fetch(`/api/os/${os.id || os.codigo}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requisitante: cabecalhoData.requisitante,
          setor: cabecalhoData.setor,
          centroCusto: cabecalhoData.centroCusto,
          prazo: cabecalhoData.prazo,
          complexidade: cabecalhoData.complexidade,
          descricaoProblema: cabecalhoData.descricaoProblema,
          situacao: statusFinal,
          dataInicio: dIni, horaInicio: hIni, dataFim: dFim, horaFim: hFim,
          motivo,
          resultado,
          observacao,
          dataJustificativa,
          maoDeObra: [], // zerar a raiz para forçar uso dentro de servicosExecutados
          servicosExecutados,
          pecasDevolvidas,
          usouVeiculo: 'Não', // força vazio no global
          veiculos: todosVeiculos, // apenas veículo em manutenção globalmente
          placaVeiculo: '',
          kmInicial: '',
          kmFinal: '',
          kmRodado: '',
          editorResponsavel: nomeEditor,
          motivoEdicao: motivoEdicao
        })
      });

      if (res.ok) {
        if (isParaRequisicao) {
          // Apenas chama o requestMoreParts, sem dar alert
          if (onRequestMoreParts) onRequestMoreParts(os);
        } else {
          alert(isFinalizar ? 'O.S. Concluída com sucesso!' : 'Rascunho salvo.');
          onSave();
        }
      } else {
        alert('Erro ao salvar apontamento.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro de conexão ao salvar.');
    }
  };

  return (
    <>
      <div className={styles.modalOverlay} onClick={onClose}>
        <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
          <div className={styles.stickyModalHeader}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button className={styles.btnBackModal} onClick={onClose}>
                <ChevronLeft size={20} /> Voltar
              </button>
              <button className={styles.btnCloseModalHeader} onClick={onClose} title="Fechar modal">
                <X size={18} />
              </button>
          </div>
        </div>

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
          <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--cor-destaque)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Wrench size={18} /> O.S. {os.codigo}
          </h3>
          {!isFinalizada && (
            <button 
              type="button" 
              onClick={() => setIsEditandoCabecalho(!isEditandoCabecalho)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'transparent', border: '1px solid var(--cor-destaque)', color: 'var(--cor-destaque)', padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600 }}
              title="Editar dados iniciais da O.S."
            >
              <Pencil size={14} /> {isEditandoCabecalho ? 'Cancelar Edição' : 'Editar Cabeçalho'}
            </button>
          )}
        </div>

        <div style={{ backgroundColor: 'var(--cor-fundo-secundario)', padding: '16px', borderRadius: '8px', marginBottom: '20px', border: '1px solid var(--cor-borda-cartao)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          {isEditandoCabecalho ? (
            <>
              <div className={styles.inputGroup}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--cor-texto-secundario)', marginBottom: '4px', display: 'block' }}>Requisitante</label>
                <input type="text" className={styles.inputField} value={cabecalhoData.requisitante} onChange={e => setCabecalhoData({...cabecalhoData, requisitante: e.target.value})} style={{ padding: '6px', fontSize: '0.85rem', width: '100%' }} />
              </div>
              <div className={styles.inputGroup}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--cor-texto-secundario)', marginBottom: '4px', display: 'block' }}>Setor</label>
                <input type="text" className={styles.inputField} value={cabecalhoData.setor} onChange={e => setCabecalhoData({...cabecalhoData, setor: e.target.value})} style={{ padding: '6px', fontSize: '0.85rem', width: '100%' }} />
              </div>
              <div className={styles.inputGroup}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--cor-texto-secundario)', marginBottom: '4px', display: 'block' }}>Centro de Custo (Alvo)</label>
                <input type="text" className={styles.inputField} value={cabecalhoData.centroCusto} onChange={e => setCabecalhoData({...cabecalhoData, centroCusto: e.target.value})} style={{ padding: '6px', fontSize: '0.85rem', width: '100%' }} />
              </div>
              <div className={styles.inputGroup}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--cor-texto-secundario)', marginBottom: '4px', display: 'block' }}>Prazo Original</label>
                <input type="date" className={styles.inputField} value={cabecalhoData.prazo} onChange={e => setCabecalhoData({...cabecalhoData, prazo: e.target.value})} style={{ padding: '6px', fontSize: '0.85rem', width: '100%' }} />
              </div>
              <div className={styles.inputGroup}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--cor-texto-secundario)', marginBottom: '4px', display: 'block' }}>Complexidade</label>
                <select className={styles.inputField} value={cabecalhoData.complexidade} onChange={e => setCabecalhoData({...cabecalhoData, complexidade: e.target.value})} style={{ padding: '6px', fontSize: '0.85rem', width: '100%' }}>
                  <option value="BAIXA">BAIXA</option>
                  <option value="NORMAL">NORMAL</option>
                  <option value="ALTA">ALTA</option>
                  <option value="URGENTE">URGENTE</option>
                </select>
              </div>
              <div className={styles.inputGroup} style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--cor-texto-secundario)', marginBottom: '4px', display: 'block' }}>Descrição do Problema (Abertura)</label>
                <textarea className={styles.inputField} rows={2} value={cabecalhoData.descricaoProblema} onChange={e => setCabecalhoData({...cabecalhoData, descricaoProblema: e.target.value})} style={{ padding: '6px', fontSize: '0.85rem', width: '100%' }} />
              </div>
            </>
          ) : (
            <>
              <div><strong>Requisitante:</strong> <div style={{ marginTop: '4px', color: 'var(--cor-texto-principal)' }}>{cabecalhoData.requisitante}</div></div>
              <div><strong>Setor:</strong> <div style={{ marginTop: '4px', color: 'var(--cor-texto-principal)' }}>{cabecalhoData.setor}</div></div>
              <div><strong>Centro de Custo:</strong> <div style={{ marginTop: '4px' }}><span className={styles.tagCC}>{cabecalhoData.centroCusto || '-'}</span></div></div>
              <div><strong>Prazo Original:</strong> <div style={{ marginTop: '4px', color: 'var(--cor-destaque)', fontWeight: 'bold' }}>{cabecalhoData.prazo ? cabecalhoData.prazo.split('-').reverse().join('/') : 'Não definido'}</div></div>
              <div><strong>Complexidade:</strong> <div style={{ marginTop: '4px', color: 'var(--cor-texto-principal)' }}>{cabecalhoData.complexidade}</div></div>
              <div style={{ gridColumn: '1 / -1' }}>
                <strong>Descrição do Problema (Abertura):</strong>
                <div style={{ marginTop: '4px', color: 'var(--cor-texto-principal)' }}>{cabecalhoData.descricaoProblema || 'Nenhuma descrição fornecida.'}</div>
              </div>
            </>
          )}
        </div>

        {/* PEÇAS LIBERADAS PARA ESTA O.S. (COM SALDO EM TEMPO REAL) */}
        {(() => {
          const saldos = calcularSaldosPecas();
          if (saldos.length === 0) return null;

          return (
            <div style={{ backgroundColor: '#ecfdf5', padding: '12px 14px', borderRadius: '8px', marginBottom: '14px', border: '1px solid #10b981', color: '#065f46' }}>
              <h4 style={{ margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem' }}>
                <Package size={16} /> Saldo de Peças Liberadas / Retiradas
              </h4>
              <div style={{ display: 'grid', gap: '6px' }}>
                {saldos.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', backgroundColor: '#ffffffaa', padding: '5px 8px', borderRadius: '6px', border: '1px solid #a7f3d0', flexWrap: 'wrap', gap: '6px' }}>
                    <div style={{ flex: 1, minWidth: '140px', fontSize: '0.76rem', color: '#064e3b' }}>
                      <strong style={{ fontSize: '0.78rem' }}>{item.qtdLiberada}x</strong> - {item.descricao}
                    </div>
                    <div>
                      {item.saldoRestante === 0 ? (
                        <span style={{ backgroundColor: '#d1fae5', color: '#065f46', padding: '3px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                          <CheckCircle size={13} color="#059669" /> 100% Aplicada
                        </span>
                      ) : (
                        <span style={{ backgroundColor: '#fef3c7', color: '#d97706', padding: '3px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                          <Package size={13} color="#d97706" /> {item.saldoRestante}x Restante{item.saldoRestante > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* PEÇAS AGUARDANDO ALMOXARIFADO / CHEFE */}
        {os.pecasSolicitadas && os.pecasSolicitadas.some(p => p.status !== 'ENTREGUE' && p.status !== 'NOVA') && (
          <div style={{ backgroundColor: '#fffbeb', padding: '12px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #f59e0b', color: '#b45309' }}>
            <h4 style={{ margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '6px' }}><AlertCircle size={16} /> Peças Aguardando (Almoxarifado/Chefe)</h4>
            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.85rem' }}>
              {os.pecasSolicitadas.filter(p => p.status !== 'ENTREGUE' && p.status !== 'NOVA').map((p, idx) => (
                <li key={idx}><strong>{p.quantidade}x</strong> - {p.descricao} <em style={{ opacity: 0.7 }}>({p.status})</em></li>
              ))}
            </ul>
          </div>
        )}

        {/* PERÍODO CALCULADO AUTOMATICAMENTE DO DIÁRIO DE BORDO */}
        {dataInicio && (
          <div className={styles.periodoAtendimentoBox}>
            <span className={styles.periodoLabel}>
              <Calendar size={15} color="var(--cor-destaque)" /> Período Calculado (Diário de Bordo):
            </span>
            <div className={styles.periodoValueBox}>
              <span className={styles.periodoBadgeItem}>
                {dataInicio ? `${dataInicio.split('-').reverse().join('/')} ${horaInicio}` : '-'}
              </span>
              <span className={styles.periodoDivisor}>até</span>
              <span className={styles.periodoBadgeItem}>
                {dataFim ? `${dataFim.split('-').reverse().join('/')} ${horaFim}` : 'Em Andamento'}
              </span>
            </div>
          </div>
        )}

        {/* SEÇÃO 2: KM DO VEÍCULO SE APLICÁVEL */}
        {veiculoAtual && (
          <div className={styles.sectionFormVeiculo}>
            <h4 className={styles.sectionTitle}><AlertCircle size={16} /> Atualização de Hodômetro/Horímetro</h4>
            <div className={styles.formGroup}>
              <label>{veiculoAtual.tipoMedicao === 'Horas' ? 'Horímetro Atual' : 'KM Atual'} da Máquina/Veículo</label>
              <input type="number" placeholder="Ex: 15200" value={kmManutencao} onChange={e => setKmManutencao(e.target.value)} />
            </div>
          </div>
        )}



        {/* SEÇÃO 4: DESCRIÇÃO E MOTIVO */}
        <div className={styles.sectionForm}>
          <div className={styles.sectionHeaderFlex}>
            <h4 className={styles.sectionTitle} style={{ margin: 0 }}>
              <FileText size={16} /> Diário de Bordo / Serviços Adicionais
            </h4>
            <div className={styles.sectionHeaderButtons}>
              <button onClick={handleAddServico} className={styles.btnSmallAdd}><Plus size={14} /> Add Serviço</button>
              {(os.situacao === 'EM_ANDAMENTO' || os.situacao === 'ATRIBUIDO_TECNICO' || os.situacao === 'PECAS_ENTREGUES') && (
                <button
                  onClick={() => {
                    if (servicosExecutados.length === 0 || !servicosExecutados.some(s => s.descricao.trim() !== '')) {
                      alert('Atenção: Antes de solicitar mais materiais, você DEVE registrar o que já foi feito no "Diário de Bordo" para prestação de contas.');
                      return;
                    }
                    if (onRequestMoreParts) {
                      // Salvar rascunho antes de fechar a tela para pedir material
                      onSaveClick(false, true);
                    }
                  }}
                  className={styles.btnSmallAdd}
                  style={{ backgroundColor: '#f86622ff', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Package size={16} /> Solicitar Material
                </button>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '16px' }}>
            {servicosExecutados.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '16px', backgroundColor: 'var(--cor-fundo-cartao)', borderRadius: '8px', border: '1px solid var(--cor-borda-cartao)', color: 'var(--cor-texto-secundario)', fontSize: '0.85rem' }}>
                Nenhum serviço ou turno registrado. Adicione um apontamento para iniciar.
              </div>
            ) : (
              servicosExecutados.map((serv, servIdx) => (
                <div key={servIdx} style={{ backgroundColor: 'var(--cor-fundo-cartao)', borderRadius: '8px', border: '1px solid var(--cor-borda-cartao)', padding: '12px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid var(--cor-borda-cartao)' }}>
                    {serv.isSaved ? (
                      <div className={styles.turnoSalvoHeader}>
                        <div className={styles.turnoSalvoTopLine}>
                          <strong style={{ color: 'var(--cor-destaque)' }}>{serv.data ? serv.data.split('-').reverse().join('/') : ''}</strong>
                          <button type="button" onClick={() => {
                            if (window.confirm("Tem certeza que deseja editar este apontamento?")) {
                              handleUpdateServico(servIdx, 'isSaved', false);
                            }
                          }} className={styles.btnEditarTurno}>
                            Editar
                          </button>
                        </div>
                        <span className={styles.turnoSalvoHorarios}>
                          {(serv.horaInicio2 || (serv.horaFim1 && serv.horaFim && serv.horaFim1 !== serv.horaFim)) ? (
                            `${serv.horaInicio || ''} às ${serv.horaFim1 || ''} | ${serv.horaInicio2 || ''} às ${serv.horaFim || ''}`
                          ) : (
                            `${serv.horaInicio || ''} às ${serv.horaFim || serv.horaFim1 || ''}`
                          )}
                        </span>
                      </div>
                    ) : (
                      <>
                        {/* LINHA SUPERIOR: BARRA INTEGRADA COM DATA E BOTÃO SALVAR */}
                        <div className={styles.turnoHeaderBar}>
                          <div className={styles.dataApontamentoBox}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Calendar size={18} style={{ color: 'var(--cor-destaque)' }} />
                              <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--cor-texto-principal)' }}>Data:</span>
                            </div>
                            <input
                              type="date"
                              value={serv.data}
                              onChange={e => handleUpdateServico(servIdx, 'data', e.target.value)}
                              style={{
                                padding: '6px 10px',
                                fontSize: '0.85rem',
                                borderRadius: '6px',
                                border: '1px solid var(--cor-borda-cartao)',
                                backgroundColor: 'var(--cor-fundo-cartao)',
                                color: 'var(--cor-texto-principal)',
                                fontWeight: 'bold',
                                outline: 'none'
                              }}
                            />
                          </div>
                          <div className={styles.turnoBotoesBox}>
                            <button type="button" onClick={() => handleUpdateServico(servIdx, 'isSaved', true)} className={styles.btnSalvarTurno}>
                              <CheckCircle size={15} /> Salvar Turno
                            </button>
                            <button className={styles.btnDelLine} onClick={() => handleRemoveServico(servIdx)} title="Remover Turno/Sessão"><Trash2 size={18} /></button>
                          </div>
                        </div>

                        {/* LINHA INFERIOR: CARDS DE HORÁRIO LADO A LADO */}
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <div className={styles.periodoCard} style={{ flex: '1 1 240px' }}>
                            <span className={styles.periodoTag}>1º Período:</span>
                            <div className={styles.campoHora} style={{ flex: 1 }}>
                              <label>Entrada</label>
                              <input type="time" value={serv.horaInicio || ''} onChange={e => handleUpdateServico(servIdx, 'horaInicio', e.target.value)} style={{ width: '100%' }} />
                            </div>
                            <div className={styles.campoHora} style={{ flex: 1 }}>
                              <label>Saída Almoço</label>
                              <input type="time" value={serv.horaFim1 || ''} onChange={e => handleUpdateServico(servIdx, 'horaFim1', e.target.value)} style={{ width: '100%' }} />
                            </div>
                          </div>

                          <div className={styles.periodoCard} style={{ flex: '1 1 240px' }}>
                            <span className={styles.periodoTag}>2º Período:</span>
                            <div className={styles.campoHora} style={{ flex: 1 }}>
                              <label>Volta Almoço</label>
                              <input type="time" value={serv.horaInicio2 || ''} onChange={e => handleUpdateServico(servIdx, 'horaInicio2', e.target.value)} style={{ width: '100%' }} />
                            </div>
                            <div className={styles.campoHora} style={{ flex: 1 }}>
                              <label>Saída Final</label>
                              <input type="time" value={serv.horaFim || ''} onChange={e => handleUpdateServico(servIdx, 'horaFim', e.target.value)} style={{ width: '100%' }} />
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  <div className={styles.formGroup} style={{ marginBottom: '12px' }}>
                    <label style={{ fontSize: '0.75rem' }}>O que foi feito? (Descrição)</label>
                    <textarea placeholder="Ex: Troca de rolamentos, Limpeza" value={serv.descricao} onChange={e => handleUpdateServico(servIdx, 'descricao', e.target.value)} disabled={serv.isSaved} style={{ width: '100%', minHeight: serv.isSaved ? 'auto' : '60px', padding: '8px', borderRadius: '6px', border: serv.isSaved ? 'none' : '1px solid var(--cor-borda-cartao)', resize: 'vertical', backgroundColor: serv.isSaved ? 'transparent' : '#fff', color: serv.isSaved ? 'var(--cor-texto-principal)' : 'inherit' }} />
                  </div>

                  {/* MINI TABELA DE MÃO DE OBRA DESTA SESSÃO */}
                  <div style={{ backgroundColor: serv.isSaved ? 'transparent' : 'var(--cor-fundo-secundario)', padding: serv.isSaved ? '0' : '10px', borderRadius: '6px', border: serv.isSaved ? 'none' : '1px solid var(--cor-borda-cartao)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}><User size={14} /> Equipe neste turno</label>
                      {!serv.isSaved && (
                        <button
                          type="button"
                          onClick={() => handleAddMaoDeObraSessao(servIdx, 'Ajudante')}
                          style={{ background: 'transparent', border: 'none', color: 'var(--cor-destaque)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}
                          title="Adicionar novo membro à equipe neste turno"
                        >
                          <UserPlus size={16} /> Adicionar Membro
                        </button>
                      )}
                    </div>
                    <div style={{ display: 'grid', gap: '6px' }}>
                      {(serv.maoDeObra || []).map((mao, maoIdx) => (
                        <React.Fragment key={maoIdx}>
                          {serv.isSaved ? (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px dashed var(--cor-borda-cartao)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontWeight: 'bold', color: 'var(--cor-texto-principal)' }}>{mao.nome}</span>
                                <span style={{
                                  fontSize: '0.7rem',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  fontWeight: 'bold',
                                  backgroundColor: mao.funcao === 'Executor Substituto' ? '#fef3c7' : (mao.funcao === 'Executor' ? '#dbeafe' : 'var(--cor-fundo-secundario)'),
                                  color: mao.funcao === 'Executor Substituto' ? '#d97706' : (mao.funcao === 'Executor' ? '#2563eb' : 'var(--cor-texto-secundario)'),
                                  border: `1px solid ${mao.funcao === 'Executor Substituto' ? '#fcd34d' : (mao.funcao === 'Executor' ? '#93c5fd' : 'var(--cor-borda-cartao)')}`
                                }}>
                                  {mao.funcao || 'Executor'}
                                </span>
                              </div>
                              <span style={{ color: 'var(--cor-texto-secundario)', fontWeight: 'bold' }}>{mao.horas ? `${String(mao.horas).replace(/h/gi, '')}H` : ''}</span>
                            </div>
                          ) : (
                            <div className={styles.maoDeObraRow}>
                              <input type="text" placeholder="Nome" value={mao.nome} onChange={e => handleUpdateMaoDeObraSessao(servIdx, maoIdx, 'nome', e.target.value)} list="fornecedores-lista" className={styles.maoDeObraNomeInput} style={{ padding: '6px', fontSize: '0.85rem', border: '1px solid var(--cor-borda-cartao)', borderRadius: '4px' }} />
                              <select value={mao.funcao || 'Ajudante'} onChange={e => handleUpdateMaoDeObraSessao(servIdx, maoIdx, 'funcao', e.target.value)} className={styles.maoDeObraFuncaoSelect} style={{ padding: '6px', fontSize: '0.85rem', border: '1px solid var(--cor-borda-cartao)', borderRadius: '4px', backgroundColor: 'var(--cor-fundo-cartao)' }}>
                                <option value="Executor">Executor (Principal)</option>
                                <option value="Executor Substituto">Executor Substituto</option>
                                <option value="Ajudante">Ajudante (Auxiliar)</option>
                              </select>
                              <input type="text" placeholder="Horas" value={String(mao.horas || '').replace(/h/gi, '')} onChange={e => handleUpdateMaoDeObraSessao(servIdx, maoIdx, 'horas', e.target.value.replace(/h/gi, ''))} className={styles.maoDeObraHorasInput} style={{ padding: '6px', fontSize: '0.85rem', border: '1px solid var(--cor-borda-cartao)', borderRadius: '4px' }} />
                              <button type="button" onClick={() => handleRemoveMaoDeObraSessao(servIdx, maoIdx)} style={{ background: 'transparent', border: 'none', color: 'var(--cor-erro)', cursor: 'pointer' }}><Trash2 size={16} /></button>
                            </div>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>

                  {/* MINI TABELA DE PEÇAS CONSUMIDAS NESTA SESSÃO */}
                  <div style={{ backgroundColor: serv.isSaved ? 'transparent' : 'var(--cor-fundo-secundario)', padding: serv.isSaved ? '0' : '10px', borderRadius: '6px', border: serv.isSaved ? 'none' : '1px solid var(--cor-borda-cartao)', marginTop: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}><Package size={14} /> Peças Consumidas / Aplicadas</label>
                      {!serv.isSaved && (
                        <button type="button" onClick={() => handleAddPecaSessao(servIdx)} style={{ background: 'transparent', border: 'none', color: 'var(--cor-destaque)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Plus size={14} /> Peça Utilizada
                        </button>
                      )}
                    </div>
                    {(!serv.pecasUtilizadas || serv.pecasUtilizadas.length === 0) && serv.isSaved ? (
                      <div style={{ fontSize: '0.8rem', color: 'var(--cor-texto-secundario)', fontStyle: 'italic' }}>Nenhuma peça consumida neste turno.</div>
                    ) : (
                      <div style={{ display: 'grid', gap: '6px' }}>
                        {(serv.pecasUtilizadas || []).map((peca, pecaIdx) => (
                          <React.Fragment key={pecaIdx}>
                            {serv.isSaved ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', borderBottom: '1px dashed var(--cor-borda-cartao)' }}>
                                <span style={{ fontWeight: 'bold', color: 'var(--cor-destaque)', minWidth: '30px' }}>{peca.quantidade}x</span>
                                <span style={{ color: 'var(--cor-texto-principal)' }}>{peca.descricao}</span>
                              </div>
                            ) : (
                              <div className={styles.pecaUtilizadaRow}>
                                <input type="text" placeholder="Buscar peça..." value={peca.descricao} onChange={e => handleUpdatePecaSessao(servIdx, pecaIdx, 'descricao', e.target.value)} list="produtos-lista-modal" style={{ padding: '6px', fontSize: '0.85rem', border: '1px solid var(--cor-borda-cartao)' }} />
                                <input type="number" placeholder="Qtd" value={peca.quantidade} onChange={e => handleUpdatePecaSessao(servIdx, pecaIdx, 'quantidade', e.target.value)} style={{ padding: '6px', fontSize: '0.85rem', border: '1px solid var(--cor-borda-cartao)' }} />
                                <button type="button" onClick={() => handleRemovePecaSessao(servIdx, pecaIdx)} style={{ background: 'transparent', border: 'none', color: 'var(--cor-erro)', cursor: 'pointer' }}><Trash2 size={16} /></button>
                              </div>
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* MINI TABELA DE VEÍCULOS DE DESLOCAMENTO NESTA SESSÃO */}
                  <div style={{ backgroundColor: serv.isSaved ? 'transparent' : 'var(--cor-fundo-secundario)', padding: serv.isSaved ? '0' : '10px', borderRadius: '6px', border: serv.isSaved ? 'none' : '1px solid var(--cor-borda-cartao)', marginTop: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}><Car size={14} /> Veículos de Deslocamento (Frota)</label>
                      {!serv.isSaved && (
                        <button type="button" onClick={() => handleAddVeiculoSessao(servIdx)} style={{ background: 'transparent', border: 'none', color: 'var(--cor-destaque)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Plus size={14} /> Veículo
                        </button>
                      )}
                    </div>
                    {(!serv.veiculosUtilizados || serv.veiculosUtilizados.length === 0) && serv.isSaved ? (
                      null
                    ) : (
                      <div style={{ display: 'grid', gap: '6px' }}>
                        {(serv.veiculosUtilizados || []).map((veic, veicIdx) => (
                          <React.Fragment key={veicIdx}>
                            {serv.isSaved ? (
                              <div className={styles.veiculoSalvoRow}>
                                <span style={{ fontWeight: 'bold', color: 'var(--cor-destaque)', display: 'flex', alignItems: 'center', gap: '4px' }}><Car size={14} /> {veic.placa}</span>
                                <span style={{ color: 'var(--cor-texto-secundario)', fontSize: '0.85rem' }}>
                                  Ini: <strong style={{ color: 'var(--cor-texto-principal)' }}>{veic.kmInicial}</strong> |
                                  Fim: <strong style={{ color: 'var(--cor-texto-principal)' }}>{veic.kmFinal}</strong> |
                                  Total: <strong style={{ color: 'var(--cor-texto-principal)' }}>{veic.km} KM</strong>
                                </span>
                              </div>
                            ) : (
                              <div className={styles.veiculoUtilizadoRow}>
                                <select value={veic.placa} onChange={e => handleUpdateVeiculoSessao(servIdx, veicIdx, 'placa', e.target.value)} className={styles.veiculoPlacaSelect} style={{ width: '100%', minWidth: 0, padding: '6px', fontSize: '0.85rem', border: '1px solid var(--cor-borda-cartao)' }}>
                                  <option value="" disabled>Placa...</option>
                                  {veiculosConfig.map(vc => <option key={vc.placa} value={vc.placa}>{vc.placa}</option>)}
                                </select>
                                <input type="number" placeholder="KM Ini" value={veic.kmInicial} onChange={e => handleUpdateVeiculoSessao(servIdx, veicIdx, 'kmInicial', e.target.value)} title="KM Inicial (editável para O.S. antigas)" style={{ width: '100%', minWidth: 0, padding: '6px', fontSize: '0.85rem', border: '1px solid var(--cor-borda-cartao)', fontWeight: 'bold' }} />
                                <input type="number" placeholder="KM Fim" value={veic.kmFinal} onChange={e => handleUpdateVeiculoSessao(servIdx, veicIdx, 'kmFinal', e.target.value)} style={{ width: '100%', minWidth: 0, padding: '6px', fontSize: '0.85rem', border: '1px solid var(--cor-borda-cartao)' }} />
                                <input type="number" placeholder="Rodado" value={veic.km} disabled style={{ width: '100%', minWidth: 0, padding: '6px', fontSize: '0.85rem', border: '1px solid var(--cor-borda-cartao)', backgroundColor: 'var(--cor-fundo-sutil)' }} />
                                <button type="button" onClick={() => handleRemoveVeiculoSessao(servIdx, veicIdx)} style={{ background: 'transparent', border: 'none', color: 'var(--cor-erro)', cursor: 'pointer' }}><Trash2 size={16} /></button>
                              </div>
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className={styles.formGroup}>
            <label>Motivo / Causa (Por que quebrou?)</label>
            <input type="text" placeholder="Ex: Desgaste natural, mau uso..." value={motivo} onChange={e => setMotivo(e.target.value)} style={{ textTransform: 'uppercase' }} />
          </div>
        </div>

        {/* Odômetro / Horímetro do Veículo Atendido */}
        {isVeiculo && (
          <div style={{ backgroundColor: 'var(--cor-fundo-secundario)', border: '1.5px solid var(--cor-borda-cartao)', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {isHorimetro ? <Wrench size={18} color="var(--cor-destaque)" /> : <Car size={18} color="var(--cor-destaque)" />}
                <strong style={{ color: 'var(--cor-texto-principal)', fontSize: '0.95rem' }}>
                  Manutenção do Equipamento / Frota ({os.centroCusto || 'Alvo'})
                </strong>
              </div>
              {veiculoConfigAlvo?.kmAtual && (
                <span style={{ fontSize: '0.85rem', color: 'var(--cor-texto-secundario)', fontWeight: '600' }}>
                  📌 Último Registro da Frota: <strong style={{ color: 'var(--cor-texto-principal)' }}>{formatarOdometroDisplay(veiculoConfigAlvo.kmAtual, unidadeMedicao)}</strong>
                </span>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '0.88rem', color: 'var(--cor-texto-principal)' }}>
                <input
                  type="checkbox"
                  checked={atualizarKm}
                  onChange={e => setAtualizarKm(e.target.checked)}
                />
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <RefreshCw size={15} color="var(--cor-destaque)" />
                  Atualizar {labelMedicao} do Veículo / Equipamento
                </span>
              </label>

              {atualizarKm && (() => {
                const ultimoRegistro = veiculoConfigAlvo?.kmAtual;
                const validacaoKm = ultimoRegistro ? validarAntiRetrocessoKM(kmManutencao, ultimoRegistro, unidadeMedicao) : { valido: true, retrocedeu: false };

                return (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', flexWrap: 'wrap', marginTop: '4px' }}>
                    <div style={{ flex: '1 1 200px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <label style={{ fontSize: '0.82rem', fontWeight: 'bold', display: 'block', color: 'var(--cor-texto-secundario)', margin: 0 }}>
                          {labelMedicao} no Atendimento:
                        </label>
                        {kmManutencao && (
                          <span style={{ fontSize: '0.85rem', fontWeight: '800', color: validacaoKm.retrocedeu ? 'var(--cor-erro, #ef4444)' : 'var(--cor-destaque)' }}>
                            👀 {formatarOdometroDisplay(kmManutencao, unidadeMedicao)}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <input
                          type="number"
                          step="0.1"
                          placeholder={placeholderMedicao}
                          value={kmManutencao}
                          onChange={e => setKmManutencao(e.target.value)}
                          style={{ 
                            padding: '8px 12px', 
                            fontSize: '1rem', 
                            fontWeight: 'bold', 
                            borderRadius: '6px', 
                            border: '1px solid',
                            width: '160px', 
                            color: validacaoKm.retrocedeu ? 'var(--cor-erro, #ef4444)' : 'var(--cor-destaque)', 
                            borderColor: validacaoKm.retrocedeu ? 'var(--cor-erro, #ef4444)' : 'var(--cor-borda-cartao)',
                            backgroundColor: 'var(--cor-fundo-cartao)' 
                          }}
                        />
                        <span style={{ fontWeight: 'bold', color: 'var(--cor-texto-secundario)', fontSize: '0.85rem' }}>{unidadeMedicao}</span>
                      </div>
                      {validacaoKm.retrocedeu && (
                        <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--cor-erro, #ef4444)', borderRadius: '6px', padding: '6px 10px', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--cor-erro, #ef4444)', fontSize: '0.8rem', fontWeight: '700' }}>
                          <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                          <span>{validacaoKm.mensagem}</span>
                        </div>
                      )}
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--cor-texto-secundario)', margin: 0, flex: '1 1 260px', lineHeight: 1.4, display: 'flex', alignItems: 'center', gap: '6px', marginTop: '22px' }}>
                      <Info size={16} color="var(--cor-destaque)" style={{ flexShrink: 0 }} />
                      <span>Ao salvar ou concluir a O.S., a medição da frota para <strong>{os.centroCusto}</strong> será atualizada automaticamente.</span>
                    </p>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        <div className={styles.formGroup} style={{ marginBottom: '16px' }}>
          {!mostrarJustificativa ? (
            <button
              type="button"
              onClick={() => setMostrarJustificativa(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', backgroundColor: '#fef3c7', color: '#d97706', border: '1px solid #fde68a', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', width: '100%', justifyContent: 'center' }}
            >
              <AlertCircle size={18} /> JUSTIFICAR ATRASO / ADICIONAR OBSERVAÇÃO
            </button>
          ) : (
            <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h4 style={{ color: '#d97706', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                  <AlertCircle size={18} /> Justificativa de Atraso / Observação
                </h4>
                {!isAtrasado && (
                  <button type="button" onClick={() => { setMostrarJustificativa(false); setObservacao(''); }} style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 'bold' }}>
                    Cancelar
                  </button>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', color: '#92400e', display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Data do Atraso / Justificativa</label>
                  <input type="date" value={dataJustificativa} onChange={e => setDataJustificativa(e.target.value)} style={{ padding: '8px', width: '100%', borderRadius: '6px', border: '1px solid #fde68a' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.85rem', color: '#92400e', display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Observação / Motivo do Atraso</label>
                  <textarea
                    value={observacao}
                    onChange={e => setObservacao(e.target.value)}
                    placeholder="Descreva o motivo do atraso ou detalhes adicionais..."
                    style={{ padding: '8px', width: '100%', borderRadius: '6px', border: '1px solid #fde68a', minHeight: '80px', resize: 'vertical' }}
                    required={isAtrasado}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* SEÇÃO DE DEVOLUÇÃO DE MATERIAIS SOBRESSALENTES AO ALMOXARIFADO (SOMENTE SE EXECUTADA / CONCLUÍDA) */}
        {resultado === 'EXECUTADA' && os.pecasSolicitadas && os.pecasSolicitadas.length > 0 && (!pecasDevolvidas || pecasDevolvidas.length === 0) && (
          <div style={{ backgroundColor: '#ecfdf5', padding: '12px 14px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #10b981', color: '#065f46', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
            <CheckCircle size={18} color="#10b981" />
            <span><strong>Devolução de Materiais:</strong> Todas as peças retiradas foram 100% aplicadas nos turnos. Nenhuma devolução pendente ao almoxarifado!</span>
          </div>
        )}

        {resultado === 'EXECUTADA' && pecasDevolvidas && pecasDevolvidas.length > 0 && (
          <div style={{ backgroundColor: '#fff7ed', padding: '14px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #fdba74', color: '#c2410c' }}>
            <h4 style={{ margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem' }}>
              <Package size={16} color="#ea580c" /> Devolução de Peças / Insumos Não Utilizados ao Almoxarifado
            </h4>
            <p style={{ margin: '0 0 10px 0', fontSize: '0.8rem', color: '#9a3412' }}>
              As peças abaixo não foram 100% consumidas nos turnos e deverão ser devolvidas fisicamente ao almoxarifado.
            </p>
            <div style={{ display: 'grid', gap: '8px' }}>
              {pecasDevolvidas.map((p, idx) => (
                <div key={idx} style={{ backgroundColor: '#ffffffaa', padding: '10px 12px', borderRadius: '6px', border: '1px solid #ffedd5', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                    <strong>{p.descricao}</strong>
                    <span style={{ fontSize: '0.8rem', color: '#9a3412' }}>
                      Retiradas: <strong>{p.qtdLiberada}x</strong> | Aplicadas: <strong>{p.qtdConsumida}x</strong>
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: '8px', alignItems: 'center' }}>
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 'bold', display: 'block', color: '#9a3412', marginBottom: '2px' }}>Qtd Devolver</label>
                      <input
                        type="number"
                        value={p.quantidadeDevolvida}
                        onChange={e => {
                          const newDev = [...pecasDevolvidas];
                          newDev[idx].quantidadeDevolvida = parseFloat(e.target.value) || 0;
                          setPecasDevolvidas(newDev);
                        }}
                        style={{ width: '100%', padding: '6px', fontSize: '0.85rem', borderRadius: '4px', border: '1px solid #fdba74', backgroundColor: '#fff', fontWeight: 'bold', color: '#c2410c' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 'bold', display: 'block', color: '#9a3412', marginBottom: '2px' }}>Motivo da Devolução</label>
                      <input
                        type="text"
                        value={p.motivoDevolucao}
                        onChange={e => {
                          const newDev = [...pecasDevolvidas];
                          newDev[idx].motivoDevolucao = e.target.value;
                          setPecasDevolvidas(newDev);
                        }}
                        placeholder="Ex: Sobra de manutenção"
                        style={{ width: '100%', padding: '6px', fontSize: '0.85rem', borderRadius: '4px', border: '1px solid #fdba74', backgroundColor: '#fff' }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className={styles.formGroup}>
          <label style={{ fontWeight: 'bold' }}>Status / Resultado do Atendimento</label>
          <select value={resultado} onChange={e => setResultado(e.target.value)} style={{ padding: '10px', fontSize: '1rem', width: '100%', borderRadius: '8px', border: '1px solid var(--cor-borda-cartao)', backgroundColor: 'var(--cor-fundo-principal)' }}>
            <option value="EXECUTADA">Executada / Concluída</option>
            <option value="EM_ANDAMENTO">Em Andamento (Rascunho)</option>
            <option value="AGUARDANDO_INSUMO">Aguardando Peça / Insumo</option>
            <option value="CANCELADA">Cancelada / Não Executada</option>
          </select>
        </div>

        {/* SEÇÃO DE HISTÓRICO DE EDIÇÕES */}
        {(os.historicoEdicoes && os.historicoEdicoes.length > 0) && (
          <div style={{ marginTop: '24px', backgroundColor: 'var(--cor-fundo-sutil)', padding: '16px', borderRadius: '8px', border: '1px solid var(--cor-borda-cartao)' }}>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: 'var(--cor-texto-principal)', fontSize: '0.95rem' }}>
              <ShieldCheck size={18} color="var(--cor-destaque)" /> 
              Histórico de Edições / Auditoria
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {os.historicoEdicoes.map((ed, idx) => (
                <li key={idx} style={{ fontSize: '0.82rem', color: 'var(--cor-texto-secundario)', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '6px' }}>
                  <strong style={{ color: 'var(--cor-texto-principal)' }}>{ed.editor}</strong> alterou esta O.S. em {new Date(ed.data).toLocaleString('pt-BR')}.
                  {ed.motivo && <><br/>Motivo: <em>{ed.motivo}</em></>}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className={styles.modalActions}>
          <button className={styles.btnSalvarRascunho} onClick={() => onSaveClick(false)}>Salvar Progresso</button>
          <button className={styles.btnFinalizarOS} onClick={() => onSaveClick(true)}>
            <CheckCircle size={18} /> Fechar O.S. (Enviar)
          </button>
        </div>

        {/* Datalist fornecedores */}
        <datalist id="fornecedores-lista">
          {fornecedores.map((f, idx) => (
            <option key={`${f.codigo_cliente_omie || ''}-${idx}`} value={f.razao_social || f.nome_fantasia} />
          ))}
        </datalist>
      </div>
    </div>

      {/* MODAL DE AUTORIZAÇÃO DE EDIÇÃO (AUDITORIA) */}
      {modalEdicaoAberta && (
        <div className={styles.modalOverlay} style={{ zIndex: 9999 }}>
          <div className={`${styles.modalContent} ${styles.animateFadeIn}`} style={{ maxWidth: '400px', padding: '24px' }} onClick={e => e.stopPropagation()}>
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
    </>
  );
};

export default FormularioServicoTecnico;
