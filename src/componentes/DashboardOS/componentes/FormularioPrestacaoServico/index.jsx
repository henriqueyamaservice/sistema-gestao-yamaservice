import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, Save, Printer, Plus, Trash2, User, Wrench, Package, Truck, 
  Clock, Calendar, CheckCircle2, AlertCircle, FileText, ChevronRight, Eye, Pencil,
  Camera, ShoppingBag
} from 'lucide-react';
import styles from './index.module.css';
import { obterRotuloUnidade, permiteDecimais } from '../../../../utils/classificadorUnidades';

const LISTA_GRANJAS = [
  'G. KAWAMURA',
  'G. ITA',
  'G. MOSQUEIRO',
  'G. GENIPAUBA',
  'G. CAMPINA',
  'G. AGUA BRANCA',
  'G. CASTANHEIRA',
  'G. GUARIMÃ',
  'G. SÃO CAETANO',
  'G. AVICEMA',
  'G. KIMURA'
];

const formatarDataBR = (d) => {
  if (!d) return '-';
  if (d.includes('/')) return d;
  const parts = d.split('T')[0].split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return d;
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
    if (t1 !== null && t4 !== null) {
      minutosTotais = Math.max(0, t4 - t1);
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

const FormularioPrestacaoServico = ({ os, onClose, onUpdateOS, onPrint }) => {
  if (!os) return null;

  const currentUser = useMemo(() => {
    try {
      const saved = localStorage.getItem('almoxarifado_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  }, []);
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'administrador';

  const [abaAtiva, setAbaAtiva] = useState('diario'); // 'diario' ou 'extrato'
  const [fotoVisualizando, setFotoVisualizando] = useState(null);

  // Estados dos campos do cabeçalho geral
  const [formData, setFormData] = useState({
    centroCusto: os.centroCusto || os.unidadeDestino || 'G. KAWAMURA',
    requisitante: os.requisitante || '',
    setor: os.setor || 'SLD',
    motivo: os.motivo || os.descricao || os.descricaoProblema || 'LIMPEZA ENTRE LOTES',
    executor: os.executor || os.tecnicoResponsavel || os.responsavel || '',
    prazo: os.prazo ? os.prazo.split('T')[0] : '',
    resultado: os.resultado || 'EXECUTADA',
    complexidade: os.complexidade || 'NORMAL',
    prioridade: os.prioridade || '1-NORMAL'
  });

  // Estrutura do Diário de Bordo por Dias / Turnos
  const [turnos, setTurnos] = useState(() => {
    // 1. Se já existirem turnos salvos no novo modelo
    if (Array.isArray(os.turnosPrestacao) && os.turnosPrestacao.length > 0) {
      return os.turnosPrestacao.map(t => ({
        id: t.id || Date.now() + Math.random(),
        data: t.data || '',
        tipoTurno: t.tipoTurno || 'INTEGRAL',
        horaInicio: t.horaInicio || '07:30',
        horaAlmocoInicio: t.horaAlmocoInicio !== undefined ? t.horaAlmocoInicio : '11:30',
        horaAlmocoFim: t.horaAlmocoFim !== undefined ? t.horaAlmocoFim : '13:00',
        horaFim: t.horaFim || '16:20',
        descricao: t.descricao || '',
        isSaved: t.isSaved !== undefined ? t.isSaved : true,
        itens: Array.isArray(t.itens) ? t.itens.map(i => ({
          id: i.id || Date.now() + Math.random(),
          tipo: i.tipo || i.tp || 'MAT',
          origem: i.origem || (i.tipo === 'EXT' || i.tipo === 'EXTERNA' || i.codigo === 'EXTERNO' ? 'EXTERNA' : 'ESTOQUE'),
          codigo: i.codigo || '',
          descricao: i.descricao || '',
          unidade: i.unidade || (i.tipo === 'HH' ? 'HRS' : i.tipo === 'TRA' ? 'HRS' : i.tipo === 'VEI' ? 'UN' : 'UN'),
          quantidade: i.quantidade !== undefined ? i.quantidade : 1,
          valorUnitario: i.valorUnitario !== undefined ? i.valorUnitario : 0,
          total: i.total !== undefined ? i.total : 0,
          fotoNota: i.fotoNota || ''
        })) : []
      }));
    }

    // 2. Se tiver itensPrestacao antigos, agrupa no Dia #1
    if (Array.isArray(os.itensPrestacao) && os.itensPrestacao.length > 0) {
      const dataPrimeiroItem = os.itensPrestacao[0].dataHora || os.dataInicio || os.data || new Date().toISOString().split('T')[0];
      return [{
        id: Date.now(),
        data: dataPrimeiroItem ? dataPrimeiroItem.split('T')[0] : new Date().toISOString().split('T')[0],
        tipoTurno: os.tipoTurno || 'INTEGRAL',
        horaInicio: os.horaInicio || '07:30',
        horaAlmocoInicio: os.horaAlmocoInicio || '11:30',
        horaAlmocoFim: os.horaAlmocoFim || '13:00',
        horaFim: os.horaFim || '16:20',
        descricao: os.motivo || os.descricao || 'Atendimento de prestação de serviços',
        isSaved: true,
        itens: os.itensPrestacao.map(i => ({
          id: i.id || Date.now() + Math.random(),
          tipo: i.tipo || i.tp || 'MAT',
          origem: i.origem || (i.tipo === 'EXT' || i.tipo === 'EXTERNA' || i.codigo === 'EXTERNO' ? 'EXTERNA' : 'ESTOQUE'),
          codigo: i.codigo || '',
          descricao: i.descricao || '',
          unidade: i.unidade || (i.tipo === 'HH' ? 'HRS' : i.tipo === 'TRA' ? 'HRS' : i.tipo === 'VEI' ? 'UN' : 'UN'),
          quantidade: i.quantidade !== undefined ? i.quantidade : 1,
          valorUnitario: i.valorUnitario !== undefined ? i.valorUnitario : 0,
          total: i.total !== undefined ? i.total : 0,
          fotoNota: i.fotoNota || ''
        }))
      }];
    }

    // 3. Inicialização padrão com 1 dia
    const hoje = new Date().toISOString().split('T')[0];
    return [{
      id: Date.now(),
      data: os.data ? os.data.split('T')[0] : hoje,
      tipoTurno: 'INTEGRAL',
      horaInicio: '07:30',
      horaAlmocoInicio: '11:30',
      horaAlmocoFim: '13:00',
      horaFim: '16:20',
      descricao: '',
      isSaved: false,
      itens: []
    }];
  });

  const [salvando, setSalvando] = useState(false);

  // Listas auxiliares para autocomplete
  const [produtos, setProdutos] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [veiculos, setVeiculos] = useState([]);
  const [custosFuncionarios, setCustosFuncionarios] = useState([]);

  useEffect(() => {
    fetch('/api/produtos')
      .then(res => res.json())
      .then(data => setProdutos(Array.isArray(data) ? data : []))
      .catch(err => console.error('Erro ao buscar produtos:', err));

    fetch('/api/fornecedores')
      .then(res => res.json())
      .then(data => setFornecedores(Array.isArray(data) ? data : []))
      .catch(err => console.error('Erro ao buscar funcionários:', err));

    fetch('/api/veiculos')
      .then(res => res.json())
      .then(data => setVeiculos(Array.isArray(data) ? data : []))
      .catch(err => console.error('Erro ao buscar veículos:', err));

    fetch('/api/custos-funcionarios')
      .then(res => res.json())
      .then(data => setCustosFuncionarios(Array.isArray(data) ? data : []))
      .catch(err => console.error('Erro ao buscar custos funcionários:', err));
  }, []);

  // Mapa rápido de custo hora médio de funcionários
  const mapCustoHoraFuncionario = useMemo(() => {
    const map = new Map();
    custosFuncionarios.forEach(rel => {
      (rel.funcionarios || []).forEach(f => {
        if (f.nome && f.horasTrabalhadas && f.folhaMensal) {
          const h = parseFloat(f.horasTrabalhadas) || 0;
          const folha = parseFloat(f.folhaMensal) || 0;
          if (h > 0 && folha > 0) {
            const vh = parseFloat((folha / h).toFixed(2));
            map.set(f.nome.trim().toUpperCase(), vh);
            if (f.cpf) map.set(f.cpf.trim(), vh);
          }
        }
      });
    });
    return map;
  }, [custosFuncionarios]);

  const handleChangeCabecalho = (e) => {
    const { name, value } = e.target;
    const isDateOrTime = name.includes('data') || name.includes('hora') || name === 'prazo';
    const finalValue = (typeof value === 'string' && !isDateOrTime) ? value.toUpperCase() : value;
    setFormData(prev => ({ ...prev, [name]: finalValue }));
  };

  // Funções de Gestão de Turnos / Dias do Diário de Bordo
  const handleAddTurno = () => {
    const ultimoTurno = turnos[turnos.length - 1];
    let proximaData = new Date().toISOString().split('T')[0];

    if (ultimoTurno && ultimoTurno.data) {
      const dt = new Date(ultimoTurno.data + 'T12:00:00');
      dt.setDate(dt.getDate() + 1);
      proximaData = dt.toISOString().split('T')[0];
    }

    const novoTurno = {
      id: Date.now() + Math.random(),
      data: proximaData,
      tipoTurno: ultimoTurno ? (ultimoTurno.tipoTurno || 'INTEGRAL') : 'INTEGRAL',
      horaInicio: ultimoTurno ? (ultimoTurno.horaInicio || '07:30') : '07:30',
      horaAlmocoInicio: ultimoTurno ? (ultimoTurno.horaAlmocoInicio || '11:30') : '11:30',
      horaAlmocoFim: ultimoTurno ? (ultimoTurno.horaAlmocoFim || '13:00') : '13:00',
      horaFim: ultimoTurno ? (ultimoTurno.horaFim || '16:20') : '16:20',
      descricao: '',
      isSaved: false,
      itens: []
    };

    setTurnos(prev => [...prev, novoTurno]);
  };

  const handleRemoveTurno = (turnoId) => {
    if (turnos.length === 1) {
      alert('A prestação de serviços deve conter pelo menos 1 dia no Diário de Bordo.');
      return;
    }
    if (window.confirm('Tem certeza que deseja remover este dia do Diário de Bordo e todos os seus apontamentos?')) {
      setTurnos(prev => prev.filter(t => t.id !== turnoId));
    }
  };

  const handleUpdateTurno = (turnoId, campo, valor) => {
    setTurnos(prev => prev.map(t => {
      if (t.id !== turnoId) return t;
      return { ...t, [campo]: valor };
    }));
  };

  // Funções de Itens dentro de um Dia Específico
  const handleAddItemAoTurno = (turnoId, tipo = 'MAT', origem = 'ESTOQUE') => {
    const isExterna = origem === 'EXTERNA' || tipo === 'EXT';
    const turnoAtual = turnos.find(t => t.id === turnoId);
    let qtdPadrao = 1;

    if (tipo === 'HH') {
      if (turnoAtual) {
        const { horasDecimais } = calcularHorasTrabalhadas(
          turnoAtual.horaInicio,
          turnoAtual.horaAlmocoInicio,
          turnoAtual.horaAlmocoFim,
          turnoAtual.horaFim,
          turnoAtual.tipoTurno || 'INTEGRAL'
        );
        qtdPadrao = horasDecimais > 0 ? horasDecimais : 7.5;
      } else {
        qtdPadrao = 7.5;
      }
    } else if (tipo === 'TRA') {
      qtdPadrao = 5.0;
    }

    const novoItem = {
      id: Date.now() + Math.random(),
      tipo: isExterna ? 'EXT' : tipo,
      origem: isExterna ? 'EXTERNA' : (tipo === 'MAT' ? 'ESTOQUE' : 'INTERNO'),
      codigo: '',
      descricao: '',
      unidade: tipo === 'HH' ? 'HRS' : tipo === 'TRA' ? 'HRS' : tipo === 'VEI' ? 'UN' : 'UN',
      quantidade: qtdPadrao,
      valorUnitario: 0,
      total: 0,
      fotoNota: ''
    };

    setTurnos(prev => prev.map(t => {
      if (t.id !== turnoId) return t;
      return {
        ...t,
        itens: [...t.itens, novoItem]
      };
    }));
  };

  const handleRemoveItemDoTurno = (turnoId, itemId) => {
    setTurnos(prev => prev.map(t => {
      if (t.id !== turnoId) return t;
      return {
        ...t,
        itens: t.itens.filter(i => i.id !== itemId)
      };
    }));
  };

  const handleUpdateItemDoTurno = (turnoId, itemId, campo, valor) => {
    setTurnos(prev => prev.map(t => {
      if (t.id !== turnoId) return t;
      const novosItens = t.itens.map(item => {
        if (item.id !== itemId) return item;

        // Trava: se for material do estoque Omie, não permite alterar valorUnitario manualmente
        const isExterna = item.origem === 'EXTERNA' || item.tipo === 'EXT' || item.tipo === 'EXTERNA' || item.codigo === 'EXTERNO';
        const isMaterialEstoque = !isExterna && item.tipo === 'MAT';
        if (campo === 'valorUnitario' && isMaterialEstoque) {
          return item;
        }

        const atualizado = { ...item, [campo]: valor };

        if (campo === 'quantidade' || campo === 'valorUnitario') {
          const q = campo === 'quantidade' ? parseFloat(valor) || 0 : parseFloat(item.quantidade) || 0;
          const v = campo === 'valorUnitario' ? parseFloat(valor) || 0 : parseFloat(item.valorUnitario) || 0;
          atualizado.total = parseFloat((q * v).toFixed(2));
        }

        return atualizado;
      });

      return { ...t, itens: novosItens };
    }));
  };

  // Upload da foto do comprovante / NF com compressão automática via Canvas
  const handleUploadFotoComprovante = (turnoId, itemId, e) => {
    const file = e.target.files[0];
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
        handleUpdateItemDoTurno(turnoId, itemId, 'fotoNota', dataUrl);
      };
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Sugestões inteligentes para o item do dia
  const handleSelectSugestao = (turnoId, itemId, tipo, valTexto) => {
    if (!valTexto) return;

    if (tipo === 'HH') {
      const func = fornecedores.find(f => 
        (f.razao_social && f.razao_social.toUpperCase() === valTexto.toUpperCase()) ||
        (f.nome_fantasia && f.nome_fantasia.toUpperCase() === valTexto.toUpperCase()) ||
        (f.cpf && f.cpf === valTexto)
      );

      const codSug = func ? (func.codigo || func.cpf || func.cnpj_cpf || '') : '';
      const vHora = mapCustoHoraFuncionario.get(valTexto.toUpperCase()) || 0;

      setTurnos(prev => prev.map(t => {
        if (t.id !== turnoId) return t;
        return {
          ...t,
          itens: t.itens.map(i => {
            if (i.id !== itemId) return i;
            const q = parseFloat(i.quantidade) || 0;
            const vUni = vHora > 0 ? vHora : i.valorUnitario;
            return {
              ...i,
              descricao: valTexto.toUpperCase(),
              codigo: codSug || i.codigo,
              unidade: 'HRS',
              valorUnitario: vUni,
              total: parseFloat((q * vUni).toFixed(2))
            };
          })
        };
      }));
    } else if (tipo === 'MAT') {
      const prod = produtos.find(p => 
        (p.descricao && p.descricao.toUpperCase() === valTexto.toUpperCase()) ||
        (p.codigo && p.codigo.toUpperCase() === valTexto.toUpperCase())
      );

      if (prod) {
        setTurnos(prev => prev.map(t => {
          if (t.id !== turnoId) return t;
          return {
            ...t,
            itens: t.itens.map(i => {
              if (i.id !== itemId) return i;
              const q = parseFloat(i.quantidade) || 0;
              const vUni = parseFloat(prod.valor_unitario) || i.valorUnitario || 0;
              return {
                ...i,
                codigo: prod.codigo || i.codigo,
                descricao: prod.descricao || valTexto.toUpperCase(),
                unidade: prod.unidade || prod.unidade_medida || prod.unidadeMedida || 'UN',
                valorUnitario: vUni,
                origem: 'ESTOQUE',
                total: parseFloat((q * vUni).toFixed(2))
              };
            })
          };
        }));
      }
    } else if (tipo === 'TRA' || tipo === 'VEI') {
      const veic = veiculos.find(v => 
        (v.placa && v.placa.toUpperCase() === valTexto.toUpperCase()) ||
        (v.modelo && `${v.placa} - ${v.modelo}`.toUpperCase() === valTexto.toUpperCase())
      );

      if (veic) {
        setTurnos(prev => prev.map(t => {
          if (t.id !== turnoId) return t;
          return {
            ...t,
            itens: t.itens.map(i => {
              if (i.id !== itemId) return i;
              return {
                ...i,
                codigo: veic.placa || i.codigo,
                unidade: tipo === 'TRA' ? 'HRS' : 'UN',
                descricao: veic.modelo ? `${veic.modelo} (${veic.placa})` : (veic.placa || valTexto.toUpperCase())
              };
            })
          };
        }));
      }
    }
  };

  // Consolidação de todos os itens de todos os dias
  const todosItensConsolidados = useMemo(() => {
    const lista = [];
    turnos.forEach((t, tIdx) => {
      (t.itens || []).forEach(item => {
        const isExterna = item.origem === 'EXTERNA' || item.tipo === 'EXT' || item.tipo === 'EXTERNA' || item.codigo === 'EXTERNO';
        lista.push({
          ...item,
          turnoId: t.id,
          diaNumero: tIdx + 1,
          dataHora: t.data,
          tipo: isExterna ? (item.tipo === 'MAT' ? 'EXT' : item.tipo) : item.tipo,
          origem: isExterna ? 'EXTERNA' : (item.tipo === 'MAT' ? 'ESTOQUE' : (item.origem || 'INTERNO')),
          fotoNota: item.fotoNota || ''
        });
      });
    });
    // Ordena cronologicamente por data do turno
    return lista.sort((a, b) => (a.dataHora || '').localeCompare(b.dataHora || ''));
  }, [turnos]);

  // Cálculos Financeiros
  const totalHH = useMemo(() => {
    return todosItensConsolidados
      .filter(i => i.tipo === 'HH')
      .reduce((acc, i) => acc + (parseFloat(i.total) || 0), 0);
  }, [todosItensConsolidados]);

  const totalTRA = useMemo(() => {
    return todosItensConsolidados
      .filter(i => i.tipo === 'TRA')
      .reduce((acc, i) => acc + (parseFloat(i.total) || 0), 0);
  }, [todosItensConsolidados]);

  const totalMAT = useMemo(() => {
    return todosItensConsolidados
      .filter(i => i.tipo === 'MAT' && i.origem !== 'EXTERNA')
      .reduce((acc, i) => acc + (parseFloat(i.total) || 0), 0);
  }, [todosItensConsolidados]);

  const totalEXT = useMemo(() => {
    return todosItensConsolidados
      .filter(i => i.tipo === 'EXT' || i.origem === 'EXTERNA')
      .reduce((acc, i) => acc + (parseFloat(i.total) || 0), 0);
  }, [todosItensConsolidados]);

  const totalVEI = useMemo(() => {
    return todosItensConsolidados
      .filter(i => i.tipo === 'VEI')
      .reduce((acc, i) => acc + (parseFloat(i.total) || 0), 0);
  }, [todosItensConsolidados]);

  const totalGeral = useMemo(() => {
    return todosItensConsolidados.reduce((acc, i) => acc + (parseFloat(i.total) || 0), 0);
  }, [todosItensConsolidados]);

  // Período Calculado do Diário de Bordo
  const periodoCalculado = useMemo(() => {
    if (turnos.length === 0) return { inicio: '', fim: '' };
    const primeiro = turnos[0];
    const ultimo = turnos[turnos.length - 1];

    return {
      dataInicio: primeiro.data,
      horaInicio: primeiro.horaInicio || '07:30',
      dataFim: ultimo.data,
      horaFim: ultimo.horaFim || '16:20',
      horaAlmocoInicio: primeiro.horaAlmocoInicio || '11:30',
      horaAlmocoFim: primeiro.horaAlmocoFim || '13:00',
      inicioTexto: primeiro.data ? `${formatarDataBR(primeiro.data)} às ${primeiro.horaInicio || '07:30'}` : '-',
      fimTexto: ultimo.data ? `${formatarDataBR(ultimo.data)} às ${ultimo.horaFim || '16:20'}` : '-'
    };
  }, [turnos]);

  // Salvar no Banco
  const handleSalvar = async () => {
    setSalvando(true);
    try {
      const situacaoSalvar = formData.resultado === 'EXECUTADA' ? 'CONCLUIDO' : 'EM_ANDAMENTO';

      const payload = {
        ...formData,
        dataInicio: periodoCalculado.dataInicio || os.dataInicio,
        horaInicio: periodoCalculado.horaInicio || os.horaInicio,
        dataFim: periodoCalculado.dataFim || os.dataFim,
        horaFim: periodoCalculado.horaFim || os.horaFim,
        turnosPrestacao: turnos.map(t => ({
          ...t,
          horaFim1: t.horaAlmocoInicio || t.horaFim1 || '11:30',
          horaInicio2: t.horaAlmocoFim || t.horaInicio2 || '13:00'
        })),
        itensPrestacao: todosItensConsolidados,
        valorEstimado: totalGeral,
        situacao: situacaoSalvar,
        editorResponsavel: localStorage.getItem('almoxarifado_user') 
          ? JSON.parse(localStorage.getItem('almoxarifado_user')).nome || 'Operador'
          : 'Operador'
      };

      const response = await fetch(`/api/os/${encodeURIComponent(os.codigo)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('Falha ao salvar as informações da prestação de serviços.');
      }

      const resData = await response.json();
      if (onUpdateOS) {
        onUpdateOS(resData.os);
      }
      alert('Prestação de Serviços atualizada com sucesso!');
      if (onClose) onClose();
    } catch (err) {
      console.error(err);
      alert(err.message || 'Erro ao salvar. Verifique a conexão com o servidor.');
    } finally {
      setSalvando(false);
    }
  };

  const handleDispararImpressao = () => {
    if (onPrint) {
      const osParaImprimir = {
        ...os,
        ...formData,
        dataInicio: periodoCalculado.dataInicio,
        horaInicio: periodoCalculado.horaInicio,
        dataFim: periodoCalculado.dataFim,
        horaFim: periodoCalculado.horaFim,
        turnosPrestacao: turnos.map(t => ({
          ...t,
          horaFim1: t.horaAlmocoInicio || t.horaFim1 || '11:30',
          horaInicio2: t.horaAlmocoFim || t.horaInicio2 || '13:00'
        })),
        itensPrestacao: todosItensConsolidados,
        valorEstimado: totalGeral
      };
      onPrint(osParaImprimir);
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerTitle}>
            <h2>Prestação de Serviço - Granjas</h2>
            <span className={styles.codigoBadge}>OS #{os.codigo}</span>
            <span style={{ fontSize: '0.85rem', color: 'var(--cor-texto-secundario)', marginLeft: '8px' }}>
              ({turnos.length} {turnos.length === 1 ? 'Dia de Atendimento' : 'Dias de Atendimento'})
            </span>
          </div>
          <button type="button" className={styles.closeButton} onClick={onClose} title="Fechar">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className={styles.body}>
          {/* Card: Dados Gerais do Atendimento */}
          <div className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>
                <Clock size={16} color="var(--cor-destaque)" />
                Dados do Atendimento & Granja Destino
              </h3>
              <div style={{ fontSize: '0.8rem', color: 'var(--cor-texto-secundario)' }}>
                <strong>Período Total do Diário:</strong> {periodoCalculado.inicioTexto} até {periodoCalculado.fimTexto}
              </div>
            </div>

            <div className={styles.gridCampos}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Unidade Destino (Granja)</label>
                <input
                  type="text"
                  className={styles.input}
                  name="centroCusto"
                  value={formData.centroCusto}
                  onChange={handleChangeCabecalho}
                  list="lista-granjas-modal"
                  placeholder="Selecione a Granja"
                  required
                />
                <datalist id="lista-granjas-modal">
                  {LISTA_GRANJAS.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </datalist>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Requisitante</label>
                <input
                  type="text"
                  className={styles.input}
                  name="requisitante"
                  value={formData.requisitante}
                  onChange={handleChangeCabecalho}
                  placeholder="Ex: MONTEIRO"
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Responsável (Líder)</label>
                <input
                  type="text"
                  className={styles.input}
                  name="executor"
                  value={formData.executor}
                  onChange={handleChangeCabecalho}
                  placeholder="Ex: JOÃO EVARISTO"
                  list="lista-funcionarios-exec"
                />
                <datalist id="lista-funcionarios-exec">
                  {fornecedores.map((f, i) => (
                    <option key={`f-${i}`} value={f.razao_social || f.nome_fantasia}>
                      {f.razao_social || f.nome_fantasia}
                    </option>
                  ))}
                </datalist>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Ficha / Setor</label>
                <input
                  type="text"
                  className={styles.input}
                  name="setor"
                  value={formData.setor}
                  onChange={handleChangeCabecalho}
                  placeholder="Ex: SLD"
                />
              </div>

              <div className={styles.formGroup} style={{ gridColumn: 'span 2' }}>
                <label className={styles.label}>Requisição / Atendimento (Serviço)</label>
                <input
                  type="text"
                  className={styles.input}
                  name="motivo"
                  value={formData.motivo}
                  onChange={handleChangeCabecalho}
                  placeholder="Ex: LIMPEZA ENTRE LOTES"
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Resultado</label>
                <select
                  className={styles.select}
                  name="resultado"
                  value={formData.resultado}
                  onChange={handleChangeCabecalho}
                >
                  <option value="EXECUTADA">EXECUTADA</option>
                  <option value="EM ANDAMENTO">EM ANDAMENTO</option>
                  <option value="PENDENTE">PENDENTE</option>
                  <option value="CANCELADA">CANCELADA</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Data Limite (Prazo)</label>
                <input
                  type="date"
                  className={styles.input}
                  name="prazo"
                  value={formData.prazo}
                  onChange={handleChangeCabecalho}
                />
              </div>
            </div>
          </div>

          {/* Barra de Abas do Módulo: Diário de Bordo vs Extrato Geral */}
          <div className={styles.navTabsContainer}>
            <div className={styles.tabsGroup}>
              <button
                type="button"
                className={`${styles.tabBtn} ${abaAtiva === 'diario' ? styles.tabBtnActive : ''}`}
                onClick={() => setAbaAtiva('diario')}
              >
                <Calendar size={16} />
                Diário de Bordo por Dias ({turnos.length})
              </button>

              <button
                type="button"
                className={`${styles.tabBtn} ${abaAtiva === 'extrato' ? styles.tabBtnActive : ''}`}
                onClick={() => setAbaAtiva('extrato')}
              >
                <FileText size={16} />
                Extrato Geral Consolidado ({todosItensConsolidados.length} Itens)
              </button>
            </div>

            {abaAtiva === 'diario' && (
              <button
                type="button"
                className={styles.btnAdicionarDia}
                onClick={handleAddTurno}
                title="Adicionar Novo Dia de Atendimento"
              >
                <Plus size={16} />
                + Adicionar Dia / Turno
              </button>
            )}
          </div>

          {/* VISÃO 1: DIÁRIO DE BORDO (CARDS DIA A DIA) */}
          {abaAtiva === 'diario' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {turnos.map((turno, tIdx) => {
                const totalTurno = (turno.itens || []).reduce((acc, item) => acc + (parseFloat(item.total) || 0), 0);

                return (
                  <div key={turno.id} className={styles.turnoCard}>
                    {/* Cabeçalho do Dia */}
                    <div className={styles.turnoHeader}>
                      <div className={styles.turnoHeaderLeft}>
                        <span className={styles.badgeDia}>
                          <Calendar size={14} />
                          Dia #{tIdx + 1} - {formatarDataBR(turno.data)}
                        </span>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--cor-texto-secundario)' }}>Data:</span>
                          <input
                            type="date"
                            className={styles.input}
                            style={{ padding: '3px 8px', fontSize: '0.8rem', width: 'auto' }}
                            value={turno.data}
                            onChange={(e) => handleUpdateTurno(turno.id, 'data', e.target.value)}
                          />
                        </div>
                      </div>

                      <div className={styles.turnoHeaderActions}>
                        <button
                          type="button"
                          className={styles.btnRemoverDia}
                          onClick={() => handleRemoveTurno(turno.id)}
                          title="Remover este dia do Diário"
                        >
                          <Trash2 size={13} />
                          Excluir Dia #{tIdx + 1}
                        </button>
                      </div>
                    </div>

                    {/* Linha de Horários com Seletor de Período (Dia Todo / Só Manhã / Só Tarde / Contínuo) */}
                    {(() => {
                      const modo = turno.tipoTurno || 'INTEGRAL';
                      const { horasDecimais, textoFormatado } = calcularHorasTrabalhadas(
                        turno.horaInicio,
                        turno.horaAlmocoInicio,
                        turno.horaAlmocoFim,
                        turno.horaFim,
                        modo
                      );

                      return (
                        <div className={styles.horariosCardLinha}>
                          {/* Seletor de Período */}
                          <div className={styles.tipoTurnoSelector}>
                            <button
                              type="button"
                              className={`${styles.btnTipoTurno} ${modo === 'INTEGRAL' ? styles.btnTipoTurnoActive : ''}`}
                              onClick={() => handleUpdateTurno(turno.id, 'tipoTurno', 'INTEGRAL')}
                              title="Dia todo com pausa para almoço (Manhã + Tarde)"
                            >
                              Dia Todo (Almoço)
                            </button>
                            <button
                              type="button"
                              className={`${styles.btnTipoTurno} ${modo === 'MANHA' ? styles.btnTipoTurnoActive : ''}`}
                              onClick={() => handleUpdateTurno(turno.id, 'tipoTurno', 'MANHA')}
                              title="Atendimento realizado apenas pela manhã"
                            >
                              Só Manhã
                            </button>
                            <button
                              type="button"
                              className={`${styles.btnTipoTurno} ${modo === 'TARDE' ? styles.btnTipoTurnoActive : ''}`}
                              onClick={() => handleUpdateTurno(turno.id, 'tipoTurno', 'TARDE')}
                              title="Atendimento realizado apenas pela tarde"
                            >
                              Só Tarde
                            </button>
                            <button
                              type="button"
                              className={`${styles.btnTipoTurno} ${modo === 'CONTINUO' ? styles.btnTipoTurnoActive : ''}`}
                              onClick={() => handleUpdateTurno(turno.id, 'tipoTurno', 'CONTINUO')}
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
                                  style={{ padding: '3px 6px', fontSize: '0.8rem', width: 'auto' }}
                                  value={turno.horaInicio || '07:30'}
                                  onChange={(e) => handleUpdateTurno(turno.id, 'horaInicio', e.target.value)}
                                  title="Horário de Entrada (Manhã)"
                                />
                                <span className={styles.horarioAte}>até</span>
                                <input
                                  type="time"
                                  className={styles.input}
                                  style={{ padding: '3px 6px', fontSize: '0.8rem', width: 'auto' }}
                                  value={turno.horaAlmocoInicio || '11:30'}
                                  onChange={(e) => handleUpdateTurno(turno.id, 'horaAlmocoInicio', e.target.value)}
                                  title="Saída para Almoço"
                                />
                              </div>

                              <span className={styles.horarioDivisor}>|</span>

                              <div className={styles.horarioItem}>
                                <span className={styles.horarioSubLabel}>Tarde:</span>
                                <input
                                  type="time"
                                  className={styles.input}
                                  style={{ padding: '3px 6px', fontSize: '0.8rem', width: 'auto' }}
                                  value={turno.horaAlmocoFim || '13:00'}
                                  onChange={(e) => handleUpdateTurno(turno.id, 'horaAlmocoFim', e.target.value)}
                                  title="Retorno do Almoço"
                                />
                                <span className={styles.horarioAte}>até</span>
                                <input
                                  type="time"
                                  className={styles.input}
                                  style={{ padding: '3px 6px', fontSize: '0.8rem', width: 'auto' }}
                                  value={turno.horaFim || '16:20'}
                                  onChange={(e) => handleUpdateTurno(turno.id, 'horaFim', e.target.value)}
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
                                style={{ padding: '3px 6px', fontSize: '0.8rem', width: 'auto' }}
                                value={turno.horaInicio || '07:30'}
                                onChange={(e) => handleUpdateTurno(turno.id, 'horaInicio', e.target.value)}
                                title="Entrada Manhã"
                              />
                              <span className={styles.horarioAte}>até</span>
                              <input
                                type="time"
                                className={styles.input}
                                style={{ padding: '3px 6px', fontSize: '0.8rem', width: 'auto' }}
                                value={turno.horaAlmocoInicio || '11:30'}
                                onChange={(e) => handleUpdateTurno(turno.id, 'horaAlmocoInicio', e.target.value)}
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
                                style={{ padding: '3px 6px', fontSize: '0.8rem', width: 'auto' }}
                                value={turno.horaAlmocoFim || '13:00'}
                                onChange={(e) => handleUpdateTurno(turno.id, 'horaAlmocoFim', e.target.value)}
                                title="Início Tarde"
                              />
                              <span className={styles.horarioAte}>até</span>
                              <input
                                type="time"
                                className={styles.input}
                                style={{ padding: '3px 6px', fontSize: '0.8rem', width: 'auto' }}
                                value={turno.horaFim || '16:20'}
                                onChange={(e) => handleUpdateTurno(turno.id, 'horaFim', e.target.value)}
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
                                style={{ padding: '3px 6px', fontSize: '0.8rem', width: 'auto' }}
                                value={turno.horaInicio || '07:00'}
                                onChange={(e) => handleUpdateTurno(turno.id, 'horaInicio', e.target.value)}
                                title="Horário de Início"
                              />
                              <span className={styles.horarioAte}>até</span>
                              <input
                                type="time"
                                className={styles.input}
                                style={{ padding: '3px 6px', fontSize: '0.8rem', width: 'auto' }}
                                value={turno.horaFim || '13:00'}
                                onChange={(e) => handleUpdateTurno(turno.id, 'horaFim', e.target.value)}
                                title="Horário de Término"
                              />
                            </div>
                          )}

                          {/* Badge de Horas Trabalhadas Calculadas */}
                          <div className={styles.badgeHorasDia} title="Total de Horas Trabalhadas no período">
                            <Clock size={13} />
                            <span>Total Efetivo: {textoFormatado} ({horasDecimais} hrs)</span>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Descrição do que foi feito no dia */}
                    <div className={styles.formGroup}>
                      <label className={styles.label}>O que foi realizado neste dia #{tIdx + 1}:</label>
                      <textarea
                        className={styles.textarea}
                        rows={2}
                        placeholder="Ex: Aplicação de cal no lote 3, gradeação da área externa..."
                        value={turno.descricao}
                        onChange={(e) => handleUpdateTurno(turno.id, 'descricao', e.target.value)}
                      />
                    </div>

                    {/* Botões de Ação para adicionar Recursos neste dia */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                      <span className={styles.label}>Recursos Utilizados no Dia #{tIdx + 1}:</span>
                      <div className={styles.btnGroupAdd}>
                        <button
                          type="button"
                          className={styles.btnAddItem}
                          onClick={() => handleAddItemAoTurno(turno.id, 'HH')}
                          title="Adicionar Horas de Funcionário neste dia"
                        >
                          <User size={13} color="#3b82f6" />
                          + HH (Homem-Hora)
                        </button>

                        <button
                          type="button"
                          className={styles.btnAddItem}
                          onClick={() => handleAddItemAoTurno(turno.id, 'TRA')}
                          title="Adicionar Trator / Máquina neste dia"
                        >
                          <Wrench size={13} color="#f59e0b" />
                          + TRA (Trator)
                        </button>

                        <button
                          type="button"
                          className={styles.btnAddItem}
                          onClick={() => handleAddItemAoTurno(turno.id, 'MAT', 'ESTOQUE')}
                          title="Adicionar Materiais do Estoque da Empresa"
                        >
                          <Package size={13} color="#10b981" />
                          + MAT (Estoque Omie)
                        </button>

                        {/* Botão Dedicado para Peça / Compra Externa com Comprovante */}
                        <button
                          type="button"
                          className={styles.btnAddItem}
                          onClick={() => handleAddItemAoTurno(turno.id, 'MAT', 'EXTERNA')}
                          title="Adicionar Peça ou Material Comprado Fora (com NF/Cupom)"
                          style={{ borderColor: 'rgba(245, 158, 11, 0.5)', backgroundColor: 'rgba(245, 158, 11, 0.08)' }}
                        >
                          <Camera size={13} color="#d97706" />
                          + Peça Externa (com NF)
                        </button>

                        <button
                          type="button"
                          className={styles.btnAddItem}
                          onClick={() => handleAddItemAoTurno(turno.id, 'VEI')}
                          title="Adicionar Veículo / Apoio neste dia"
                        >
                          <Truck size={13} color="#8b5cf6" />
                          + VEI (Veículo)
                        </button>
                      </div>
                    </div>

                    {/* Tabela de Recursos do Dia */}
                    <div className={styles.tableContainer}>
                      <table className={styles.tableItens}>
                        <thead>
                          <tr>
                            <th style={{ width: '6%' }}>Tp</th>
                            <th style={{ width: '12%' }}>Código</th>
                            <th style={{ width: '28%' }}>Descrição do Recurso / Consumível</th>
                            <th style={{ width: '12%', textAlign: 'right' }}>Quant.</th>
                            <th style={{ width: '12%', textAlign: 'right' }}>$/UNI</th>
                            <th style={{ width: '12%', textAlign: 'right' }}>TOTAL</th>
                            <th style={{ width: '14%', textAlign: 'center' }}>Comprovante / NF</th>
                            <th style={{ width: '4%', textAlign: 'center' }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {(!turno.itens || turno.itens.length === 0) ? (
                            <tr>
                              <td colSpan="8" style={{ textAlign: 'center', padding: '16px', color: 'var(--cor-texto-secundario)' }}>
                                Nenhum recurso lançado no Dia #{tIdx + 1}. Clique nos botões acima para adicionar (HH, TRA, MAT Estoque, Peça Externa ou VEI).
                              </td>
                            </tr>
                          ) : (
                            turno.itens.map(item => {
                              const isExterna = item.origem === 'EXTERNA' || item.tipo === 'EXT' || item.tipo === 'EXTERNA' || item.codigo === 'EXTERNO';
                              const badgeClass = 
                                item.tipo === 'HH' ? styles.badgeHH :
                                item.tipo === 'TRA' ? styles.badgeTRA :
                                (item.tipo === 'EXT' || isExterna) ? styles.badgeEXT :
                                item.tipo === 'VEI' ? styles.badgeVEI : styles.badgeMAT;

                              return (
                                <tr key={item.id}>
                                  <td>
                                    <select
                                      className={`${styles.inputTable} ${badgeClass}`}
                                      value={isExterna ? 'EXT' : item.tipo}
                                      onChange={(e) => {
                                        const novoTipo = e.target.value;
                                        handleUpdateItemDoTurno(turno.id, item.id, 'tipo', novoTipo);
                                        if (novoTipo === 'EXT') {
                                          handleUpdateItemDoTurno(turno.id, item.id, 'origem', 'EXTERNA');
                                        } else if (novoTipo === 'MAT') {
                                          handleUpdateItemDoTurno(turno.id, item.id, 'origem', 'ESTOQUE');
                                        } else {
                                          handleUpdateItemDoTurno(turno.id, item.id, 'origem', 'INTERNO');
                                        }
                                      }}
                                    >
                                      <option value="HH">HH</option>
                                      <option value="TRA">TRA</option>
                                      <option value="MAT">MAT</option>
                                      <option value="EXT">EXT</option>
                                      <option value="VEI">VEI</option>
                                    </select>
                                  </td>

                                  <td>
                                    <input
                                      type="text"
                                      className={styles.inputTable}
                                      value={item.codigo || ''}
                                      onChange={(e) => handleUpdateItemDoTurno(turno.id, item.id, 'codigo', e.target.value.toUpperCase())}
                                      placeholder={isExterna ? "Nº NF/Cupom" : "Cód."}
                                    />
                                  </td>

                                  <td>
                                    <div style={{ position: 'relative', width: '100%' }}>
                                      <input
                                        type="text"
                                        className={styles.inputTable}
                                        style={{
                                          paddingRight: isExterna ? '110px' : '8px',
                                          borderColor: isExterna ? 'rgba(217, 119, 6, 0.4)' : undefined
                                        }}
                                        value={item.descricao || ''}
                                        onChange={(e) => {
                                          handleUpdateItemDoTurno(turno.id, item.id, 'descricao', e.target.value.toUpperCase());
                                          if (!isExterna) {
                                            handleSelectSugestao(turno.id, item.id, item.tipo, e.target.value);
                                          }
                                        }}
                                        list={!isExterna ? `datalist-turno-${turno.id}-${item.id}` : undefined}
                                        placeholder={
                                          isExterna ? "Ex: ÓLEO, FILTRO, PEÇA..." :
                                          item.tipo === 'HH' ? "Nome do Funcionário..." :
                                          item.tipo === 'TRA' ? "Ex: TRATOR JOHN DEERE..." :
                                          item.tipo === 'VEI' ? "Ex: VM 330 8X2R..." : "Ex: CAL EM PÓ..."
                                        }
                                      />
                                      {isExterna && (
                                        <span 
                                          className={styles.badgeOrigemExterna} 
                                          style={{
                                            position: 'absolute',
                                            right: '6px',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            pointerEvents: 'none'
                                          }}
                                        >
                                          <ShoppingBag size={10} /> Compra Externa
                                        </span>
                                      )}
                                    </div>
                                    {!isExterna && (
                                      <datalist id={`datalist-turno-${turno.id}-${item.id}`}>
                                        {item.tipo === 'HH' && fornecedores.map((f, i) => (
                                          <option key={`h-${i}`} value={f.razao_social || f.nome_fantasia}>
                                            {f.cpf ? `CPF: ${f.cpf}` : ''}
                                          </option>
                                        ))}
                                        {item.tipo === 'MAT' && produtos.map((p, i) => (
                                          <option key={`p-${i}`} value={p.descricao}>
                                            {p.codigo ? `Cód: ${p.codigo}` : ''} {isAdmin && p.valor_unitario ? `(R$ ${p.valor_unitario})` : ''}
                                          </option>
                                        ))}
                                        {(item.tipo === 'TRA' || item.tipo === 'VEI') && veiculos.map((v, i) => (
                                          <option key={`v-${i}`} value={v.modelo ? `${v.modelo} (${v.placa})` : v.placa}>
                                            {v.placa}
                                          </option>
                                        ))}
                                      </datalist>
                                    )}
                                  </td>

                                  <td>
                                    {(() => {
                                      const unRotulo = item.tipo === 'HH' ? 'h' :
                                                       item.tipo === 'TRA' ? 'h' :
                                                       item.tipo === 'VEI' ? 'un' :
                                                       obterRotuloUnidade(item.unidade);
                                      const aceitaDecimais = item.tipo === 'HH' || item.tipo === 'TRA' || permiteDecimais(item.unidade);

                                      return (
                                        <div className={styles.quantidadeInputGroup}>
                                          <input
                                            type="number"
                                            step={aceitaDecimais ? "0.01" : "1"}
                                            min="0"
                                            className={styles.inputTable}
                                            style={{ textAlign: 'right' }}
                                            value={item.quantidade}
                                            onChange={(e) => handleUpdateItemDoTurno(turno.id, item.id, 'quantidade', e.target.value)}
                                            onWheel={(e) => e.target.blur()}
                                          />
                                          {isExterna ? (
                                            <select
                                              className={styles.selectUnidade}
                                              value={(item.unidade || 'UN').toUpperCase()}
                                              onChange={(e) => handleUpdateItemDoTurno(turno.id, item.id, 'unidade', e.target.value)}
                                              title="Selecione a Unidade de Medida (Unidade, Quilo, Litro, Metro, Caixa, Peça)"
                                            >
                                              <option value="UN">un</option>
                                              <option value="KG">kg</option>
                                              <option value="L">L</option>
                                              <option value="M">m</option>
                                              <option value="PC">pç</option>
                                              <option value="CX">cx</option>
                                            </select>
                                          ) : (
                                            <span className={styles.badgeUnidade} title={item.unidade ? `Unidade: ${item.unidade}` : 'Unidade'}>
                                              {unRotulo}
                                            </span>
                                          )}
                                        </div>
                                      );
                                    })()}
                                  </td>

                                  <td>
                                    {(() => {
                                      const isMaterialEstoque = !isExterna && item.tipo === 'MAT';
                                      if (isMaterialEstoque && !isAdmin) {
                                        return (
                                          <div style={{ textAlign: 'center', color: 'var(--cor-texto-secundario)', fontStyle: 'italic', fontSize: '0.8rem' }} title="Valor confidencial do estoque Omie">
                                            —
                                          </div>
                                        );
                                      }

                                      return (
                                        <input
                                          type="number"
                                          step="0.01"
                                          className={styles.inputTable}
                                          style={{
                                            textAlign: 'right',
                                            fontWeight: isExterna ? 'bold' : 'normal',
                                            color: isExterna ? 'var(--cor-destaque)' : 'inherit',
                                            backgroundColor: isMaterialEstoque ? 'var(--cor-fundo-sutil)' : undefined,
                                            cursor: isMaterialEstoque ? 'not-allowed' : undefined,
                                            opacity: isMaterialEstoque ? 0.85 : 1
                                          }}
                                          value={item.valorUnitario !== undefined && item.valorUnitario !== null ? item.valorUnitario : ''}
                                          onChange={(e) => {
                                            if (isMaterialEstoque) return;
                                            handleUpdateItemDoTurno(turno.id, item.id, 'valorUnitario', e.target.value);
                                          }}
                                          onFocus={(e) => e.target.select()}
                                          placeholder="0,00"
                                          disabled={isMaterialEstoque}
                                          readOnly={isMaterialEstoque}
                                          title={isMaterialEstoque ? "Valor oficial do estoque Omie (bloqueado para edição)" : "Valor unitário ($/UNI)"}
                                        />
                                      );
                                    })()}
                                  </td>

                                  <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                                    {!isAdmin ? (
                                      <span style={{ color: 'var(--cor-texto-secundario)', fontStyle: 'italic', fontSize: '0.8rem' }} title="Resultado do valor final visível apenas para Admin">
                                        —
                                      </span>
                                    ) : (
                                      `R$ ${(parseFloat(item.total) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                    )}
                                  </td>

                                  {/* Coluna de Comprovante / Foto da NF */}
                                  <td style={{ textAlign: 'center' }}>
                                    {isExterna ? (
                                      item.fotoNota ? (
                                        <div className={styles.fotoNotaContainer}>
                                          <img
                                            src={item.fotoNota}
                                            alt="Comprovante"
                                            className={styles.miniaturaFotoNota}
                                            onClick={() => setFotoVisualizando(item.fotoNota)}
                                            title="Clique para ampliar o comprovante"
                                          />
                                          <button
                                            type="button"
                                            className={styles.btnFotoNotaVer}
                                            onClick={() => setFotoVisualizando(item.fotoNota)}
                                            title="Visualizar Comprovante"
                                          >
                                            <Eye size={11} /> Ver
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleUpdateItemDoTurno(turno.id, item.id, 'fotoNota', '')}
                                            title="Remover foto"
                                            style={{ background: 'none', border: 'none', color: 'var(--cor-erro)', cursor: 'pointer', padding: '2px' }}
                                          >
                                            <Trash2 size={12} />
                                          </button>
                                        </div>
                                      ) : (
                                        <label className={styles.btnFotoNotaAnexo} title="Anexar foto da Nota Fiscal ou Cupom">
                                          <Camera size={12} /> Anexar NF
                                          <input
                                            type="file"
                                            accept="image/*"
                                            capture="environment"
                                            style={{ display: 'none' }}
                                            onChange={(e) => handleUploadFotoComprovante(turno.id, item.id, e)}
                                          />
                                        </label>
                                      )
                                    ) : (
                                      <span style={{ fontSize: '0.72rem', color: 'var(--cor-texto-secundario)' }}>Estoque</span>
                                    )}
                                  </td>

                                  <td style={{ textAlign: 'center' }}>
                                    <button
                                      type="button"
                                      className={styles.btnRemoverLinha}
                                      onClick={() => handleRemoveItemDoTurno(turno.id, item.id)}
                                      title="Remover linha"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Subtotal do Dia (Somente Admin) */}
                    {isAdmin && (
                      <div className={styles.subtotalDiaCard}>
                        <span>Subtotal Dia #{tIdx + 1} ({formatarDataBR(turno.data)}):</span>
                        <span className={styles.subtotalDiaValor}>
                          R$ {totalTurno.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* VISÃO 2: EXTRATO GERAL CONSOLIDADO (TODOS OS DIAS) */}
          {abaAtiva === 'extrato' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className={styles.sectionHeader} style={{ marginBottom: '4px' }}>
                <span className={styles.label}>Extrato de Recursos Cobrados de Todos os Dias (Ordem Cronológica):</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--cor-texto-secundario)' }}>
                  Total de {todosItensConsolidados.length} itens distribuídos em {turnos.length} dias
                </span>
              </div>

              <div className={styles.tableContainer}>
                <table className={styles.tableItens}>
                  <thead>
                    <tr>
                      <th style={{ width: '11%' }}>Data Hora</th>
                      <th style={{ width: '6%' }}>Dia</th>
                      <th style={{ width: '6%' }}>Tp</th>
                      <th style={{ width: '12%' }}>Código</th>
                      <th style={{ width: '28%' }}>Descrição do Recurso / Consumível</th>
                      <th style={{ width: '9%', textAlign: 'right' }}>Quant.</th>
                      <th style={{ width: '11%', textAlign: 'right' }}>$/UNI</th>
                      <th style={{ width: '11%', textAlign: 'right' }}>TOTAL</th>
                      <th style={{ width: '6%', textAlign: 'center' }}>Comprovante</th>
                    </tr>
                  </thead>
                  <tbody>
                    {todosItensConsolidados.length === 0 ? (
                      <tr>
                        <td colSpan="9" style={{ textAlign: 'center', padding: '24px', color: 'var(--cor-texto-secundario)' }}>
                          Nenhum recurso lançado no Diário de Bordo.
                        </td>
                      </tr>
                    ) : (
                      todosItensConsolidados.map((item, idx) => {
                        const isExterna = item.origem === 'EXTERNA' || item.tipo === 'EXTERNA' || item.codigo === 'EXTERNO';
                        const badgeClass = 
                          item.tipo === 'HH' ? styles.badgeHH :
                          item.tipo === 'TRA' ? styles.badgeTRA :
                          item.tipo === 'VEI' ? styles.badgeVEI : styles.badgeMAT;

                        return (
                          <tr key={idx}>
                            <td>{formatarDataBR(item.dataHora)}</td>
                            <td>
                              <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--cor-destaque)' }}>
                                Dia #{item.diaNumero}
                              </span>
                            </td>
                            <td>
                              <span className={`${styles.badgeTp} ${badgeClass}`}>{item.tipo}</span>
                            </td>
                            <td style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{item.codigo || '-'}</td>
                            <td>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <strong>{item.descricao || '-'}</strong>
                                {isExterna && (
                                  <span className={styles.badgeOrigemExterna} style={{ alignSelf: 'flex-start' }}>
                                    <ShoppingBag size={9} /> Compra Externa
                                  </span>
                                )}
                              </div>
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                              {(() => {
                                const unRotulo = item.tipo === 'HH' ? 'h' :
                                                 item.tipo === 'TRA' ? 'h' :
                                                 item.tipo === 'VEI' ? 'un' :
                                                 obterRotuloUnidade(item.unidade);
                                const qFormatada = Number.isInteger(parseFloat(item.quantidade)) 
                                  ? item.quantidade 
                                  : parseFloat(item.quantidade).toFixed(2).replace('.', ',');
                                return (
                                  <span>
                                    {qFormatada} <span style={{ fontSize: '0.75rem', color: 'var(--cor-destaque)', fontWeight: 'bold' }}>{unRotulo}</span>
                                  </span>
                                );
                              })()}
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              {(() => {
                                const isMaterialEstoque = !isExterna && item.tipo === 'MAT';
                                if (isMaterialEstoque && !isAdmin) {
                                  return (
                                    <span style={{ color: 'var(--cor-texto-secundario)', fontStyle: 'italic', fontSize: '0.8rem' }} title="Valor confidencial do estoque Omie">
                                      —
                                    </span>
                                  );
                                }
                                return `R$ ${(parseFloat(item.valorUnitario) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                              })()}
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                              {!isAdmin ? (
                                <span style={{ color: 'var(--cor-texto-secundario)', fontStyle: 'italic', fontSize: '0.8rem' }} title="Resultado do valor final visível apenas para Admin">
                                  —
                                </span>
                              ) : (
                                `R$ ${(parseFloat(item.total) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                              )}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              {item.fotoNota ? (
                                <div className={styles.fotoNotaContainer} style={{ justifyContent: 'center' }}>
                                  <img
                                    src={item.fotoNota}
                                    alt="NF"
                                    className={styles.miniaturaFotoNota}
                                    onClick={() => setFotoVisualizando(item.fotoNota)}
                                    title="Clique para ampliar"
                                  />
                                  <button
                                    type="button"
                                    className={styles.btnFotoNotaVer}
                                    onClick={() => setFotoVisualizando(item.fotoNota)}
                                  >
                                    <Eye size={11} /> Ver
                                  </button>
                                </div>
                              ) : isExterna ? (
                                <label className={styles.btnFotoNotaAnexo} style={{ cursor: 'pointer' }} title="Anexar foto da Nota Fiscal ou Cupom">
                                  <Camera size={11} /> Anexar NF
                                  <input
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    style={{ display: 'none' }}
                                    onChange={(e) => handleUploadFotoComprovante(item.turnoId, item.id, e)}
                                  />
                                </label>
                              ) : (
                                <span style={{ fontSize: '0.72rem', color: 'var(--cor-texto-secundario)' }}>Estoque</span>
                              )}
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

          {/* Resumo Financeiro Geral da O.S. (Somente Admin) */}
          {isAdmin && (
            <div className={styles.totaisGrid}>
              <div className={styles.cardTotalItem}>
                <span className={styles.labelTotalItem}>Mão de Obra (HH)</span>
                <span className={styles.valTotalItem}>
                  R$ {totalHH.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div className={styles.cardTotalItem}>
                <span className={styles.labelTotalItem}>Tratores / Máq. (TRA)</span>
                <span className={styles.valTotalItem}>
                  R$ {totalTRA.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div className={styles.cardTotalItem}>
                <span className={styles.labelTotalItem}>Materiais Estoque (MAT)</span>
                <span className={styles.valTotalItem}>
                  R$ {totalMAT.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div className={`${styles.cardTotalItem} ${styles.cardTotalExt}`}>
                <span className={styles.labelTotalItem} style={{ color: '#d97706', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <ShoppingBag size={12} />
                  Peças Externas (EXT / NF)
                </span>
                <span className={styles.valTotalItem} style={{ color: '#d97706' }}>
                  R$ {totalEXT.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div className={styles.cardTotalItem}>
                <span className={styles.labelTotalItem}>Veículos (VEI)</span>
                <span className={styles.valTotalItem}>
                  R$ {totalVEI.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div className={`${styles.cardTotalItem} ${styles.cardTotalGeral}`}>
                <span className={styles.labelTotalItem} style={{ color: 'var(--cor-destaque)' }}>TOTAL GERAL ({turnos.length} DIAS)</span>
                <span className={styles.valTotalGeral}>
                  R$ {totalGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <button type="button" className={styles.btnSecundario} onClick={onClose}>
            Fechar
          </button>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              type="button" 
              className={styles.btnImprimir} 
              onClick={handleDispararImpressao}
              title="Imprimir Formulário Oficial da Yamaservice"
            >
              <Printer size={16} />
              Imprimir Atendimento
            </button>

            <button 
              type="button" 
              className={styles.btnSalvar} 
              onClick={handleSalvar}
              disabled={salvando}
            >
              <Save size={16} />
              {salvando ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </div>
      </div>

      {/* Modal Flutuante para Visualização da Foto da NF em Zoom */}
      {fotoVisualizando && (
        <div className={styles.modalFotoOverlay} onClick={() => setFotoVisualizando(null)}>
          <div className={styles.modalFotoContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalFotoHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Camera size={18} color="var(--cor-destaque)" />
                <span>Comprovante de Compra Externa / Nota Fiscal</span>
              </div>
              <button
                type="button"
                className={styles.closeButton}
                onClick={() => setFotoVisualizando(null)}
                title="Fechar visualização"
              >
                <X size={20} />
              </button>
            </div>
            <div className={styles.modalFotoBody}>
              <img src={fotoVisualizando} alt="Nota Fiscal Ampliada" className={styles.imgFotoAmpliada} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FormularioPrestacaoServico;
