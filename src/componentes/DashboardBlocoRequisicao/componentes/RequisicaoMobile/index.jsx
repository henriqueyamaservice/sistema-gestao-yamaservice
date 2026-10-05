import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, Plus, Trash2, CheckCircle2, Send, RotateCcw, ShieldAlert, Wrench, ChevronRight, ChevronLeft, MessageSquare, ListTodo, Bot, User, Mic, Info, X } from 'lucide-react';
import styles from './RequisicaoMobile.module.css';

const RequisicaoMobile = ({ produtos = [] }) => {
  const [departamentos, setDepartamentos] = useState([]);
  const [locaisEstoque, setLocaisEstoque] = useState([]);
  const [projetos, setProjetos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [veiculos, setVeiculos] = useState([]);
  
  const [formulario, setFormulario] = useState({
    localEstoque: 'PADRAO - Local de Estoque Padrão',
    setor: '',
    centroCusto: '',
    numeroOS: '',
    contatoCliente: '',
    prioridade: 'normal'
  });

  const [termoBusca, setTermoBusca] = useState('');
  const [produtoSelecionado, setProdutoSelecionado] = useState(null);
  const [quantidadeItem, setQuantidadeItem] = useState(1);
  const [itensCarrinho, setItensCarrinho] = useState([]);

  const [usuarioLogado, setUsuarioLogado] = useState(() => {
    const saved = localStorage.getItem('almoxarifado_user');
    return saved ? JSON.parse(saved) : { nome: 'Funcionário', role: 'funcionario' };
  });

  const [loading, setLoading] = useState(false);
  const [sucessoReqId, setSucessoReqId] = useState(null);

  const [proximoCodigoOS, setProximoCodigoOS] = useState('');
  const [tipoServico, setTipoServico] = useState('CORRETIVA');
  const [isEmergencia, setIsEmergencia] = useState(false);
  const [descricaoServico, setDescricaoServico] = useState('');
  
  const [requerPecas, setRequerPecas] = useState(false);

  // Controle de Passos (Stepper)
  const [passoAtual, setPassoAtual] = useState(1);

  // CHATBOT STATE
  const [isChatMode, setIsChatMode] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { sender: 'bot', text: 'Olá! Qual é o problema que você precisa relatar? (Descreva com detalhes)' }
  ]);
  const [chatStep, setChatStep] = useState(1);
  const [chatInputValue, setChatInputValue] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const chatMessagesEndRef = useRef(null);

  useEffect(() => {
    if (isChatMode && chatMessagesEndRef.current) {
      chatMessagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isChatMode]);

  const startListening = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Seu navegador não suporta digitação por voz. Tente usar o Google Chrome.');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setChatInputValue(prev => prev ? prev + ' ' + transcript : transcript);
    };

    recognition.onerror = (event) => {
      console.error('Erro no microfone:', event.error);
      setIsListening(false);
    };

    recognition.onend = () => setIsListening(false);

    recognition.start();
  };

  const addBotMessage = (text, delay = 600) => {
    setTimeout(() => {
      setChatMessages(prev => [...prev, { sender: 'bot', text }]);
    }, delay);
  };

  const handleChatOption = (option, label) => {
    setChatMessages(prev => [...prev, { sender: 'user', text: label }]);
    if (chatStep === 2) {
      if (option === 'AJUDA') {
        addBotMessage('Não se preocupe! Aqui vão alguns exemplos:\n\n- Corretiva: Consertar o que já quebrou. Pode ser Normal ou de Emergência (quando há risco na produção)!\n- Preventiva: Revisão programada para evitar falhas.\n- Investimento: Instalar algo novo que não existia.\n\nQual delas melhor se encaixa no seu problema?');
        setTimeout(() => {
          setChatMessages(prev => [...prev, { sender: 'bot', text: 'Selecione uma das opções abaixo:' }]);
        }, 1500);
        return;
      }
      setTipoServico(option);
      if (option === 'CORRETIVA') {
        setChatStep(3);
        addBotMessage('É uma emergência (risco de parar a produção)?');
      } else {
        setIsEmergencia(false);
        setChatStep(4);
        addBotMessage('Entendido. Qual é o Setor de execução?');
      }
    } else if (chatStep === 3) {
      setIsEmergencia(option === 'SIM');
      setChatStep(4);
      addBotMessage('Certo. Qual é o Setor de execução?');
    } else if (chatStep === 6) {
      setRequerPecas(option === 'SIM');
      setChatStep(7);
      if (option === 'SIM') {
        addBotMessage('Ok! Por favor, volte para o MODO MANUAL no topo da tela para buscar os itens no carrinho, ou conclua sem peças.');
      } else {
        addBotMessage('Tudo pronto! Você já pode clicar em Abrir Chamado.');
      }
    }
  };

  const handleChatSend = () => {
    if (!chatInputValue.trim()) return;
    const text = chatInputValue.trim();
    setChatMessages(prev => [...prev, { sender: 'user', text }]);
    setChatInputValue('');

    if (chatStep === 1) {
      setDescricaoServico(text.toUpperCase());
      setChatStep(2);
      addBotMessage('Ótimo. Qual é o tipo de serviço?');
    }
  };

  const handleChatSelect = (e, field) => {
    const val = e.target.value;
    setFormulario(prev => ({ ...prev, [field]: val }));
    setChatMessages(prev => [...prev, { sender: 'user', text: val }]);

    if (field === 'setor') {
      setChatStep(5);
      addBotMessage('Agora selecione o Centro de Custo ou Veículo Alvo:');
    } else if (field === 'centroCusto') {
      setChatStep(6);
      addBotMessage('Quase lá! Precisa de material do Almoxarifado para isso?');
    }
  };

  const isPasso1Valido = descricaoServico.trim() !== '';
  const isPasso2Valido = formulario.setor !== '' && formulario.centroCusto !== '';

  const avancarPasso = () => {
    if (passoAtual === 1 && !isPasso1Valido) {
      alert('Por favor, preencha a Descrição do Serviço antes de avançar.');
      return;
    }
    if (passoAtual === 2 && !isPasso2Valido) {
      alert('Por favor, preencha o Setor e o Centro de Custo antes de avançar.');
      return;
    }
    setPassoAtual(prev => Math.min(prev + 1, 4));
  };

  const voltarPasso = () => {
    setPassoAtual(prev => Math.max(prev - 1, 1));
  };

  useEffect(() => {
    const fetchDados = async () => {
      try {
        const [resDep, resLocais, resProj, resCli, resOs, resProxCod, resVeic] = await Promise.all([
          fetch(`/api/departamentos`),
          fetch(`/api/locais-estoque`),
          fetch(`/api/projetos`),
          fetch(`/api/fornecedores`),
          fetch(`/api/os`),
          fetch(`/api/os/proximo-codigo`),
          fetch(`/api/veiculos`)
        ]);
        if(resDep.ok) setDepartamentos(await resDep.json());
        if(resLocais.ok) setLocaisEstoque(await resLocais.json());
        if(resCli.ok) setClientes(await resCli.json());
        if(resVeic.ok) setVeiculos(await resVeic.json());

        if (resProxCod.ok) {
          const prox = await resProxCod.json();
          setProximoCodigoOS(prox.proximoCodigo || '');
        }

        let listaCombinada = [];
        if (resProj.ok) {
          const projs = await resProj.json();
          listaCombinada = projs.map(p => ({ codigo: p.codigo, nome: p.nome }));
        }

        if (resOs.ok) {
          const ordens = await resOs.json();
          ordens.forEach(os => {
            const veiculosStr = os.veiculos?.map(v => v.placa).filter(Boolean).join(', ');
            const infoVeiculos = veiculosStr ? ` (${veiculosStr})` : '';
            const labelOs = `${os.codigo}${infoVeiculos}`;
            listaCombinada.unshift({ codigo: os.codigo, nome: labelOs });
          });
        }
        setProjetos(listaCombinada);
      } catch (err) {
        console.error('Erro ao carregar dados:', err);
      }
    };
    fetchDados();
  }, []);

  const handleChangeForm = (e) => {
    const { name, value } = e.target;
    setFormulario(prev => ({ ...prev, [name]: value }));
  };

  const produtosFiltrados = useMemo(() => {
    if (!termoBusca || termoBusca.trim().length < 2) return [];
    const termos = termoBusca.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return (produtos || []).filter(p => {
      const desc = (p.descricao || '').toLowerCase();
      const cod = (p.codigo || '').toLowerCase();
      return termos.every(t => desc.includes(t) || cod.includes(t));
    }).slice(0, 8);
  }, [produtos, termoBusca]);

  const handleSelecionarProduto = (prod) => {
    setProdutoSelecionado(prod);
    setTermoBusca('');
    setQuantidadeItem(1);
  };

  const handleAdicionarLista = () => {
    if (!produtoSelecionado || quantidadeItem <= 0) return;

    const unitPrice = Number(produtoSelecionado.valor_unitario || produtoSelecionado.preco || produtoSelecionado.preco_venda || produtoSelecionado.preco_unitario || 0);
    const unidadeItem = produtoSelecionado.unidade || 'UN';
    const itemExistente = itensCarrinho.find(i => i.codigo === produtoSelecionado.codigo);

    if (itemExistente) {
      setItensCarrinho(itensCarrinho.map(i =>
        i.codigo === produtoSelecionado.codigo
          ? {
              ...i,
              quantidade: Number(i.quantidade) + Number(quantidadeItem),
              unidade: i.unidade || unidadeItem,
              valor_unitario: i.valor_unitario !== undefined ? i.valor_unitario : unitPrice
            }
          : i
      ));
    } else {
      setItensCarrinho([...itensCarrinho, {
        codigo: produtoSelecionado.codigo,
        descricao: produtoSelecionado.descricao,
        quantidade: Number(quantidadeItem),
        unidade: unidadeItem,
        valor_unitario: unitPrice
      }]);
    }
    setProdutoSelecionado(null);
    setQuantidadeItem(1);
  };

  const handleRemoverItem = (codigo) => {
    setItensCarrinho(itensCarrinho.filter(i => i.codigo !== codigo));
  };

  const handleConcluir = async () => {
    if (!descricaoServico) {
      alert('Por favor, preencha a Descrição do Serviço!');
      return;
    }

    setLoading(true);
    
    const flagEmergencia = tipoServico === 'CORRETIVA' ? isEmergencia : false;

    // Payload para Ordem de Serviço (Sem o código, para o servidor gerar na hora de salvar e evitar duplicidade)
    const osPayload = {
      data: new Date().toISOString().split('T')[0],
      hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      abertoPor: usuarioLogado.nome,
      requisitante: 'AGUARDANDO TRIAGEM', // O chefe assumirá ao aprovar
      setor: formulario.setor || 'ADMINSTRATIVO',
      centroCusto: formulario.centroCusto || '',
      tipo: tipoServico,
      isEmergencia: flagEmergencia,
      prioridade: flagEmergencia ? '3-EMERGÊNCIA' : '1-NORMAL',
      descricao: descricaoServico,
      motivo: formulario.motivo || '',
      situacao: flagEmergencia ? 'EMERGENCIA_CHEFE_SETOR' : 'AGUARDANDO_CHEFE_SETOR',
      tipoManutencao: requerPecas ? 'COM_PECA' : 'SEM_PECA',
      pecasSolicitadas: requerPecas ? itensCarrinho : []
    };

    try {
      // 1. Cria a O.S. sequencial no banco
      const response = await fetch('/api/os', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(osPayload)
      });

      if (response.ok) {
        const responseData = await response.json();
        const codigoGerado = responseData.os?.codigo || 'GERADO';
        
        setSucessoReqId(codigoGerado);
        
        // Limpar form
        setDescricaoServico('');
        setTermoBusca('');
        setProdutoSelecionado(null);
        setQuantidadeItem(1);
        setItensCarrinho([]);
        setFormulario({
          localEstoque: 'PADRAO - Local de Estoque Padrão',
          setor: '',
          centroCusto: '',
          numeroOS: '',
          contatoCliente: '',
          prioridade: 'normal'
        });
        setTipoServico('CORRETIVA');
        setIsEmergencia(false);
        setRequerPecas(false);
        setIsChatMode(false);
        setChatStep(1);
        setChatMessages([{ sender: 'bot', text: 'Olá! Qual é o problema que você precisa relatar? (Descreva com detalhes)' }]);
      } else {
        alert('Erro ao salvar a O.S.');
      }
    } catch (error) {
      console.error('Erro:', error);
      alert('Erro de conexão ao salvar a O.S.');
    } finally {
      setLoading(false);
    }
  };

  if (sucessoReqId) {
    return (
      <div className={styles.sucessoBox}>
        <CheckCircle2 size={64} color="#f97316" />
        <h3>Chamado de Serviço Aberto!</h3>
        <p>Sua solicitação foi registrada com sucesso e encaminhada para triagem do Chefe de Setor.</p>
        
        <div className={styles.numProtocolo}>
          O.S. {sucessoReqId}
        </div>

        <button 
          className={styles.btnConcluir}
          onClick={() => setSucessoReqId(null)}
          style={{ background: '#3b82f6' }}
        >
          <RotateCcw size={20} />
          Abrir Novo Chamado
        </button>
      </div>
    );
  }

  const isFormValid = descricaoServico.trim() !== '' && formulario.setor !== '' && formulario.centroCusto !== '';

  return (
    <div style={{ padding: '24px 16px', display: 'flex', flexDirection: 'column', minHeight: '80vh' }}>
      
      {/* MODO TOGGLE */}
      <div className={styles.modeToggleContainer}>
        <div className={styles.modeToggle}>
          <button 
            className={`${styles.modeToggleBtn} ${!isChatMode ? styles.modeToggleBtnActive : ''}`}
            onClick={() => setIsChatMode(false)}
          >
            <ListTodo size={16} /> Passo a Passo
          </button>
          <button 
            className={`${styles.modeToggleBtn} ${isChatMode ? styles.modeToggleBtnActive : ''}`}
            onClick={() => setIsChatMode(true)}
          >
            <MessageSquare size={16} /> Assistente (Chat)
          </button>
        </div>
      </div>

      {!isChatMode ? (
        <>
      {/* Stepper Header */}
      <div className={styles.stepperContainer}>
        <div className={styles.stepperLine}>
          <div className={styles.stepperLineProgress} style={{ width: `${((passoAtual - 1) / 3) * 100}%` }}></div>
        </div>
        
        {[1, 2, 3, 4].map(step => (
          <div key={step} className={styles.stepWrapper}>
            <div className={`${styles.stepCircle} ${passoAtual === step ? styles.stepCircleActive : ''} ${passoAtual > step ? styles.stepCircleCompleted : ''}`}>
              {passoAtual > step ? <CheckCircle2 size={16} /> : step}
            </div>
            <div className={`${styles.stepLabel} ${passoAtual >= step ? styles.stepLabelActive : ''}`}>
              {step === 1 ? 'Básico' : step === 2 ? 'Local' : step === 3 ? 'Peças' : 'Resumo'}
            </div>
          </div>
        ))}
      </div>

      {/* BADGE DA O.S. COMPACTO (Sempre visível) */}
      <div style={{
        backgroundColor: 'var(--cor-fundo-secundario, #f1f5f9)',
        border: '1px solid var(--cor-borda-cartao)',
        borderRadius: '4px',
        padding: '8px 12px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <div>
          <div style={{ fontSize: '0.65rem', color: 'var(--cor-texto-secundario)', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '2px' }}>
            Nº O.S. (Automático)
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--cor-destaque)' }}>
            {proximoCodigoOS || 'Carregando...'}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--cor-texto-secundario)', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '2px' }}>
            Abertura
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--cor-texto-principal)', fontWeight: '600' }}>
            {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>

      {/* STEP 1: INFORMAÇÕES BÁSICAS */}
      {passoAtual === 1 && (
        <div className={styles.stepContent}>
          <h3 className={styles.sectionTitle}>1. O que aconteceu?</h3>
          <div className={styles.formBlock}>
            <div className={styles.formGroup}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <label style={{ margin: 0 }}>Tipo de Serviço</label>
                <button 
                  onClick={() => setShowInfoModal(true)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--cor-destaque)', cursor: 'pointer', padding: '2px', display: 'flex' }}
                  title="O que significa cada tipo?"
                >
                  <Info size={18} />
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  { id: 'CORRETIVA', label: 'Manutenção Corretiva', desc: 'Consertar algo que já quebrou ou parou de funcionar.' },
                  { id: 'PREVENTIVA', label: 'Preventiva / Preditiva', desc: 'Revisão programada para evitar falhas e quebras.' },
                  { id: 'INVESTIMENTO', label: 'Implantação / Investimento', desc: 'Instalação de algo novo ou melhoria no setor.' }
                ].map(tipo => (
                  <div 
                    key={tipo.id}
                    onClick={() => {
                      setTipoServico(tipo.id);
                      if (tipo.id !== 'CORRETIVA') setIsEmergencia(false);
                    }}
                    style={{
                      padding: '14px',
                      borderRadius: '8px',
                      border: tipoServico === tipo.id ? '2px solid var(--cor-destaque)' : '1px solid var(--cor-borda-cartao)',
                      backgroundColor: tipoServico === tipo.id ? 'rgba(249, 115, 22, 0.1)' : 'var(--cor-fundo-cartao)',
                      color: tipoServico === tipo.id ? 'var(--cor-destaque)' : 'var(--cor-texto-principal)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      transition: 'all 0.2s',
                      textTransform: 'uppercase'
                    }}
                  >
                    <div style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      border: tipoServico === tipo.id ? '4px solid var(--cor-destaque)' : '2px solid var(--cor-borda-cartao)',
                      transition: 'all 0.2s',
                      flexShrink: 0
                    }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontWeight: tipoServico === tipo.id ? 'bold' : '600', fontSize: '0.95rem' }}>{tipo.label}</span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--cor-texto-secundario)', textTransform: 'none' }}>{tipo.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {tipoServico === 'CORRETIVA' && (
              <div 
                onClick={() => setIsEmergencia(!isEmergencia)}
                style={{
                  padding: '14px',
                  borderRadius: '8px',
                  border: isEmergencia ? '2px solid #ef4444' : '1px solid var(--cor-borda-cartao)',
                  backgroundColor: isEmergencia ? 'rgba(239, 68, 68, 0.1)' : 'var(--cor-fundo-cartao)',
                  color: isEmergencia ? '#ef4444' : 'var(--cor-texto-principal)',
                  fontWeight: isEmergencia ? 'bold' : 'normal',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  transition: 'all 0.2s',
                  fontSize: '0.95rem',
                  textTransform: 'uppercase',
                  marginBottom: '12px'
                }}
              >
                <div style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '4px',
                  border: isEmergencia ? '4px solid #ef4444' : '2px solid var(--cor-borda-cartao)',
                  transition: 'all 0.2s'
                }} />
                <ShieldAlert size={16} color={isEmergencia ? "#ef4444" : "var(--cor-texto-secundario)"} /> 
                É Emergência? (Risco na Produção)
              </div>
            )}

            <div className={styles.formGroup}>
              <label>Descrição do Serviço / Chamado <span style={{color: '#ef4444'}}>*</span></label>
              <textarea
                rows="3"
                placeholder="Ex: Trocar 2 lâmpadas no setor de eletrônica..."
                value={descricaoServico}
                onChange={(e) => setDescricaoServico(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--cor-borda-cartao)', textTransform: 'uppercase', backgroundColor: 'var(--cor-fundo-cartao)', color: 'var(--cor-texto-principal)' }}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label>Motivo / Causa (Por que o serviço é necessário?)</label>
              <input
                type="text"
                placeholder="Ex: Desgaste natural, mau uso, preventivo..."
                value={formulario.motivo || ''}
                onChange={(e) => setFormulario({ ...formulario, motivo: (e.target.value).toUpperCase() })}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--cor-borda-cartao)', backgroundColor: 'var(--cor-fundo-cartao)', color: 'var(--cor-texto-principal)' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: LOCALIZAÇÃO */}
      {passoAtual === 2 && (
        <div className={styles.stepContent}>
          <h3 className={styles.sectionTitle}>2. Onde ocorreu?</h3>
          <div className={styles.formBlock}>
            <div className={styles.formGroup}>
              <label>Setor de Execução <span style={{color: '#ef4444'}}>*</span></label>
              <select 
                name="setor" 
                value={formulario.setor} 
                onChange={handleChangeForm}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--cor-borda-cartao)', backgroundColor: 'var(--cor-fundo-cartao)', color: 'var(--cor-texto-principal)' }}
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
              <label>Centro de Custo / Veículo Alvo <span style={{color: '#ef4444'}}>*</span></label>
              <select 
                name="centroCusto" 
                value={formulario.centroCusto} 
                onChange={handleChangeForm}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--cor-borda-cartao)', backgroundColor: 'var(--cor-fundo-cartao)', color: 'var(--cor-texto-principal)' }}
              >
                <option value="" disabled>Selecione uma opção...</option>
                <optgroup label="Departamentos / Setores">
                  {departamentos.map(d => (
                    <option key={`dep-${d.codigo || d.descricao}`} value={d.descricao}>{d.descricao}</option>
                  ))}
                </optgroup>
                <optgroup label="Veículos da Empresa">
                  {veiculos.map(v => (
                    <option key={`veic-${v.placa}`} value={v.placa}>{v.modelo ? `${v.placa} - ${v.modelo}` : v.placa}</option>
                  ))}
                </optgroup>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: MATERIAIS */}
      {passoAtual === 3 && (
        <div className={styles.stepContent}>
          <h3 className={styles.sectionTitle}>3. Precisa de Materiais?</h3>
          <div className={styles.formBlock}>
            <div 
              onClick={() => setRequerPecas(!requerPecas)}
              style={{
                padding: '14px',
                borderRadius: '8px',
                border: requerPecas ? '2px solid var(--cor-destaque)' : '1px solid var(--cor-borda-cartao)',
                backgroundColor: requerPecas ? 'rgba(249, 115, 22, 0.1)' : 'var(--cor-fundo-cartao)',
                color: requerPecas ? 'var(--cor-destaque)' : 'var(--cor-texto-principal)',
                fontWeight: requerPecas ? 'bold' : 'normal',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                transition: 'all 0.2s',
                fontSize: '0.95rem',
                textTransform: 'uppercase'
              }}
            >
              <div style={{
                width: '16px',
                height: '16px',
                borderRadius: '4px',
                border: requerPecas ? '4px solid var(--cor-destaque)' : '2px solid var(--cor-borda-cartao)',
                transition: 'all 0.2s'
              }} />
              <Wrench size={16} color={requerPecas ? "var(--cor-destaque)" : "var(--cor-texto-secundario)"} /> 
              Serviço Precisa de Material?
            </div>
            
            {requerPecas && (
              <div style={{ marginTop: '16px' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--cor-texto-secundario)', marginBottom: '8px' }}>Busque e adicione os materiais que precisará do Almoxarifado para este serviço:</p>
                
                {!produtoSelecionado ? (
                  <div style={{ position: 'relative' }}>
                    <input 
                      type="text" 
                      placeholder="Buscar peça por nome ou código..." 
                      value={termoBusca} 
                      onChange={(e) => setTermoBusca(e.target.value)} 
                      style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--cor-destaque)', textTransform: 'uppercase', backgroundColor: 'var(--cor-fundo-cartao)', color: 'var(--cor-texto-principal)' }} 
                    />
                    {produtosFiltrados.length > 0 && (
                      <ul style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: 'var(--cor-fundo-cartao)', border: '1px solid var(--cor-destaque)', borderRadius: '6px', margin: 0, padding: 0, listStyle: 'none', maxHeight: '150px', overflowY: 'auto', zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
                        {produtosFiltrados.map(p => (
                          <li key={p.codigo} onClick={() => handleSelecionarProduto(p)} style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid var(--cor-borda-cartao)', fontSize: '0.85rem', color: 'var(--cor-texto-principal)' }}>
                            <strong>{p.codigo}</strong> - {p.descricao}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', backgroundColor: 'var(--cor-fundo-cartao)', padding: '12px', borderRadius: '6px', border: '1px solid var(--cor-destaque)' }}>
                    <span style={{ flex: 1, fontSize: '0.85rem', color: 'var(--cor-texto-principal)' }}><strong>Selecionado:</strong> {produtoSelecionado.descricao}</span>
                    <input 
                      type="number" 
                      min="1" 
                      value={quantidadeItem} 
                      onChange={e => setQuantidadeItem(e.target.value)} 
                      style={{ width: '60px', padding: '8px', borderRadius: '4px', border: '1px solid var(--cor-borda-cartao)', textAlign: 'center', backgroundColor: 'var(--cor-fundo-secundario)', color: 'var(--cor-texto-principal)' }}
                    />
                    <button onClick={handleAdicionarLista} style={{ backgroundColor: 'var(--cor-destaque)', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Add</button>
                    <button onClick={() => setProdutoSelecionado(null)} style={{ backgroundColor: 'transparent', color: 'var(--cor-texto-secundario)', border: '1px solid var(--cor-texto-secundario)', padding: '8px', borderRadius: '4px', cursor: 'pointer' }}>X</button>
                  </div>
                )}

                {itensCarrinho.length > 0 && (
                  <div style={{ marginTop: '16px' }}>
                    <h5 style={{ margin: '0 0 8px 0', color: 'var(--cor-texto-principal)' }}>Itens Solicitados:</h5>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                      {itensCarrinho.map(item => (
                        <li key={item.codigo} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', borderBottom: '1px solid var(--cor-borda-cartao)', fontSize: '0.85rem' }}>
                          <span style={{ color: 'var(--cor-texto-principal)' }}><strong>{item.quantidade}x</strong> {item.descricao}</span>
                          <button onClick={() => handleRemoverItem(item.codigo)} style={{ background: 'transparent', border: 'none', color: 'var(--cor-erro)', cursor: 'pointer', padding: '4px' }}>
                            <Trash2 size={16} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* STEP 4: RESUMO */}
      {passoAtual === 4 && (
        <div className={styles.stepContent}>
          <h3 className={styles.sectionTitle}>4. Resumo da Solicitação</h3>
          
          <div className={styles.resumoBox}>
            <div className={styles.resumoItem}>
              <span className={styles.resumoLabel}>Tipo de Serviço</span>
              <span className={styles.resumoValor}>
                {tipoServico === 'CORRETIVA' ? 'Manutenção Corretiva' : tipoServico === 'PREVENTIVA' ? 'Preventiva / Preditiva' : 'Implantação / Investimento'}
                {tipoServico === 'CORRETIVA' && isEmergencia && <span style={{ color: '#ef4444', fontWeight: 'bold', marginLeft: '8px' }}>(EMERGÊNCIA)</span>}
              </span>
            </div>
            
            <div className={styles.resumoItem}>
              <span className={styles.resumoLabel}>Descrição / Relato</span>
              <span className={styles.resumoValor} style={{ textTransform: 'uppercase' }}>{descricaoServico}</span>
            </div>
            
            {formulario.motivo && (
              <div className={styles.resumoItem}>
                <span className={styles.resumoLabel}>Motivo</span>
                <span className={styles.resumoValor}>{formulario.motivo}</span>
              </div>
            )}

            <div className={styles.resumoItem}>
              <span className={styles.resumoLabel}>Setor e Centro de Custo</span>
              <span className={styles.resumoValor}>{formulario.setor} | {formulario.centroCusto}</span>
            </div>
            
            <div className={styles.resumoItem}>
              <span className={styles.resumoLabel}>Materiais Solicitados</span>
              <span className={styles.resumoValor}>
                {!requerPecas || itensCarrinho.length === 0 ? 'Nenhum material solicitado.' : `${itensCarrinho.length} item(ns) na lista.`}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Navegação Inferior */}
      <div style={{ marginTop: 'auto', paddingTop: '24px' }}>
        <div className={styles.navButtons}>
          {passoAtual > 1 && (
            <button className={styles.btnVoltar} onClick={voltarPasso}>
              <ChevronLeft size={20} />
              Voltar
            </button>
          )}
          
          {passoAtual < 4 ? (
            <button className={styles.btnAvancar} onClick={avancarPasso}>
              Próximo Passo
              <ChevronRight size={20} />
            </button>
          ) : (
            <button 
              className={styles.btnConcluir}
              onClick={handleConcluir}
              disabled={loading}
              style={{ width: '100%', flex: 2, padding: '16px', fontSize: '1rem', borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
            >
              <Send size={20} />
              {loading ? 'Processando...' : 'Abrir Chamado'}
            </button>
          )}
        </div>
      </div>
        </>
      ) : (
        <div className={styles.chatContainer}>
          <div className={styles.chatMessages}>
            {chatMessages.map((msg, i) => (
              <div key={i} className={`${styles.chatBubble} ${msg.sender === 'bot' ? styles.chatBubbleBot : styles.chatBubbleUser}`}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px', opacity: 0.7, fontSize: '0.75rem', fontWeight: 'bold' }}>
                  {msg.sender === 'bot' ? <><Bot size={14} /> Assistente</> : <><User size={14} /> Você</>}
                </div>
                {msg.text}
              </div>
            ))}
            
            {/* Chat Inputs Especiais */}
            {chatStep === 2 && chatMessages[chatMessages.length - 1].sender === 'bot' && (
              <div className={styles.chatOptions}>
                <button className={styles.chatOptionBtn} onClick={() => handleChatOption('CORRETIVA', 'Manutenção Corretiva')}>
                  <div style={{ fontSize: '0.9rem' }}>Manutenção Corretiva</div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 'normal', opacity: 0.8, marginTop: '2px' }}>Consertar algo que já quebrou ou parou.</div>
                </button>
                <button className={styles.chatOptionBtn} onClick={() => handleChatOption('PREVENTIVA', 'Preventiva / Preditiva')}>
                  <div style={{ fontSize: '0.9rem' }}>Preventiva / Preditiva</div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 'normal', opacity: 0.8, marginTop: '2px' }}>Revisão para evitar falhas futuras.</div>
                </button>
                <button className={styles.chatOptionBtn} onClick={() => handleChatOption('INVESTIMENTO', 'Implantação / Investimento')}>
                  <div style={{ fontSize: '0.9rem' }}>Implantação / Investimento</div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 'normal', opacity: 0.8, marginTop: '2px' }}>Instalação de algo novo ou melhoria.</div>
                </button>
                <button className={styles.chatOptionBtn} onClick={() => handleChatOption('AJUDA', '❓ Não sei qual escolher')} style={{ borderColor: 'var(--cor-texto-secundario)', color: 'var(--cor-texto-principal)', marginTop: '8px' }}>
                  <div style={{ fontSize: '0.9rem', textAlign: 'center' }}>❓ Não sei qual escolher</div>
                </button>
              </div>
            )}
            {chatStep === 3 && chatMessages[chatMessages.length - 1].sender === 'bot' && (
              <div className={styles.chatOptions}>
                <button className={styles.chatOptionBtn} onClick={() => handleChatOption('SIM', 'Sim, é emergência')}>Sim, é emergência</button>
                <button className={styles.chatOptionBtn} onClick={() => handleChatOption('NAO', 'Não, pode ser programado')}>Não, pode ser programado</button>
              </div>
            )}
            {chatStep === 4 && chatMessages[chatMessages.length - 1].sender === 'bot' && (
              <select value="" onChange={(e) => handleChatSelect(e, 'setor')} className={styles.chatInput} style={{marginTop: '10px'}}>
                <option value="" disabled>Selecione um setor...</option>
                <option value="ELETRICA">ELETRICA</option>
                <option value="MECANICA">MECANICA</option>
                <option value="SERRALHEIRO">SERRALHEIRO</option>
                <option value="SERVICO GERAL">SERVICO GERAL</option>
                <option value="LOGISTICA">LOGISTICA</option>
              </select>
            )}
            {chatStep === 5 && chatMessages[chatMessages.length - 1].sender === 'bot' && (
              <select value="" onChange={(e) => handleChatSelect(e, 'centroCusto')} className={styles.chatInput} style={{marginTop: '10px'}}>
                <option value="" disabled>Selecione o centro de custo...</option>
                {departamentos.map(d => <option key={d.descricao} value={d.descricao}>{d.descricao}</option>)}
                {veiculos.map(v => <option key={v.placa} value={v.placa}>{v.placa} {v.modelo}</option>)}
              </select>
            )}
            {chatStep === 6 && chatMessages[chatMessages.length - 1].sender === 'bot' && (
              <div className={styles.chatOptions}>
                <button className={styles.chatOptionBtn} onClick={() => handleChatOption('SIM', 'Sim, preciso de materiais')}>Sim, preciso de materiais</button>
                <button className={styles.chatOptionBtn} onClick={() => handleChatOption('NAO', 'Não preciso')}>Não preciso</button>
              </div>
            )}
            {chatStep === 7 && (
              <div style={{ textAlign: 'center', marginTop: '10px' }}>
                <button className={styles.btnConcluir} onClick={handleConcluir} disabled={loading || !isFormValid} style={{ margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Send size={20} style={{marginRight: '8px'}} /> {loading ? 'Processando...' : 'Abrir Chamado Agora'}
                </button>
              </div>
            )}
            <div ref={chatMessagesEndRef} />
          </div>

          {chatStep === 1 && (
            <div className={styles.chatInputArea}>
              <button 
                className={`${styles.chatMicBtn} ${isListening ? styles.chatMicBtnListening : ''}`} 
                onClick={startListening}
                title="Falar"
              >
                <Mic size={18} />
              </button>
              <input 
                type="text" 
                placeholder={isListening ? "Ouvindo..." : "Digite o problema..."} 
                className={styles.chatInput} 
                value={chatInputValue}
                onChange={e => setChatInputValue(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && handleChatSend()}
              />
              <button className={styles.chatSendBtn} onClick={handleChatSend} disabled={!chatInputValue.trim()}>
                <Send size={18} />
              </button>
            </div>
          )}
        </div>
      )}
      
      {/* Modal de Informação */}
      {showInfoModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ backgroundColor: 'var(--cor-fundo-principal)', borderRadius: '12px', width: '100%', maxWidth: '400px', overflow: 'hidden', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--cor-borda-cartao)', backgroundColor: 'var(--cor-fundo-cartao)' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--cor-texto-principal)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Info size={20} color="var(--cor-destaque)" />
                Tipos de Serviço
              </h3>
              <button onClick={() => setShowInfoModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--cor-texto-secundario)' }}>
                <X size={24} />
              </button>
            </div>
            <div style={{ padding: '20px' }}>
              <div style={{ marginBottom: '16px' }}>
                <strong style={{ color: 'var(--cor-texto-principal)', fontSize: '1rem', display: 'block', marginBottom: '4px' }}>Manutenção Corretiva</strong>
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--cor-texto-secundario)', lineHeight: '1.5' }}>Usada quando algo parou de funcionar ou quebrou de surpresa. <strong>Pode ser reportada como Normal ou de Emergência (quando há risco de parar a produção).</strong> <br/><strong>Exemplos:</strong> Lâmpada queimada, torneira vazando, máquina parada, disjuntor desarmando.</p>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <strong style={{ color: 'var(--cor-texto-principal)', fontSize: '1rem', display: 'block', marginBottom: '4px' }}>Preventiva / Preditiva</strong>
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--cor-texto-secundario)', lineHeight: '1.5' }}>Usada para manutenções programadas ou vistorias de rotina para evitar que algo quebre no futuro. <br/><strong>Exemplos:</strong> Limpeza de filtros de ar, troca de óleo do gerador, reaperto de painéis.</p>
              </div>
              <div>
                <strong style={{ color: 'var(--cor-texto-principal)', fontSize: '1rem', display: 'block', marginBottom: '4px' }}>Implantação / Investimento</strong>
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--cor-texto-secundario)', lineHeight: '1.5' }}>Usada quando estamos criando ou instalando algo que não existia antes. <br/><strong>Exemplos:</strong> Puxar uma tomada nova em uma sala, instalar um ar-condicionado novo, cabeamento de rede.</p>
              </div>
            </div>
            <div style={{ padding: '16px 20px', borderTop: '1px solid var(--cor-borda-cartao)', textAlign: 'right' }}>
              <button onClick={() => setShowInfoModal(false)} style={{ background: 'var(--cor-destaque)', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RequisicaoMobile;
