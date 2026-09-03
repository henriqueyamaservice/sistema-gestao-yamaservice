import React, { useState, useEffect, useRef } from 'react';
import { ShieldAlert, CheckCircle, Clock, Send, FileText, XCircle, Search, Eye, DollarSign, X, ChevronDown, UserCheck, Trash2, PackageCheck, AlertTriangle, Bell, Sparkles } from 'lucide-react';
import styles from './DashboardChefeSetor.module.css';
import { AGUARDANDO_CHEFE_SETOR, EMERGENCIA_CHEFE_SETOR, AGUARDANDO_DIRETORIA, ATRIBUIDO_TECNICO, CANCELADO, FASE_1_TRIAGEM } from '../../utils/osStatus';
import SeletorTecnico from './componentes/SeletorTecnico';
import CardOSChefeSetor from './componentes/CardOSChefeSetor';
import ModalOrcamentoChefeSetor from './componentes/ModalOrcamentoChefeSetor';
import HeaderChefeSetor from './componentes/HeaderChefeSetor';
import MenuChefeSetor from './componentes/MenuChefeSetor';
import GerenciadorUsuarios from '../GerenciadorUsuarios';
import RequisicaoMobile from '../DashboardBlocoRequisicao/componentes/RequisicaoMobile';
import AcompanhamentoMobile from '../DashboardBlocoRequisicao/componentes/AcompanhamentoMobile';

const parseMoeda = (val) => {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  let str = String(val).replace(/[^\d.,]/g, '');
  if (str.includes(',') && str.includes('.')) {
    const lastComma = str.lastIndexOf(',');
    const lastDot = str.lastIndexOf('.');
    if (lastComma > lastDot) str = str.replace(/\./g, '').replace(',', '.');
    else str = str.replace(/,/g, '');
  }
  else if (str.includes(',')) str = str.replace(',', '.');
  return parseFloat(str) || 0;
};

const DashboardChefeSetor = () => {
  const [pendentes, setPendentes] = useState([]);
  const [emAndamento, setEmAndamento] = useState([]);
  const [historico, setHistorico] = useState([]);
  const [abaAtiva, setAbaAtiva] = useState('pendentes'); // 'pendentes' | 'em_andamento' | 'historico'
  const [loading, setLoading] = useState(true);
  const [alertaNovaOS, setAlertaNovaOS] = useState(null);
  const qtdPendentesRef = useRef(0);
  const [tecnicos, setTecnicos] = useState([]);
  const [tecnicoSelecionado, setTecnicoSelecionado] = useState({});
  const [valoresEstimados, setValoresEstimados] = useState({});
  const [observacoesChefe, setObservacoesChefe] = useState({});
  const [tiposManutencao, setTiposManutencao] = useState({});
  const [setoresEdit, setSetoresEdit] = useState({});
  const [centrosCustoEdit, setCentrosCustoEdit] = useState({});
  const [prazosEdit, setPrazosEdit] = useState({});
  const [complexidadesEdit, setComplexidadesEdit] = useState({});
  const [pecasSolicitadasEdicao, setPecasSolicitadasEdicao] = useState([]);
  const [termoBusca, setTermoBusca] = useState('');
  const [produtosEstoque, setProdutosEstoque] = useState([]);
  const [veiculos, setVeiculos] = useState([]);
  const [departamentos, setDepartamentos] = useState([]);
  const [showGerenciadorUsuarios, setShowGerenciadorUsuarios] = useState(false);
  const [showNovaOS, setShowNovaOS] = useState(false);

  // Modal para detalhar e orçar a O.S.
  const [osModal, setOsModal] = useState(null);
  const [termoBuscaPeca, setTermoBuscaPeca] = useState('');
  const [pecaSelecionada, setPecaSelecionada] = useState(null);
  const [qtdPeca, setQtdPeca] = useState(1);

  const carregarDados = async (isFirstLoad = false) => {
    if (isFirstLoad) setLoading(true);
    try {
      const now = Date.now();
      const safeFetchJson = async (url) => {
        try {
          const res = await fetch(url, { cache: 'no-store' });
          if (!res || !res.ok) return null;
          const contentType = res.headers.get('content-type');
          if (!contentType || !contentType.includes('application/json')) return null;
          return await res.json();
        } catch {
          return null;
        }
      };

      const [ordens, fornecedores, vendedores, produtos, veicList, depList] = await Promise.all([
        safeFetchJson(`/api/os?_t=${now}`),
        safeFetchJson(`/api/fornecedores?_t=${now}`),
        safeFetchJson(`/api/vendedores?_t=${now}`),
        safeFetchJson(`/api/produtos/light?_t=${now}`),
        safeFetchJson(`/api/veiculos?_t=${now}`),
        safeFetchJson(`/api/departamentos?_t=${now}`)
      ]);

      if (Array.isArray(ordens)) {
        // 1. Aba Triagem (Pendências que exigem ação do Chefe do Setor)
        const listaPendentes = ordens.filter(o => 
          o && (FASE_1_TRIAGEM.includes(o.situacao) || !o.situacao || 
          (o.pecasSolicitadas && o.pecasSolicitadas.some(p => p.status === 'AGUARDANDO_CHEFE_ADICIONAL')))
        );
        listaPendentes.sort((a, b) => (b.isEmergencia ? 1 : 0) - (a.isEmergencia ? 1 : 0));

        // 2. Aba Em Execução (O.S. aprovadas ativas na oficina: EM_ANDAMENTO, AGUARDANDO_INSUMO, etc.)
        const statusEmAndamento = ['EM_ANDAMENTO', 'AGUARDANDO_INSUMO', 'ATRIBUIDO_TECNICO', 'AGUARDANDO_ALMOXARIFADO', 'PECAS_ENTREGUES'];
        const listaEmAndamento = ordens.filter(o => 
          o && !listaPendentes.some(p => (p.codigo || p.id) === (o.codigo || o.id)) &&
          statusEmAndamento.includes(o.situacao)
        );

        // 3. Aba Histórico (O.S. finalizadas, concluídas ou canceladas)
        const listaHistorico = ordens.filter(o => 
          o && !listaPendentes.some(p => (p.codigo || p.id) === (o.codigo || o.id)) &&
          !listaEmAndamento.some(e => (e.codigo || e.id) === (o.codigo || o.id))
        );

        // Notificação em tempo real quando chega requisição nova do Bloco de Requisições
        if (qtdPendentesRef.current > 0 && listaPendentes.length > qtdPendentesRef.current) {
          const novidades = listaPendentes.filter(p => p.situacao === 'AGUARDANDO_CHEFE_SETOR' || p.situacao === 'EMERGENCIA_CHEFE_SETOR');
          if (novidades.length > 0) {
            const maisRecente = novidades[0];
            setAlertaNovaOS(`NOVA REQUISIÇÃO RECEBIDA DE ${maisRecente.requisitante || 'SOLICITANTE'}! O.S. #${maisRecente.codigo || maisRecente.id}`);
          }
        }
        qtdPendentesRef.current = listaPendentes.length;

        setPendentes(listaPendentes);
        setEmAndamento(listaEmAndamento);
        setHistorico(listaHistorico);

        // Inicializa mapa de valores estimados e observações
        const mapaValores = {};
        const mapaObs = {};
        const mapaTec = {};
        const mapaTipoManut = {};
        const mapaSetor = {};
        const mapaCC = {};
        const mapaPrazo = {};
        ordens.forEach(o => {
          if (!o) return;
          const key = o.codigo || o.id;
          if (o.valorEstimado !== undefined) mapaValores[key] = o.valorEstimado;
          if (o.observacaoChefe) mapaObs[key] = o.observacaoChefe;
          if (o.tecnicoResponsavel) mapaTec[key] = o.tecnicoResponsavel;
          if (o.tipoManutencao) mapaTipoManut[key] = o.tipoManutencao;
          if (o.setor) mapaSetor[key] = o.setor;
          if (o.centroCusto) mapaCC[key] = o.centroCusto;
          if (o.prazo) mapaPrazo[key] = o.prazo;
        });
        setValoresEstimados(prev => ({ ...mapaValores, ...prev }));
        setObservacoesChefe(prev => ({ ...mapaObs, ...prev }));
        setTecnicoSelecionado(prev => ({ ...mapaTec, ...prev }));
        setTiposManutencao(prev => ({ ...mapaTipoManut, ...prev }));
        setSetoresEdit(prev => ({ ...mapaSetor, ...prev }));
        setCentrosCustoEdit(prev => ({ ...mapaCC, ...prev }));
        setPrazosEdit(prev => ({ ...mapaPrazo, ...prev }));
      }

      const token = localStorage.getItem('almoxarifado_token');
      const usuariosRes = await fetch('/api/usuarios?role=tecnico', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const usuariosDB = usuariosRes.ok ? await usuariosRes.json() : [];
      
      const tecnicosFormatados = usuariosDB.map(u => ({
        nomeExibicao: u.nome.toUpperCase(),
        codigo: u.codigo_omie || u.id,
        ...u
      }));
      setTecnicos(tecnicosFormatados);

      if (Array.isArray(produtos)) setProdutosEstoque(produtos);
      if (Array.isArray(veicList)) setVeiculos(veicList);
      if (Array.isArray(depList)) setDepartamentos(depList);
    } catch (err) {
      console.error('Erro ao carregar dados do chefe de setor:', err);
    } finally {
      if (isFirstLoad) setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados(true);
    const interval = setInterval(() => {
      carregarDados(false);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleAbrirModal = (os) => {
    setOsModal(os);
    setPecasSolicitadasEdicao(os.pecasSolicitadas || []);
    const key = os.codigo || os.id;
    if (valoresEstimados[key] === undefined) {
      setValoresEstimados(prev => ({ ...prev, [key]: os.valorEstimado || 0 }));
    }
    if (observacoesChefe[key] === undefined) {
      setObservacoesChefe(prev => ({ ...prev, [key]: os.observacaoChefe || '' }));
    }
    if (tecnicoSelecionado[key] === undefined) {
      setTecnicoSelecionado(prev => ({ ...prev, [key]: os.tecnicoResponsavel || '' }));
    }
    if (tiposManutencao[key] === undefined) {
      const temPecasAdicionais = os.situacao === 'EM_ANDAMENTO' && os.pecasSolicitadas?.some(p => p.status === 'AGUARDANDO_CHEFE_ADICIONAL');
      setTiposManutencao(prev => ({ ...prev, [key]: temPecasAdicionais ? 'COM_PECA' : (os.tipoManutencao || 'SEM_PECA') }));
    }
    if (setoresEdit[key] === undefined) {
      setSetoresEdit(prev => ({ ...prev, [key]: os.setor || '' }));
    }
    if (centrosCustoEdit[key] === undefined) {
      setCentrosCustoEdit(prev => ({ ...prev, [key]: os.centroCusto || '' }));
    }
    if (prazosEdit[key] === undefined) {
      setPrazosEdit(prev => ({ ...prev, [key]: os.prazo || '' }));
    }
    if (complexidadesEdit[key] === undefined) {
      setComplexidadesEdit(prev => ({ ...prev, [key]: os.complexidade || 'NORMAL' }));
    }
  };

  const handleSalvarApenasOrcamento = async (os) => {
    const key = os.codigo || os.id;
    const valorNum = parseFloat(valoresEstimados[key]) || 0;
    const obs = observacoesChefe[key] || '';
    const tecnico = tecnicoSelecionado[key] || os.tecnicoResponsavel || '';
    const tipoManut = tiposManutencao[key] || os.tipoManutencao || 'SEM_PECA';
    const setorEdt = setoresEdit[key] || os.setor || '';
    const centroCustoEdt = centrosCustoEdit[key] || os.centroCusto || '';
    const prazoEdt = prazosEdit[key] || os.prazo || '';
    const complexidadeEdt = complexidadesEdit[key] || os.complexidade || 'NORMAL';

    try {
      const res = await fetch(`/api/os/${os.id || os.codigo}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          valorEstimado: valorNum,
          observacaoChefe: obs,
          tecnicoResponsavel: tecnico,
          tipoManutencao: tipoManut,
          pecasSolicitadas: pecasSolicitadasEdicao,
          setor: setorEdt,
          centroCusto: centroCustoEdt,
          prazo: prazoEdt,
          complexidade: complexidadeEdt
        })
      });

      if (res.ok) {
        alert('Orçamento salvo com sucesso!');
        carregarDados();
        if (osModal) setOsModal(null);
      } else {
        alert('Erro ao salvar orçamento.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao conectar com o servidor.');
    }
  };

  const handleAprovarEEnviar = async (os, encamihaDiretoriaForcado = false) => {
    const key = os.codigo || os.id;
    const tecnico = tecnicoSelecionado[key] || os.tecnicoResponsavel || '';
    
    // VALIDAÇÃO: Impede o envio sem o técnico responsável preenchido
    if (!tecnico || tecnico.trim() === '') {
      alert('Atenção: É obrigatório selecionar um "Técnico / Mecânico Responsável" antes de Autorizar e Mandar ao Técnico (ou Diretoria).\n\nPara salvar apenas o progresso, use "Salvar Orçamento".');
      return;
    }

    const setorEdt = setoresEdit[key] || os.setor || '';
    const centroCustoEdt = centrosCustoEdit[key] || os.centroCusto || '';
    if (!setorEdt || setorEdt.trim() === '') {
      alert('Atenção: Selecione o "Setor de Execução" antes de autorizar.');
      return;
    }
    if (!centroCustoEdt || centroCustoEdt.trim() === '') {
      alert('Atenção: Preencha o "Centro de Custo / Veículo" antes de autorizar.');
      return;
    }

    const valorNum = valoresEstimados[key] !== undefined ? parseMoeda(valoresEstimados[key]) : (os.valorEstimado || 0);
    const prazoEdt = prazosEdit[key] || os.prazo || '';
    if (!prazoEdt || prazoEdt.trim() === '') {
      alert('Atenção: É obrigatório preencher o "Prazo de Entrega / Previsão" antes de Autorizar e Mandar ao Técnico.');
      return;
    }
    const complexidadeEdt = complexidadesEdit[key] || os.complexidade || 'NORMAL';
    const tipoManut = tiposManutencao[key] || os.tipoManutencao || 'COM_PECA';
    const obs = observacoesChefe[key] || os.observacaoChefe || '';

    // Alçada: Tipo INVESTIMENTO e valor > R$5k vai para Diretoria
    const vaiParaDiretoria = encamihaDiretoriaForcado || (os.tipo === 'INVESTIMENTO' && valorNum > 5000);
    const novaSituacao = vaiParaDiretoria ? AGUARDANDO_DIRETORIA : ATRIBUIDO_TECNICO;

    // NOVO: Se tiver peças e não for pra diretoria, marcar as peças iniciais e adicionais como aguardando almoxarifado
    let pecasFinais = [...pecasSolicitadasEdicao];
    let precisaCriarRequisicao = false;

    if (!vaiParaDiretoria && (tipoManut === 'COM_PECA' || pecasFinais.length > 0)) {
      precisaCriarRequisicao = true;
      pecasFinais = pecasFinais.map(p => {
        if (!p.status || p.status === 'NOVA' || p.status === '' || p.status === 'AGUARDANDO_CHEFE_ADICIONAL') {
          return { ...p, status: 'AGUARDANDO_ALMOXARIFADO' };
        }
        return p;
      });
    }

    try {
      const savedUser = localStorage.getItem('almoxarifado_user');
      const userData = savedUser ? JSON.parse(savedUser) : null;
      const nomeChefe = userData?.nome || 'CHEFE DE SETOR';

      const res = await fetch(`/api/os/${os.codigo || os.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          situacao: novaSituacao,
          tecnicoResponsavel: tecnico,
          valorEstimado: valorNum,
          observacaoChefe: obs,
          tipoManutencao: tipoManut,
          dataAutorizacaoChefe: new Date().toISOString(),
          requisitante: nomeChefe,
          pecasSolicitadas: pecasFinais,
          setor: setorEdt,
          centroCusto: centroCustoEdt,
          prazo: prazoEdt,
          complexidade: complexidadeEdt
        })
      });

      if (res.ok) {
        // DISPARAR REQUISIÇÃO PARA ALMOXARIFADO SE NECESSÁRIO
        if (precisaCriarRequisicao) {
          const pecasAEnviar = pecasFinais.filter(p => p.status === 'AGUARDANDO_ALMOXARIFADO');
          if (pecasAEnviar.length > 0) {
            await fetch(`/api/requisicoes`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                tipo: 'os',
                numeroOS: os.codigo || os.id,
                solicitante: tecnico,
                departamento: setorEdt,
                prioridade: os.isEmergencia ? 'urgente' : 'normal',
                centroCusto: centroCustoEdt,
                itens: pecasAEnviar.map(p => ({
                  codigo: p.codigo,
                  descricao: p.descricao,
                  quantidade: p.quantidade,
                  valor_unitario: p.valor_unitario || 0
                }))
              })
            }).catch(e => console.error("Erro ao gerar requisicao no almoxarifado", e));
          }
        }

        const strValor = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorNum);
        alert(vaiParaDiretoria 
          ? `Orçamento (${strValor}) encaminhado para Aprovação da Diretoria!` 
          : `Aprovado (Valor: ${strValor}) e enviado para o Técnico (${tecnico})! O Almoxarifado foi notificado para separar os materiais iniciais.`
        );
        if (osModal) setOsModal(null);
        carregarDados();
      } else {
        alert('Erro ao atualizar a O.S.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro de conexão ao salvar.');
    }
  };

  const handleAprovarLoteAdicional = async (os) => {
    // Pegar as peças adicionais pendentes
    const pecasAdicionaisPendentes = pecasSolicitadasEdicao.filter(p => p.status === 'AGUARDANDO_CHEFE_ADICIONAL');
    if (pecasAdicionaisPendentes.length === 0) {
      alert('Não há peças adicionais aguardando aprovação nesta O.S.');
      return;
    }

    try {
      // 1. Busca se já existe uma requisição no Almoxarifado para esta O.S.
      const resReqs = await fetch('/api/requisicoes');
      let reqExistente = null;
      if (resReqs.ok) {
        const todasReqs = await resReqs.json();
        reqExistente = todasReqs.find(r => r.numeroOS === (os.codigo || os.id) && r.status !== 'finalizado' && r.status !== 'entregue' && r.status !== 'cancelado');
      }

      const novosItens = pecasAdicionaisPendentes.map(p => ({
        codigo: p.codigo,
        descricao: p.descricao,
        quantidade: p.quantidade,
        valor_unitario: p.valor_unitario
      }));

      if (reqExistente) {
        // Se já existe requisição no Almoxarifado, UNIFICA os novos itens no mesmo card!
        const itensUnificados = [...(reqExistente.itens || []), ...novosItens];
        await fetch(`/api/requisicoes/${reqExistente.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ itens: itensUnificados })
        });
      } else {
        // Caso contrário, cria a requisição inicial
        await fetch('/api/requisicoes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tipo: 'os',
            numeroOS: os.codigo || os.id,
            solicitante: os.tecnicoResponsavel || os.requisitante || 'Técnico',
            departamento: os.setor || 'MANUTENÇÃO',
            prioridade: os.isEmergencia ? 'urgente' : 'normal',
            centroCusto: os.centroCusto || '',
            itens: novosItens
          })
        });
      }

      // 2. Atualizar o status das peças na OS para AGUARDANDO_ALMOXARIFADO
      const novasPecas = pecasSolicitadasEdicao.map(p => 
        (!p.status || p.status === 'NOVA' || p.status === '' || p.status === 'AGUARDANDO_CHEFE_ADICIONAL') ? { ...p, status: 'AGUARDANDO_ALMOXARIFADO' } : p
      );

      const res = await fetch(`/api/os/${os.codigo || os.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pecasSolicitadas: novasPecas
        })
      });

      if (res.ok) {
        alert('Lote adicional aprovado e unificado no Almoxarifado com sucesso!');
        if (osModal) setOsModal(null);
        carregarDados();
      } else {
        alert('Erro ao atualizar a O.S.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro de conexão: ' + err.message);
    }
  };

  const handleRejeitar = async (os) => {
    if (!window.confirm(`Deseja realmente recusar a solicitação O.S. ${os.codigo}?`)) return;
    try {
      const res = await fetch(`/api/os/${os.codigo || os.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ situacao: CANCELADO })
      });
      if (res.ok) {
        alert('Solicitação recusada.');
        if (osModal) setOsModal(null);
        carregarDados();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const listaBaseAba = abaAtiva === 'pendentes' ? pendentes : (abaAtiva === 'em_andamento' ? emAndamento : historico);

  const osFiltradas = (listaBaseAba || []).filter(o => {
    if (!o) return false;
    if (!termoBusca || !termoBusca.trim()) return true;
    const term = termoBusca.toLowerCase();
    return (
      (o.codigo && String(o.codigo).toLowerCase().includes(term)) ||
      (o.requisitante && String(o.requisitante).toLowerCase().includes(term)) ||
      (o.descricao && String(o.descricao).toLowerCase().includes(term)) ||
      (o.setor && String(o.setor).toLowerCase().includes(term))
    );
  });

  const prodsFiltrados = termoBuscaPeca.length >= 2 
    ? produtosEstoque.filter(p => 
        (p.descricao || '').toLowerCase().includes(termoBuscaPeca.toLowerCase()) ||
        (p.codigo || '').toLowerCase().includes(termoBuscaPeca.toLowerCase())
      ).slice(0, 5)
    : [];

  const handleAdicionarPeca = () => {
    if (!pecaSelecionada || qtdPeca <= 0) return;
    const itemExistente = pecasSolicitadasEdicao.find(p => p.codigo === pecaSelecionada.codigo);
    if (itemExistente) {
      setPecasSolicitadasEdicao(pecasSolicitadasEdicao.map(p => 
        p.codigo === pecaSelecionada.codigo ? { ...p, quantidade: Number(p.quantidade) + Number(qtdPeca) } : p
      ));
    } else {
      setPecasSolicitadasEdicao([...pecasSolicitadasEdicao, {
        codigo: pecaSelecionada.codigo,
        descricao: pecaSelecionada.descricao,
        quantidade: Number(qtdPeca),
        valor_unitario: pecaSelecionada.valor_unitario || 0,
        status: 'AGUARDANDO_ALMOXARIFADO'
      }]);
    }
    setPecaSelecionada(null); setTermoBuscaPeca(''); setQtdPeca(1);
  };

  const handleRemoverPeca = (codigo) => {
    setPecasSolicitadasEdicao(pecasSolicitadasEdicao.filter(p => p.codigo !== codigo));
  };

  const totalEmergencias = (pendentes || []).filter(o => o && o.isEmergencia).length;

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <MenuChefeSetor 
        abaAtiva={abaAtiva}
        setAbaAtiva={setAbaAtiva}
        setShowGerenciadorUsuarios={setShowGerenciadorUsuarios}
      />
      <div className={styles.container} style={{ flex: 1, overflowY: 'auto' }}>
        <HeaderChefeSetor 
        abaAtiva={abaAtiva}
        setAbaAtiva={setAbaAtiva}
        totalPendentes={pendentes.length}
        totalEmAndamento={emAndamento.length}
        totalHistorico={historico.length}
        totalEmergencias={pendentes.filter(o => o.isEmergencia).length}
        termoBusca={termoBusca}
        setTermoBusca={setTermoBusca}
        setShowGerenciadorUsuarios={setShowGerenciadorUsuarios}
        onNovoChamado={() => setShowNovaOS(true)}
      />

      {showGerenciadorUsuarios && (
        <GerenciadorUsuarios onClose={() => setShowGerenciadorUsuarios(false)} />
      )}

      {alertaNovaOS && (
        <div style={{ backgroundColor: '#ecfdf5', color: '#047857', padding: '12px 16px', borderRadius: '10px', border: '1px solid #10b981', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 12px rgba(16,185,129,0.15)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Bell size={20} color="#059669" />
            <strong style={{ fontSize: '0.95rem' }}>{alertaNovaOS}</strong>
          </div>
          <button onClick={() => setAlertaNovaOS(null)} style={{ background: 'transparent', border: 'none', color: '#047857', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1rem' }}>✕</button>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Carregando solicitações...</div>
      ) : abaAtiva === 'meus_pedidos' ? (
        <AcompanhamentoMobile />
      ) : osFiltradas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', background: 'var(--cor-fundo-cartao)', borderRadius: '12px', border: '1px solid var(--cor-borda-cartao)' }}>
          Nenhuma solicitação encontrada no momento.
        </div>
      ) : (
        <div className={styles.gridCards}>
          {osFiltradas.map((os, idx) => {
            const osKey = os.codigo || os.id;
            const valorInput = valoresEstimados[osKey] !== undefined ? valoresEstimados[osKey] : (os.valorEstimado || 0);
            const valorAtual = parseMoeda(valorInput);

            return (
              <CardOSChefeSetor
                key={`${osKey}-${idx}`}
                os={os}
                abaAtiva={abaAtiva}
                tecnicos={tecnicos}
                tecnicoSelecionadoNome={tecnicoSelecionado[osKey] || os.tecnicoResponsavel || ''}
                valorAtual={valorAtual}
                onAbrirModal={handleAbrirModal}
                onSelectTecnico={(key, nome) => setTecnicoSelecionado({ ...tecnicoSelecionado, [key]: nome })}
                onRejeitar={handleRejeitar}
                onAprovarEEnviar={handleAprovarEEnviar}
              />
            );
          })}
        </div>
      )}

      {/* MODAL DETALHADO DE ORÇAMENTO E ANÁLISE DO CHEFE DE SETOR */}
      <ModalOrcamentoChefeSetor
        osModal={osModal}
        onClose={() => setOsModal(null)}
        valoresEstimados={valoresEstimados}
        setValoresEstimados={setValoresEstimados}
        observacoesChefe={observacoesChefe}
        setObservacoesChefe={setObservacoesChefe}
        setoresEdit={setoresEdit}
        setSetoresEdit={setSetoresEdit}
        centrosCustoEdit={centrosCustoEdit}
        setCentrosCustoEdit={setCentrosCustoEdit}
        prazosEdit={prazosEdit}
        setPrazosEdit={setPrazosEdit}
        complexidadesEdit={complexidadesEdit}
        setComplexidadesEdit={setComplexidadesEdit}
        tiposManutencao={tiposManutencao}
        setTiposManutencao={setTiposManutencao}
        pecasSolicitadasEdicao={pecasSolicitadasEdicao}
        setPecasSolicitadasEdicao={setPecasSolicitadasEdicao}
        termoBuscaPeca={termoBuscaPeca}
        setTermoBuscaPeca={setTermoBuscaPeca}
        pecaSelecionada={pecaSelecionada}
        setPecaSelecionada={setPecaSelecionada}
        qtdPeca={qtdPeca}
        setQtdPeca={setQtdPeca}
        produtosEstoque={produtosEstoque}
        departamentos={departamentos}
        veiculos={veiculos}
        tecnicos={tecnicos}
        tecnicoSelecionadoNome={osModal ? (tecnicoSelecionado[osModal.codigo || osModal.id] || osModal.tecnicoResponsavel || '') : ''}
        onSelectTecnico={(key, nome) => setTecnicoSelecionado({ ...tecnicoSelecionado, [key]: nome })}
        onAdicionarPeca={handleAdicionarPeca}
        onRemoverPeca={handleRemoverPeca}
        onRejeitar={handleRejeitar}
        onSalvarApenasOrcamento={handleSalvarApenasOrcamento}
        onAprovarLoteAdicional={handleAprovarLoteAdicional}
        onAprovarEEnviar={handleAprovarEEnviar}
      />

      {/* MODAL NOVO CHAMADO */}
      {showNovaOS && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '16px' }}>
          <div style={{ backgroundColor: 'var(--cor-fundo-principal)', width: '100%', maxWidth: '500px', height: '90vh', borderRadius: '14px', overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
            <button 
              onClick={() => { setShowNovaOS(false); carregarDados(); }}
              style={{ position: 'absolute', top: '12px', right: '12px', zIndex: 10, background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <RequisicaoMobile produtos={produtosEstoque} />
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
};

export default DashboardChefeSetor;
