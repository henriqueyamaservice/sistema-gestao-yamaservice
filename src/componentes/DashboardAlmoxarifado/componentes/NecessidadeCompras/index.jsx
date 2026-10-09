import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  AlertTriangle, Plus, ShoppingCart, Send, X, PackagePlus, Box, 
  Search, CheckCircle2, Clock, Filter, ArrowRight, RefreshCw, Eye,
  PlusCircle, Check, Tag, MapPin, Sparkles, Barcode, Trash2
} from 'lucide-react';
import styles from './NecessidadeCompras.module.css';
import { 
  obterBadgeInfo, 
  obterRotuloUnidade, 
  permiteDecimais, 
  formatarQuantidadeComUnidade 
} from '../../../../utils/classificadorUnidades';

const extrairEndereco = (prod) => {
  if (!prod) return '-';
  const c = prod.caracteristicas || [];
  const end = c.find(x => {
    const n = (x.cNomeCaract || x.nome || '').toUpperCase();
    return n === 'ENDEREÇO' || n === 'ENDERECO' || n === 'LOCALIZAÇÃO' || n === 'LOCALIZACAO';
  });
  if (end) return end.cConteudo || end.conteudo || '-';

  const corredor = c.find(x => (x.cNomeCaract || x.nome)?.toUpperCase() === 'CORREDOR');
  const prateleira = c.find(x => (x.cNomeCaract || x.nome)?.toUpperCase() === 'PRATELEIRA');
  if (corredor || prateleira) {
    const cVal = corredor?.cConteudo || corredor?.conteudo || '-';
    const pVal = prateleira?.cConteudo || prateleira?.conteudo || '-';
    return `Corr: ${cVal} / Prat: ${pVal}`;
  }

  return prod.endereco || prod.localizacao || '-';
};

const extrairMarca = (prod) => {
  if (!prod) return '-';
  const c = prod.caracteristicas || [];
  const m = c.find(x => (x.cNomeCaract || x.nome)?.toUpperCase() === 'MARCA');
  if (m) return m.cConteudo || m.conteudo || '-';
  return prod.marca || '-';
};

const formatarDescricaoLimpa = (texto) => {
  if (!texto) return '';
  return String(texto)
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
};

const NecessidadeCompras = ({ produtos, onUpdate }) => {
  const [selecionados, setSelecionados] = useState([]);
  const [modalAvulso, setModalAvulso] = useState(false);
  const [modalCatalogo, setModalCatalogo] = useState(false);
  const [modalConfirmacao, setModalConfirmacao] = useState(false);
  const [projetos, setProjetos] = useState([]);
  const [osList, setOsList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState(null);

  // Estados do Modal de Adicionar do Catálogo (Opção A)
  const [termoBuscaCatalogo, setTermoBuscaCatalogo] = useState('');
  const [produtoCatalogoSelecionado, setProdutoCatalogoSelecionado] = useState(null);
  const [qtdCatalogo, setQtdCatalogo] = useState(1);
  const [feedbackItemAdicionado, setFeedbackItemAdicionado] = useState(null);
  const buscaCatalogoInputRef = useRef(null);
  const qtdCatalogoInputRef = useRef(null);

  // Controle de abas e filtro
  const [filtroAba, setFiltroAba] = useState('pendentes'); // 'pendentes' | 'pedidos' | 'recebidos' | 'todos'
  const [busca, setBusca] = useState('');

  // Itens finais que vão para o modal de confirmação
  const [itensConfirmacao, setItensConfirmacao] = useState([]);

  const [formAvulso, setFormAvulso] = useState({
    descricao: '',
    quantidade: 1
  });

  const [projetoGlobal, setProjetoGlobal] = useState('');
  const [sugestaoEntrega, setSugestaoEntrega] = useState('');
  const [categoriaCompra, setCategoriaCompra] = useState('Reposição de Estoque');

  // Filtra itens abaixo do estoque mínimo
  const todosEmAlerta = (produtos || []).filter(p => 
    Number(p.estoque_minimo || 0) > 0 && Number(p.quantidade_estoque || 0) <= Number(p.estoque_minimo || 0)
  );

  // Divide entre itens pendentes, com pedido em andamento e já recebidos no Almoxarifado
  const produtosPendentes = todosEmAlerta.filter(p => (Number(p.quantidade_pedida) || 0) === 0);
  const produtosJaPedidos = todosEmAlerta.filter(p => (Number(p.quantidade_pedida) || 0) > 0);
  const produtosRecebidos = (produtos || []).filter(p => Boolean(p.ultimo_recebimento_info));

  // Itens exibidos de acordo com a aba e termo de busca
  const listaBase = (
    filtroAba === 'pendentes' ? produtosPendentes :
    filtroAba === 'pedidos' ? produtosJaPedidos :
    filtroAba === 'recebidos' ? produtosRecebidos :
    todosEmAlerta
  );

  const produtosExibidos = listaBase.filter(p => {
    if (!busca.trim()) return true;
    const termo = busca.toLowerCase();
    const cod = String(p.codigo || '').toLowerCase();
    const desc = String(p.descricao || '').toLowerCase();
    return cod.includes(termo) || desc.includes(termo);
  });

  // Autocomplete de produtos para reposição livre (Opção A)
  const produtosCatalogoFiltrados = useMemo(() => {
    if (!termoBuscaCatalogo.trim()) return [];
    const termo = termoBuscaCatalogo.toLowerCase().trim();
    return (produtos || []).filter(p => {
      const cod = String(p.codigo || '').toLowerCase();
      const desc = String(p.descricao || '').toLowerCase();
      const ean = String(p.ean || '').toLowerCase();
      return cod.includes(termo) || desc.includes(termo) || ean.includes(termo);
    }).slice(0, 40);
  }, [produtos, termoBuscaCatalogo]);

  useEffect(() => {
    const fetchProjetos = async () => {
      try {
        const res = await fetch('/api/projetos');
        if (res.ok) setProjetos(await res.json());
      } catch (err) {
        console.error('Erro ao buscar projetos:', err);
      }
    };
    
    const fetchOs = async () => {
      try {
        const res = await fetch('/api/os');
        if (res.ok) setOsList(await res.json());
      } catch (err) {
        console.error('Erro ao buscar OS:', err);
      }
    };

    fetchProjetos();
    fetchOs();
  }, []);

  const formatarStatusCompras = (status) => {
    switch (status) {
      case 'pendente_cotacao': return 'Aguardando Cotação';
      case 'em_concorrencia': return 'Em Concorrência / Cotação';
      case 'em_orcamento': return 'Em Orçamento';
      case 'aguardando_aprovacao': return 'Aguardando Aprovação';
      case 'pedido_gerado': return 'Pedido Feito ao Fornecedor';
      case 'aguardando_nfe': return 'Aguardando NF-e';
      case 'concluido': return 'Aguardando Entrada no Estoque';
      case 'entregue_parcial': return 'Entregue Parcial';
      case 'entregue': return 'Entregue no Almoxarifado';
      default: return 'Solicitado ao Compras';
    }
  };

  const handleToggleSelectAll = (e) => {
    if (e.target.checked) {
      // Por padrão seleciona os itens da lista exibida
      // Se na aba 'todos', prioriza os pendentes para não gerar duplicidade acidental
      const itensSelecionaveis = produtosExibidos.filter(p => 
        filtroAba === 'pedidos' ? true : (Number(p.quantidade_pedida) || 0) === 0
      );
      setSelecionados(itensSelecionaveis.map(p => p.codigo));
    } else {
      setSelecionados([]);
    }
  };

  const handleToggleSelect = (codigo) => {
    if (selecionados.includes(codigo)) {
      setSelecionados(selecionados.filter(c => c !== codigo));
    } else {
      setSelecionados([...selecionados, codigo]);
    }
  };

  const abrirModalConfirmacao = () => {
    const itens = todosEmAlerta
      .filter(p => selecionados.includes(p.codigo))
      .map(p => {
        const estoqueAtual = Number(p.quantidade_estoque || 0);
        const estoqueMin = Number(p.estoque_minimo || 0);
        const qtdSugerida = Math.max(1, estoqueMin - estoqueAtual);
        return {
          idLocal: Date.now() + Math.random(),
          tipo: 'reposicao',
          codigo: p.codigo,
          descricao: p.descricao,
          valor_unitario: p.valor_unitario || 0,
          quantidade: qtdSugerida,
          unidade: p.unidade || 'UN'
        };
      });
    setItensConfirmacao(itens);
    setModalConfirmacao(true);
  };

  const pedirItemIndividual = (prod) => {
    const estoqueAtual = Number(prod.quantidade_estoque || 0);
    const estoqueMin = Number(prod.estoque_minimo || 0);
    const qtdSugerida = Math.max(1, estoqueMin - estoqueAtual);
    setItensConfirmacao([{
      idLocal: Date.now() + Math.random(),
      tipo: 'reposicao',
      codigo: prod.codigo,
      descricao: prod.descricao,
      valor_unitario: prod.valor_unitario || 0,
      quantidade: qtdSugerida,
      unidade: prod.unidade || 'UN'
    }]);
    setModalConfirmacao(true);
  };

  const handleSalvarAvulso = () => {
    if (!formAvulso.descricao.trim()) return;
    
    const novoAvulso = {
      idLocal: Date.now() + Math.random(),
      id: `NOVO-${Date.now()}`,
      tipo: 'avulso',
      codigo: 'NOVO',
      descricao: formAvulso.descricao.trim().toUpperCase(),
      quantidade: Number(formAvulso.quantidade) || 1,
      valor_unitario: 0,
      unidade: 'UN'
    };

    setItensConfirmacao([...itensConfirmacao, novoAvulso]);
    
    if (!modalConfirmacao) {
      setModalConfirmacao(true);
    }

    setModalAvulso(false);
    setFormAvulso({ descricao: '', quantidade: 1 });
  };

  const handleSelecionarProdutoCatalogo = (prod) => {
    setProdutoCatalogoSelecionado(prod);
    setTermoBuscaCatalogo('');
    const estAtual = Number(prod.quantidade_estoque || 0);
    const estMin = Number(prod.estoque_minimo || 0);
    const sugerida = estMin > estAtual ? Math.max(1, estMin - estAtual) : 10;
    setQtdCatalogo(sugerida);
    setTimeout(() => qtdCatalogoInputRef.current?.focus(), 80);
  };

  const handleAdicionarItemAoPedido = (continuarBuscando = false) => {
    if (!produtoCatalogoSelecionado || Number(qtdCatalogo) <= 0) return;

    const novoItem = {
      idLocal: Date.now() + Math.random(),
      tipo: 'reposicao',
      codigo: produtoCatalogoSelecionado.codigo,
      descricao: produtoCatalogoSelecionado.descricao,
      valor_unitario: produtoCatalogoSelecionado.valor_unitario || 0,
      quantidade: Number(qtdCatalogo),
      unidade: produtoCatalogoSelecionado.unidade || 'UN',
      isAvulso: false
    };

    setItensConfirmacao(prev => {
      const idx = prev.findIndex(item => item.codigo === novoItem.codigo && item.tipo !== 'avulso');
      if (idx >= 0) {
        const atualizados = [...prev];
        atualizados[idx] = {
          ...atualizados[idx],
          quantidade: Number(atualizados[idx].quantidade) + Number(novoItem.quantidade)
        };
        return atualizados;
      }
      return [...prev, novoItem];
    });

    if (continuarBuscando) {
      setFeedbackItemAdicionado({
        codigo: produtoCatalogoSelecionado.codigo,
        descricao: produtoCatalogoSelecionado.descricao,
        quantidade: Number(qtdCatalogo),
        unidade: produtoCatalogoSelecionado.unidade || 'UN'
      });
      setProdutoCatalogoSelecionado(null);
      setTermoBuscaCatalogo('');
      setQtdCatalogo(1);
      setTimeout(() => buscaCatalogoInputRef.current?.focus(), 80);
    } else {
      setModalCatalogo(false);
      setProdutoCatalogoSelecionado(null);
      setTermoBuscaCatalogo('');
      setQtdCatalogo(1);
      setFeedbackItemAdicionado(null);
      setModalConfirmacao(true);
    }
  };

  const handleAvancarParaConfirmacao = () => {
    if (produtoCatalogoSelecionado && Number(qtdCatalogo) > 0) {
      handleAdicionarItemAoPedido(false);
    } else if (itensConfirmacao.length > 0) {
      setModalCatalogo(false);
      setProdutoCatalogoSelecionado(null);
      setTermoBuscaCatalogo('');
      setFeedbackItemAdicionado(null);
      setModalConfirmacao(true);
    }
  };

  const handleRemoverItemConfirmacao = (idLocal) => {
    setItensConfirmacao(prev => prev.filter(i => i.idLocal !== idLocal));
  };

  const handleEnviarNecessidade = async () => {
    if (itensConfirmacao.length === 0) return;
    
    setLoading(true);
    setMensagem(null);

    const requisicaoData = {
      tipo: 'reposicao',
      status_compras: 'pendente_cotacao',
      dataRequisicao: new Date().toISOString(),
      sugestaoEntrega: sugestaoEntrega,
      projetoDestino: projetoGlobal,
      categoriaCompra: categoriaCompra,
      solicitante: 'Almoxarifado (Central)',
      itens: itensConfirmacao.map(item => ({
        codigo: item.codigo,
        descricao: item.descricao,
        quantidade: Number(item.quantidade) || 1,
        valor_unitario: item.valor_unitario || 0,
        unidade: item.unidade || 'UN',
        isAvulso: item.tipo === 'avulso'
      }))
    };

    try {
      const response = await fetch('/api/requisicoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requisicaoData)
      });

      if (!response.ok) throw new Error('Erro ao enviar necessidade de compras');

      const dataRes = await response.json();
      const numReq = dataRes?.requisicao?.id ? `#${dataRes.requisicao.id}` : '';

      setMensagem({ 
        tipo: 'sucesso', 
        texto: `✅ Requisição ${numReq} enviada para o Compras com sucesso! O(s) produto(s) agora estão marcados como "Pedido Feito ao Compras".` 
      });
      setSelecionados([]);
      setItensConfirmacao([]);
      setModalConfirmacao(false);
      
      // Atualiza o estado global de produtos no Dashboard
      if (onUpdate) onUpdate();

      // Muda para aba 'todos' para o usuário ver o produto devidamente marcado na hora
      setFiltroAba('todos');

      setTimeout(() => setMensagem(null), 7000);
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* Top Header */}
      <div className={styles.header}>
        <div className={styles.headerIcon}>
          <ShoppingCart size={32} />
        </div>
        <div className={styles.headerText}>
          <h1>Necessidade de Compras</h1>
          <p>Controle de reposição de estoque crítico e envio de pedidos de compras.</p>
        </div>
      </div>

      {mensagem && (
        <div style={{ 
          padding: '14px 18px', 
          borderRadius: '10px', 
          background: mensagem.tipo === 'sucesso' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', 
          color: mensagem.tipo === 'sucesso' ? 'var(--cor-sucesso)' : 'var(--cor-erro)', 
          border: `1px solid ${mensagem.tipo === 'sucesso' ? 'var(--cor-sucesso)' : 'var(--cor-erro)'}`,
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          {mensagem.texto}
        </div>
      )}

      {/* Métricas Resumidas */}
      <div className={styles.metricasGrid}>
        <div className={styles.metricaCard}>
          <div className={styles.metricaIcone} style={{ background: 'rgba(239, 68, 68, 0.15)', color: 'var(--cor-erro)' }}>
            <AlertTriangle size={24} />
          </div>
          <div className={styles.metricaInfo}>
            <span className={styles.metricaValor}>{todosEmAlerta.length}</span>
            <span className={styles.metricaTitulo}>Total Abaixo do Mínimo</span>
          </div>
        </div>

        <div className={styles.metricaCard}>
          <div className={styles.metricaIcone} style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--cor-erro)' }}>
            <Clock size={24} />
          </div>
          <div className={styles.metricaInfo}>
            <span className={styles.metricaValor}>{produtosPendentes.length}</span>
            <span className={styles.metricaTitulo}>Aguardando Solicitação</span>
          </div>
        </div>

        <div className={styles.metricaCard}>
          <div className={styles.metricaIcone} style={{ background: 'rgba(255, 107, 0, 0.15)', color: 'var(--cor-destaque)' }}>
            <ShoppingCart size={24} />
          </div>
          <div className={styles.metricaInfo}>
            <span className={styles.metricaValor}>{produtosJaPedidos.length}</span>
            <span className={styles.metricaTitulo}>Em Processo de Compra</span>
          </div>
        </div>

        <div className={styles.metricaCard}>
          <div className={styles.metricaIcone} style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--cor-sucesso)' }}>
            <CheckCircle2 size={24} />
          </div>
          <div className={styles.metricaInfo}>
            <span className={styles.metricaValor}>{produtosRecebidos.length}</span>
            <span className={styles.metricaTitulo}>Recebidos no Estoque</span>
          </div>
        </div>
      </div>

      {/* Seção Principal */}
      <div className={styles.section}>
        <div className={styles.actionBar}>
          <div className={styles.actionBarText}>
            <h3><AlertTriangle size={24} /> Ação de Reposição de Estoque</h3>
            <p>Selecione produtos críticos ou adicione qualquer item do estoque para solicitar reposição ao setor de Compras.</p>
          </div>
          
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button 
              className={styles.btnCatalogoTopo} 
              onClick={() => {
                setModalCatalogo(true);
                setProdutoCatalogoSelecionado(null);
                setTermoBuscaCatalogo('');
                setQtdCatalogo(1);
                setTimeout(() => buscaCatalogoInputRef.current?.focus(), 80);
              }}
              title="Buscar qualquer produto existente no cadastro e pedir reposição mesmo acima do estoque mínimo"
            >
              <PlusCircle size={18} />
              + Adicionar Produto do Estoque
            </button>

            <button className={styles.btnAvulsoTopo} onClick={() => setModalAvulso(true)}>
              <PackagePlus size={18} />
              Solicitar Produto Novo
            </button>

            <button 
              className={styles.btnGerarReq} 
              onClick={abrirModalConfirmacao}
              disabled={selecionados.length === 0}
            >
              <ShoppingCart size={18} />
              {selecionados.length > 0 ? `Gerar Requisição (${selecionados.length})` : 'Gerar Requisição'}
            </button>
          </div>
        </div>

        {/* Abas de Navegação e Filtros */}
        <div className={styles.tabsFiltro}>
          <div style={{ display: 'flex', gap: '6px', flex: 1, flexWrap: 'wrap' }}>
            <button 
              className={`${styles.tabBtn} ${filtroAba === 'pendentes' ? styles.tabBtnActive : ''}`}
              onClick={() => setFiltroAba('pendentes')}
            >
              <AlertTriangle size={15} color="var(--cor-erro)" />
              Aguardando Solicitação
              <span className={styles.tabBadge}>{produtosPendentes.length}</span>
            </button>

            <button 
              className={`${styles.tabBtn} ${filtroAba === 'pedidos' ? styles.tabBtnActive : ''}`}
              onClick={() => setFiltroAba('pedidos')}
            >
              <ShoppingCart size={15} color="var(--cor-destaque)" />
              Em Processo de Compra
              <span className={styles.tabBadge}>{produtosJaPedidos.length}</span>
            </button>

            <button 
              className={`${styles.tabBtn} ${filtroAba === 'recebidos' ? styles.tabBtnActive : ''}`}
              onClick={() => setFiltroAba('recebidos')}
            >
              <CheckCircle2 size={15} color="var(--cor-sucesso)" />
              Recebidos no Estoque
              <span className={styles.tabBadge}>{produtosRecebidos.length}</span>
            </button>

            <button 
              className={`${styles.tabBtn} ${filtroAba === 'todos' ? styles.tabBtnActive : ''}`}
              onClick={() => setFiltroAba('todos')}
            >
              Todos em Alerta
              <span className={styles.tabBadge}>{todosEmAlerta.length}</span>
            </button>
          </div>

          {/* Barra de Busca rápida */}
          <div className={styles.searchBarContainer}>
            <Search size={16} color="var(--cor-texto-secundario)" />
            <input 
              type="text" 
              placeholder="Buscar por código ou descrição..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
            {busca && (
              <button 
                onClick={() => setBusca('')} 
                style={{ background: 'transparent', border: 'none', color: 'var(--cor-texto-secundario)', cursor: 'pointer', padding: 0 }}
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {produtosExibidos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--cor-texto-secundario)' }}>
            <CheckCircle2 size={40} color="var(--cor-sucesso)" style={{ marginBottom: '8px', opacity: 0.8 }} />
            <p style={{ margin: 0, fontWeight: 600 }}>
              {filtroAba === 'pendentes' && 'Nenhum produto com reposição pendente! Todos os itens em alerta já possuem pedido criado ou estão no estoque.'}
              {filtroAba === 'pedidos' && 'Nenhum pedido ativo para o setor de Compras no momento.'}
              {filtroAba === 'recebidos' && 'Nenhum histórico recente de produtos recebidos no estoque.'}
              {filtroAba === 'todos' && 'Nenhum produto abaixo do estoque mínimo cadastrado.'}
            </p>
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.checkboxCell}>
                  <input 
                    type="checkbox" 
                    onChange={handleToggleSelectAll}
                    checked={selecionados.length > 0 && selecionados.length === produtosExibidos.filter(p => filtroAba === 'pedidos' ? true : (Number(p.quantidade_pedida) || 0) === 0).length}
                  />
                </th>
                <th>Código</th>
                <th>Descrição do Produto</th>
                <th style={{ textAlign: 'center' }}>Estoque Atual</th>
                <th style={{ textAlign: 'center' }}>Mínimo</th>
                <th style={{ textAlign: 'center' }}>Falta p/ Mínimo</th>
                <th>Situação no Compras</th>
                <th style={{ textAlign: 'center' }}>Ação</th>
              </tr>
            </thead>
            <tbody>
              {produtosExibidos.map(prod => {
                const isSelected = selecionados.includes(prod.codigo);
                const qtdEstoque = Number(prod.quantidade_estoque || 0);
                const estoqueMin = Number(prod.estoque_minimo || 0);
                const qtdPedida = Number(prod.quantidade_pedida || 0);
                const emCompra = qtdPedida > 0;
                const falta = Math.max(1, estoqueMin - qtdEstoque);

                return (
                  <tr 
                    key={prod.codigo_produto || prod.codigo} 
                    className={isSelected ? styles.selected : ''} 
                    onClick={() => handleToggleSelect(prod.codigo)} 
                    style={{ cursor: 'pointer' }}
                  >
                    <td className={styles.checkboxCell} onClick={e => e.stopPropagation()}>
                      <input 
                        type="checkbox" 
                        checked={isSelected}
                        onChange={() => handleToggleSelect(prod.codigo)}
                      />
                    </td>
                    <td>
                      <span className={styles.productCode}>
                        <Box size={14} style={{ opacity: 0.7 }} /> {prod.codigo || '-'}
                      </span>
                    </td>
                    <td>
                      <span className={styles.productTitle}>
                        {prod.descricao || 'Produto sem nome'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{ 
                        color: qtdEstoque <= 0 ? 'var(--cor-erro)' : 'var(--cor-sucesso)', 
                        backgroundColor: qtdEstoque <= 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', 
                        padding: '3px 8px', 
                        borderRadius: '4px',
                        fontWeight: 'bold',
                        fontSize: '0.85rem'
                      }}>
                        {qtdEstoque} {prod.unidade || 'UN'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{ 
                        color: 'var(--cor-erro)', 
                        backgroundColor: 'rgba(239, 68, 68, 0.1)', 
                        padding: '3px 8px', 
                        borderRadius: '4px',
                        fontWeight: 'bold',
                        fontSize: '0.85rem'
                      }}>
                        {estoqueMin} {prod.unidade || 'UN'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={styles.sugeridoCell}>
                        +{falta} {prod.unidade || 'UN'}
                      </span>
                    </td>
                    <td>
                      <div className={styles.statusComprasContainer}>
                        {emCompra ? (
                          <>
                            <span 
                              className={styles.badgeEmCompra}
                              title={prod.pedido_compras_info ? `Requisição #${prod.pedido_compras_info.reqId} - Solicitado por ${prod.pedido_compras_info.solicitante}` : 'Pedido em andamento no Compras'}
                            >
                              <ShoppingCart size={13} />
                              Pedido Feito: {qtdPedida} {prod.unidade || 'UN'}
                            </span>
                            <span className={styles.statusEtapaSub}>
                              {formatarStatusCompras(prod.pedido_compras_info?.status_compras)}
                              {prod.pedido_compras_info?.reqId && ` • Req #${prod.pedido_compras_info.reqId}`}
                            </span>
                          </>
                        ) : prod.ultimo_recebimento_info ? (
                          <>
                            <span 
                              className={styles.badgeRecebidoEstoque}
                              title={`Recebido no Almoxarifado em ${new Date(prod.ultimo_recebimento_info.dataRecebimento).toLocaleDateString('pt-BR')}`}
                            >
                              <CheckCircle2 size={13} />
                              Recebido no Estoque {prod.ultimo_recebimento_info.isParcial ? '(Parcial)' : ''}
                            </span>
                            <span className={styles.statusEtapaSub}>
                              Entregue em {new Date(prod.ultimo_recebimento_info.dataRecebimento).toLocaleDateString('pt-BR')}
                              {prod.ultimo_recebimento_info.reqId && ` • Req #${prod.ultimo_recebimento_info.reqId}`}
                            </span>
                          </>
                        ) : (
                          <span className={styles.badgePendente}>
                            <AlertTriangle size={13} />
                            Aguardando Solicitação
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                      <button 
                        className={styles.btnPedirItem}
                        onClick={() => pedirItemIndividual(prod)}
                        title={emCompra ? 'Solicitar reposição adicional deste item' : 'Solicitar este item imediatamente'}
                      >
                        {emCompra ? '+ Pedir Mais' : '+ Pedir'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal de Confirmação (Estilo Padrão Yama) */}
      {modalConfirmacao && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalConfirmacaoContent}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--cor-texto-principal)' }}>
                <ShoppingCart size={24} color="var(--cor-destaque)" />
                Confirmar Requisição para Compras
              </h3>
              <button 
                onClick={() => setModalConfirmacao(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--cor-texto-secundario)', cursor: 'pointer' }}
              >
                <X size={24} />
              </button>
            </div>

            <div className={styles.modalConfirmacaoScroll}>
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                <div className={styles.formGroup} style={{ flex: '1 1 200px' }}>
                  <label>Categoria da Compra</label>
                  <select 
                    value={categoriaCompra}
                    onChange={(e) => setCategoriaCompra(e.target.value)}
                    style={{ background: 'var(--cor-fundo-secundario)', border: '1px solid var(--cor-borda-cartao)', padding: '10px', borderRadius: '8px', color: 'var(--cor-texto-principal)' }}
                  >
                    <option>Reposição de Estoque</option>
                    <option>Compra de Material Para Uso e Consumo</option>
                    <option>Uso e Consumo / Reposição de Estoque</option>
                  </select>
                </div>
                
                <div className={styles.formGroup} style={{ flex: '1 1 200px' }}>
                  <label>Ordem de Serviço (OS) / Projeto</label>
                  <input 
                    type="text" 
                    list="projetos-os-list"
                    placeholder="Buscar Nº OS ou Projeto..."
                    value={projetoGlobal}
                    onChange={(e) => setProjetoGlobal(e.target.value.toUpperCase())}
                  />
                  <datalist id="projetos-os-list">
                    {osList.map(os => (
                      <option key={os.id || os.numero_os || os.codigo} value={`OS-${os.numero_os || os.codigo}`}>
                        {os.descricao}
                      </option>
                    ))}
                    {projetos.map(p => (
                      <option key={p.codigo} value={p.nome} />
                    ))}
                  </datalist>
                </div>

                <div className={styles.formGroup} style={{ flex: '1 1 180px' }}>
                  <label>Sugestão de Entrega</label>
                  <input 
                    type="date" 
                    value={sugestaoEntrega}
                    onChange={(e) => setSugestaoEntrega(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '8px' }}>
                <h4 style={{ margin: 0, color: 'var(--cor-texto-principal)' }}>Itens da Requisição ({itensConfirmacao.length})</h4>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    type="button"
                    onClick={() => {
                      setModalCatalogo(true);
                      setProdutoCatalogoSelecionado(null);
                      setTermoBuscaCatalogo('');
                      setQtdCatalogo(1);
                      setTimeout(() => buscaCatalogoInputRef.current?.focus(), 80);
                    }}
                    style={{ background: 'var(--cor-fundo-sutil)', border: '1px solid var(--cor-destaque)', padding: '6px 12px', borderRadius: '6px', color: 'var(--cor-destaque)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.82rem', fontWeight: 'bold' }}
                  >
                    <PlusCircle size={14} /> + Do Estoque
                  </button>
                  <button 
                    type="button"
                    onClick={() => setModalAvulso(true)}
                    style={{ background: 'var(--cor-fundo-sutil)', border: '1px solid var(--cor-borda-cartao)', padding: '6px 12px', borderRadius: '6px', color: 'var(--cor-texto-principal)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.82rem', fontWeight: 'bold' }}
                  >
                    <PackagePlus size={14} /> + Item Avulso
                  </button>
                </div>
              </div>

              <table className={styles.table}>
                <thead>
                  <tr>
                    <th style={{ width: '40px', textAlign: 'center' }}>#</th>
                    <th>Código</th>
                    <th>Descrição do Produto</th>
                    <th style={{ textAlign: 'center', width: '130px' }}>Quantidade</th>
                    <th style={{ width: '40px', textAlign: 'center' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {itensConfirmacao.length === 0 && (
                    <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--cor-texto-secundario)' }}>Nenhum item na lista.</td></tr>
                  )}
                  {itensConfirmacao.map((item, index) => (
                    <tr key={item.idLocal}>
                      <td style={{ textAlign: 'center', fontWeight: 'bold', color: 'var(--cor-texto-secundario)' }}>{index + 1}</td>
                      <td>
                        <span className={styles.productCode}>{item.codigo}</span>
                      </td>
                      <td>
                        <span className={styles.productTitle}>
                          {item.descricao}
                          {item.tipo === 'avulso' && <span style={{ marginLeft: '8px', fontSize: '0.65rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--cor-erro)', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>NOVO</span>}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                          <input 
                            type="number" 
                            min="1" 
                            value={item.quantidade} 
                            onChange={(e) => {
                              const val = e.target.value;
                              setItensConfirmacao(itensConfirmacao.map(i => i.idLocal === item.idLocal ? { ...i, quantidade: val } : i));
                            }}
                            style={{ width: '75px', padding: '6px', border: '1px solid var(--cor-borda-cartao)', borderRadius: '6px', textAlign: 'center', background: 'var(--cor-fundo-secundario)', color: 'var(--cor-texto-principal)' }}
                          />
                          <span style={{ fontSize: '0.75rem', color: 'var(--cor-texto-secundario)' }}>{item.unidade || 'UN'}</span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button 
                          onClick={() => setItensConfirmacao(itensConfirmacao.filter(i => i.idLocal !== item.idLocal))}
                          style={{ background: 'transparent', border: 'none', color: 'var(--cor-erro)', cursor: 'pointer', padding: '4px' }}
                          title="Remover item"
                        >
                          <X size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className={styles.modalActions}>
              <button className={styles.btnCancelar} onClick={() => setModalConfirmacao(false)}>
                Cancelar
              </button>
              <button 
                className={styles.btnSalvar} 
                onClick={handleEnviarNecessidade}
                disabled={loading || itensConfirmacao.length === 0}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Send size={18} /> {loading ? 'Enviando...' : 'Enviar para Compras'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Modal Avulso */}
      {modalAvulso && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3>Solicitar Novo Produto</h3>
            <div className={styles.formGroup}>
              <label>Descrição do Item (O que deseja pedir?)</label>
              <input 
                autoFocus
                type="text" 
                placeholder="Ex: TABLET SAMSUNG 10 POL..."
                value={formAvulso.descricao}
                onChange={(e) => setFormAvulso({...formAvulso, descricao: e.target.value.toUpperCase()})}
              />
            </div>
            
            <div className={styles.formGroup}>
              <label>Quantidade</label>
              <input 
                type="number" 
                min="1" 
                value={formAvulso.quantidade}
                onChange={(e) => setFormAvulso({...formAvulso, quantidade: e.target.value})}
              />
            </div>

            <div className={styles.modalActions}>
              <button className={styles.btnCancelar} onClick={() => setModalAvulso(false)}>Cancelar</button>
              <button className={styles.btnSalvar} onClick={handleSalvarAvulso} disabled={!formAvulso.descricao.trim()}>Adicionar Pedido</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Adição de Produto do Catálogo (Opção A) - Versão Grande */}
      {modalCatalogo && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCatalogoContent}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--cor-borda-cartao)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ color: 'var(--cor-destaque)', background: 'rgba(255, 107, 0, 0.12)', padding: '10px', borderRadius: '12px', display: 'flex' }}>
                  <PlusCircle size={26} />
                </div>
                <div>
                  <h3 style={{ margin: 0, color: 'var(--cor-texto-principal)', fontSize: '1.35rem' }}>Adicionar Produto do Estoque</h3>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.9rem', color: 'var(--cor-texto-secundario)' }}>
                    Selecione um item já cadastrado para pedir reposição preventiva ao setor de compras
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setModalCatalogo(false)} 
                style={{ background: 'transparent', border: 'none', color: 'var(--cor-texto-secundario)', cursor: 'pointer', padding: '6px' }}
                title="Fechar"
              >
                <X size={24} />
              </button>
            </div>

            <div className={styles.modalCatalogoScroll}>
              <div className={styles.layoutCatalogoDuplo}>
                {/* COLUNA ESQUERDA: Catálogo e Busca de Materiais */}
                <div className={styles.colunaCatalogoPesquisa}>
                  {/* Feedback de item adicionado com sucesso */}
                  {feedbackItemAdicionado && (
                    <div style={{
                      background: 'rgba(16, 185, 129, 0.12)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      color: 'var(--cor-sucesso)',
                      padding: '10px 16px',
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.9rem',
                      animation: 'fadeIn 0.2s ease-in-out'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <CheckCircle2 size={18} />
                        <span>
                          <strong>{feedbackItemAdicionado.quantidade} {feedbackItemAdicionado.unidade}</strong> de <strong>{feedbackItemAdicionado.codigo} - {formatarDescricaoLimpa(feedbackItemAdicionado.descricao)}</strong> adicionado ao pedido!
                        </span>
                      </div>
                      <button 
                        onClick={() => setFeedbackItemAdicionado(null)}
                        style={{ background: 'transparent', border: 'none', color: 'var(--cor-sucesso)', cursor: 'pointer', padding: '4px' }}
                        title="Fechar aviso"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )}

                  {/* Se o produto NÃO estiver selecionado, exibe o input de busca e a lista de resultados / dicas */}
                  {!produtoCatalogoSelecionado ? (
                    <>
                      <div style={{ position: 'relative' }}>
                        <label style={{ display: 'block', fontSize: '0.95rem', fontWeight: 700, color: 'var(--cor-texto-principal)', marginBottom: '8px' }}>
                          Pesquisar no Catálogo (Código, Descrição ou EAN)
                        </label>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                          <Search size={22} style={{ position: 'absolute', left: '14px', color: 'var(--cor-texto-secundario)' }} />
                          <input 
                            ref={buscaCatalogoInputRef}
                            type="text" 
                            placeholder="Ex: PARAFUSO, FILTRO, PRD00123..."
                            value={termoBuscaCatalogo}
                            onChange={(e) => setTermoBuscaCatalogo(e.target.value)}
                            style={{
                              width: '100%',
                              background: 'var(--cor-fundo-secundario)',
                              border: '1.5px solid var(--cor-borda-cartao)',
                              color: 'var(--cor-texto-principal)',
                              padding: '13px 16px 13px 46px',
                              borderRadius: '10px',
                              fontSize: '1.05rem',
                              boxSizing: 'border-box'
                            }}
                            autoFocus
                          />
                          {termoBuscaCatalogo && (
                            <button 
                              onClick={() => setTermoBuscaCatalogo('')} 
                              style={{ position: 'absolute', right: '14px', background: 'transparent', border: 'none', color: 'var(--cor-texto-secundario)', cursor: 'pointer' }}
                            >
                              <X size={18} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* 1. Dica inicial quando o usuário ainda não digitou nada */}
                      {!termoBuscaCatalogo.trim() && (
                        <div className={styles.catalogoDicaVazia}>
                          <Search size={32} style={{ color: 'var(--cor-destaque)', marginBottom: '8px', opacity: 0.8 }} />
                          <p style={{ margin: 0, fontWeight: 700, fontSize: '1.05rem', color: 'var(--cor-texto-principal)' }}>
                            Digite o código ou nome do material acima
                          </p>
                          <span style={{ fontSize: '0.88rem', color: 'var(--cor-texto-secundario)', marginTop: '4px' }}>
                            Pesquise entre os {produtos?.length || 0} produtos cadastrados no catálogo para solicitar reposição preventiva
                          </span>
                        </div>
                      )}

                      {/* 2. Aviso de nenhum resultado encontrado */}
                      {termoBuscaCatalogo.trim() && produtosCatalogoFiltrados.length === 0 && (
                        <div className={styles.catalogoDicaVazia}>
                          <AlertTriangle size={32} style={{ color: 'var(--cor-destaque)', marginBottom: '8px' }} />
                          <p style={{ margin: 0, fontWeight: 700, fontSize: '1.05rem', color: 'var(--cor-texto-principal)' }}>
                            Nenhum material encontrado para "{termoBuscaCatalogo}"
                          </p>
                          <span style={{ fontSize: '0.88rem', color: 'var(--cor-texto-secundario)', marginTop: '4px' }}>
                            Verifique o código ou a descrição digitada, ou cadastre uma solicitação avulsa caso o item não esteja no catálogo.
                          </span>
                        </div>
                      )}

                      {/* 3. Lista de produtos encontrados no fluxo natural */}
                      {produtosCatalogoFiltrados.length > 0 && (
                        <div className={styles.containerResultadosCatalogo}>
                          <div className={styles.headerResultadosCatalogo}>
                            <span>Resultados: <strong>{produtosCatalogoFiltrados.length} materiais encontrados</strong></span>
                            <span style={{ fontSize: '0.82rem', color: 'var(--cor-destaque)', fontWeight: 600 }}>Clique no material para selecionar</span>
                          </div>
                          <ul className={styles.listaResultadosCatalogo}>
                            {produtosCatalogoFiltrados.map(p => {
                              const b = obterBadgeInfo(p.unidade);
                              const est = Number(p.quantidade_estoque || 0);
                              const min = Number(p.estoque_minimo || 0);
                              const end = extrairEndereco(p);
                              const marca = extrairMarca(p);

                              return (
                                <li 
                                  key={p.codigo_produto || p.codigo} 
                                  onClick={() => handleSelecionarProdutoCatalogo(p)}
                                  className={styles.itemResultadoCatalogo}
                                >
                                  {/* Coluna 1: Código e Unidade */}
                                  <div className={styles.colunaCodigoUnidade}>
                                    <span className={styles.badgeCodigo}>{p.codigo}</span>
                                    <span style={{
                                      fontSize: '0.72rem', fontWeight: 'bold',
                                      color: b.cor, backgroundColor: b.bg,
                                      border: `1px solid ${b.border}`,
                                      padding: '2px 8px', borderRadius: '5px',
                                      display: 'inline-flex', alignItems: 'center', gap: '4px',
                                      whiteSpace: 'nowrap'
                                    }}>
                                      {b.icone} {b.label}
                                    </span>
                                  </div>

                                  {/* Coluna 2: Descrição Limpa, Marca e Endereço */}
                                  <div className={styles.colunaDescricao}>
                                    <div className={styles.descricaoTitulo}>
                                      {formatarDescricaoLimpa(p.descricao)}
                                    </div>
                                    <div className={styles.subinfoProduto}>
                                      {end !== '-' && (
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                          <MapPin size={14} style={{ color: 'var(--cor-destaque)', flexShrink: 0 }} />
                                          <span><strong>Endereço:</strong> {end}</span>
                                        </span>
                                      )}
                                      {marca !== '-' && (
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                          <Tag size={14} style={{ color: 'var(--cor-destaque)', flexShrink: 0 }} />
                                          <span><strong>Marca:</strong> {marca}</span>
                                        </span>
                                      )}
                                      {p.ean && (
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                          <Barcode size={15} style={{ color: 'var(--cor-texto-secundario)', flexShrink: 0 }} />
                                          <span><strong>EAN:</strong> {p.ean}</span>
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Coluna 3: Métricas de Estoque e Compras */}
                                  <div className={styles.colunaEstoque}>
                                    <span className={styles.tagMetrica}>
                                      <Box size={14} style={{ color: 'var(--cor-destaque)', flexShrink: 0 }} />
                                      <span>Saldo: <strong style={{ color: est <= 0 ? 'var(--cor-erro)' : 'var(--cor-sucesso)', fontSize: '0.92rem' }}>{formatarQuantidadeComUnidade(est, p.unidade)}</strong></span>
                                    </span>
                                    <span style={{ color: 'var(--cor-borda-cartao)' }}>|</span>
                                    <span className={styles.tagMetrica}>
                                      <AlertTriangle size={14} style={{ color: '#f59e0b', flexShrink: 0 }} />
                                      <span>Mínimo: <strong>{min} {p.unidade || 'UN'}</strong></span>
                                    </span>
                                    {p.em_compra && (
                                      <>
                                        <span style={{ color: 'var(--cor-borda-cartao)' }}>|</span>
                                        <span style={{ color: 'var(--cor-destaque)', fontWeight: 'bold', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                          <ShoppingCart size={14} style={{ flexShrink: 0 }} />
                                          <span>Em compra: {p.quantidade_pedida} {p.unidade}</span>
                                        </span>
                                      </>
                                    )}
                                  </div>

                                  {/* Coluna 4: Botão de Ação */}
                                  <button 
                                    type="button" 
                                    className={styles.btnSelecionarItemIndicador}
                                    onClick={(e) => { e.stopPropagation(); handleSelecionarProdutoCatalogo(p); }}
                                  >
                                    <span>Selecionar</span>
                                    <ArrowRight size={16} />
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      )}
                    </>
                  ) : (
                    /* Card do Produto Selecionado */
                    <div className={styles.cardProdutoEscolhido}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                            <span className={styles.badgeCodigo}>
                              {produtoCatalogoSelecionado.codigo}
                            </span>
                            {(() => {
                              const b = obterBadgeInfo(produtoCatalogoSelecionado.unidade);
                              return (
                                <span style={{
                                  fontSize: '0.72rem', fontWeight: 'bold',
                                  color: b.cor, backgroundColor: b.bg,
                                  border: `1px solid ${b.border}`,
                                  padding: '2px 8px', borderRadius: '5px',
                                  display: 'inline-flex', alignItems: 'center', gap: '4px'
                                }}>
                                  {b.icone} {b.label}
                                </span>
                              );
                            })()}
                          </div>
                          <h4 style={{ margin: 0, color: 'var(--cor-texto-principal)', fontSize: '0.98rem', fontWeight: 700, lineHeight: 1.35 }}>
                            {formatarDescricaoLimpa(produtoCatalogoSelecionado.descricao)}
                          </h4>
                        </div>
                        <button 
                          onClick={() => { setProdutoCatalogoSelecionado(null); setTimeout(() => buscaCatalogoInputRef.current?.focus(), 50); }}
                          style={{ background: 'var(--cor-fundo-secundario)', border: '1px solid var(--cor-borda-cartao)', color: 'var(--cor-destaque)', padding: '8px 16px', borderRadius: '8px', fontSize: '0.88rem', cursor: 'pointer', fontWeight: 700 }}
                        >
                          ← Trocar Material
                        </button>
                      </div>

                      <div style={{ display: 'flex', gap: '18px', flexWrap: 'wrap', fontSize: '0.92rem', margin: '14px 0 20px 0', background: 'var(--cor-fundo-secundario)', padding: '12px 18px', borderRadius: '10px', border: '1px solid var(--cor-borda-cartao)' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <Box size={16} style={{ color: 'var(--cor-destaque)' }} />
                          <span>Saldo Atual: <strong style={{ color: Number(produtoCatalogoSelecionado.quantidade_estoque || 0) <= 0 ? 'var(--cor-erro)' : 'var(--cor-sucesso)' }}>{formatarQuantidadeComUnidade(produtoCatalogoSelecionado.quantidade_estoque, produtoCatalogoSelecionado.unidade)}</strong></span>
                        </span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <AlertTriangle size={15} style={{ color: '#f59e0b' }} />
                          <span>Estoque Mínimo: <strong>{produtoCatalogoSelecionado.estoque_minimo || 0} {produtoCatalogoSelecionado.unidade || 'UN'}</strong></span>
                        </span>
                        {extrairEndereco(produtoCatalogoSelecionado) !== '-' && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <MapPin size={15} style={{ color: 'var(--cor-destaque)' }} />
                            <span>Endereço: <strong>{extrairEndereco(produtoCatalogoSelecionado)}</strong></span>
                          </span>
                        )}
                        {extrairMarca(produtoCatalogoSelecionado) !== '-' && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <Tag size={15} style={{ color: 'var(--cor-destaque)' }} />
                            <span>Marca: <strong>{extrairMarca(produtoCatalogoSelecionado)}</strong></span>
                          </span>
                        )}
                      </div>

                      {/* Input de Quantidade */}
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '16px', marginTop: '16px' }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ display: 'block', fontSize: '0.95rem', fontWeight: 700, color: 'var(--cor-texto-principal)', marginBottom: '8px' }}>
                            Quantidade a Repor ({obterRotuloUnidade(produtoCatalogoSelecionado.unidade)})
                          </label>
                          <input 
                            ref={qtdCatalogoInputRef}
                            type="number" 
                            min={permiteDecimais(produtoCatalogoSelecionado.unidade) ? "0.01" : "1"}
                            step={permiteDecimais(produtoCatalogoSelecionado.unidade) ? "0.01" : "1"}
                            value={qtdCatalogo}
                            onChange={(e) => setQtdCatalogo(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAdicionarItemAoPedido(true);
                              }
                            }}
                            style={{
                              width: '100%',
                              background: 'var(--cor-fundo-secundario)',
                              border: '2px solid var(--cor-destaque)',
                              color: 'var(--cor-texto-principal)',
                              padding: '12px 18px',
                              borderRadius: '10px',
                              fontSize: '1.25rem',
                              fontWeight: 'bold',
                              boxSizing: 'border-box'
                            }}
                          />
                        </div>

                        {/* Atalhos de quantidade rápida */}
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {[10, 25, 50, 100, 200].map(n => (
                            <button
                              key={n}
                              type="button"
                              onClick={() => setQtdCatalogo(n)}
                              style={{
                                background: Number(qtdCatalogo) === n ? 'var(--cor-destaque)' : 'var(--cor-fundo-secundario)',
                                color: Number(qtdCatalogo) === n ? 'var(--cor-texto-inverso)' : 'var(--cor-texto-principal)',
                                border: '1px solid var(--cor-borda-cartao)',
                                padding: '12px 14px',
                                borderRadius: '8px',
                                fontSize: '0.9rem',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              +{n}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Botões de Ação do Card de Produto */}
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--cor-borda-cartao)', flexWrap: 'wrap' }}>
                        <button 
                          type="button" 
                          onClick={() => handleAdicionarItemAoPedido(true)}
                          disabled={Number(qtdCatalogo) <= 0}
                          style={{
                            background: 'var(--cor-fundo-secundario)',
                            border: '1.5px solid var(--cor-destaque)',
                            color: 'var(--cor-destaque)',
                            padding: '12px 20px',
                            borderRadius: '8px',
                            fontSize: '0.95rem',
                            fontWeight: 700,
                            cursor: Number(qtdCatalogo) <= 0 ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            transition: 'all 0.15s ease',
                            opacity: Number(qtdCatalogo) <= 0 ? 0.5 : 1
                          }}
                        >
                          <Plus size={18} /> + Adicionar ao Pedido e Buscar Próximo
                        </button>
                        <button 
                          type="button" 
                          onClick={() => handleAdicionarItemAoPedido(false)}
                          disabled={Number(qtdCatalogo) <= 0}
                          style={{
                            background: 'var(--cor-destaque)',
                            color: 'var(--cor-texto-inverso)',
                            border: 'none',
                            padding: '12px 24px',
                            borderRadius: '8px',
                            fontSize: '0.95rem',
                            fontWeight: 700,
                            cursor: Number(qtdCatalogo) <= 0 ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            boxShadow: '0 4px 14px rgba(255, 107, 0, 0.25)',
                            opacity: Number(qtdCatalogo) <= 0 ? 0.5 : 1
                          }}
                        >
                          <ShoppingCart size={18} /> Adicionar e Concluir Pedido ({itensConfirmacao.length + 1}) →
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* COLUNA DIREITA: Painel / Carrinho do Pedido Atual */}
                <div className={styles.colunaCarrinhoPedido}>
                  <div className={styles.carrinhoHeader}>
                    <div className={styles.carrinhoHeaderTitulo}>
                      <ShoppingCart size={20} color="var(--cor-destaque)" />
                      <span>Pedido em Andamento</span>
                    </div>
                    <span className={styles.carrinhoBadgeContador}>
                      {itensConfirmacao.length} {itensConfirmacao.length === 1 ? 'material' : 'materiais'}
                    </span>
                  </div>

                  <div className={styles.carrinhoCorpoScroll}>
                    {itensConfirmacao.length === 0 ? (
                      <div className={styles.carrinhoVazioAviso}>
                        <PackagePlus size={40} style={{ opacity: 0.4, marginBottom: '10px' }} />
                        <strong style={{ fontSize: '0.95rem', color: 'var(--cor-texto-principal)' }}>Nenhum material adicionado</strong>
                        <span style={{ fontSize: '0.82rem', marginTop: '6px' }}>
                          Pesquise e selecione materiais ao lado para adicionar ao pedido.
                        </span>
                      </div>
                    ) : (
                      itensConfirmacao.map(item => (
                        <div key={item.idLocal} className={styles.carrinhoItemCard}>
                          <div className={styles.carrinhoItemTopo}>
                            <span className={styles.badgeCodigo}>{item.codigo}</span>
                            <button 
                              type="button"
                              onClick={() => handleRemoverItemConfirmacao(item.idLocal)}
                              className={styles.btnRemoverItemCarrinho}
                              title="Remover material do pedido"
                            >
                              <Trash2 size={13} />
                              <span>Remover</span>
                            </button>
                          </div>
                          <div className={styles.carrinhoItemDescricao}>
                            {formatarDescricaoLimpa(item.descricao)}
                          </div>
                          <div className={styles.carrinhoItemRodape}>
                            <span className={styles.carrinhoItemQtdBadge}>
                              Qtd: {item.quantidade} {item.unidade}
                            </span>
                            <CheckCircle2 size={15} color="var(--cor-sucesso)" />
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className={styles.carrinhoFooterAcoes}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.88rem', color: 'var(--cor-texto-secundario)', padding: '0 4px' }}>
                      <span>Total no pedido:</span>
                      <strong style={{ color: 'var(--cor-texto-principal)', fontSize: '0.95rem' }}>
                        {itensConfirmacao.length} {itensConfirmacao.length === 1 ? 'material' : 'materiais'}
                      </strong>
                    </div>

                    <button 
                      type="button"
                      className={styles.btnFinalizarPedidoCarrinho}
                      onClick={handleAvancarParaConfirmacao}
                      disabled={itensConfirmacao.length === 0 && !produtoCatalogoSelecionado}
                      title={itensConfirmacao.length === 0 && !produtoCatalogoSelecionado ? 'Adicione ao menos um material' : 'Avançar para confirmar projeto e observações'}
                    >
                      <ShoppingCart size={18} />
                      <span>
                        Finalizar Pedido ({itensConfirmacao.length + (produtoCatalogoSelecionado && Number(qtdCatalogo) > 0 ? 1 : 0)}) →
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.modalActions} style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--cor-borda-cartao)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <button 
                className={styles.btnCancelar} 
                onClick={() => {
                  setModalCatalogo(false);
                  setFeedbackItemAdicionado(null);
                }} 
                style={{ padding: '10px 20px', fontSize: '0.95rem' }}
              >
                {itensConfirmacao.length > 0 ? 'Fechar Catálogo (Manter Itens)' : 'Cancelar'}
              </button>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                {produtoCatalogoSelecionado && (
                  <button 
                    type="button" 
                    onClick={() => handleAdicionarItemAoPedido(true)}
                    disabled={Number(qtdCatalogo) <= 0}
                    style={{
                      background: 'transparent',
                      border: '1.5px solid var(--cor-destaque)',
                      color: 'var(--cor-destaque)',
                      padding: '10px 18px',
                      borderRadius: '8px',
                      fontSize: '0.92rem',
                      fontWeight: 700,
                      cursor: Number(qtdCatalogo) <= 0 ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Plus size={16} /> + Adicionar ao Pedido
                  </button>
                )}
                <button 
                  type="button"
                  className={styles.btnSalvar} 
                  onClick={handleAvancarParaConfirmacao}
                  disabled={itensConfirmacao.length === 0 && !produtoCatalogoSelecionado}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px', 
                    padding: '10px 22px', 
                    fontSize: '0.95rem', 
                    fontWeight: 700,
                    opacity: (itensConfirmacao.length === 0 && !produtoCatalogoSelecionado) ? 0.5 : 1,
                    cursor: (itensConfirmacao.length === 0 && !produtoCatalogoSelecionado) ? 'not-allowed' : 'pointer'
                  }}
                >
                  <ShoppingCart size={17} /> 
                  <span>
                    Concluir Pedido ({itensConfirmacao.length + (produtoCatalogoSelecionado && Number(qtdCatalogo) > 0 ? 1 : 0)}) →
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default NecessidadeCompras;
