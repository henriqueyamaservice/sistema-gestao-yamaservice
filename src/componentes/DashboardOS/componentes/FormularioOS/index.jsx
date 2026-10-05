import React, { useState, useEffect, useMemo, useRef } from 'react';
import { FileText, Save, Clock, AlertCircle, Wrench, Calendar, X, Trash2, Sparkles, Check, CheckCircle } from 'lucide-react';
import styles from './index.module.css';
import { EM_ANDAMENTO } from '../../../../utils/osStatus';

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

// Helpers para validação e busca de veículos
const normalizarTexto = (txt) => (txt || '').toString().trim().toUpperCase();
const normalizarPlaca = (txt) => (txt || '').toString().toUpperCase().replace(/[^A-Z0-9]/g, '');

const detectarCategoriaVeiculo = (veic, textoCentroCusto) => {
  const combinado = `${veic?.modelo || ''} ${veic?.subtipoMaquina || ''} ${veic?.especieTipo || ''} ${veic?.tipo || ''} ${veic?.tipoEquipamento || ''} ${textoCentroCusto || ''}`.toUpperCase();
  
  if (veic?.tipoEquipamento === 'MAQUINA' || veic?.tipoMedicao === 'Horas' || /TRATOR|MAQUINA|MÁQUINA|RETRO|ESCAVADEIRA|PÁ CARREGADEIRA|PA CARREGADEIRA|BOBCAT|VALTRA|MASSEY|JOHN DEERE|NEW HOLLAND|CASE|AGRALE/i.test(combinado)) {
    return 'MAQUINA';
  }
  
  if (/CAMINHAO|CAMINHÃO|TRUCK|TOCO|CAVALO|24\.280|24280|ATEGO|CONSTELLATION|CARGO|ACTROS|AXOR|FH|VM|CARGA|SCANIA|VOLVO|MERCEDES/i.test(combinado)) {
    return 'CAMINHAO';
  }
  
  if (/STRADA|SAVEIRO|GOL|FIORINO|ARGO|MOBI|POLO|HILUX|S10|RANGER|TORO|COROLLA|ONIX|HB20|UTILITARIO|UTILITÁRIO|PASSEIO|AUTOMOVEL|AUTOMÓVEL|CARRO|LEVE/i.test(combinado)) {
    return 'CARRO';
  }

  // Se tem placa e medição é KM mas não combinou pesado, por padrão consideramos veículo leve/carro
  if (veic?.tipoMedicao === 'KM' || veic?.placa) {
    return 'CARRO';
  }

  return 'TODOS';
};

const FormularioOS = ({ onAddOS, osList, onClose, initialTipo = 'CORRETIVA', isPrestacaoMode = false, initialCentroCusto = '' }) => {
  const isPrestacao = Boolean(isPrestacaoMode || initialTipo === 'PRESTACAO_SERVICO');

  const [formData, setFormData] = useState({
    codigo: '',
    data: new Date().toISOString().split('T')[0],
    hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    requisitante: '',
    complexidade: 'NORMAL',
    prioridade: '1-NORMAL',
    setor: isPrestacao ? 'SLD' : '',
    centroCusto: initialCentroCusto || '',
    prazo: '',
    tipo: (initialTipo === 'PRESTACAO_SERVICO' ? 'CORRETIVA' : initialTipo) || 'CORRETIVA',
    situacao: EM_ANDAMENTO,
    descricao: '',
    motivo: '',
    kitId: null,
    kitNome: null
  });

  // Atualiza centro de custo caso seja repassado dinamicamente
  useEffect(() => {
    if (initialCentroCusto) {
      setFormData(prev => ({
        ...prev,
        centroCusto: initialCentroCusto.toUpperCase()
      }));
    }
  }, [initialCentroCusto]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [servicosPadraoList, setServicosPadraoList] = useState({});
  const [mostrarAddServicoPadrao, setMostrarAddServicoPadrao] = useState(false);
  const [novoServicoPadrao, setNovoServicoPadrao] = useState('');
  const [dropdownAberto, setDropdownAberto] = useState(false);
  const [reqDropdownAberto, setReqDropdownAberto] = useState(false);
  const [modoExclusao, setModoExclusao] = useState(false);
  const [veiculos, setVeiculos] = useState([]);
  const [departamentos, setDepartamentos] = useState([]);
  const [requisitantesList, setRequisitantesList] = useState([]);
  const [fornecedoresList, setFornecedoresList] = useState([]);
  const [servicosKits, setServicosKits] = useState([]);
  const servicosDropdownRef = useRef(null);
  const reqDropdownRef = useRef(null);

  // Fechar dropdowns ao clicar fora
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (servicosDropdownRef.current && !servicosDropdownRef.current.contains(e.target)) {
        setDropdownAberto(false);
      }
      if (reqDropdownRef.current && !reqDropdownRef.current.contains(e.target)) {
        setReqDropdownAberto(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Modal Novo Requisitante
  const [showAddReqModal, setShowAddReqModal] = useState(false);
  const [novoReqFuncionario, setNovoReqFuncionario] = useState('');
  const [novoReqApelido, setNovoReqApelido] = useState('');

  // Busca requisitantes
  useEffect(() => {
    fetch(`/api/requisitantes`)
      .then(res => res.json())
      .then(data => setRequisitantesList(data))
      .catch(err => console.error('Erro ao buscar requisitantes:', err));
  }, []);

  // Busca fornecedores/funcionários da Omie
  useEffect(() => {
    fetch(`/api/fornecedores`)
      .then(res => res.json())
      .then(data => setFornecedoresList(data))
      .catch(err => console.error('Erro ao buscar fornecedores:', err));
  }, []);

  const handleOpenAddRequisitante = () => {
    setShowAddReqModal(true);
    setNovoReqFuncionario('');
    setNovoReqApelido('');
  };

  const handleSalvarNovoRequisitante = async () => {
    if (!novoReqApelido || !novoReqApelido.trim()) {
      alert("Por favor, digite o Apelido do Requisitante.");
      return;
    }

    try {
      const response = await fetch(`/api/requisitantes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: novoReqApelido.trim() })
      });
      if (response.ok) {
        const { nome: novoNome } = await response.json();
        setRequisitantesList(prev => {
          if (!prev.includes(novoNome)) return [...prev, novoNome];
          return prev;
        });
        setFormData(prev => ({ ...prev, requisitante: novoNome }));
        setShowAddReqModal(false);
      } else {
        alert('Erro ao salvar requisitante.');
      }
    } catch (error) {
      console.error(error);
      alert('Erro na comunicação com o servidor.');
    }
  };

  const handleExcluirRequisitanteNaLista = async (nomeParaExcluir) => {
    if (!window.confirm(`Tem certeza que deseja apagar o requisitante "${nomeParaExcluir}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/requisitantes`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: nomeParaExcluir })
      });
      if (response.ok) {
        setRequisitantesList(prev => prev.filter(r => r !== nomeParaExcluir));
        if (formData.requisitante === nomeParaExcluir) {
          setFormData(prev => ({ ...prev, requisitante: '' }));
        }
      } else {
        alert('Erro ao apagar requisitante.');
      }
    } catch (error) {
      console.error(error);
      alert('Erro na comunicação com o servidor.');
    }
  };

  // Busca veículos para o datalist
  useEffect(() => {
    fetch(`/api/veiculos`)
      .then(res => res.json())
      .then(data => setVeiculos(data))
      .catch(err => console.error('Erro ao buscar veículos:', err));
  }, []);

  // Busca departamentos para o datalist
  useEffect(() => {
    fetch(`/api/departamentos`)
      .then(res => res.json())
      .then(data => setDepartamentos(data))
      .catch(err => console.error('Erro ao buscar departamentos:', err));
  }, []);

  // Busca serviços padrão do backend
  useEffect(() => {
    fetch(`/api/servicos-padrao`)
      .then(res => res.json())
      .then(data => setServicosPadraoList(data))
      .catch(err => console.error('Erro ao buscar serviços padrão:', err));
  }, []);

  // Busca kits e templates de serviços da oficina
  useEffect(() => {
    fetch(`/api/servicos-kits`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setServicosKits(data);
      })
      .catch(err => console.error('Erro ao buscar kits de serviços:', err));
  }, []);

  // Buscar próximo código da sequência global de OS para exibição imediata
  useEffect(() => {
    const dataRef = formData.data || new Date().toISOString().split('T')[0];
    fetch(`/api/os/proximo-codigo?data=${dataRef}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.proximoCodigo) {
          setFormData(prev => ({ ...prev, codigo: data.proximoCodigo }));
        }
      })
      .catch(() => {
        if (osList && osList.length > 0) {
          const [ano, mes] = dataRef.split('-');
          const sufixo = `${mes}${ano.slice(-2)}`;
          const osDoMes = osList.filter(o => o.codigo && o.codigo.endsWith(`-${sufixo}`));
          let proximoNumero = 1;
          if (osDoMes.length > 0) {
            const numeros = osDoMes.map(o => parseInt((o.codigo || '').replace(/^#/, '').split('-')[0], 10) || 0);
            proximoNumero = Math.max(...numeros) + 1;
          }
          const proximoCodigo = `${proximoNumero.toString().padStart(2, '0')}-${sufixo}`;
          setFormData(prev => ({ ...prev, codigo: proximoCodigo }));
        }
      });
  }, [formData.data, osList]);

  const [userName, setUserName] = useState('Desconhecido');

  useEffect(() => {
    const userData = localStorage.getItem('almoxarifado_user');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        setUserName(user.nome || user.name || user.login || user.username || 'Desconhecido');
      } catch (e) {
        console.error('Erro ao ler dados do usuário:', e);
      }
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const isDateOrTime = name === 'data' || name === 'hora';
    const finalValue = (typeof value === 'string' && !isDateOrTime) ? value.toUpperCase() : value;
    setFormData(prev => ({ ...prev, [name]: finalValue }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Força a situação para EM_ANDAMENTO ao salvar e salva o usuário logado
      const novaOS = {
        ...formData,
        situacao: EM_ANDAMENTO,
        abertoPor: userName,
        isPrestacaoServico: isPrestacao,
        modalidade: isPrestacao ? 'PRESTACAO_SERVICO' : 'INTERNA',
        tipo: isPrestacao ? 'PRESTACAO_SERVICO' : formData.tipo,
        tipoServico: formData.tipo || 'CORRETIVA',
        tipoManutencao: formData.tipo || 'CORRETIVA'
      };

      // Envia para o backend
      const response = await fetch(`/api/os`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(novaOS)
      });

      if (!response.ok) {
        throw new Error('Falha ao salvar a Ordem de Serviço');
      }

      const dataSalva = await response.json();
      onAddOS(dataSalva.os);

      if (onClose) onClose();

      // Limpar formulário mantendo alguns defaults e calculando novo código será feito pelo useEffect 
      // pois osList vai ser atualizada pelo parent (DashboardOS)
      setFormData(prev => ({
        ...prev,
        codigo: '', // vai ser preenchido pelo useEffect
        requisitante: '',
        setor: isPrestacao ? 'SLD' : '',
        centroCusto: '',
        descricao: '',
        prazo: '',
        tipo: 'CORRETIVA'
      }));
    } catch (error) {
      console.error(error);
      alert('Erro ao cadastrar O.S. Verifique a conexão com o servidor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddServicoPadraoText = (servico) => {
    setFormData(prev => ({
      ...prev,
      descricao: prev.descricao ? `${prev.descricao}\n- ${servico}` : `- ${servico}`
    }));
  };

  const handleSalvarNovoServicoPadrao = async () => {
    if (!formData.setor) {
      alert('Selecione um Setor de Execução primeiro.');
      return;
    }
    if (!novoServicoPadrao.trim()) return;

    try {
      const response = await fetch(`/api/servicos-padrao`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setor: formData.setor, servico: novoServicoPadrao.trim() })
      });
      if (response.ok) {
        const data = await response.json();
        setServicosPadraoList(data.servicos);
        setNovoServicoPadrao('');
        setMostrarAddServicoPadrao(false);
      }
    } catch (error) {
      console.error(error);
      alert('Erro ao salvar o serviço padrão.');
    }
  };

  const handleExcluirServicoPadrao = async (servico) => {
    if (!window.confirm(`Tem certeza que deseja excluir o serviço "${servico}" da lista padrão?`)) {
      return;
    }
    try {
      const response = await fetch(`/api/servicos-padrao`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setor: formData.setor, servico })
      });
      if (response.ok) {
        const data = await response.json();
        setServicosPadraoList(data.servicos);
        setModoExclusao(false);
      }
    } catch (error) {
      console.error(error);
      alert('Erro ao excluir o serviço padrão.');
    }
  };

  // Identifica se o Centro de Custo digitado corresponde a um veículo/máquina da frota
  const veiculoAlvo = useMemo(() => {
    if (!formData.centroCusto) return null;
    const centroLimpo = normalizarTexto(formData.centroCusto);
    const centroPlacaNorm = normalizarPlaca(formData.centroCusto);

    return (veiculos || []).find(v => {
      if (!v) return false;
      const vPlacaNorm = normalizarPlaca(v.placa);
      const vPlacaTexto = normalizarTexto(v.placa);
      const vModelo = normalizarTexto(v.modelo || v.subtipoMaquina);

      // Match exato ou alfanumérico por placa (ex: XDS1258 === XDS1258)
      if (vPlacaNorm && centroPlacaNorm && (vPlacaNorm === centroPlacaNorm || centroPlacaNorm.startsWith(vPlacaNorm) || vPlacaNorm.startsWith(centroPlacaNorm))) {
        return true;
      }
      // Match caso o usuário tenha selecionado a opção "PLACA - MODELO" do datalist
      if (vPlacaTexto && centroLimpo.includes(vPlacaTexto)) {
        return true;
      }
      // Match por modelo caso tenha digitado o modelo exato
      if (vModelo && (centroLimpo === vModelo || centroLimpo.startsWith(vModelo))) {
        return true;
      }
      return false;
    }) || null;
  }, [formData.centroCusto, veiculos]);

  const categoriaVeiculoAtiva = useMemo(() => {
    if (!formData.centroCusto) return null;
    return detectarCategoriaVeiculo(veiculoAlvo, formData.centroCusto);
  }, [veiculoAlvo, formData.centroCusto]);

  // Classificação estrita dos Kits da Oficina conforme o Veículo Alvo
  const kitsDoVeiculo = useMemo(() => {
    if (formData.setor !== 'MECANICA' || !servicosKits || servicosKits.length === 0) {
      return [];
    }

    const centroTexto = (formData.centroCusto || '').trim();
    if (!centroTexto) {
      // Nenhum veículo digitado ainda
      return [];
    }

    const placaAlvoLimpa = veiculoAlvo ? normalizarPlaca(veiculoAlvo.placa) : normalizarPlaca(centroTexto);
    const modeloAlvo = normalizarTexto(veiculoAlvo ? (veiculoAlvo.modelo || veiculoAlvo.subtipoMaquina || '') : centroTexto);
    const catAlvo = categoriaVeiculoAtiva;

    const compativeis = [];

    servicosKits.forEach(kit => {
      let pontuacao = 0; // Para ordenar os mais específicos primeiro

      const tipoAlvo = kit.aplicabilidade?.tipoAlvo || 'TODOS';
      const kitPlaca = normalizarPlaca(kit.aplicabilidade?.placa);
      const kitModelo = normalizarTexto(kit.aplicabilidade?.modelo);
      const kitCat = kit.categoria;

      // 1. Kits que exigem uma PLACA específica
      if (tipoAlvo === 'PLACA' && kitPlaca) {
        if (placaAlvoLimpa && kitPlaca === placaAlvoLimpa) {
          pontuacao = 100; // Match exato por placa
        }
      }
      // 2. Kits que exigem um MODELO específico
      else if (tipoAlvo === 'MODELO' && kitModelo) {
        if (modeloAlvo && (modeloAlvo.includes(kitModelo) || kitModelo.includes(modeloAlvo))) {
          pontuacao = 80; // Match específico por modelo
        }
      }
      // 3. Kits genéricos para a CATEGORIA (Carro, Caminhão, Máquina)
      else if (kitCat && catAlvo && kitCat === catAlvo) {
        // Se caiu aqui, é porque o kit é genérico para a categoria toda (tipoAlvo === 'TODOS' ou sem modelo/placa exigido)
        pontuacao = 50;
      }
      // 4. Kits Universais de Oficina
      else if (kitCat === 'GERAL') {
        pontuacao = 20;
      }

      // Se teve pontuação > 0, o kit é compatível com este veículo!
      if (pontuacao > 0) {
        compativeis.push({ ...kit, _pontuacao: pontuacao });
      }
    });

    // Ordena os kits com maior relevância primeiro (específicos do modelo/placa primeiro)
    return compativeis.sort((a, b) => b._pontuacao - a._pontuacao);
  }, [formData.setor, formData.centroCusto, servicosKits, veiculoAlvo, categoriaVeiculoAtiva]);

  // Manipulador ao selecionar um Kit de Serviço da Oficina
  const handleSelectKit = (kit) => {
    setFormData(prev => {
      let novaDescricao = prev.descricao ? prev.descricao.trim() : '';
      const textoKit = kit.nome; // Nome do kit vai para o Problema Inicial
      if (!novaDescricao) {
        novaDescricao = textoKit;
      } else if (!novaDescricao.includes(textoKit)) {
        novaDescricao = `${novaDescricao}\n- ${textoKit}`;
      }

      // Se for serviço preventivo (óleo ou revisão), ajusta o tipo para PREVENTIVA
      const ehPreventiva = kit.trocouOleo || kit.fezRevisao || /óleo|oleo|revisão|revisao/i.test(kit.nome);
      const novoTipo = ehPreventiva ? 'PREVENTIVA' : prev.tipo;

      return {
        ...prev,
        descricao: novaDescricao,
        tipo: novoTipo,
        kitId: kit.id || null,
        kitNome: kit.nome || null
      };
    });
    setDropdownAberto(false);
  };

  const servicosExibicao = servicosPadraoList[formData.setor] ? [...servicosPadraoList[formData.setor]] : [];

  return (
    <div className={styles.overlay}>
      <div className={`${styles.modalCard} ${styles.animateFadeIn}`}>
        {onClose && (
          <button type="button" onClick={onClose} className={styles.closeButton}>
            <X size={24} />
          </button>
        )}

        <div className={styles.headerTituloWrapper}>
          <h2 className={styles.cardTitle} style={{ margin: 0 }}>
            <FileText size={36} className={styles.logoIcon} />
            {isPrestacao ? 'Cadastrar Prestação de Serviço (Granjas)' : 'Cadastrar Ordem de Serviço'}
          </h2>
          {isPrestacao && (
            <div className={styles.badgeModalidade}>
              <span className={styles.badgeModalidadeDot} />
              PRESTAÇÃO DE SERVIÇO (GRANJAS)
            </div>
          )}
        </div>

        {/* Info de quem está abrindo a OS */}
        <div style={{ 
          marginBottom: '12px', 
          padding: '4px 8px', 
          backgroundColor: 'var(--cor-fundo-sutil)', 
          borderRadius: '4px', 
          borderLeft: '2px solid var(--cor-destaque)',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: '0.65rem'
        }}>
          <span style={{ color: 'var(--cor-texto-secundario)', fontWeight: '600', textTransform: 'uppercase' }}>Aberto por:</span>
          <span style={{ color: 'var(--cor-texto-principal)', fontWeight: 'bold', textTransform: 'uppercase' }}>
            {userName}
          </span>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Informações Principais */}
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Código da O.S (Auto)</label>
              <input
                type="text"
                className={styles.input}
                name="codigo"
                value={formData.codigo}
                onChange={handleChange}
                placeholder="Gerado automaticamente"
                readOnly
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Data</label>
              <div className={styles.relativeContainer}>
                <input
                  type="date"
                  className={styles.input}
                  name="data"
                  value={formData.data}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Hora</label>
              <input
                type="time"
                className={styles.input}
                name="hora"
                value={formData.hora}
                onChange={handleChange}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Requisitante</label>
              <div style={{ display: 'flex', gap: '8px', flex: 1, alignItems: 'center', width: '100%' }}>
                <div className={styles.dropdownWrapper} ref={reqDropdownRef} style={{ flex: 1 }}>
                  <div
                    className={`${styles.select} ${styles.selectDropdown}`}
                    onClick={() => setReqDropdownAberto(!reqDropdownAberto)}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <span>{formData.requisitante || 'Selecione um requisitante...'}</span>
                    <span style={{ fontSize: '10px' }}>{reqDropdownAberto ? '▲' : '▼'}</span>
                  </div>

                  {reqDropdownAberto && (
                    <div className={styles.dropdownList}>
                      {requisitantesList.map((reqNome, index) => (
                        <div key={index} className={`${styles.servicoTag} ${styles.servicoTagItem}`}>
                          <span
                            className={styles.servicoTagTexto}
                            onClick={() => { setFormData(prev => ({ ...prev, requisitante: reqNome })); setReqDropdownAberto(false); }}
                          >
                            {reqNome}
                          </span>
                          <button
                            type="button"
                            className={styles.servicoTagExcluir}
                            onClick={(e) => { e.stopPropagation(); handleExcluirRequisitanteNaLista(reqNome); }}
                            title="Excluir requisitante"
                          >
                            X
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleOpenAddRequisitante}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--cor-destaque)',
                    cursor: 'pointer',
                    fontSize: '24px',
                    lineHeight: '1',
                    fontWeight: 'bold',
                    padding: '0 4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title="Adicionar Novo Requisitante"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Classificação e Setor */}
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Setor de Execução</label>
              <select
                className={styles.select}
                name="setor"
                value={formData.setor}
                onChange={handleChange}
                required
              >
                <option value="" disabled>Selecione um setor</option>
                <option value="ELETRICA">ELETRICA</option>
                <option value="MECANICA">MECANICA</option>
                <option value="SERRALHEIRO">SERRALHEIRO</option>
                <option value="SERVICO GERAL">SERVICO GERAL</option>
                <option value="METALURGICA">METALURGICA</option>
                <option value="CONSTRUCAO CIVIL">CONSTRUCAO CIVIL</option>
                <option value="SLD">SLD</option>
                <option value="ELETRONICA">ELETRONICA</option>
                <option value="FABRICA DE RACAO">FABRICA DE RACAO</option>
                <option value="LOGISTICA">LOGISTICA</option>

              </select>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>
                {isPrestacao ? 'Unidade de Destino (Granja)' : 'Centro de Custo Alvo / Veículo'}
              </label>
              <input
                type="text"
                className={styles.input}
                name="centroCusto"
                value={formData.centroCusto}
                onChange={handleChange}
                placeholder={isPrestacao ? "Selecione a Granja (Ex: G. KAWAMURA)" : "Ex: Granja ou Placa (ABC-1234)"}
                list={isPrestacao ? "granjas-list" : "veiculos-list"}
                required
              />
              {isPrestacao ? (
                <datalist id="granjas-list">
                  {LISTA_GRANJAS.map(g => (
                    <option key={`granja-${g}`} value={g}>{g}</option>
                  ))}
                </datalist>
              ) : (
                <datalist id="veiculos-list">
                  {departamentos.map(dep => (
                    <option key={`dep-${dep.codigo || dep.descricao}`} value={dep.descricao}>{dep.descricao}</option>
                  ))}
                  {veiculos.map(v => (
                    <option key={`veic-${v.placa}`} value={v.placa}>{v.modelo ? `${v.placa} - ${v.modelo}` : v.placa}</option>
                  ))}
                </datalist>
              )}
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Complexidade</label>
              <select
                className={styles.select}
                name="complexidade"
                value={formData.complexidade}
                onChange={handleChange}
              >
                <option value="BAIXA">Baixa</option>
                <option value="NORMAL">Normal</option>
                <option value="ALTA">Alta</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Prioridade</label>
              <select
                className={styles.select}
                name="prioridade"
                value={formData.prioridade}
                onChange={handleChange}
              >
                <option value="1-NORMAL">1 - Normal</option>
                <option value="2-URGENTE">2 - Urgente</option>
                <option value="3-EMERGÊNCIA">3 - Emergência</option>
              </select>
            </div>
          </div>

          {/* Prazo e Situação */}
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Prazo</label>
              <input
                type="date"
                className={styles.input}
                name="prazo"
                value={formData.prazo}
                onChange={handleChange}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Tipo de Manutenção</label>
              <select
                className={styles.select}
                name="tipo"
                value={formData.tipo}
                onChange={handleChange}
              >
                <option value="CORRETIVA">Corretiva</option>
                <option value="PREVENTIVA">Preventiva</option>
                <option value="IMPLANTAÇÃO">Implantação</option>
                <option value="PERIODICO">Periódico</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Situação</label>
              <select
                className={styles.select}
                name="situacao"
                value={formData.situacao}
                onChange={handleChange}
              >
                <option value="À EXECUTAR">À Executar</option>
              </select>
            </div>
          </div>

          {/* Serviços Padrão & Kits de Serviços */}
          {formData.setor && (
            <div className={styles.formGrid}>
              <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label className={styles.label} style={{ margin: 0 }}>
                    {formData.setor === 'MECANICA' ? 'Kits & Serviços da Oficina (MECÂNICA)' : `Serviços Padrão (${formData.setor})`}
                  </label>
                  {formData.setor === 'MECANICA' && servicosKits.length > 0 && (
                    <span style={{ fontSize: '0.72rem', color: 'var(--cor-destaque)', fontWeight: 800 }}>
                      ⚡ {servicosKits.length} Kits Disponíveis
                    </span>
                  )}
                </div>

                {/* Chips de Sugestão Rápida para o Veículo Alvo */}
                {formData.setor === 'MECANICA' && kitsDoVeiculo.length > 0 && (
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--cor-destaque)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Sparkles size={12} /> Sugestões para {veiculoAlvo?.placa || formData.centroCusto}:
                    </span>
                    {kitsDoVeiculo.slice(0, 4).map((k, idx) => (
                      <button
                        key={k.id || idx}
                        type="button"
                        className={styles.kitQuickChip}
                        onClick={() => handleSelectKit(k)}
                        title={k.descricaoPadrao || k.nome}
                      >
                        <Sparkles size={11} />
                        {k.nome}
                      </button>
                    ))}
                  </div>
                )}

                <div className={`${styles.servicosContainer} ${styles.servicosContainerRow}`}>

                  {(servicosExibicao.length > 0 || formData.setor === 'MECANICA') ? (
                    <div className={styles.dropdownWrapper} ref={servicosDropdownRef} style={{ width: '100%', flex: 1 }}>
                      <div
                        className={`${styles.select} ${styles.selectDropdown}`}
                        onClick={() => setDropdownAberto(!dropdownAberto)}
                        style={{ paddingRight: formData.kitNome ? '36px' : '12px' }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {formData.kitNome 
                            ? <><CheckCircle size={14} color="var(--cor-sucesso)" /> <strong style={{ color: 'var(--cor-sucesso)' }}>Kit Selecionado:</strong> {formData.kitNome}</>
                            : (formData.setor === 'MECANICA' && formData.centroCusto
                                ? `Selecione um kit ou serviço para ${veiculoAlvo?.placa || formData.centroCusto}...`
                                : 'Selecione um serviço ou kit para adicionar...')}
                        </span>
                        
                        {formData.kitNome && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setFormData(prev => ({ ...prev, kitId: null, kitNome: null, descricao: '', tipo: 'CORRETIVA' })); }}
                            style={{ position: 'absolute', right: '30px', background: 'transparent', border: 'none', color: 'var(--cor-texto-secundario)', cursor: 'pointer' }}
                            title="Remover kit selecionado"
                          >
                            <X size={14} />
                          </button>
                        )}
                        <span style={{ fontSize: '10px' }}>{dropdownAberto ? '▲' : '▼'}</span>
                      </div>

                      {dropdownAberto && (
                        <div className={styles.dropdownList} style={{ width: '100%', minWidth: '400px' }}>
                          {/* 1. SE SETOR MECÂNICA MAS VEÍCULO NÃO INFORMADO */}
                          {formData.setor === 'MECANICA' && !formData.centroCusto && (
                            <div className={styles.dropdownAvisoVeiculo}>
                              <AlertCircle size={15} color="var(--cor-destaque)" />
                              <span>Digite a Placa do veículo no campo "Centro de Custo" acima para listar os kits de manutenção compatíveis com ele.</span>
                            </div>
                          )}

                          {/* 2. KITS ESPECÍFICOS PARA O VEÍCULO ALVO (Ex: XDS-1258) */}
                          {formData.setor === 'MECANICA' && formData.centroCusto && kitsDoVeiculo.length > 0 && (
                            <>
                              <div className={styles.dropdownSectionHeader}>
                                <Sparkles size={11} color="var(--cor-destaque)" />
                                <span>Kits Compatíveis com {veiculoAlvo ? `${veiculoAlvo.placa} (${veiculoAlvo.modelo || categoriaVeiculoAtiva})` : formData.centroCusto}</span>
                              </div>
                              {kitsDoVeiculo.map((kit, i) => (
                                <div
                                  key={`kit-rec-${kit.id || i}`}
                                  className={`${styles.servicoTag} ${styles.servicoTagItem}`}
                                  onClick={() => handleSelectKit(kit)}
                                  style={{ cursor: 'pointer' }}
                                >
                                  <div className={styles.servicoTagTexto}>
                                    <div className={styles.kitItemRow}>
                                      <div className={styles.kitItemInfo}>
                                        <span className={styles.kitItemNome}>{kit.nome}</span>
                                        {kit.descricaoPadrao && (
                                          <span className={styles.kitItemSub}>{kit.descricaoPadrao.slice(0, 80)}...</span>
                                        )}
                                      </div>
                                      <div className={styles.kitItemBadges}>
                                        {kit.trocouOleo && <span className={styles.kitItemBadge}>Óleo</span>}
                                        <span className={styles.kitItemBadge}>{kit.categoria}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </>
                          )}

                          {/* AVISO QUANDO TEM VEÍCULO MAS NÃO TEM KIT */}
                          {formData.setor === 'MECANICA' && formData.centroCusto && kitsDoVeiculo.length === 0 && (
                            <div className={styles.dropdownAvisoVeiculo} style={{ background: 'var(--cor-fundo-secundario)' }}>
                              <AlertCircle size={15} color="var(--cor-texto-secundario)" />
                              <span style={{ fontWeight: 'normal' }}>Nenhum kit pré-configurado encontrado para <strong>{veiculoAlvo?.modelo || formData.centroCusto}</strong>.</span>
                            </div>
                          )}

                          {/* 3. SERVIÇOS PADRÃO TEXTUAIS */}
                          {servicosExibicao.length > 0 && (
                            <>
                              {formData.setor === 'MECANICA' && (
                                <div className={styles.dropdownSectionHeader}>
                                  <span>Serviços Padrão Textuais</span>
                                </div>
                              )}
                              {servicosExibicao.map((svc, i) => {
                                const isHardcoded = ['TROCA DE ÓLEO', 'REVISÃO', 'TROCA DE ÓLEO E REVISÃO'].includes(svc);
                                return (
                                  <div key={i} className={`${styles.servicoTag} ${styles.servicoTagItem}`}>
                                    <span
                                      className={styles.servicoTagTexto}
                                      onClick={() => { handleAddServicoPadraoText(svc); setDropdownAberto(false); }}
                                    >
                                      {svc}
                                    </span>
                                    {!isHardcoded && (
                                      <button
                                        type="button"
                                        className={styles.servicoTagExcluir}
                                        onClick={(e) => { e.stopPropagation(); handleExcluirServicoPadrao(svc); }}
                                        title="Excluir serviço padrão"
                                      >
                                        X
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className={`${styles.ajudaTexto} ${styles.ajudaTextoInline}`}>Nenhum serviço padrão cadastrado para este setor.</span>
                  )}

                  {!mostrarAddServicoPadrao ? (
                    <button
                      type="button"
                      className={styles.novoServicoBtn}
                      onClick={() => setMostrarAddServicoPadrao(true)}
                    >
                      + Novo Serviço Padrão
                    </button>
                  ) : (
                    <div className={styles.novoServicoForm}>
                      <input
                        type="text"
                        className={styles.novoServicoInput}
                        placeholder="EX: TROCA DE LÂMPADA"
                        value={novoServicoPadrao}
                        onChange={(e) => setNovoServicoPadrao(e.target.value.toUpperCase())}
                      />
                      <button
                        type="button"
                        className={`${styles.btnAcaoPequeno} ${styles.btnSalvar}`}
                        onClick={handleSalvarNovoServicoPadrao}
                      >
                        Salvar
                      </button>
                      <button
                        type="button"
                        className={`${styles.btnAcaoPequeno} ${styles.btnCancelar}`}
                        onClick={() => { setMostrarAddServicoPadrao(false); setNovoServicoPadrao(''); }}
                      >
                        X
                      </button>
                    </div>
                  )}
                </div>
                <small className={styles.ajudaTexto}>Clique no texto de um serviço acima para adicioná-lo à descrição, ou clique no X para excluí-lo permanentemente da lista.</small>
              </div>
            </div>
          )}

          {/* Descrição e Motivo */}
          <div className={styles.formGrid}>
            <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
              <label className={styles.label}>Descrição do Serviço</label>
              <textarea
                className={styles.textarea}
                name="descricao"
                value={formData.descricao}
                onChange={handleChange}
                placeholder="Descreva detalhadamente o serviço a ser realizado..."
                required
              />
            </div>
          </div>

          <div className={styles.formGrid}>
            <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
              <label className={styles.label}>Motivo / Causa do Serviço (Por que o serviço foi necessário?)</label>
              <textarea
                className={styles.textarea}
                name="motivo"
                value={formData.motivo || ''}
                onChange={handleChange}
                placeholder="Ex: Pneu furou ao passar no canteiro; Peça desgastada por tempo de uso; Manutenção preventiva periódica..."
                rows={2}
              />
            </div>
          </div>

          {/* Ações */}
          <div className={styles.actions}>
            <button type="submit" className={styles.btnPrimary} disabled={isSubmitting}>
              <Save size={18} />
              {isSubmitting ? 'CADASTRANDO...' : (isPrestacao ? 'CADASTRAR PRESTAÇÃO DE SERVIÇO' : 'CADASTRAR O.S.')}
            </button>
          </div>
        </form>
      </div>

      {/* Modal de Novo Requisitante */}
      {showAddReqModal && (
        <div className={styles.overlay} style={{ zIndex: 9999 }}>
          <div className={styles.modalCard} style={{ maxWidth: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, color: 'var(--cor-destaque)', fontSize: '1.2rem' }}>Novo Requisitante</h3>
              <button type="button" onClick={() => setShowAddReqModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--cor-texto-principal)' }}>
                <X size={20} />
              </button>
            </div>

            <div className={styles.formGroup} style={{ marginBottom: '16px' }}>
              <label className={styles.label}>Buscar Funcionário (Omie)</label>
              <input
                type="text"
                className={styles.input}
                placeholder="Nome do funcionário..."
                value={novoReqFuncionario}
                onChange={(e) => setNovoReqFuncionario(e.target.value)}
                list="omie-fornecedores-list"
              />
              <datalist id="omie-fornecedores-list">
                {fornecedoresList.map((f, i) => (
                  <option key={i} value={f.razao_social || f.nome_fantasia || f.nome} />
                ))}
              </datalist>
              <small className={styles.ajudaTexto} style={{ display: 'block', marginTop: '4px' }}>Selecione o funcionário integrado para referência.</small>
            </div>

            <div className={styles.formGroup} style={{ marginBottom: '24px' }}>
              <label className={styles.label}>Apelido do Requisitante (Salvar como) <span style={{ color: '#ef4444' }}>*</span></label>
              <input
                type="text"
                className={styles.input}
                placeholder="Ex: Monteiro"
                value={novoReqApelido}
                onChange={(e) => setNovoReqApelido(e.target.value.toUpperCase())}
              />
              <small className={styles.ajudaTexto} style={{ display: 'block', marginTop: '4px' }}>Como este nome aparecerá nas Ordens de Serviço.</small>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" onClick={() => setShowAddReqModal(false)} className={`${styles.btnPrimary}`} style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent', border: '1px solid var(--cor-borda-cartao)', color: 'var(--cor-texto-principal)' }}>Cancelar</button>
              <button type="button" onClick={handleSalvarNovoRequisitante} className={styles.btnPrimary} style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>Salvar</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default FormularioOS;
