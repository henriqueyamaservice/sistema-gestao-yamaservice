import React, { useState, useEffect } from 'react';
import { ShoppingCart, CheckCircle2, PackageSearch, Factory, ChevronDown, ChevronRight, Archive, ExternalLink, Clock, FileCheck, ArrowRight, PackagePlus, Building2, UserCheck, Check, RefreshCw } from 'lucide-react';
import styles from './Compras.module.css';

const Compras = ({ setView }) => {
  const [requisicoes, setRequisicoes] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandido, setExpandido] = useState(null);
  const [concluindoId, setConcluindoId] = useState(null);
  const [reenviandoId, setReenviandoId] = useState(null);

  useEffect(() => {
    fetchDados();
    const timer = setInterval(() => {
      fetchDados();
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const fetchDados = async () => {
    try {
      const [resReq, resForn] = await Promise.all([
        fetch('/api/requisicoes'),
        fetch('/api/fornecedores')
      ]);
      const dataReq = await resReq.json();
      const dataForn = await resForn.json();

      // Filtrar apenas pedidos em aberto gerados
      const requisicoesFiltradas = dataReq.filter(r => r.status_compras === 'pedido_gerado');

      setRequisicoes(requisicoesFiltradas);
      setFornecedores(dataForn);
      setLoading(false);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      setLoading(false);
    }
  };

  const getNomeFornecedor = (id) => {
    const f = fornecedores.find(f => f.codigo_cliente_omie == id);
    if (!f) return 'Fornecedor Desconhecido';
    return f.nome_fantasia || f.razao_social || 'Fornecedor Sem Nome';
  };

  const handleAvancarEntradaEstoque = async (reqId) => {
    setConcluindoId(reqId);
    try {
      const response = await fetch(`/api/requisicoes/${reqId}/simular-nfe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        // Fallback: avança a etapa diretamente
        await fetch(`/api/requisicoes/${reqId}/avancar-etapa`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ novoStatus: 'concluido' })
        });
      }

      alert('Pedido enviado com sucesso para a Entrada no Estoque! O Almoxarifado já pode conferir e receber os produtos.');
      if (setView) {
        setView('entrada');
      } else {
        fetchDados();
      }
    } catch (error) {
      console.error(error);
      alert('Ocorreu um erro ao avançar para a entrada no estoque.');
    } finally {
      setConcluindoId(null);
    }
  };

  const handleReenviarOmie = async (reqId) => {
    setReenviandoId(reqId);
    try {
      const res = await fetch(`/api/requisicoes/${reqId}/reenviar-omie`, {
        method: 'POST'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Erro ao reenviar.');
      alert(data.message || 'Retentativa concluída!');
      fetchDados();
    } catch (error) {
      alert('Erro: ' + error.message);
    } finally {
      setReenviandoId(null);
    }
  };

  const toggleExpand = (id) => {
    setExpandido(expandido === id ? null : id);
  };

  if (loading) {
    return <div className={styles.loading}>Buscando pedidos sincronizados na Omie...</div>;
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerTitle}>
          <div className={styles.iconHighlight}>
            <ShoppingCart size={28} />
          </div>
          <div>
            <h2>Compras e Pedidos</h2>
            <p>Pedidos de compra oficialmente gerados na Omie</p>
          </div>
        </div>
      </header>

      {requisicoes.length === 0 ? (
        <div className={styles.empty}>
          <CheckCircle2 size={48} color="var(--cor-sucesso)" style={{ marginBottom: '16px' }} />
          <h3>Tudo limpo!</h3>
          <p>Não há nenhum novo Pedido de Compra pendente de visualização.</p>
        </div>
      ) : (
        <div className={styles.lista}>
            {requisicoes.map(req => {
              const isExpanded = expandido === req.id;

              return (
                <div key={req.id} className={`${styles.card} ${isExpanded ? styles.expanded : ''}`}>
                  <div className={styles.cardHeader} onClick={() => toggleExpand(req.id)}>
                    <div className={styles.cardInfo}>
                      <div className={styles.idBox}>
                        <span className={styles.label}>Requisição</span>
                        <span className={styles.value}>#{req.id.split('-')[0]}</span>
                      </div>
                      <div className={styles.detalhe}>
                        <span className={styles.label}>Projeto/Obra</span>
                        <span className={styles.value}>{req.projeto}</span>
                      </div>
                      <div className={styles.detalhe}>
                        <span className={styles.label}>Data da Aprovação</span>
                        <span className={styles.value}>
                          {new Date(
                            req.historico_status?.find(h => h.status === 'pedido_gerado')?.data || req.data
                          ).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                      {req.status_compras === 'aguardando_nfe' ? (
                        <span className={styles.badgeAguardandoNfe}>
                          <Clock size={14} /> Aguardando NFe...
                        </span>
                      ) : (
                        <span className={styles.badgeSincronizado}>
                          <CheckCircle2 size={14} /> Sincronizado Omie
                        </span>
                      )}
                      {isExpanded ? <ChevronDown size={20} className={styles.chevronIcon} /> : <ChevronRight size={20} className={styles.chevronIcon} />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className={styles.cardBody}>
                      <h4 className={styles.pedidosTitulo}>Pedidos Gerados para esta Requisição:</h4>

                      <div className={styles.pedidosGrid}>
                        {req.pedidos_omie && req.pedidos_omie.length > 0 ? (
                          req.pedidos_omie.map((pedido, idx) => (
                            <div key={idx} className={styles.pedidoCard}>
                              {/* Cabeçalho do Pedido */}
                              <div className={styles.pedidoHeader}>
                                <div className={styles.pedidoHeaderFornecedor}>
                                  <div className={styles.iconFactoryWrapper}>
                                    <Factory size={20} />
                                  </div>
                                  <div>
                                    <p className={styles.fornecedorSubLabel}>Fornecedor</p>
                                    <h3 className={styles.fornecedorTitulo}>{getNomeFornecedor(pedido.fornecedorId)}</h3>
                                  </div>
                                </div>

                                  <div className={styles.pedidoOmieBox}>
                                    <p className={styles.pedidoOmieLabel}>Pedido Omie</p>
                                    <div className={styles.pedidoOmieNumeroRow}>
                                      <span className={String(pedido.numeroPedido).startsWith('ERRO') ? styles.pedidoOmieErro : styles.pedidoOmieNumero}>
                                        {pedido.numeroPedido}
                                      </span>
                                      {!String(pedido.numeroPedido).startsWith('ERRO') && (
                                        <ExternalLink size={14} style={{ cursor: 'pointer', color: 'var(--cor-destaque)' }} />
                                      )}
                                    </div>
                                    {String(pedido.numeroPedido).startsWith('ERRO') && (
                                      <button 
                                        onClick={() => handleReenviarOmie(req.id)}
                                        className={styles.btnReenviarOmie}
                                        disabled={reenviandoId === req.id}
                                        style={{ opacity: reenviandoId === req.id ? 0.7 : 1, cursor: reenviandoId === req.id ? 'wait' : 'pointer' }}
                                      >
                                        <RefreshCw size={14} className={reenviandoId === req.id ? styles.spin : ''} /> 
                                        {reenviandoId === req.id ? 'Sincronizando...' : 'Sincronizar Novamente'}
                                      </button>
                                    )}
                                  </div>
                                </div>

                              {/* Lista de Itens (Substituindo a tabela) */}
                              {pedido.itens && pedido.itens.length > 0 && (
                                <div className={styles.itensListaPedido}>
                                  {pedido.itens.map((item, i) => (
                                    <div key={i} className={styles.itemPedidoCard}>
                                      <div className={styles.itemPedidoHeader}>
                                        <div>
                                          <div className={styles.itemPedidoDescricao}>{item.descricao || item.codigo_item}</div>
                                          <div className={styles.itemPedidoCodigo}>Cód: {item.codigo_item}</div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                          <div className={styles.itemPedidoTotal}>
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((item.quantidade || 0) * (item.valor_unitario || 0))}
                                          </div>
                                        </div>
                                      </div>

                                      <div className={styles.itemPedidoDetalhesLinha}>
                                        <span>Qtd: <strong>{item.quantidade}</strong></span>
                                        <span>Unit: <strong>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valor_unitario || 0)}</strong></span>
                                      </div>

                                      {item.observacao && (
                                        <div className={styles.itemObservacao}>
                                          {item.observacao}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Rodapé do Pedido (Valor Total e Vinculação) */}
                              <div className={styles.pedidoRodape}>
                                <div>
                                  {pedido.nota_fiscal_vinculada ? (
                                    <div className={styles.nfeVinculadaOk}>
                                      <FileCheck size={16} /> NF-e Vinculada: {
                                        pedido.nota_fiscal_vinculada.chaveAcesso && !pedido.nota_fiscal_vinculada.chaveAcesso.startsWith('352609')
                                          ? (pedido.nota_fiscal_vinculada.numeroNF || pedido.nota_fiscal_vinculada.chaveAcesso.substring(25, 34))
                                          : (pedido.nota_fiscal_vinculada.numeroNF || 'Vinculada')
                                      }
                                    </div>
                                  ) : (
                                    <div className={styles.nfeVinculadaPendente}>Nenhuma NF-e vinculada</div>
                                  )}
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                  <span className={styles.pedidoTotalLabel}>Total do Pedido:</span>
                                  <span className={styles.pedidoTotalValor}>
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pedido.valorTotal || 0)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className={styles.semPedidosAviso}>
                            Nenhum número de pedido retornado (Simulação).
                          </div>
                        )}
                      </div>

                      <div className={styles.cardFooterAcoes}>
                        <button
                          type="button"
                          onClick={() => handleAvancarEntradaEstoque(req.id)}
                          disabled={concluindoId === req.id}
                          className={styles.btnEntradaDireta}
                          title="Avançar este pedido para a etapa de Entrada no Estoque"
                        >
                          <PackagePlus size={18} />
                          {concluindoId === req.id ? 'Processando Entrada...' : 'Avançar para Entrada no Estoque'}
                          <ArrowRight size={16} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
    </div>
  );
};

export default Compras;
