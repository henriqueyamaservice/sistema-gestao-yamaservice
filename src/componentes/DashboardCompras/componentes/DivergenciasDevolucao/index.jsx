import React, { useState, useEffect } from 'react';
import { AlertTriangle, ChevronDown, ChevronRight, CheckCircle2, PackageX, FileWarning, RefreshCcw } from 'lucide-react';
import styles from './DivergenciasDevolucao.module.css';

const DivergenciasDevolucao = ({ setView }) => {
  const [requisicoes, setRequisicoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandido, setExpandido] = useState(null);
  const [resolvendo, setResolvendo] = useState(false);
  const [resolucaoDados, setResolucaoDados] = useState({ acao: 'exigir_restante', notaDevolucao: '', observacaoResolucao: '' });

  useEffect(() => {
    fetchDivergencias();
  }, []);

  const fetchDivergencias = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/requisicoes');
      const data = await res.json();
      
      // Filtra apenas requisições que tiveram entrega parcial
      const divergencias = data.filter(r => r.status_compras === 'entregue_parcial' && r.divergencia);
      setRequisicoes(divergencias);
    } catch (error) {
      console.error('Erro ao buscar divergências:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResolver = async (req) => {
    if (resolucaoDados.acao === 'cancelar_pendencia' && !resolucaoDados.notaDevolucao) {
      alert('Para gerar devolução, informe o número da Nota de Devolução / Protocolo do Fornecedor.');
      return;
    }

    setResolvendo(true);
    try {
      const res = await fetch(`/api/requisicoes/${req.id}/resolver-divergencia`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resolucaoDados)
      });
      if (!res.ok) throw new Error('Falha ao resolver divergência');
      
      alert('Divergência tratada com sucesso!');
      setExpandido(null);
      fetchDivergencias(); // Recarrega a lista
    } catch (error) {
      alert('Erro ao resolver: ' + error.message);
    } finally {
      setResolvendo(false);
    }
  };

  if (loading) return <div style={{ padding: '24px' }}>Buscando divergências no recebimento...</div>;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerTitle}>
          <div className={styles.iconHighlight} style={{ background: '#fef2f2', color: '#ef4444' }}>
            <FileWarning size={28} />
          </div>
          <div>
            <h2>Central de Divergências e Devoluções</h2>
            <p>Tratamento de faltas ou problemas reportados pelo Almoxarifado</p>
          </div>
        </div>
      </header>

      {requisicoes.length === 0 ? (
        <div className={styles.empty}>
          <CheckCircle2 size={48} color="#10b981" style={{ marginBottom: '16px' }} />
          <h3>Nenhuma divergência pendente!</h3>
          <p>O Almoxarifado não relatou faltas em recebimentos recentes.</p>
        </div>
      ) : (
        <div className={styles.lista}>
          {requisicoes.map(req => {
            const isExpanded = expandido === req.id;
            const divergencia = req.divergencia || {};
            const nota = req.pedidos_omie?.find(p => p.nota_fiscal_vinculada)?.nota_fiscal_vinculada;
            
            // Calcula itens que vieram faltando
            const itensAvaliados = (nota?.itens || []).map(item => {
              const codigoMapeado = req.mapeamento_nfe?.[item.codigo];
              if (!codigoMapeado || codigoMapeado === 'ignorar') return null;
              
              let qtdEsperada = item.quantidade;
              let qtdRecebida = 0;
              
              if (divergencia.itensRecebidos) {
                 qtdRecebida = divergencia.itensRecebidos[codigoMapeado] || 0;
              }
              
              return {
                codigo: item.codigo,
                descricao: item.descricao,
                esperado: qtdEsperada,
                recebido: qtdRecebida,
                falta: qtdEsperada - qtdRecebida
              };
            }).filter(i => i && i.falta > 0);

            return (
              <div key={req.id} className={`${styles.card} ${isExpanded ? styles.expanded : ''}`}>
                <div className={styles.cardHeader} onClick={() => setExpandido(isExpanded ? null : req.id)}>
                  <div className={styles.cardInfo}>
                    <div className={styles.idBox}>
                      <span className={styles.label}>NF-e com Falta</span>
                      <span className={styles.value}>{nota?.chaveAcesso?.substring(25, 34) || 'S/N'}</span>
                    </div>
                    <div className={styles.detalhe}>
                      <span className={styles.label}>Data do Recebimento</span>
                      <span className={styles.value}>{new Date(divergencia.dataRegistro).toLocaleDateString()}</span>
                    </div>
                    <div className={styles.detalhe}>
                      <span className={styles.label}>Fornecedor</span>
                      <span className={styles.value}>{nota?.emitente?.nome || 'Desconhecido'}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <span style={{ 
                      background: '#fef2f2', color: '#ef4444', padding: '6px 12px', 
                      borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px'
                    }}>
                      <AlertTriangle size={14} /> Requer Atenção
                    </span>
                    {isExpanded ? <ChevronDown size={20} color="#64748b" /> : <ChevronRight size={20} color="#64748b" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className={styles.cardBody}>
                    <div style={{ padding: '24px', display: 'flex', gap: '24px' }}>
                      
                      <div style={{ flex: 1 }}>
                        <h4 style={{ color: '#334155', marginTop: 0, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <PackageX size={18} color="#ef4444" /> Itens Faltantes:
                        </h4>
                        
                        <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                          <thead style={{ background: '#f8fafc' }}>
                            <tr>
                              <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '0.85rem', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>Produto</th>
                              <th style={{ padding: '10px 16px', textAlign: 'center', fontSize: '0.85rem', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>Esperado</th>
                              <th style={{ padding: '10px 16px', textAlign: 'center', fontSize: '0.85rem', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>Recebido</th>
                              <th style={{ padding: '10px 16px', textAlign: 'center', fontSize: '0.85rem', color: '#ef4444', borderBottom: '1px solid #e2e8f0' }}>Faltou</th>
                            </tr>
                          </thead>
                          <tbody>
                            {itensAvaliados.map(item => (
                              <tr key={item.codigo}>
                                <td style={{ padding: '12px 16px', fontSize: '0.9rem', color: '#334155', borderBottom: '1px solid #f1f5f9' }}>{item.descricao}</td>
                                <td style={{ padding: '12px 16px', fontSize: '0.9rem', textAlign: 'center', color: '#64748b', borderBottom: '1px solid #f1f5f9' }}>{item.esperado}</td>
                                <td style={{ padding: '12px 16px', fontSize: '0.9rem', textAlign: 'center', color: '#64748b', borderBottom: '1px solid #f1f5f9' }}>{item.recebido}</td>
                                <td style={{ padding: '12px 16px', fontSize: '0.9rem', textAlign: 'center', color: '#ef4444', fontWeight: 'bold', borderBottom: '1px solid #f1f5f9' }}>{item.falta}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>

                        <div style={{ marginTop: '24px', background: '#fff7ed', padding: '16px', borderRadius: '8px', border: '1px solid #ffedd5' }}>
                          <strong style={{ color: '#ea580c', display: 'block', marginBottom: '4px', fontSize: '0.85rem' }}>Observação do Almoxarife:</strong>
                          <p style={{ margin: 0, color: '#9a3412', fontStyle: 'italic' }}>"{divergencia.observacao}"</p>
                        </div>
                      </div>

                      <div style={{ width: '400px' }} className={styles.resolucaoPanel}>
                        <h4 style={{ color: '#334155', marginTop: 0, marginBottom: '16px' }}>Decisão de Compras</h4>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', color: '#64748b', marginBottom: '6px' }}>Ação a ser tomada:</label>
                            <select 
                              value={resolucaoDados.acao}
                              onChange={e => setResolucaoDados({...resolucaoDados, acao: e.target.value})}
                              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }}
                            >
                              <option value="exigir_restante">Aguardar fornecedor enviar o restante</option>
                              <option value="cancelar_pendencia">Gerar Devolução / Solicitar Reembolso</option>
                            </select>
                          </div>

                          {resolucaoDados.acao === 'cancelar_pendencia' && (
                            <div>
                              <label style={{ display: 'block', fontSize: '0.85rem', color: '#64748b', marginBottom: '6px' }}>Nº Nota de Devolução (Opcional):</label>
                              <input 
                                type="text"
                                placeholder="Ex: NF-e 12345"
                                value={resolucaoDados.notaDevolucao}
                                onChange={e => setResolucaoDados({...resolucaoDados, notaDevolucao: e.target.value})}
                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }}
                              />
                            </div>
                          )}

                          <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', color: '#64748b', marginBottom: '6px' }}>Observações Internas (Compras):</label>
                            <textarea 
                              rows="3"
                              placeholder="O que foi acordado com o fornecedor..."
                              value={resolucaoDados.observacaoResolucao}
                              onChange={e => setResolucaoDados({...resolucaoDados, observacaoResolucao: e.target.value})}
                              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', resize: 'vertical' }}
                            ></textarea>
                          </div>

                          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                            <button 
                              className={`${styles.btn} ${styles.btnSecondary}`} 
                              style={{ flex: 1 }}
                              onClick={() => setExpandido(null)}
                            >
                              Voltar
                            </button>
                            <button 
                              className={`${styles.btn} ${styles.btnPrimary}`} 
                              style={{ flex: 2 }}
                              onClick={() => handleResolver(req)}
                              disabled={resolvendo}
                            >
                              {resolvendo ? 'Salvando...' : 'Confirmar Resolução'}
                            </button>
                          </div>
                        </div>

                      </div>
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

export default DivergenciasDevolucao;
