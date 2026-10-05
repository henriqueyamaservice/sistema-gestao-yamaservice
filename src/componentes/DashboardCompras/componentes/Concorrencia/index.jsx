import React, { useState, useEffect } from 'react';
import { Scale, ChevronDown, ChevronUp, Plus, Trash2, Building, DollarSign, Zap, X, History, ShoppingCart, Loader2 } from 'lucide-react';
import { deduplicarCotacoes } from '../../../../utils/cotacoesHelper';
import ModalSubstituicao from '../ModalSubstituicao';
import styles from './Concorrencia.module.css';

// Componente de Busca/Filtro de Fornecedores por digitação (Nome ou CNPJ/CPF) com botão + para novo
const FornecedorAutocomplete = ({ fornecedores, valorSelecionado, onChange, onOpenModal }) => {
  const [busca, setBusca] = useState('');
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    if (valorSelecionado) {
      const f = fornecedores.find(f => String(f.codigo_cliente_omie) === String(valorSelecionado));
      if (f) setBusca(f.nome_fantasia || f.razao_social);
    } else {
      setBusca('');
    }
  }, [valorSelecionado, fornecedores]);

  const filtrados = (fornecedores || []).filter(f => {
    if (!busca) return true;
    const termo = busca.toLowerCase();
    return (
      f.nome_fantasia?.toLowerCase().includes(termo) ||
      f.razao_social?.toLowerCase().includes(termo) ||
      f.cnpj_cpf?.includes(termo)
    );
  }).slice(0, 40);

  return (
    <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center', gap: '4px' }}>
      <div style={{ position: 'relative', flex: 1, minWidth: '180px' }}>
        <div style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: '8px', color: 'var(--cor-texto-secundario)', pointerEvents: 'none', display: 'flex', alignItems: 'center' }}>
          <Building size={14} />
        </div>
        <input 
          type="text"
          value={busca}
          onChange={(e) => { 
            setBusca(e.target.value); 
            setAberto(true);
            if (!e.target.value) {
              onChange('');
            }
          }}
          onFocus={() => setAberto(true)}
          onBlur={() => setTimeout(() => setAberto(false), 250)}
          placeholder="Buscar Fornecedor (Nome ou CNPJ/CPF)..."
          style={{ 
            width: '100%', 
            padding: '7px 8px 7px 28px', 
            border: '1px solid var(--cor-borda-cartao)', 
            borderRadius: '6px', 
            fontSize: '0.85rem', 
            outline: 'none',
            background: 'var(--cor-fundo-cartao)',
            color: 'var(--cor-texto-principal)'
          }}
        />
        {aberto && (
          <div style={{ 
            position: 'absolute', 
            top: 'calc(100% + 4px)', 
            left: 0, 
            right: 0, 
            minWidth: '260px',
            background: 'var(--cor-fundo-cartao)', 
            border: '1px solid var(--cor-borda-cartao)', 
            borderRadius: '6px',
            zIndex: 999, 
            maxHeight: '220px', 
            overflowY: 'auto', 
            boxShadow: '0 8px 16px rgba(0,0,0,0.15)' 
          }}>
            {filtrados.length > 0 ? filtrados.map(f => (
              <div 
                key={f.codigo_cliente_omie} 
                style={{ padding: '8px 10px', cursor: 'pointer', borderBottom: '1px solid var(--cor-borda-cartao)' }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(f.codigo_cliente_omie);
                  setBusca(f.nome_fantasia || f.razao_social);
                  setAberto(false);
                }}
                onMouseOver={(e) => e.currentTarget.style.background = 'var(--cor-fundo-sutil)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--cor-texto-principal)' }}>{f.nome_fantasia || f.razao_social}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--cor-texto-secundario)' }}>{f.cnpj_cpf ? `CNPJ/CPF: ${f.cnpj_cpf}` : 'Sem documento'}</div>
              </div>
            )) : (
              <div style={{ padding: '8px 10px', fontSize: '0.8rem', color: 'var(--cor-texto-secundario)' }}>
                Nenhum fornecedor encontrado. Clique em + ao lado para cadastrar.
              </div>
            )}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onOpenModal}
        title="Cadastrar novo fornecedor (Mercado Livre / Balcão / CNPJ)"
        style={{
          background: 'var(--cor-fundo-secundario)',
          border: '1px solid var(--cor-borda-cartao)',
          borderRadius: '6px',
          padding: '7px 9px',
          cursor: 'pointer',
          color: 'var(--cor-destaque)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}
      >
        <Plus size={16} />
      </button>
    </div>
  );
};

const Concorrencia = ({ setView }) => {
  const [requisicoes, setRequisicoes] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandido, setExpandido] = useState(null);
  
  // Modal de Substituição
  const [itemParaSubstituir, setItemParaSubstituir] = useState(null);
  const [reqIdParaSubstituir, setReqIdParaSubstituir] = useState(null);

  // States para Cadastro Rápido de Fornecedor (Mercado Livre / Balcão)
  const [modalFornecedorAberto, setModalFornecedorAberto] = useState(false);
  const [novoForn, setNovoForn] = useState({ 
    razao_social: '', nome_fantasia: '', cnpj_cpf: '', 
    email: '', cep: '', endereco: '', bairro: '', cidade: '', estado: '' 
  });
  const [salvandoFornecedor, setSalvandoFornecedor] = useState(false);
  const [contextoNovoFornecedor, setContextoNovoFornecedor] = useState(null); // { reqId, codigoItem, cotacaoId }

  // Estado temporário das cotações sendo digitadas
  // Formato: { reqId: { itemCodigo: [ { fornecedorId, valorUnitario, previsaoDias } ] } }
  const [cotacoesTemp, setCotacoesTemp] = useState({});

  // Estado para armazenar os dados da última compra de cada produto cotado { [codigoProduto]: ultimaCompraObj }
  const [ultimasCompras, setUltimasCompras] = useState({});

  // Estado para controlar quais botões de auto-cotar estão carregando { [chave]: true }
  const [loadingAutoCotar, setLoadingAutoCotar] = useState({});

  useEffect(() => {
    fetchDados();
  }, []);

  const fetchDados = async () => {
    setLoading(true);
    try {
      // Busca Requisições
      const resReq = await fetch('/api/requisicoes');
      const dataReq = await resReq.json();
      const emConcorrencia = dataReq.filter(req => req.status_compras === 'em_concorrencia');
      setRequisicoes(emConcorrencia);

      // Busca Fornecedores
      const resForn = await fetch('/api/fornecedores');
      if (resForn.ok) {
        const dataForn = await resForn.json();
        setFornecedores(dataForn);
      }

      // Buscar última compra dos produtos presentes nas requisições em concorrência
      const codigosUnicos = new Set();
      emConcorrencia.forEach(req => {
        (req.itens || []).forEach(item => {
          if (item.codigo) codigosUnicos.add(item.codigo);
        });
      });

      if (codigosUnicos.size > 0) {
        const promessas = Array.from(codigosUnicos).map(async (cod) => {
          try {
            const r = await fetch(`/api/produtos/${encodeURIComponent(cod)}/ultima-compra`);
            if (r.ok) {
              const d = await r.json();
              return { codigo: cod, ultimaCompra: d.ultimaCompra };
            }
          } catch (e) {
            console.warn(`Erro ao buscar última compra do item ${cod}:`, e);
          }
          return { codigo: cod, ultimaCompra: null };
        });

        const resultados = await Promise.all(promessas);
        const mapaUltimas = {};
        resultados.forEach(item => {
          if (item && item.ultimaCompra) {
            mapaUltimas[item.codigo] = item.ultimaCompra;
          }
        });
        setUltimasCompras(mapaUltimas);
      }
    } catch (error) {
      console.error('Erro ao carregar dados da concorrência:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id) => {
    setExpandido(expandido === id ? null : id);
  };

  // Preenche a cotação reaproveitando a Última Compra
  const reaproveitarUltimaCompra = (reqId, codigoItem, ultima) => {
    if (!ultima) return;
    setCotacoesTemp(prev => {
      const reqState = { ...(prev[reqId] || {}) };
      let arrayAtual = reqState[codigoItem];

      if (arrayAtual === undefined) {
        const req = requisicoes.find(r => r.id === reqId);
        const item = req?.itens?.find(i => i.codigo === codigoItem);
        arrayAtual = item?.cotacoes ? deduplicarCotacoes(item.cotacoes) : [];
      }

      // Evita duplicar se esse fornecedor já estiver na lista
      const fornecedorJaPresente = arrayAtual.some(c => 
        ultima.fornecedorId && String(c.fornecedorId) === String(ultima.fornecedorId)
      );

      let novoArray;
      const valorFormatado = Number(ultima.valorUnitario || 0).toFixed(2);

      if (fornecedorJaPresente) {
        // Atualiza a linha existente com o valor unitário da última compra
        novoArray = arrayAtual.map(c => {
          if (String(c.fornecedorId) === String(ultima.fornecedorId)) {
            return {
              ...c,
              valorUnitario: valorFormatado
            };
          }
          return c;
        });
      } else {
        novoArray = [
          ...arrayAtual,
          {
            id: Date.now().toString() + Math.random().toString(36).substring(2, 6),
            fornecedorId: ultima.fornecedorId || '',
            valorUnitario: valorFormatado,
            previsaoDias: '5'
          }
        ];
      }

      return {
        ...prev,
        [reqId]: {
          ...reqState,
          [codigoItem]: novoArray
        }
      };
    });
  };

  // ----- Manipulação de Cotações Temporárias -----
  const getCotacoesItem = (reqId, codigoItem) => {
    // Retorna as cotações temporárias se existirem, ou as já salvas deduplicadas
    if (cotacoesTemp[reqId] && cotacoesTemp[reqId][codigoItem] !== undefined) {
      return cotacoesTemp[reqId][codigoItem];
    }
    const req = requisicoes.find(r => r.id === reqId);
    const item = req?.itens?.find(i => i.codigo === codigoItem);
    return deduplicarCotacoes(item?.cotacoes || []);
  };

  const addCotacao = (reqId, codigoItem) => {
    setCotacoesTemp(prev => {
      const reqState = { ...(prev[reqId] || {}) };
      let arrayAtual = reqState[codigoItem];
      
      // Se ainda não estava no estado temporário, traz as existentes deduplicadas
      if (arrayAtual === undefined) {
        const req = requisicoes.find(r => r.id === reqId);
        const item = req?.itens?.find(i => i.codigo === codigoItem);
        arrayAtual = item?.cotacoes ? deduplicarCotacoes(item.cotacoes) : [];
      }

      return {
        ...prev,
        [reqId]: {
          ...reqState,
          [codigoItem]: [
            ...arrayAtual,
            {
              id: Date.now().toString() + Math.random().toString(36).substring(2, 6),
              fornecedorId: '',
              valorUnitario: '',
              previsaoDias: ''
            }
          ]
        }
      };
    });
  };

  const autoCotar = async (reqId, codigoItem) => {
    const chave = `${reqId}_${codigoItem}`;
    if (loadingAutoCotar[chave]) return; // Impede múltiplos cliques enquanto já estiver buscando!

    setLoadingAutoCotar(prev => ({ ...prev, [chave]: true }));
    try {
      const response = await fetch(`/api/produtos/${codigoItem}/sugestao-precos`);
      if (!response.ok) throw new Error('Falha ao buscar sugestão de preços');
      const sugestoes = await response.json();
      
      setCotacoesTemp(prev => {
        const novoEstado = { ...prev };
        if (!novoEstado[reqId]) novoEstado[reqId] = {};
        
        let existentes = novoEstado[reqId][codigoItem];
        if (existentes === undefined) {
          const req = requisicoes.find(r => r.id === reqId);
          const item = req?.itens?.find(i => i.codigo === codigoItem);
          existentes = item?.cotacoes ? deduplicarCotacoes(item.cotacoes) : [];
        }
        
        // Ao clicar em Auto-Cotar, redefine/atualiza a cotação do item com o conjunto de sugestões reais
        if (!sugestoes || sugestoes.length === 0) {
          alert('Nenhum pedido de compra anterior foi encontrado na Omie ou no Almoxarifado para este produto.\n\nUse o botão "+ Adicionar Fornecedor" para cotar manualmente.');
          return prev;
        }

        novoEstado[reqId][codigoItem] = sugestoes;
        return novoEstado;
      });
    } catch (error) {
      console.error('Erro na auto-cotação:', error);
      alert('Erro ao buscar histórico de compras da Omie.');
    } finally {
      setLoadingAutoCotar(prev => ({ ...prev, [chave]: false }));
    }
  };

  const removeCotacao = (reqId, codigoItem, cotacaoId) => {
    setCotacoesTemp(prev => {
      const reqState = prev[reqId] || {};
      let itemState = reqState[codigoItem];
      if (itemState === undefined) {
        const req = requisicoes.find(r => r.id === reqId);
        const item = req?.itens?.find(i => i.codigo === codigoItem);
        itemState = item?.cotacoes ? deduplicarCotacoes(item.cotacoes) : [];
      }
      return {
        ...prev,
        [reqId]: {
          ...reqState,
          [codigoItem]: itemState.filter(c => c.id !== cotacaoId)
        }
      };
    });
  };

  const updateCotacao = (reqId, codigoItem, cotacaoId, campo, valor) => {
    setCotacoesTemp(prev => {
      const reqState = prev[reqId] || {};
      let itemState = reqState[codigoItem];
      if (itemState === undefined) {
        const req = requisicoes.find(r => r.id === reqId);
        const item = req?.itens?.find(i => i.codigo === codigoItem);
        itemState = item?.cotacoes ? deduplicarCotacoes(item.cotacoes) : [];
      }
      
      if (campo === 'fornecedorId' && valor) {
        const jaExiste = itemState.some(c => c.id !== cotacaoId && String(c.fornecedorId) === String(valor));
        if (jaExiste) {
          alert('Este fornecedor já possui uma cotação neste produto.');
          return prev;
        }
      }
      
      return {
        ...prev,
        [reqId]: {
          ...reqState,
          [codigoItem]: itemState.map(c => 
            c.id === cotacaoId ? { ...c, [campo]: valor } : c
          )
        }
      };
    });
  };

  const salvarCotacoesFinalizar = async (reqId) => {
    try {
      // 1. Salvar as cotações no backend garantindo que foram deduplicadas
      const cotacoesReq = { ...(cotacoesTemp[reqId] || {}) };
      
      const req = requisicoes.find(r => r.id === reqId);
      req?.itens?.forEach(item => {
        if (!cotacoesReq[item.codigo] && item.cotacoes) {
          cotacoesReq[item.codigo] = deduplicarCotacoes(item.cotacoes);
        } else if (cotacoesReq[item.codigo]) {
          cotacoesReq[item.codigo] = deduplicarCotacoes(cotacoesReq[item.codigo]).filter(c => c.fornecedorId && c.valorUnitario);
        }
      });
      
      const payloadCotacoes = {
        cotacoes: cotacoesReq
      };

      await fetch(`/api/requisicoes/${reqId}/salvar-cotacoes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadCotacoes)
      });

      // 2. Avançar etapa
      const resAvancar = await fetch(`/api/requisicoes/${reqId}/avancar-etapa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ novoStatus: 'em_orcamento' })
      });

      if (!resAvancar.ok) throw new Error('Falha ao enviar para Orçamentos');
      
      setView('orcamentos');
    } catch (error) {
      console.error('Erro ao finalizar cotação:', error);
      alert('Erro ao enviar para orçamentos.');
    }
  };

  const salvarNovoFornecedor = async () => {
    if (!novoForn.razao_social || !novoForn.cnpj_cpf) {
      alert('Razão Social / Nome e CNPJ/CPF são obrigatórios');
      return;
    }

    setSalvandoFornecedor(true);
    try {
      const res = await fetch('/api/fornecedores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(novoForn)
      });
      if (!res.ok) throw new Error('Erro ao salvar fornecedor');
      const fornecedorCriado = await res.json();
      
      setFornecedores(prev => [...prev, fornecedorCriado]);
      
      if (contextoNovoFornecedor && contextoNovoFornecedor.cotacaoId) {
        const { reqId, codigoItem, cotacaoId } = contextoNovoFornecedor;
        updateCotacao(reqId, codigoItem, cotacaoId, 'fornecedorId', fornecedorCriado.codigo_cliente_omie);
      } else if (contextoNovoFornecedor) {
        const { reqId, codigoItem } = contextoNovoFornecedor;
        addCotacao(reqId, codigoItem);
      }

      setModalFornecedorAberto(false);
      setNovoForn({ razao_social: '', nome_fantasia: '', cnpj_cpf: '' });
      setContextoNovoFornecedor(null);
    } catch (err) {
      alert('Erro: ' + err.message);
    } finally {
      setSalvandoFornecedor(false);
    }
  };

  // ----- Substituição -----
  const abrirModalSubstituicao = (e, reqId, item) => {
    e.stopPropagation();
    setReqIdParaSubstituir(reqId);
    setItemParaSubstituir(item);
  };

  const handleSubstituicao = async (produtoSubstituto, motivo) => {
    try {
      const payload = {
        codigoOriginal: itemParaSubstituir.codigo,
        produtoSubstituto,
        motivo
      };

      const response = await fetch(`/api/requisicoes/${reqIdParaSubstituir}/substituir-item`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error('Falha ao registrar substituição');
      await fetchDados();
    } catch (error) {
      console.error('Erro na substituição:', error);
      alert('Ocorreu um erro ao registrar a substituição.');
    }
  };

  if (loading) return <div className={styles.loading}>Carregando concorrências...</div>;

  if (requisicoes.length === 0) {
    return (
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.headerTitle}>
            <div className={styles.iconHighlight}>
              <Scale size={28} />
            </div>
            <div>
              <h2>Concorrência e Cotações</h2>
              <p>Compare as ofertas dos fornecedores</p>
            </div>
          </div>
        </header>
        <div className={styles.empty}>
          <Scale size={48} color="var(--cor-borda-cartao)" />
          <h3>Nenhuma requisição em cotação</h3>
          <p>As requisições iniciadas na Fila aparecerão aqui.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerTitle}>
          <div className={styles.iconHighlight}>
            <Scale size={28} />
          </div>
          <div>
            <h2>Concorrência e Cotações</h2>
            <p>Selecione uma requisição e preencha os orçamentos recebidos</p>
          </div>
        </div>
      </header>
      
      <div className={styles.lista}>
        {requisicoes.map((req) => {
          const isExpanded = expandido === req.id;
          
          return (
            <div key={req.id} className={`${styles.card} ${isExpanded ? styles.expanded : ''}`}>
              <div className={styles.cardHeader} onClick={() => toggleExpand(req.id)}>
                <div className={styles.cardInfo}>
                  <div className={styles.idBox}>
                    <span className={styles.label}>Requisição</span>
                    <span className={styles.value}>#{req.id.slice(-6)}</span>
                  </div>
                  <div className={styles.detalhe}>
                    <span className={styles.label}>Setor Solicitante</span>
                    <span className={styles.value}>{req.setor || 'Almoxarifado'}</span>
                  </div>
                  <div className={styles.detalhe}>
                    <span className={styles.label}>Itens</span>
                    <span className={styles.value}>{req.itens?.length || 0} produtos</span>
                  </div>
                </div>
                
                <div className={styles.cardActions}>
                  {isExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                </div>
              </div>

              {isExpanded && (
                <div className={styles.cardBody}>
                  {req.itens?.map((item) => {
                    const cotacoes = getCotacoesItem(req.id, item.codigo);
                    
                    return (
                      <div key={item.codigo} className={styles.itemSection}>
                        <div className={styles.itemHeader}>
                          <div className={styles.itemInfoMain}>
                            <span className={styles.badgeCodigo}>{item.codigo}</span>
                            <h4>{item.descricao}</h4>
                            {item.substituicao && <span className={styles.badgeSubstituto} title={item.substituicao.motivo}>SUBSTITUIU {item.substituicao.codigoOriginal}</span>}
                          </div>
                          
                          <div className={styles.itemAcoesTop}>
                            <span className={styles.qtdBadge}>{item.quantidade} un. solicitadas</span>
                            <button 
                              className={styles.btnAcaoPequeno} 
                              onClick={(e) => abrirModalSubstituicao(e, req.id, item)}
                            >
                              Substituir Peça
                            </button>
                          </div>
                        </div>

                        {/* Card Referência: Exibido APENAS quando o produto já tem entrada/compra registrada no sistema */}
                        {ultimasCompras[item.codigo] && (
                          <div className={styles.ultimaCompraCard}>
                            <div className={styles.ultimaCompraInfo}>
                              <span className={styles.ultimaCompraTag}>
                                <History size={13} />
                                Última Compra
                              </span>
                              <span>
                                <strong>
                                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(ultimasCompras[item.codigo].valorUnitario)}
                                </strong>{' '}
                                <span style={{ color: 'var(--cor-texto-secundario)' }}>
                                  ({ultimasCompras[item.codigo].fornecedorNome}
                                  {ultimasCompras[item.codigo].dataCompra ? ` • ${new Date(ultimasCompras[item.codigo].dataCompra).toLocaleDateString('pt-BR')}` : ''})
                                </span>
                              </span>
                            </div>

                            <button
                              type="button"
                              className={styles.btnUsarUltimaCompra}
                              onClick={() => reaproveitarUltimaCompra(req.id, item.codigo, ultimasCompras[item.codigo])}
                              title="Preencher este fornecedor e valor na tabela de cotação"
                            >
                              <ShoppingCart size={14} />
                              Usar Último Fornecedor
                            </button>
                          </div>
                        )}

                        <div className={styles.cotacoesArea}>
                          {cotacoes.length === 0 ? (
                            <p className={styles.semCotacao}>Nenhuma cotação lançada para este item.</p>
                          ) : (
                            <table className={styles.tabelaCotacoes}>
                              <thead>
                                <tr>
                                  <th>Fornecedor (Omie)</th>
                                  <th width="150">Preço Unitário (R$)</th>
                                  <th width="120">Entrega (Dias)</th>
                                  <th width="50"></th>
                                </tr>
                              </thead>
                              <tbody>
                                {cotacoes.map((cot, index) => (
                                  <tr key={cot.id || index}>
                                    <td style={{ minWidth: '240px' }}>
                                      <FornecedorAutocomplete 
                                        fornecedores={fornecedores}
                                        valorSelecionado={cot.fornecedorId}
                                        onChange={(novoId) => updateCotacao(req.id, item.codigo, cot.id, 'fornecedorId', novoId)}
                                        onOpenModal={() => {
                                          setContextoNovoFornecedor({ reqId: req.id, codigoItem: item.codigo, cotacaoId: cot.id });
                                          setModalFornecedorAberto(true);
                                        }}
                                      />
                                      {(cot.isUltimaCompra || (ultimasCompras[item.codigo]?.fornecedorId && String(cot.fornecedorId) === String(ultimasCompras[item.codigo]?.fornecedorId))) && (
                                        <div style={{ marginTop: '4px', fontSize: '0.75rem', color: 'var(--cor-sucesso)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600' }}>
                                          <History size={12} />
                                          <span>Fornecedor da Última Compra</span>
                                          {(cot.dataCompra || ultimasCompras[item.codigo]?.dataCompra) && (
                                            <span style={{ color: 'var(--cor-texto-secundario)', fontWeight: 'normal' }}>
                                              ({new Date(cot.dataCompra || ultimasCompras[item.codigo]?.dataCompra).toLocaleDateString('pt-BR')})
                                            </span>
                                          )}
                                        </div>
                                      )}
                                    </td>
                                    <td>
                                      <div className={styles.inputIconWrapper}>
                                        <DollarSign size={16} />
                                        <input 
                                          type="number" 
                                          placeholder="0.00" 
                                          step="0.01"
                                          value={cot.valorUnitario}
                                          onChange={(e) => updateCotacao(req.id, item.codigo, cot.id, 'valorUnitario', e.target.value)}
                                        />
                                      </div>
                                    </td>
                                    <td>
                                      <input 
                                        type="number" 
                                        placeholder="Ex: 5"
                                        value={cot.previsaoDias}
                                        onChange={(e) => updateCotacao(req.id, item.codigo, cot.id, 'previsaoDias', e.target.value)}
                                      />
                                    </td>
                                    <td>
                                      <button className={styles.btnRemover} onClick={() => removeCotacao(req.id, item.codigo, cot.id)}>
                                        <Trash2 size={16} />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                          
                          <div className={styles.acoesCotacaoGroup} style={{ display: 'flex', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
                            <button 
                              className={styles.btnAddCotacao} 
                              onClick={() => addCotacao(req.id, item.codigo)}
                            >
                              <Plus size={16} /> Adicionar Fornecedor para Participar da Concorrência
                            </button>
                            <button 
                              className={styles.btnAddCotacao}
                              style={{ 
                                backgroundColor: loadingAutoCotar[`${req.id}_${item.codigo}`] ? 'var(--cor-fundo-secundario)' : '#f59e0b', 
                                color: loadingAutoCotar[`${req.id}_${item.codigo}`] ? 'var(--cor-texto-secundario)' : '#fff', 
                                border: 'none',
                                opacity: loadingAutoCotar[`${req.id}_${item.codigo}`] ? 0.7 : 1,
                                cursor: loadingAutoCotar[`${req.id}_${item.codigo}`] ? 'wait' : 'pointer'
                              }}
                              onClick={() => autoCotar(req.id, item.codigo)}
                              disabled={Boolean(loadingAutoCotar[`${req.id}_${item.codigo}`])}
                              title="Busca compras reais anteriores na nuvem da Omie e no Almoxarifado"
                            >
                              {loadingAutoCotar[`${req.id}_${item.codigo}`] ? (
                                <>
                                  <Loader2 size={16} className={styles.spinner} style={{ animation: 'spin 1s linear infinite' }} />
                                  Buscando na Omie...
                                </>
                              ) : (
                                <>
                                  <Zap size={16} fill="currentColor" />
                                  Auto-Cotar (Omie)
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  <div className={styles.cardFooter}>
                    <button 
                      className={styles.btnFinalizar} 
                      onClick={() => salvarCotacoesFinalizar(req.id)}
                    >
                      Finalizar Cotações e Enviar para Orçamentos
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <ModalSubstituicao 
        isOpen={!!itemParaSubstituir} 
        onClose={() => setItemParaSubstituir(null)}
        itemOriginal={itemParaSubstituir}
        onConfirm={handleSubstituicao}
      />

      {/* Modal de Cadastro Rápido de Fornecedor (Mercado Livre / Balcão / CNPJ) */}
      {modalFornecedorAberto && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--cor-fundo-cartao)', padding: '24px', borderRadius: '12px', width: '700px', maxWidth: '95%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', border: '1px solid var(--cor-borda-cartao)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--cor-texto-principal)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Building size={20} color="var(--cor-destaque)" /> Novo Fornecedor (Concorrência)
              </h3>
              <button onClick={() => setModalFornecedorAberto(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cor-texto-secundario)' }}>
                <X size={24} />
              </button>
            </div>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', fontWeight: '500', color: 'var(--cor-texto-principal)' }}>Razão Social / Nome do Vendedor *</label>
              <input 
                type="text" 
                value={novoForn.razao_social} 
                onChange={e => setNovoForn({...novoForn, razao_social: e.target.value})} 
                placeholder="Ex: MERCADO LIVRE - AUTO PECAS LTDA"
                style={{ width: '100%', padding: '10px', border: '1px solid var(--cor-borda-cartao)', borderRadius: '6px', background: 'var(--cor-fundo-secundario)', color: 'var(--cor-texto-principal)', outline: 'none' }} 
              />
            </div>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', fontWeight: '500', color: 'var(--cor-texto-principal)' }}>Nome Fantasia (Opcional)</label>
              <input 
                type="text" 
                value={novoForn.nome_fantasia} 
                onChange={e => setNovoForn({...novoForn, nome_fantasia: e.target.value})} 
                placeholder="Ex: Mercado Livre"
                style={{ width: '100%', padding: '10px', border: '1px solid var(--cor-borda-cartao)', borderRadius: '6px', background: 'var(--cor-fundo-secundario)', color: 'var(--cor-texto-principal)', outline: 'none' }} 
              />
            </div>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', fontWeight: '500', color: 'var(--cor-texto-principal)' }}>CNPJ ou CPF *</label>
              <input 
                type="text" 
                value={novoForn.cnpj_cpf} 
                onChange={e => setNovoForn({...novoForn, cnpj_cpf: e.target.value})} 
                placeholder="Somente números ou com pontuação"
                style={{ width: '100%', padding: '10px', border: '1px solid var(--cor-borda-cartao)', borderRadius: '6px', background: 'var(--cor-fundo-secundario)', color: 'var(--cor-texto-principal)', outline: 'none' }} 
              />
            </div>
            
            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', fontWeight: '500', color: 'var(--cor-texto-principal)' }}>E-mail</label>
                <input type="email" value={novoForn.email} onChange={e => setNovoForn({...novoForn, email: e.target.value})} placeholder="vendas@empresa.com" style={{ width: '100%', padding: '10px', border: '1px solid var(--cor-borda-cartao)', borderRadius: '6px', background: 'var(--cor-fundo-secundario)', color: 'var(--cor-texto-principal)', outline: 'none' }} />
              </div>
              <div style={{ width: '120px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', fontWeight: '500', color: 'var(--cor-texto-principal)' }}>CEP</label>
                <input type="text" value={novoForn.cep} onChange={e => setNovoForn({...novoForn, cep: e.target.value})} placeholder="00000-000" style={{ width: '100%', padding: '10px', border: '1px solid var(--cor-borda-cartao)', borderRadius: '6px', background: 'var(--cor-fundo-secundario)', color: 'var(--cor-texto-principal)', outline: 'none' }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '25px' }}>
              <div style={{ flex: 2 }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', fontWeight: '500', color: 'var(--cor-texto-principal)' }}>Endereço</label>
                <input type="text" value={novoForn.endereco} onChange={e => setNovoForn({...novoForn, endereco: e.target.value})} placeholder="Rua / Avenida" style={{ width: '100%', padding: '10px', border: '1px solid var(--cor-borda-cartao)', borderRadius: '6px', background: 'var(--cor-fundo-secundario)', color: 'var(--cor-texto-principal)', outline: 'none' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', fontWeight: '500', color: 'var(--cor-texto-principal)' }}>Cidade</label>
                <input type="text" value={novoForn.cidade} onChange={e => setNovoForn({...novoForn, cidade: e.target.value})} placeholder="Cidade" style={{ width: '100%', padding: '10px', border: '1px solid var(--cor-borda-cartao)', borderRadius: '6px', background: 'var(--cor-fundo-secundario)', color: 'var(--cor-texto-principal)', outline: 'none' }} />
              </div>
              <div style={{ width: '60px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', fontWeight: '500', color: 'var(--cor-texto-principal)' }}>UF</label>
                <input type="text" value={novoForn.estado} onChange={e => setNovoForn({...novoForn, estado: e.target.value.toUpperCase()})} placeholder="SP" maxLength={2} style={{ width: '100%', padding: '10px', border: '1px solid var(--cor-borda-cartao)', borderRadius: '6px', background: 'var(--cor-fundo-secundario)', color: 'var(--cor-texto-principal)', outline: 'none' }} />
              </div>
            </div>
            
            <button 
              onClick={salvarNovoFornecedor}
              disabled={salvandoFornecedor || !novoForn.razao_social || !novoForn.cnpj_cpf}
              style={{ 
                width: '100%', padding: '12px', background: 'var(--cor-destaque)', color: 'var(--cor-texto-inverso)', border: 'none', 
                borderRadius: '6px', cursor: (salvandoFornecedor || !novoForn.razao_social || !novoForn.cnpj_cpf) ? 'not-allowed' : 'pointer', 
                fontWeight: 'bold', fontSize: '1rem', transition: 'background 0.2s',
                opacity: (salvandoFornecedor || !novoForn.razao_social || !novoForn.cnpj_cpf) ? 0.6 : 1
              }}
            >
              {salvandoFornecedor ? 'Salvando...' : 'Cadastrar e Usar Fornecedor'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Concorrencia;
