import React, { useState, useEffect, useRef } from 'react';
import {
  Send, Camera, X, CheckCircle2, AlertTriangle, Fuel,
  Truck, ArrowRight, ArrowLeft, RefreshCw, Eye, Sparkles, User, MapPin, Gauge, FileText
} from 'lucide-react';
import styles from './index.module.css';
import { parseMoeda } from '../../../../../utils/parseMoeda';
import { validarAntiRetrocessoKM, limparNumeroOdometro } from '../../../../../utils/formatadorOdometro';
import BotaoSair from '../../../../BotaoSair';

const DashboardChatBoxCombustivel = ({ onClose, onSucesso, requisicaoInicial = null, corTema = 'laranja', isFrentistaProp = false, isMotoristaProp = false }) => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [etapa, setEtapa] = useState('PEDIR_NUMERO_REQ'); // PEDIR_NUMERO_REQ, PEDIR_CUPOM, PEDIR_KM, PEDIR_LITROS, PEDIR_PRECO, PEDIR_FOTO, CONFIRMACAO, FINALIZADO

  // Identificação do Usuário Logado
  const currentUser = React.useMemo(() => {
    try {
      const saved = localStorage.getItem('almoxarifado_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  }, []);
  const isMotorista = isMotoristaProp || currentUser?.role === 'motorista';
  const isFrentista = isFrentistaProp || currentUser?.role === 'frentista';
  const isVerde = corTema === 'verde';
  const podeVerValores = currentUser?.role === 'admin' || currentUser?.role === 'administrador';
  const SESSION_KEY = isFrentista ? 'frentista_chat_sessao' : isMotorista ? 'motorista_chat_sessao' : 'combustivel_chat_sessao';

  // Dados do Abastecimento
  const [requisicaoSelecionada, setRequisicaoSelecionada] = useState(requisicaoInicial);
  const [todasRequisicoes, setTodasRequisicoes] = useState([]);
  const [veiculosList, setVeiculosList] = useState([]);
  const [geradoresList, setGeradoresList] = useState([]);
  const [ultimoKmRef, setUltimoKmRef] = useState(0);

  const [cupom, setCupom] = useState('');
  const [kmAtual, setKmAtual] = useState('');
  const [litros, setLitros] = useState('');
  const [precoLitro, setPrecoLitro] = useState('');
  const [fotoVisor, setFotoVisor] = useState('');
  const [fotoZoom, setFotoZoom] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fotoVisorRef = useRef('');
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const inputRef = useRef(null);
  const inicializadoRef = useRef(false);

  // Helper de persistência de sessão seguro (sem elementos JSX) para blindagem contra recarregamento no celular
  const salvarSessao = (novosDados = {}) => {
    try {
      const msgsParaSalvar = (novosDados.messages || messages || []).map(m => ({
        id: m.id,
        sender: m.sender,
        text: m.text,
        tipoCard: m.tipoCard || null,
        cardData: m.cardData || null,
        fotoUrl: m.fotoUrl || null,
        time: m.time
      }));

      const sessaoAtual = {
        requisicaoSelecionada: novosDados.requisicaoSelecionada !== undefined ? novosDados.requisicaoSelecionada : requisicaoSelecionada,
        cupom: novosDados.cupom !== undefined ? novosDados.cupom : cupom,
        kmAtual: novosDados.kmAtual !== undefined ? novosDados.kmAtual : kmAtual,
        litros: novosDados.litros !== undefined ? novosDados.litros : litros,
        precoLitro: novosDados.precoLitro !== undefined ? novosDados.precoLitro : precoLitro,
        etapa: novosDados.etapa !== undefined ? novosDados.etapa : etapa,
        messages: msgsParaSalvar,
        fotoVisor: novosDados.fotoVisor !== undefined ? novosDados.fotoVisor : (fotoVisorRef.current || fotoVisor),
        ultimoKmRef: novosDados.ultimoKmRef !== undefined ? novosDados.ultimoKmRef : ultimoKmRef
      };

      if (sessaoAtual.requisicaoSelecionada) {
        const serialized = JSON.stringify(sessaoAtual);
        try { sessionStorage.setItem(SESSION_KEY, serialized); } catch (e) { }
        try { localStorage.setItem(SESSION_KEY, serialized); } catch (e) { }
      }
    } catch (e) {
      console.error('Erro ao salvar sessao do chat:', e);
    }
  };

  const limparSessao = () => {
    try {
      sessionStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(SESSION_KEY);
    } catch (e) { }
  };

  // Rola para a mensagem mais recente automaticamente
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Carrega requisições, veículos e geradores na inicialização
  useEffect(() => {
    fetch('/api/combustivel')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setTodasRequisicoes(data);
      })
      .catch(err => console.error('Erro ao carregar requisições:', err));

    fetch('/api/veiculos')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setVeiculosList(data);
      })
      .catch(err => console.error('Erro ao carregar veículos:', err));

    fetch('/api/geradores')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setGeradoresList(data);
      })
      .catch(err => console.error('Erro ao carregar geradores:', err));
  }, []);

  // Renderiza texto convertendo marcações **negrito** em <strong>
  const renderFormattedText = (text) => {
    if (!text || typeof text !== 'string') return text;
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    if (parts.length === 1) return text;
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  // Helper para adicionar mensagem do Bot com delay e persistência limpa
  const botReply = (text, cardOrExtra = null, nextEtapa = null) => {
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      const agora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      let cardInfo = {};
      if (cardOrExtra && typeof cardOrExtra === 'object') {
        if (cardOrExtra.tipoCard) {
          cardInfo = cardOrExtra;
        } else if (React.isValidElement(cardOrExtra)) {
          cardInfo = { legacyExtra: cardOrExtra };
        }
      }

      setMessages(prev => {
        // Trava anti-duplicação: não insere a mesma mensagem repetida consecutivamente
        if (prev.length > 0) {
          const ultima = prev[prev.length - 1];
          if (ultima.sender === 'bot' && ultima.text === text) {
            return prev;
          }
        }
        const novaLista = [
          ...prev,
          {
            id: Date.now() + Math.random(),
            sender: 'bot',
            text,
            ...cardInfo,
            time: agora
          }
        ];
        salvarSessao({ messages: novaLista, ...(nextEtapa ? { etapa: nextEtapa } : {}) });
        return novaLista;
      });
      if (nextEtapa) setEtapa(nextEtapa);
    }, 450);
  };

  // Helper para adicionar mensagem do Usuário
  const userReply = (text, cardOrExtra = null) => {
    const agora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    let cardInfo = {};
    if (cardOrExtra && typeof cardOrExtra === 'object') {
      if (cardOrExtra.tipoCard) {
        cardInfo = cardOrExtra;
      } else if (React.isValidElement(cardOrExtra)) {
        cardInfo = { legacyExtra: cardOrExtra };
      }
    }
    setMessages(prev => {
      const novaLista = [
        ...prev,
        {
          id: Date.now() + Math.random(),
          sender: 'user',
          text,
          ...cardInfo,
          time: agora
        }
      ];
      salvarSessao({ messages: novaLista });
      return novaLista;
    });
  };

  // Identifica se o destino da requisição é Veículo, Gerador/Granja ou Outro Equipamento
  const identificarDestino = (req) => {
    if (!req) return { isVeiculo: false, isGerador: false, tipoTexto: 'Destino' };
    const vNome = (req.veiculo || req.uConsu || '').trim().toUpperCase();
    const vNomeLimpo = vNome.replace(/[^A-Z0-9]/g, '');

    let isVeiculo = veiculosList.some(v => (v.placa || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '') === vNomeLimpo);
    const isGerador = geradoresList.some(g => (g.nome || g.codigo || g.granja || '').trim().toUpperCase() === vNome) ||
      vNome.includes('GERADOR') || vNome.includes('GRANJA') || vNome.startsWith('G. ') || vNome.startsWith('G-') || (req.tipo === 'granja' || req.tipo === 'gerador');

    // Se não achou na lista do banco, tenta classificar por padrão de texto
    if (!isVeiculo && !isGerador) {
      // Padrão de Placa (Mercosul ou Antiga: 3 letras + 4 números/letras) ou começa com 'TRA' (Trator)
      const isPlaca = /^[A-Z]{3}\d[A-Z0-9]\d{2}$/.test(vNomeLimpo) || /^[A-Z]{3}\d{4}$/.test(vNomeLimpo);
      const isTrator = vNome.startsWith('TRA');

      if (isPlaca || isTrator) {
        isVeiculo = true;
      }
    }

    let tipoTexto = 'Veículo';
    if (isGerador) tipoTexto = 'Gerador / Granja';
    else if (!isVeiculo) tipoTexto = 'Equipamento / Setor';

    return { isVeiculo, isGerador, tipoTexto };
  };

  // Mensagem Inicial do Agente (protegido contra duplicação e com recuperação de sessão no celular)
  useEffect(() => {
    if (inicializadoRef.current) return;
    inicializadoRef.current = true;

    // Blindagem de Celular: Tenta restaurar sessão se a aba recarregou após a câmera do smartphone (sessionStorage ou localStorage)
    try {
      const sessaoSalva = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
      if (sessaoSalva) {
        const p = JSON.parse(sessaoSalva);
        if (p && p.requisicaoSelecionada && p.etapa && p.etapa !== 'FINALIZADO') {
          setRequisicaoSelecionada(p.requisicaoSelecionada);
          if (p.cupom) setCupom(p.cupom);
          if (p.kmAtual !== undefined && p.kmAtual !== '') setKmAtual(p.kmAtual);
          if (p.litros) setLitros(p.litros);
          if (p.precoLitro) setPrecoLitro(p.precoLitro);
          if (p.ultimoKmRef) setUltimoKmRef(p.ultimoKmRef);
          if (p.fotoVisor) {
            setFotoVisor(p.fotoVisor);
            fotoVisorRef.current = p.fotoVisor;
          }
          setEtapa(p.etapa);
          if (Array.isArray(p.messages) && p.messages.length > 0) {
            setMessages(p.messages);
            return;
          }
        }
      }
    } catch (e) { }

    if (requisicaoInicial) {
      // Se já abriu com requisição selecionada (ex: vindo da lista do Frentista)
      configurarRequisicao(requisicaoInicial, true);
    } else {
      const primeiroNome = currentUser?.nome ? currentUser.nome.split(' ')[0] : '';
      const saudacaoNome = primeiroNome ? `, ${primeiroNome}` : '';
      if (isMotorista) {
        botReply(`Olá${saudacaoNome}! 🚗 Bem-vindo ao Assistente de Abastecimento do **Posto Oriente**.`);
      } else if (isFrentista) {
        botReply(`Olá${saudacaoNome}! ⛽ Bem-vindo ao Assistente de Abastecimento Interno (**Posto Yamaves / Almoxarifado**).`);
      } else {
        botReply(`Olá${saudacaoNome}! ⛽ Bem-vindo ao Assistente de Abastecimento da Yamaservice.`);
      }
      setTimeout(() => {
        botReply("Para iniciarmos o registro do abastecimento, qual é o número da sua Requisição?");
      }, 700);
    }
  }, []);

  // Configura a requisição e descobre o último KM ou Horímetro
  const configurarRequisicao = (req, comSaudacao = false) => {
    setRequisicaoSelecionada(req);
    const { isVeiculo, isGerador, tipoTexto } = identificarDestino(req);

    // Regra de Preço: Posto Oriente é externo (pergunta ao motorista), Posto Yamaves/Almoxarifado puxa do lote
    const isPostoOriente = (req.fornecedor || '').toUpperCase().includes('ORIENTE');
    if (isPostoOriente) {
      setPrecoLitro('');
    } else {
      const vUnitLote = req.valorUnitario || req.valor_litro;
      if (vUnitLote && parseFloat(vUnitLote) > 0) {
        setPrecoLitro(vUnitLote);
      } else if (req.lote_origem_id) {
        fetch('/api/combustivel/entradas')
          .then(res => res.json())
          .then(data => {
            const lote = data.find(e => String(e.id) === String(req.lote_origem_id));
            if (lote && parseFloat(lote.valorUn) > 0) {
              setPrecoLitro(lote.valorUn);
            }
          })
          .catch(() => { });
      } else if (req.fornecedor && req.combustivel) {
        fetch(`/api/combustivel/lotes-disponiveis?estoque=${encodeURIComponent(req.fornecedor)}&produto=${encodeURIComponent(req.combustivel)}`)
          .then(res => res.json())
          .then(lotes => {
            if (Array.isArray(lotes) && lotes.length > 0 && parseFloat(lotes[0].valorUn) > 0) {
              setPrecoLitro(lotes[0].valorUn);
            }
          })
          .catch(() => { });
      }
    }

    // Descobre o último KM (veículo) ou Horímetro (gerador/granja)
    let ultimoKm = 0;
    if (req.veiculo) {
      const vNome = req.veiculo.trim().toUpperCase();
      if (isVeiculo) {
        const v = veiculosList.find(item => (item.placa || '').trim().toUpperCase() === vNome);
        if (v) {
          ultimoKm = Math.max(parseFloat(v.kmAtual) || 0, parseFloat(v.kmTrocaOleo) || 0, parseFloat(v.kmRevisao) || 0);
        }
      } else if (isGerador) {
        const g = geradoresList.find(item => (item.nome || item.codigo || item.granja || '').trim().toUpperCase() === vNome);
        if (g) {
          ultimoKm = parseFloat(g.horimetroAtual) || 0;
        }
      }
    }
    if (!ultimoKm && req.km) {
      ultimoKm = parseFloat(req.km) || 0;
    }
    setUltimoKmRef(ultimoKm);

    // Regra do Cupom: No Posto Yamaves e Almoxarifado (ou quando for Frentista), o cupom é o próprio número da requisição
    const forn = (req.fornecedor || '').toUpperCase();
    const isPostoInterno = !forn.includes('ORIENTE');
    const autoPreencherCupom = isFrentista || isPostoInterno;
    const cupomResolvido = String(req.cupom || req.numeroRequisicao || '');

    if (autoPreencherCupom) {
      setCupom(cupomResolvido);
    }

    const exibirCardEPerguntas = (delayCard = 0) => {
      setTimeout(() => {
        botReply(`✅ Requisição #${req.numeroRequisicao} identificada com sucesso!`, {
          tipoCard: 'REQ_CARD',
          cardData: {
            numeroRequisicao: req.numeroRequisicao,
            veiculo: req.veiculo,
            fornecedor: req.fornecedor,
            combustivel: req.combustivel,
            requisitante: req.requisitante || req.motorista,
            tipoTexto,
            autoPreencherCupom,
            cupomResolvido,
            ultimoKm,
            isVeiculo,
            isGerador
          }
        });

        if (autoPreencherCupom) {
          // FRENTISTA (Posto Yamaves / Almoxarifado): Cupom já é a requisição, pula direto para KM, Horímetro ou Litros
          if (isVeiculo) {
            salvarSessao({ requisicaoSelecionada: req, ultimoKmRef: ultimoKm, cupom: cupomResolvido, etapa: 'PEDIR_KM' });
            setTimeout(() => {
              const msgKm = ultimoKm > 0
                ? `Qual é o KM atual marcado no painel do veículo? (Último registrado: ${ultimoKm.toLocaleString('pt-BR')} km)`
                : "Qual é a quilometragem (KM) atual mostrada no painel do veículo?";
              botReply(msgKm, null, 'PEDIR_KM');
            }, 1100);
          } else if (isGerador) {
            salvarSessao({ requisicaoSelecionada: req, ultimoKmRef: ultimoKm, cupom: cupomResolvido, etapa: 'PEDIR_KM' });
            setTimeout(() => {
              const msgHorimetro = ultimoKm > 0
                ? `Qual é o Horímetro atual mostrado no gerador? (Último registrado: ${ultimoKm.toLocaleString('pt-BR')} hrs) - Se não houver horímetro, digite 0 para avançar:`
                : "Qual é o Horímetro atual mostrado no painel do gerador? (Se o equipamento não possuir marcador, digite 0 para avançar):";
              botReply(msgHorimetro, null, 'PEDIR_KM');
            }, 1100);
          } else {
            // NÃO É VEÍCULO NEM GERADOR: Pula direto para litros
            setKmAtual(0);
            salvarSessao({ requisicaoSelecionada: req, ultimoKmRef: 0, cupom: cupomResolvido, kmAtual: 0, etapa: 'PEDIR_LITROS' });
            setTimeout(() => {
              botReply("Destino identificado (dispensa registro de quilometragem).");
              setTimeout(() => {
                botReply("Quantos litros de combustível foram abastecidos?", null, 'PEDIR_LITROS');
              }, 600);
            }, 1100);
          }
        } else {
          // MOTORISTA (Posto Oriente): Pergunta o cupom fiscal impresso pelo posto conveniado
          salvarSessao({ requisicaoSelecionada: req, ultimoKmRef: ultimoKm, etapa: 'PEDIR_CUPOM' });
          setTimeout(() => {
            botReply("Qual o número do Cupom Fiscal / Comprovante impresso pelo posto?", null, 'PEDIR_CUPOM');
          }, 1100);
        }
      }, delayCard);
    };

    if (comSaudacao) {
      const primeiroNome = currentUser?.nome ? currentUser.nome.split(' ')[0] : (currentUser?.username || 'Colega');
      botReply(`Olá, ${primeiroNome}! 👋 Vamos registrar o abastecimento da Requisição #${req.numeroRequisicao}.`);
      exibirCardEPerguntas(700);
    } else {
      exibirCardEPerguntas(0);
    }
  };

  // Processamento das entradas do usuário por etapa
  const handleSendMessage = () => {
    const texto = inputValue.trim();
    if (!texto && etapa !== 'PEDIR_FOTO') return;

    if (etapa === 'PEDIR_NUMERO_REQ') {
      userReply(`Requisição #${texto}`);
      setInputValue('');

      // Busca a requisição
      const encontrada = todasRequisicoes.find(r =>
        String(r.numeroRequisicao).trim() === texto ||
        String(r.id).trim() === texto
      );

      if (!encontrada) {
        botReply(`❌ A Requisição #${texto} não foi encontrada no sistema. Por favor, verifique o número no canhoto e tente novamente.`);
        return;
      }

      if (encontrada.status === 'CONCLUÍDO' || encontrada.status === 'ABASTECIDA') {
        botReply(`⚠️ A Requisição #${texto} já consta como CONCLUÍDA no sistema! Caso precise de um novo abastecimento, abra uma nova requisição na empresa.`);
        return;
      }

      if (encontrada.status === 'CANCELADO' || encontrada.status === 'CANCELADA') {
        botReply(`🚫 A Requisição #${texto} foi CANCELADA. Por favor, procure o responsável no almoxarifado.`);
        return;
      }

      // Regra de Separação de Postos:
      // 1. Motorista abastece exclusivamente no Posto Oriente
      if (isMotorista) {
        const forn = (encontrada.fornecedor || '').toUpperCase();
        if (!forn.includes('ORIENTE')) {
          botReply(`⚠️ A Requisição #${texto} é do fornecedor "${encontrada.fornecedor || 'Posto Interno'}". Como motorista, você registra exclusivamente os abastecimentos externos no **Posto Oriente**. Abastecimentos no Posto Yamaves ou Almoxarifado são operados pelo Frentista Yamaves.`);
          return;
        }
      }

      // 2. Frentista Yamaves abastece exclusivamente Posto Yamaves e Almoxarifado
      if (isFrentista) {
        const forn = (encontrada.fornecedor || '').toUpperCase();
        if (forn.includes('ORIENTE')) {
          botReply(`⚠️ A Requisição #${texto} é do **Posto Oriente** (posto externo conveniado). Ela deve ser lançada pelo próprio motorista que realizou a viagem.`);
          return;
        }
      }

      // Requisição válida e em andamento!
      configurarRequisicao(encontrada);

    } else if (etapa === 'PEDIR_CUPOM') {
      const cupomFormatado = texto.toUpperCase();
      userReply(`Cupom: ${cupomFormatado}`);
      setCupom(cupomFormatado);
      setInputValue('');

      const { isVeiculo, isGerador } = identificarDestino(requisicaoSelecionada);

      if (isVeiculo) {
        const msgKm = ultimoKmRef > 0
          ? `Qual é o KM atual marcado no painel do veículo? (Último registrado: ${ultimoKmRef.toLocaleString('pt-BR')} km)`
          : "Qual é a quilometragem (KM) atual mostrada no painel do veículo?";
        botReply(msgKm, null, 'PEDIR_KM');
        salvarSessao({ cupom: cupomFormatado, etapa: 'PEDIR_KM' });
      } else if (isGerador) {
        const msgHorimetro = ultimoKmRef > 0
          ? `Qual é o Horímetro atual mostrado no gerador? (Último registrado: ${ultimoKmRef.toLocaleString('pt-BR')} hrs) - Se não houver horímetro, digite 0 para avançar:`
          : "Qual é o Horímetro atual mostrado no painel do gerador? (Se o equipamento não possuir marcador, digite 0 para avançar):";
        botReply(msgHorimetro, null, 'PEDIR_KM');
        salvarSessao({ cupom: cupomFormatado, etapa: 'PEDIR_KM' });
      } else {
        // NÃO É VEÍCULO NEM GERADOR: Não solicita quilometragem conforme regra do sistema
        setKmAtual(0);
        botReply("Destino identificado (dispensa registro de quilometragem).");
        salvarSessao({ cupom: cupomFormatado, kmAtual: 0, etapa: 'PEDIR_LITROS' });
        setTimeout(() => {
          botReply("Quantos litros de combustível foram abastecidos?", null, 'PEDIR_LITROS');
        }, 700);
      }

    } else if (etapa === 'PEDIR_KM') {
      const { isVeiculo, isGerador } = identificarDestino(requisicaoSelecionada);
      const unidade = isGerador ? 'hrs' : 'km';
      const rawKm = texto.trim();

      if (isGerador && rawKm === '0') {
        userReply("0 hrs (Sem marcador)");
        setKmAtual(0);
        setInputValue('');
        botReply("Horímetro dispensado registrado com sucesso!");
        salvarSessao({ kmAtual: 0, etapa: 'PEDIR_LITROS' });
        setTimeout(() => {
          botReply("Quantos litros de combustível foram abastecidos?", null, 'PEDIR_LITROS');
        }, 700);
        return;
      }

      const validacao = validarAntiRetrocessoKM(rawKm, ultimoKmRef || 0, unidade);

      if (!validacao.valido && !validacao.retrocedeu) {
        userReply(texto);
        setInputValue('');
        botReply(isGerador ? "Por favor, digite o horímetro válido (sem vírgulas)." : "Por favor, digite uma quilometragem válida (sem vírgulas, ex: 85420).");
        return;
      }

      if (validacao.retrocedeu && isVeiculo) {
        userReply(`${rawKm} km`);
        setInputValue('');
        botReply(validacao.mensagem, { tipoCard: 'ALERTA_KM' });
        return;
      }

      const kmDigitado = typeof validacao.valorNumerico === 'number' && !isNaN(validacao.valorNumerico)
        ? validacao.valorNumerico
        : (parseFloat(limparNumeroOdometro(rawKm)) || 0);

      const unidadeTexto = isGerador ? 'hrs' : 'km';
      const kmFormatado = kmDigitado.toLocaleString('pt-BR');
      userReply(`${kmFormatado} ${unidadeTexto}`);
      setKmAtual(kmDigitado);
      setInputValue('');

      const msgKMOk = isGerador
        ? `Horímetro ${kmFormatado} hrs registrado com sucesso!`
        : `KM ${kmFormatado} registrado com sucesso!`;

      botReply(msgKMOk);
      salvarSessao({ kmAtual: kmDigitado, etapa: 'PEDIR_LITROS' });

      setTimeout(() => {
        botReply("Quantos litros de combustível foram abastecidos?", null, 'PEDIR_LITROS');
      }, 700);

    } else if (etapa === 'PEDIR_LITROS') {
      const litrosDigitados = parseMoeda(texto);
      if (isNaN(litrosDigitados) || litrosDigitados <= 0) {
        userReply(texto);
        setInputValue('');
        botReply("Por favor, digite a quantidade em litros (ex: 55,40).");
        return;
      }

      userReply(`${litrosDigitados.toFixed(2)} Litros`);
      setLitros(litrosDigitados);
      setInputValue('');

      botReply(`${litrosDigitados.toFixed(2)} L de ${requisicaoSelecionada?.combustivel || 'combustível'} registrados com sucesso!`);

      const isPostoOriente = (requisicaoSelecionada?.fornecedor || '').toUpperCase().includes('ORIENTE');

      if (isPostoOriente) {
        // Posto Oriente (posto externo conveniado): Assistente pergunta o preço do litro ao motorista
        setTimeout(() => {
          botReply(
            "Qual foi o valor do litro (R$) registrado na bomba ou cupom do Posto Oriente? (ex: 5,89)",
            null,
            'PEDIR_PRECO'
          );
        }, 700);
        salvarSessao({ litros: litrosDigitados, etapa: 'PEDIR_PRECO' });
      } else {
        // Posto Interno (Posto Yamaves / Almoxarifado): Preço é do estoque contábil interno, FRENTISTA NÃO DIGITA PREÇO!
        const avancarParaFoto = (precoResolvido = null) => {
          setTimeout(() => {
            botReply(
              "Agora, tire uma foto bem nítida do visor da bomba de combustível ou do comprovante 📸",
              { tipoCard: 'BOTAO_FOTO' },
              'PEDIR_FOTO'
            );
          }, 750);
          salvarSessao({ litros: litrosDigitados, precoLitro: precoResolvido !== null ? precoResolvido : precoLitro, etapa: 'PEDIR_FOTO' });
        };

        if (precoLitro && parseFloat(precoLitro) > 0) {
          // Sigilo Financeiro: Apenas o Administrador visualiza o custo contábil
          if (podeVerValores) {
            const totalEstoque = (litrosDigitados * parseFloat(precoLitro)).toFixed(2);
            setTimeout(() => {
              botReply(`Custo contábil do estoque: R$ ${parseFloat(precoLitro).toFixed(2)}/L (Total estimado: R$ ${parseFloat(totalEstoque).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}) ⛽`);
            }, 350);
          }
          avancarParaFoto(precoLitro);
        } else {
          // Busca o lote do estoque do Posto Yamaves ou Almoxarifado em tempo real
          const forn = requisicaoSelecionada?.fornecedor || 'P YAMAVES';
          const prod = requisicaoSelecionada?.combustivel || 'DIESEL';
          fetch(`/api/combustivel/lotes-disponiveis?estoque=${encodeURIComponent(forn)}&produto=${encodeURIComponent(prod)}`)
            .then(res => res.json())
            .then(lotes => {
              if (Array.isArray(lotes) && lotes.length > 0 && parseFloat(lotes[0].valorUn) > 0) {
                const p = parseFloat(lotes[0].valorUn);
                setPrecoLitro(p);
                if (podeVerValores) {
                  const total = (litrosDigitados * p).toFixed(2);
                  setTimeout(() => {
                    botReply(`Custo contábil do estoque: R$ ${p.toFixed(2)}/L (Total estimado: R$ ${parseFloat(total).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}) ⛽`);
                  }, 350);
                }
                avancarParaFoto(p);
              } else {
                avancarParaFoto();
              }
            })
            .catch(() => {
              avancarParaFoto();
            });
        }
      }

    } else if (etapa === 'PEDIR_PRECO') {
      const precoDigitado = parseMoeda(texto);
      if (isNaN(precoDigitado) || precoDigitado <= 0) {
        userReply(texto);
        setInputValue('');
        botReply("Por favor, digite um valor de preço por litro válido (ex: 5,89 ou 6.15).");
        return;
      }

      userReply(`R$ ${precoDigitado.toFixed(2)} / Litro`);
      setPrecoLitro(precoDigitado);
      setInputValue('');

      const totalEstimado = (parseFloat(litros) * precoDigitado).toFixed(2);
      botReply(
        `Preço de R$ ${precoDigitado.toFixed(2)}/L confirmado! (Total do abastecimento: R$ ${parseFloat(totalEstimado).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}) 💰`
      );

      setTimeout(() => {
        botReply(
          "Agora, tire uma foto bem nítida do visor da bomba de combustível ou do cupom fiscal da compra 📸",
          { tipoCard: 'BOTAO_FOTO' },
          'PEDIR_FOTO'
        );
      }, 800);
      salvarSessao({ precoLitro: precoDigitado, etapa: 'PEDIR_FOTO' });
    }
  };

  // Compressão e Upload da Foto do Visor via Canvas com proteção de memória para celular
  const handleCaptureFoto = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    try {
      const objectUrl = URL.createObjectURL(file);
      const img = new window.Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const MAX_DIM = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_DIM) {
              height = Math.round((height * MAX_DIM) / width);
              width = MAX_DIM;
            }
          } else {
            if (height > MAX_DIM) {
              width = Math.round((width * MAX_DIM) / height);
              height = MAX_DIM;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Gera JPEG leve (qualidade 0.65 - ~35-45KB) evitando OOM no smartphone
          const dataUrl = canvas.toDataURL('image/jpeg', 0.65);

          // Libera memória bitmap imediatamente para evitar crash no celular
          URL.revokeObjectURL(objectUrl);
          img.onload = null;
          img.onerror = null;
          img.src = '';

          fotoVisorRef.current = dataUrl;
          setFotoVisor(dataUrl);

          // Persiste a foto imediatamente na requisição no servidor para que o formulário manual já veja
          if (requisicaoSelecionada) {
            const identificador = requisicaoSelecionada.id || requisicaoSelecionada.numeroRequisicao;
            fetch(`/api/combustivel/requisicao/${identificador}/foto`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ foto: dataUrl, fotoNota: dataUrl, fotoVisor: dataUrl, fotoComprovante: dataUrl })
            }).catch(err => console.error('Erro ao salvar foto imediatamente na requisição:', err));
          }

          userReply("Foto do comprovante anexada 📸", {
            tipoCard: 'FOTO_PREVIEW',
            fotoUrl: dataUrl
          });

          botReply("Foto recebida e comprimida com sucesso!");

          setTimeout(() => {
            botReply(
              "Confira o resumo do seu abastecimento antes de concluir:",
              { tipoCard: 'CONFIRMACAO' },
              'CONFIRMACAO'
            );
          }, 700);

          salvarSessao({ fotoVisor: dataUrl, etapa: 'CONFIRMACAO' });
        } catch (err) {
          console.error('Erro ao processar imagem no canvas:', err);
          URL.revokeObjectURL(objectUrl);
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        alert('Erro ao carregar a imagem selecionada.');
      };
      img.src = objectUrl;
    } catch (err) {
      console.error('Erro ao ler arquivo:', err);
    }
    e.target.value = '';
  };

  // Finalização do abastecimento com PUT no backend
  const handleFinalizarAbastecimento = async () => {
    if (!requisicaoSelecionada) return;
    setIsSubmitting(true);

    try {
      const identificador = requisicaoSelecionada.id || requisicaoSelecionada.numeroRequisicao;

      const vUnit = precoLitro ? parseFloat(precoLitro) : (parseFloat(requisicaoSelecionada.valorUnitario || requisicaoSelecionada.valor_litro) || 0);
      const vTotal = vUnit > 0 ? (parseFloat(litros) * vUnit).toFixed(2) : null;
      const fotoParaEnviar = fotoVisorRef.current || fotoVisor || requisicaoSelecionada?.fotoNota || requisicaoSelecionada?.fotoVisor || requisicaoSelecionada?.foto || requisicaoSelecionada?.fotoComprovante || '';

      const agora = new Date();
      const ano = agora.getFullYear();
      const mes = String(agora.getMonth() + 1).padStart(2, '0');
      const dia = String(agora.getDate()).padStart(2, '0');
      const dataAbastecimento = `${ano}-${mes}-${dia}`;
      const horaAbastecimento = `${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`;
      const dataHoraISO = `${dataAbastecimento}T${horaAbastecimento}:00`;

      const payload = {
        cupom: cupom || 'S/C',
        km: parseFloat(kmAtual) || 0,
        kmAtual: parseFloat(kmAtual) || 0,
        km_abastecimento: parseFloat(kmAtual) || 0,
        qtde: parseFloat(litros),
        litros: parseFloat(litros),
        valorUnitario: vUnit > 0 ? vUnit : null,
        valor_litro: vUnit > 0 ? vUnit : null,
        valorTotal: vTotal,
        valor_total: vTotal,
        combustivel: requisicaoSelecionada.combustivel || 'DIESEL',
        foto: fotoParaEnviar,
        fotoNota: fotoParaEnviar,
        fotoVisor: fotoParaEnviar,
        fotoComprovante: fotoParaEnviar,
        data_abastecimento: dataAbastecimento,
        hora_abastecimento: horaAbastecimento,
        data_hora: dataHoraISO,
        data_hora_abastecimento: dataHoraISO,
        data_finalizacao: dataHoraISO,
        motorista: requisicaoSelecionada.requisitante || requisicaoSelecionada.motorista,
        veiculo: requisicaoSelecionada.veiculo,
        fornecedor: requisicaoSelecionada.fornecedor,
        preenchido_por: currentUser?.nome
          ? `${currentUser.nome} (${isMotorista ? 'Motorista' : isFrentista ? 'Frentista' : currentUser.role})`
          : (isMotorista ? 'Motorista (Chat)' : isFrentista ? 'Frentista (Chat)' : 'Usuário (Chat)'),
        usuario_id: currentUser?.id || null,
        usuario_username: currentUser?.username || null,
        usuario_nome: currentUser?.nome || null,
        frentista_id: isFrentista ? (currentUser?.id || null) : null,
        frentista_nome: isFrentista ? (currentUser?.nome || currentUser?.username || null) : null,
        frentista_username: isFrentista ? (currentUser?.username || null) : null,
        abastecido_por: currentUser?.nome || currentUser?.username || 'Frentista',
        usuario_tipo: isMotorista ? 'motorista' : isFrentista ? 'frentista' : (currentUser?.role || 'sistema'),
        origem_abastecimento: isMotorista ? 'MOTORISTA' : isFrentista ? 'FRENTISTA' : 'CHAT'
      };

      const res = await fetch(`/api/combustivel/abastecimento/${identificador}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok) {
        limparSessao();
        botReply(
          `🎉 Parabéns! O abastecimento da Requisição #${requisicaoSelecionada.numeroRequisicao} foi concluído e registrado no sistema com sucesso!`,
          { tipoCard: 'SUCESSO' },
          'FINALIZADO'
        );

        if (onSucesso) {
          onSucesso(data.requisicao);
        }
      } else {
        botReply(`❌ Erro ao finalizar: ${data.message || 'Falha ao comunicar com o servidor.'}`);
      }
    } catch (err) {
      console.error(err);
      botReply("❌ Ocorreu um erro de conexão com o servidor. Por favor, tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reiniciar fluxo
  const handleReiniciar = () => {
    limparSessao();
    fotoVisorRef.current = '';
    setCupom('');
    setKmAtual('');
    setLitros('');
    setPrecoLitro('');
    setFotoVisor('');
    setEtapa('PEDIR_NUMERO_REQ');
    setRequisicaoSelecionada(null);
    botReply("Tudo bem, vamos reiniciar! Digite novamente o número da requisição que deseja abastecer:");
  };

  // Renderizador dinâmico de cards sem poluir o state com JSX circular
  const renderCardExtra = (msg) => {
    if (msg.tipoCard === 'BOTAO_FOTO') {
      const jaTemFoto = !!(fotoVisorRef.current || fotoVisor);
      return (
        <div style={{ marginTop: 8 }}>
          <label
            htmlFor="chatFotoFileInput"
            className={`${styles.chipBtn} ${styles.chipBtnPrimary}`}
            style={{
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              textDecoration: 'none'
            }}
          >
            <Camera size={16} />
            {jaTemFoto ? 'Tirar Outra Foto / Substituir' : 'Tirar Foto do Visor / Comprovante'}
          </label>
        </div>
      );
    }

    if (msg.tipoCard === 'REQ_CARD') {
      const data = msg.cardData || {};
      const r = requisicaoSelecionada || {};
      const veic = data.veiculo || r.veiculo || 'Não informado';
      const forn = data.fornecedor || r.fornecedor || 'Não informado';
      const comb = data.combustivel || r.combustivel || 'DIESEL';
      const reqM = data.requisitante || r.requisitante || r.motorista || 'Não informado';
      const tipoT = data.tipoTexto || 'Veículo';
      const autoCup = data.autoPreencherCupom;
      const cResolvido = data.cupomResolvido || cupom || r.numeroRequisicao;
      const uKm = data.ultimoKm || ultimoKmRef || 0;
      const isV = data.isVeiculo !== undefined ? data.isVeiculo : true;
      const isG = data.isGerador !== undefined ? data.isGerador : false;

      return (
        <div className={styles.reqCard}>
          <div className={styles.reqCardRow}>
            <span className={styles.reqCardLabel}><Truck size={12} style={{ display: 'inline', marginRight: 4 }} /> {tipoT}:</span>
            <span className={styles.reqCardValue}>{veic}</span>
          </div>
          <div className={styles.reqCardRow}>
            <span className={styles.reqCardLabel}><MapPin size={12} style={{ display: 'inline', marginRight: 4 }} /> Posto:</span>
            <span className={styles.reqCardValue}>{forn}</span>
          </div>
          <div className={styles.reqCardRow}>
            <span className={styles.reqCardLabel}><Fuel size={12} style={{ display: 'inline', marginRight: 4 }} /> Combustível:</span>
            <span className={styles.reqCardValue}>{comb}</span>
          </div>
          <div className={styles.reqCardRow}>
            <span className={styles.reqCardLabel}><User size={12} style={{ display: 'inline', marginRight: 4 }} /> Motorista / Solicitante:</span>
            <span className={styles.reqCardValue}>{reqM}</span>
          </div>
          {autoCup && (
            <div className={styles.reqCardRow} style={{ borderTop: '1px dashed var(--cor-borda-cartao)', paddingTop: 6, marginTop: 4 }}>
              <span className={styles.reqCardLabel}><FileText size={12} style={{ display: 'inline', marginRight: 4 }} /> Cupom / Req:</span>
              <span className={styles.reqCardValue} style={{ color: 'var(--chat-destaque, var(--cor-destaque))', fontWeight: 600 }}>
                #{cResolvido} (Preenchimento Automático)
              </span>
            </div>
          )}
          {uKm > 0 && isV && (
            <div className={styles.reqCardRow} style={{ borderTop: autoCup ? 'none' : '1px dashed var(--cor-borda-cartao)', paddingTop: 6, marginTop: 4 }}>
              <span className={styles.reqCardLabel}><Gauge size={12} style={{ display: 'inline', marginRight: 4 }} /> Último KM Registrado:</span>
              <span className={styles.reqCardValue} style={{ color: 'var(--chat-destaque, var(--cor-destaque))' }}>{uKm.toLocaleString('pt-BR')} km</span>
            </div>
          )}
          {uKm > 0 && isG && (
            <div className={styles.reqCardRow} style={{ borderTop: autoCup ? 'none' : '1px dashed var(--cor-borda-cartao)', paddingTop: 6, marginTop: 4 }}>
              <span className={styles.reqCardLabel}><Gauge size={12} style={{ display: 'inline', marginRight: 4 }} /> Último Horímetro Registrado:</span>
              <span className={styles.reqCardValue} style={{ color: 'var(--chat-destaque, var(--cor-destaque))' }}>{uKm.toLocaleString('pt-BR')} hrs</span>
            </div>
          )}
        </div>
      );
    }

    if (msg.tipoCard === 'FOTO_PREVIEW') {
      const src = msg.fotoUrl || fotoVisor || fotoVisorRef.current;
      if (!src) return null;
      return (
        <div className={styles.fotoPreviewContainer}>
          <img
            src={src}
            alt="Comprovante"
            className={styles.fotoPreviewImg}
            onClick={() => setFotoZoom(src)}
            title="Clique para ampliar"
          />
          <span className={styles.badgeFotoOk}><CheckCircle2 size={11} /> Otimizada</span>
        </div>
      );
    }

    if (msg.tipoCard === 'CONFIRMACAO') {
      const vPrecoFinal = precoLitro ? parseFloat(precoLitro) : (parseFloat(requisicaoSelecionada?.valorUnitario || requisicaoSelecionada?.valor_litro) || 0);
      const vTotalCalc = vPrecoFinal > 0 && litros ? (parseFloat(litros) * vPrecoFinal).toFixed(2) : null;
      const { isVeiculo, isGerador, tipoTexto } = identificarDestino(requisicaoSelecionada);

      return (
        <div className={styles.reqCard} style={{ borderColor: 'var(--chat-destaque, var(--cor-destaque))' }}>
          <div className={styles.reqCardRow}>
            <span className={styles.reqCardLabel}>Requisição:</span>
            <span className={styles.reqCardValue}>#{requisicaoSelecionada?.numeroRequisicao}</span>
          </div>
          <div className={styles.reqCardRow}>
            <span className={styles.reqCardLabel}>{tipoTexto}:</span>
            <span className={styles.reqCardValue}>{requisicaoSelecionada?.veiculo || 'Não informado'}</span>
          </div>
          <div className={styles.reqCardRow}>
            <span className={styles.reqCardLabel}>Posto:</span>
            <span className={styles.reqCardValue}>{requisicaoSelecionada?.fornecedor || 'Não informado'}</span>
          </div>
          <div className={styles.reqCardRow}>
            <span className={styles.reqCardLabel}>Cupom Fiscal:</span>
            <span className={styles.reqCardValue}>{cupom || 'NÃO INFORMADO'}</span>
          </div>
          {isVeiculo && parseFloat(kmAtual) > 0 && (
            <div className={styles.reqCardRow}>
              <span className={styles.reqCardLabel}>KM Atual:</span>
              <span className={styles.reqCardValue} style={{ color: 'var(--chat-destaque, var(--cor-destaque))' }}>
                {parseFloat(kmAtual).toLocaleString('pt-BR')} km
              </span>
            </div>
          )}
          {isGerador && parseFloat(kmAtual) > 0 && (
            <div className={styles.reqCardRow}>
              <span className={styles.reqCardLabel}>Horímetro:</span>
              <span className={styles.reqCardValue} style={{ color: 'var(--chat-destaque, var(--cor-destaque))' }}>
                {parseFloat(kmAtual).toLocaleString('pt-BR')} hrs
              </span>
            </div>
          )}
          <div className={styles.reqCardRow}>
            <span className={styles.reqCardLabel}>Volume:</span>
            <span className={styles.reqCardValue} style={{ color: '#10b981', fontWeight: 600 }}>
              {litros} L ({requisicaoSelecionada?.combustivel || 'DIESEL'})
            </span>
          </div>
          {podeVerValores && vPrecoFinal > 0 && vTotalCalc && (
            <>
              <div className={styles.reqCardRow}>
                <span className={styles.reqCardLabel}>Preço / Litro:</span>
                <span className={styles.reqCardValue}>R$ {vPrecoFinal.toFixed(2)}</span>
              </div>
              <div className={styles.reqCardRow}>
                <span className={styles.reqCardLabel}>Valor Total:</span>
                <span className={styles.reqCardValue} style={{ color: 'var(--chat-destaque, var(--cor-destaque))', fontWeight: 700 }}>
                  R$ {parseFloat(vTotalCalc).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button
              type="button"
              className={`${styles.chipBtn} ${styles.chipBtnPrimary}`}
              style={{ flex: 1, justifyContent: 'center', padding: '10px' }}
              onClick={handleFinalizarAbastecimento}
              disabled={isSubmitting}
            >
              {isSubmitting ? <RefreshCw size={14} className="spin" /> : <CheckCircle2 size={16} />}
              Confirmar e Concluir
            </button>
            <button
              type="button"
              className={styles.chipBtn}
              onClick={handleReiniciar}
              disabled={isSubmitting}
              title="Reiniciar preenchimento"
            >
              <RefreshCw size={14} /> Corrigir
            </button>
          </div>
        </div>
      );
    }

    if (msg.tipoCard === 'ALERTA_KM') {
      return (
        <div className={styles.alertBox}>
          <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <strong>Odômetro não pode retroceder.</strong>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem' }}>
              Por favor, confirme no painel do veículo e digite a quilometragem correta.
            </p>
          </div>
        </div>
      );
    }

    if (msg.tipoCard === 'SUCESSO') {
      return (
        <div className={styles.successBox}>
          <CheckCircle2 size={20} style={{ flexShrink: 0 }} />
          <div>
            <strong>Abastecimento Finalizado!</strong>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem' }}>
              Aguarde a conferência física do cupom na empresa. Tenha um ótimo turno! 🏁
            </p>
          </div>
        </div>
      );
    }

    if (msg.legacyExtra) {
      return msg.legacyExtra;
    }

    return null;
  };

  // Requisições abertas recentes para sugestão rápida
  const requisicoesAbertas = todasRequisicoes
    .filter(r => r.status === 'EM ANDAMENTO' || r.status === 'ABERTA')
    .filter(r => {
      if (isMotorista) {
        // Motorista vê exclusivamente Posto Oriente
        const forn = (r.fornecedor || '').toUpperCase();
        return forn.includes('ORIENTE');
      } else if (isFrentista) {
        // Frentista Yamaves vê exclusivamente Posto Yamaves e Almoxarifado
        const forn = (r.fornecedor || '').toUpperCase();
        if (!forn.includes('YAMAVES') && !forn.includes('ALMOXARIFADO')) return false;
      }
      return true;
    })
    .slice(0, 4);

  return (
    <div className={styles.modalOverlay}>
      <div className={`${styles.chatContainer} ${isVerde ? styles.temaVerde : ''}`}>
        {/* Header Estilo WhatsApp / App Nativo */}
        <div className={styles.chatHeader}>
          <div className={styles.headerLeft}>
            {onClose && (
              <button
                type="button"
                className={styles.headerBackBtn}
                onClick={() => {
                  limparSessao();
                  onClose();
                }}
                title="Voltar / Fechar"
              >
                <ArrowLeft size={22} />
              </button>
            )}
            <div className={styles.botAvatar}>
              <Fuel size={20} />
              <span className={styles.botStatusDot} />
            </div>
            <div className={styles.headerInfo}>
              <h3 className={styles.headerTitle}>
                Assistente de Abastecimento
              </h3>
              <span className={styles.headerSubtitle}>
                <Sparkles size={11} /> Online • {isFrentista ? 'Posto Yamaves' : isMotorista ? 'Posto Oriente' : 'Yamaservice'}
              </span>
            </div>
          </div>

          <div className={styles.headerActions}>
            <button
              type="button"
              className={styles.headerBtn}
              onClick={handleReiniciar}
              title="Reiniciar preenchimento"
            >
              <RefreshCw size={17} />
            </button>
            {onClose ? (
              <button
                type="button"
                className={styles.headerBtn}
                onClick={() => {
                  limparSessao();
                  onClose();
                }}
                title="Fechar chat"
              >
                <X size={20} />
              </button>
            ) : (
              <BotaoSair isCollapsed={true} inline={true} />
            )}
          </div>
        </div>

        {/* Feed de Mensagens */}
        <div className={styles.messagesArea}>
          {messages.map(msg => (
            <div
              key={msg.id}
              className={msg.sender === 'bot' ? styles.messageBot : styles.messageUser}
            >
              {msg.sender === 'bot' && (
                <div className={styles.miniAvatar}>
                  <Fuel size={14} />
                </div>
              )}
              <div className={msg.sender === 'bot' ? styles.bubbleBot : styles.bubbleUser}>
                <div className={styles.bubbleText}>{renderFormattedText(msg.text)}</div>
                {renderCardExtra(msg)}
                <div className={styles.messageTime} style={{ textAlign: msg.sender === 'bot' ? 'left' : 'right' }}>
                  {msg.time}
                </div>
              </div>
            </div>
          ))}

          {/* Efeito Digitando... */}
          {isTyping && (
            <div className={styles.messageBot}>
              <div className={styles.miniAvatar}>
                <Fuel size={14} />
              </div>
              <div className={styles.typingIndicator}>
                <span className={styles.typingDot} />
                <span className={styles.typingDot} />
                <span className={styles.typingDot} />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Chips de Sugestão de Requisições Abertas (Carrossel Horizontal de Toque Rápido) */}
        {etapa === 'PEDIR_NUMERO_REQ' && requisicoesAbertas.length > 0 && (
          <div className={styles.quickActionsArea}>
            <span className={styles.quickActionsLabel}>
              Toque rápido:
            </span>
            <div className={styles.quickActionsScroll}>
              {requisicoesAbertas.map(req => (
                <button
                  key={req.id || req.numeroRequisicao}
                  type="button"
                  className={styles.chipBtn}
                  onClick={() => {
                    userReply(`Requisição #${req.numeroRequisicao}`);
                    configurarRequisicao(req);
                  }}
                >
                  <Truck size={13} color="var(--chat-destaque, var(--cor-destaque))" />
                  <span>#{req.numeroRequisicao} • {req.veiculo}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Footer / Input de Mensagem */}
        <div className={styles.chatFooter}>
          {/* Botão de Câmera nativo via label associado ao input de foto */}
          <label
            htmlFor="chatFotoFileInput"
            className={styles.btnCamera}
            title="Fotografar cupom ou visor da bomba"
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Camera size={20} />
          </label>
          <input
            id="chatFotoFileInput"
            type="file"
            ref={fileInputRef}
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleCaptureFoto}
          />

          {/* Campo de Entrada de Texto */}
          <input
            ref={inputRef}
            type="text"
            inputMode={
              etapa === 'PEDIR_KM' || etapa === 'PEDIR_NUMERO_REQ' ? 'numeric' :
              etapa === 'PEDIR_LITROS' || etapa === 'PEDIR_PRECO' ? 'decimal' :
              'text'
            }
            className={styles.inputField}
            placeholder={
              etapa === 'PEDIR_NUMERO_REQ' ? "Digite o número da requisição (ex: 1250)..." :
                etapa === 'PEDIR_CUPOM' ? "Digite o número do Cupom Fiscal..." :
                  etapa === 'PEDIR_KM' ? "Digite o KM do painel..." :
                    etapa === 'PEDIR_LITROS' ? "Digite os litros abastecidos (ex: 55,40)..." :
                      etapa === 'PEDIR_PRECO' ? "Digite o valor do litro R$ (ex: 5,89)..." :
                        etapa === 'PEDIR_FOTO' ? "Clique na câmera para tirar foto..." :
                          etapa === 'FINALIZADO' ? "Abastecimento concluído!" :
                            "Digite sua resposta..."
            }
            value={inputValue}
            disabled={etapa === 'CONFIRMACAO' || etapa === 'FINALIZADO' || isSubmitting}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSendMessage();
              }
            }}
          />

          {/* Botão de Envio */}
          <button
            type="button"
            className={styles.btnSend}
            onClick={handleSendMessage}
            disabled={(!inputValue.trim() && etapa !== 'PEDIR_FOTO') || etapa === 'CONFIRMACAO' || etapa === 'FINALIZADO' || isSubmitting}
            title="Enviar mensagem"
          >
            <Send size={18} />
          </button>
        </div>

        {/* Modal de Zoom da Foto */}
        {fotoZoom && (
          <div className={styles.fotoModalOverlay} onClick={() => setFotoZoom(null)}>
            <button
              type="button"
              className={styles.fotoModalClose}
              onClick={() => setFotoZoom(null)}
            >
              <X size={24} />
            </button>
            <img src={fotoZoom} alt="Visor de Combustível Ampliado" className={styles.fotoModalImg} />
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardChatBoxCombustivel;
