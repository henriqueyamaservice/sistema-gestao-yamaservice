import React, { useState, useEffect } from 'react';
import { FileText, RefreshCw, CheckCircle2, ChevronDown, ChevronRight, FileCode2, Info } from 'lucide-react';
import styles from './NotasFiscais.module.css';

const NotasFiscais = () => {
  const [notas, setNotas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);
  const [expandido, setExpandido] = useState(null);

  useEffect(() => {
    fetchNotas();
  }, []);

  const fetchNotas = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/sefaz/notas');
      const data = await res.json();
      setNotas(data);
    } catch (error) {
      console.error('Erro ao buscar notas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSincronizar = async () => {
    setSincronizando(true);
    try {
      const res = await fetch('/api/sefaz/sincronizar');
      const data = await res.json();
      alert(data.message);
      setNotas(data.notas);
    } catch (error) {
      console.error(error);
      alert('Erro ao comunicar com o Robô da SEFAZ.');
    } finally {
      setSincronizando(false);
    }
  };

  const toggleExpand = (chave) => {
    setExpandido(expandido === chave ? null : chave);
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerTitle}>
          <div className={styles.iconHighlight} style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
            <FileText size={28} />
          </div>
          <div>
            <h2>Caixa de Entrada SEFAZ</h2>
            <p>Busca automática de Notas Fiscais via Manifesto (NfeDistribuicaoDFe)</p>
          </div>
        </div>
        <div>
          <button 
            onClick={handleSincronizar}
            disabled={sincronizando}
            style={{
              background: '#3b82f6', color: '#fff', border: 'none', padding: '10px 20px',
              borderRadius: '6px', fontSize: '0.95rem', fontWeight: 'bold', cursor: sincronizando ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 6px rgba(59, 130, 246, 0.2)',
              opacity: sincronizando ? 0.7 : 1
            }}
          >
            <RefreshCw size={18} className={sincronizando ? styles.spin : ''} />
            {sincronizando ? 'Sincronizando com SEFAZ...' : 'Sincronizar Agora'}
          </button>
        </div>
      </header>
      
      {loading ? (
        <div className={styles.loading}>Carregando notas locais...</div>
      ) : notas.length === 0 ? (
        <div className={styles.empty}>
          <FileCode2 size={48} color="#94a3b8" style={{ marginBottom: '16px' }} />
          <h3>Nenhuma nota encontrada no cache</h3>
          <p>Clique em Sincronizar Agora para buscar novas notas na SEFAZ.</p>
        </div>
      ) : (
        <div className={styles.lista}>
          {notas.map(nota => {
            const isExpanded = expandido === nota.chaveAcesso;
            return (
              <div key={nota.chaveAcesso} className={`${styles.card} ${isExpanded ? styles.expanded : ''}`}>
                <div className={styles.cardHeader} onClick={() => toggleExpand(nota.chaveAcesso)}>
                  <div className={styles.cardInfo}>
                    <div className={styles.idBox}>
                      <span className={styles.label}>NFe</span>
                      <span className={styles.value} style={{ color: '#3b82f6' }}>
                        {nota.chaveAcesso.substring(25, 34)}
                      </span>
                    </div>
                    <div className={styles.detalhe}>
                      <span className={styles.label}>Emissor (Fornecedor)</span>
                      <span className={styles.value}>{nota.emitente.nome}</span>
                    </div>
                    <div className={styles.detalhe}>
                      <span className={styles.label}>Data de Emissão</span>
                      <span className={styles.value}>
                        {new Date(nota.dataEmissao).toLocaleDateString()}
                      </span>
                    </div>
                    <div className={styles.detalhe}>
                      <span className={styles.label}>Valor da NFe</span>
                      <span className={styles.value} style={{ fontWeight: 'bold', color: '#10b981' }}>
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(nota.valorTotal)}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    {nota.vinculadaAoPedido ? (
                      <span style={{ 
                        background: '#dcfce7', color: '#166534', padding: '4px 8px', 
                        borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: '4px'
                      }}>
                        <CheckCircle2 size={12} /> Vinculada ao {nota.vinculadaAoPedido}
                      </span>
                    ) : (
                      <span style={{ 
                        background: '#f1f5f9', color: '#475569', padding: '4px 8px', 
                        borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold', border: '1px solid #cbd5e1'
                      }}>
                        XML Válido
                      </span>
                    )}
                    {isExpanded ? <ChevronDown size={20} color="#64748b" /> : <ChevronRight size={20} color="#64748b" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className={styles.cardBody} style={{ background: '#f8fafc' }}>
                    
                    <div style={{ background: '#e0f2fe', padding: '12px 16px', borderRadius: '6px', border: '1px solid #bae6fd', display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px' }}>
                      <Info color="#0284c7" size={24} />
                      <div>
                        <p style={{ margin: 0, color: '#0369a1', fontWeight: '600', fontSize: '0.9rem' }}>Chave de Acesso Completa</p>
                        <p style={{ margin: 0, color: '#0c4a6e', fontSize: '0.85rem', fontFamily: 'monospace', letterSpacing: '2px' }}>{nota.chaveAcesso}</p>
                      </div>
                    </div>

                    <h4 style={{ margin: '0 0 16px 0', color: '#334155' }}>Itens da Nota Fiscal:</h4>
                    
                    <div style={{ width: '100%', overflowX: 'auto', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr>
                            <th style={{ textAlign: 'left', padding: '12px', borderBottom: '2px solid #e2e8f0', color: '#64748b', fontSize: '0.85rem', background: '#f1f5f9' }}>Produto</th>
                            <th style={{ textAlign: 'center', padding: '12px', borderBottom: '2px solid #e2e8f0', color: '#64748b', fontSize: '0.85rem', background: '#f1f5f9' }}>Qtd</th>
                            <th style={{ textAlign: 'right', padding: '12px', borderBottom: '2px solid #e2e8f0', color: '#64748b', fontSize: '0.85rem', background: '#f1f5f9' }}>Valor Unit.</th>
                            <th style={{ textAlign: 'right', padding: '12px', borderBottom: '2px solid #e2e8f0', color: '#64748b', fontSize: '0.85rem', background: '#f1f5f9' }}>Total Item</th>
                          </tr>
                        </thead>
                        <tbody>
                          {nota.itens.map((item, i) => (
                            <tr key={i}>
                              <td style={{ padding: '12px', borderBottom: '1px solid #f1f5f9', fontSize: '0.9rem', color: '#334155' }}>
                                <div style={{ fontWeight: '600' }}>{item.descricao}</div>
                                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Cód: {item.codigo}</div>
                              </td>
                              <td style={{ padding: '12px', borderBottom: '1px solid #f1f5f9', textAlign: 'center', fontSize: '0.9rem', color: '#334155' }}>
                                {item.quantidade}
                              </td>
                              <td style={{ padding: '12px', borderBottom: '1px solid #f1f5f9', textAlign: 'right', fontSize: '0.9rem', color: '#334155' }}>
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valorUnitario)}
                              </td>
                              <td style={{ padding: '12px', borderBottom: '1px solid #f1f5f9', textAlign: 'right', fontSize: '0.9rem', fontWeight: '600', color: '#0f172a' }}>
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valorTotal)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                      {nota.vinculadaAoPedido ? (
                        <div style={{ background: '#ecfdf5', color: '#059669', padding: '12px 16px', borderRadius: '6px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid #a7f3d0' }}>
                          <CheckCircle2 size={20} />
                          Nota pareada automaticamente com o {nota.vinculadaAoPedido}
                        </div>
                      ) : (
                        <button style={{
                          background: '#10b981', color: '#fff', border: 'none', padding: '10px 20px',
                          borderRadius: '6px', fontSize: '0.95rem', fontWeight: '600', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: '8px'
                        }}>
                          <CheckCircle2 size={18} />
                          Vincular Manualmente
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

export default NotasFiscais;
