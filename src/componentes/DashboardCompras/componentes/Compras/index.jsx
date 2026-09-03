import React, { useState, useEffect } from 'react';
import { ShoppingCart, CheckCircle2, PackageSearch, Factory, ChevronDown, ChevronRight, Archive, ExternalLink, Clock, FileCheck } from 'lucide-react';
import styles from './Compras.module.css';

const Compras = () => {
  const [requisicoes, setRequisicoes] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandido, setExpandido] = useState(null);
  const [concluindoId, setConcluindoId] = useState(null);

  useEffect(() => {
    fetchDados();
  }, []);

  const fetchDados = async () => {
    try {
      const [resReq, resForn] = await Promise.all([
        fetch('/api/requisicoes'),
        fetch('/api/fornecedores')
      ]);
      const dataReq = await resReq.json();
      const dataForn = await resForn.json();

      // Filtrar requisições (Apenas os gerados, que ainda precisam ser fechados)
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

  const handleAguardarNfe = async (reqId) => {
    setConcluindoId(reqId);
    try {
      const response = await fetch(`/api/requisicoes/${reqId}/avancar-etapa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ novoStatus: 'aguardando_nfe' })
      });

      if (!response.ok) throw new Error('Erro ao avançar requisição');

      fetchDados(); // Atualiza a tela
    } catch (error) {
      console.error(error);
      alert('Ocorreu um erro ao atualizar a requisição.');
    } finally {
      setConcluindoId(null);
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
          <CheckCircle2 size={48} color="#10b981" style={{ marginBottom: '16px' }} />
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
                      <span style={{
                        background: '#fef3c7', color: '#b45309', padding: '6px 12px',
                        borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px'
                      }}>
                        <Clock size={14} /> Aguardando NFe...
                      </span>
                    ) : (
                      <span style={{
                        background: '#dcfce7', color: '#166534', padding: '6px 12px',
                        borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px'
                      }}>
                        <CheckCircle2 size={14} /> Sincronizado Omie
                      </span>
                    )}
                    {isExpanded ? <ChevronDown size={20} color="#64748b" /> : <ChevronRight size={20} color="#64748b" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className={styles.cardBody} style={{ background: '#f8fafc' }}>
                    <h4 style={{ margin: '0 0 16px 0', color: '#334155' }}>Pedidos Gerados para esta Requisição:</h4>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {req.pedidos_omie && req.pedidos_omie.length > 0 ? (
                        req.pedidos_omie.map((pedido, idx) => (
                          <div key={idx} style={{
                            background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px',
                            padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                          }}>
                            {/* Cabeçalho do Pedido */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ background: '#f1f5f9', padding: '8px', borderRadius: '8px' }}>
                                  <Factory size={20} color="#64748b" />
                                </div>
                                <div>
                                  <p style={{ margin: '0 0 2px 0', fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Fornecedor</p>
                                  <h3 style={{ margin: 0, fontSize: '0.95rem', color: '#0f172a' }}>{getNomeFornecedor(pedido.fornecedorId)}</h3>
                                </div>
                              </div>

                              <div style={{ textAlign: 'right' }}>
                                <p style={{ margin: '0 0 2px 0', fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Pedido Omie</p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
                                  <span style={{ fontSize: '1.05rem', fontWeight: 'bold', color: '#0ea5e9' }}>{pedido.numeroPedido}</span>
                                  <ExternalLink size={14} color="#0ea5e9" style={{ cursor: 'pointer' }} />
                                </div>
                              </div>
                            </div>

                            {/* Lista de Itens (Substituindo a tabela) */}
                            {pedido.itens && pedido.itens.length > 0 && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                                {pedido.itens.map((item, i) => (
                                  <div key={i} style={{ background: '#f8fafc', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                      <div>
                                        <div style={{ fontWeight: 'bold', color: '#0f172a', fontSize: '0.9rem' }}>{item.descricao || item.codigo_item}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Cód: {item.codigo_item}</div>
                                      </div>
                                      <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#10b981' }}>
                                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((item.quantidade || 0) * (item.valor_unitario || 0))}
                                        </div>
                                      </div>
                                    </div>
                                    
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: '#475569', background: '#fff', padding: '6px', borderRadius: '4px', border: '1px dashed #cbd5e1' }}>
                                      <span>Qtd: <strong>{item.quantidade}</strong></span>
                                      <span>Unit: <strong>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valor_unitario || 0)}</strong></span>
                                    </div>
                                    
                                    {item.observacao && (
                                      <div style={{ fontSize: '0.8rem', color: '#059669', background: '#d1fae5', padding: '6px 8px', borderRadius: '4px', borderLeft: '3px solid #10b981', fontWeight: '500' }}>
                                        {item.observacao}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Rodapé do Pedido (Valor Total e Vinculação) */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '12px', borderRadius: '8px' }}>
                              <div>
                                {pedido.nota_fiscal_vinculada ? (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981', fontWeight: 'bold', fontSize: '0.8rem' }}>
                                    <FileCheck size={16} /> NF-e Vinculada: {pedido.nota_fiscal_vinculada.chaveAcesso.substring(25, 34)}
                                  </div>
                                ) : (
                                  <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Nenhuma NF-e vinculada</div>
                                )}
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <span style={{ color: '#64748b', fontSize: '0.8rem', marginRight: '12px' }}>Total do Pedido:</span>
                                <span style={{ fontSize: '1.15rem', fontWeight: 'bold', color: '#10b981' }}>
                                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pedido.valorTotal || 0)}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', textAlign: 'center', color: '#64748b', border: '1px solid #e2e8f0' }}>
                          Nenhum número de pedido retornado (Simulação).
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #e2e8f0' }}>
                      {req.status_compras === 'aguardando_nfe' ? (
                        <div style={{ color: '#64748b', fontSize: '0.9rem', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Clock size={16} /> O Robô da SEFAZ tentará parear a nota automaticamente.
                        </div>
                      ) : (
                        <button
                          onClick={() => handleAguardarNfe(req.id)}
                          disabled={concluindoId === req.id}
                          style={{
                            background: '#10b981', color: '#fff', border: 'none', padding: '10px 20px',
                            borderRadius: '6px', fontSize: '0.95rem', fontWeight: '600', cursor: concluindoId === req.id ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s', boxShadow: '0 4px 6px rgba(16, 185, 129, 0.2)'
                          }}
                        >
                          <CheckCircle2 size={18} />
                          {concluindoId === req.id ? 'Atualizando...' : 'Confirmar Compra (Aguardar NF-e)'}
                        </button>
                      )}
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
