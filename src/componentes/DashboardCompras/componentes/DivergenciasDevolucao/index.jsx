import React, { useState, useEffect } from 'react';
import { AlertTriangle, ChevronDown, ChevronRight, CheckCircle2, PackageX, FileWarning, RefreshCcw, DollarSign, FileText, Truck, Info } from 'lucide-react';
import styles from './DivergenciasDevolucao.module.css';

const DivergenciasDevolucao = ({ setView }) => {
  const [requisicoes, setRequisicoes] = useState([]);
  const [abaAtiva, setAbaAtiva] = useState('pendentes'); // 'pendentes' | 'resolvidas'
  const [loading, setLoading] = useState(true);
  const [expandido, setExpandido] = useState(null);
  const [resolvendo, setResolvendo] = useState(false);
  const [resolucaoDados, setResolucaoDados] = useState({ 
    acao: 'abatimento_boleto', 
    valorAbatimento: '', 
    notaDevolucao: '', 
    observacaoResolucao: '' 
  });

  useEffect(() => {
    fetchDivergencias(true);
    const interval = setInterval(() => fetchDivergencias(false), 4000);
    return () => clearInterval(interval);
  }, []);

  const fetchDivergencias = async (mostrarLoading = false) => {
    try {
      if (mostrarLoading) setLoading(true);
      const res = await fetch('/api/requisicoes');
      const data = await res.json();
      
      // Armazena requisições que tiveram divergência registrada
      const divergencias = Array.isArray(data) ? data.filter(r => Boolean(r.divergencia)) : [];
      setRequisicoes(divergencias);
    } catch (error) {
      console.error('Erro ao buscar divergências:', error);
    } finally {
      if (mostrarLoading) setLoading(false);
    }
  };

  const handleToggleExpandir = (req) => {
    if (expandido === req.id) {
      setExpandido(null);
    } else {
      setExpandido(req.id);
      const div = req.divergencia || {};
      const nota = req.pedidos_omie?.find(p => p.nota_fiscal_vinculada)?.nota_fiscal_vinculada || req.nota_fiscal_vinculada;
      
      if (div.status === 'resolvido' && div.resolucao) {
        setResolucaoDados({
          acao: div.resolucao.acao || 'abatimento_boleto',
          valorAbatimento: div.resolucao.valorAbatimento ? String(div.resolucao.valorAbatimento) : '',
          notaDevolucao: div.resolucao.notaDevolucao || '',
          observacaoResolucao: div.resolucao.observacaoResolucao || ''
        });
        return;
      }

      let valorSugerido = Number(div.valorDivergencia || 0);
      if (valorSugerido <= 0) {
        const itens = div.itensFaltantes || [];
        valorSugerido = itens.reduce((acc, it) => {
          let vUnit = Number(it.valorUnitario || 0);
          if (vUnit <= 0) {
            const itemNota = (nota?.itens || req.itens || []).find(ni => 
              String(ni.codigo) === String(it.codigo) || 
              String(ni.codigo_item) === String(it.codigo) ||
              String(ni.descricao).toLowerCase() === String(it.descricao).toLowerCase()
            );
            vUnit = Number(itemNota?.valorUnitario || itemNota?.valor_unitario || 0);
            if (vUnit <= 0 && (nota?.valorTotal || req.valor) && it.esperado) {
              vUnit = Number(((nota?.valorTotal || req.valor) / it.esperado).toFixed(2));
            }
          }
          const falta = Number(it.falta || (it.esperado - it.recebido) || 0);
          return acc + (it.valorFalta && it.valorFalta > 0 ? Number(it.valorFalta) : (falta * vUnit));
        }, 0);
      }

      setResolucaoDados({
        acao: 'abatimento_boleto',
        valorAbatimento: valorSugerido > 0 ? valorSugerido.toFixed(2) : '',
        notaDevolucao: '',
        observacaoResolucao: ''
      });
    }
  };

  const handleResolver = async (req) => {
    if (resolucaoDados.acao === 'nota_devolucao' && !resolucaoDados.notaDevolucao) {
      alert('Para gerar devolução fiscal, informe o número da Nota de Devolução emitida.');
      return;
    }
    if (resolucaoDados.acao === 'abatimento_boleto' && (!resolucaoDados.valorAbatimento || Number(resolucaoDados.valorAbatimento) <= 0)) {
      alert('Informe o valor do desconto negociado a ser abatido no boleto/contas a pagar.');
      return;
    }

    setResolvendo(true);
    try {
      const res = await fetch(`/api/requisicoes/${req.id}/resolver-divergencia`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          acao: resolucaoDados.acao,
          notaDevolucao: resolucaoDados.notaDevolucao,
          valorAbatimento: Number(resolucaoDados.valorAbatimento || 0),
          observacaoResolucao: resolucaoDados.observacaoResolucao
        })
      });
      if (!res.ok) throw new Error('Falha ao resolver divergência');
      
      alert('Divergência tratada com sucesso! O Fiscal e o Almoxarifado foram sincronizados.');
      setExpandido(null);
      setAbaAtiva('resolvidas');
      fetchDivergencias(); // Recarrega a lista
    } catch (error) {
      alert('Erro ao resolver: ' + error.message);
    } finally {
      setResolvendo(false);
    }
  };

  const pendentesList = requisicoes.filter(r => 
    r.divergencia?.status === 'pendente_compras' || 
    r.divergencia?.status === 'aguardando_entrega' || 
    (!r.divergencia?.status && r.status_compras === 'entregue_parcial')
  );

  const resolvidasList = requisicoes.filter(r => 
    r.divergencia?.status === 'resolvido'
  );

  const listaExibicao = abaAtiva === 'pendentes' ? pendentesList : resolvidasList;

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

      {/* Abas: Pendentes vs Resolvidas */}
      <div className={styles.tabsContainer}>
        <button
          className={`${styles.tabBtn} ${abaAtiva === 'pendentes' ? styles.tabBtnAtivo : ''}`}
          onClick={() => { setAbaAtiva('pendentes'); setExpandido(null); }}
        >
          <AlertTriangle size={16} /> Pendentes
          {pendentesList.length > 0 && (
            <span className={styles.badgeContador}>{pendentesList.length}</span>
          )}
        </button>

        <button
          className={`${styles.tabBtn} ${abaAtiva === 'resolvidas' ? styles.tabBtnAtivo : ''}`}
          onClick={() => { setAbaAtiva('resolvidas'); setExpandido(null); }}
        >
          <CheckCircle2 size={16} /> Histórico / Resolvidas
          {resolvidasList.length > 0 && (
            <span className={styles.badgeContador}>{resolvidasList.length}</span>
          )}
        </button>
      </div>

      {listaExibicao.length === 0 ? (
        <div className={styles.empty}>
          <CheckCircle2 size={48} color="#10b981" style={{ marginBottom: '16px' }} />
          <h3>{abaAtiva === 'pendentes' ? 'Nenhuma divergência pendente!' : 'Nenhuma divergência no histórico.'}</h3>
          <p>{abaAtiva === 'pendentes' ? 'O Almoxarifado não relatou faltas em recebimentos recentes.' : 'Quando Compras tratar uma divergência, ela aparecerá arquivada aqui.'}</p>
        </div>
      ) : (
        <div className={styles.lista}>
          {listaExibicao.map(req => {
            const isExpanded = expandido === req.id;
            const divergencia = req.divergencia || {};
            const nota = req.pedidos_omie?.find(p => p.nota_fiscal_vinculada)?.nota_fiscal_vinculada || req.nota_fiscal_vinculada;
            
            // Calcula itens que vieram faltando (utiliza itensFaltantes do divergenciasService se disponível)
            const itensAvaliados = (divergencia.itensFaltantes && divergencia.itensFaltantes.length > 0)
              ? divergencia.itensFaltantes.map(it => {
                  let vUnit = Number(it.valorUnitario || 0);
                  if (vUnit <= 0) {
                    const itemNota = (nota?.itens || req.itens || []).find(ni => 
                      String(ni.codigo) === String(it.codigo) || 
                      String(ni.codigo_item) === String(it.codigo) ||
                      String(ni.codigo) === String(it.codigoNfeOriginal) ||
                      String(ni.descricao).toLowerCase() === String(it.descricao).toLowerCase()
                    );
                    vUnit = Number(itemNota?.valorUnitario || itemNota?.valor_unitario || 0);
                    if (vUnit <= 0 && (nota?.valorTotal || req.valor) && it.esperado) {
                      vUnit = Number(((nota?.valorTotal || req.valor) / it.esperado).toFixed(2));
                    }
                  }
                  const faltaCalc = Number(it.falta || (it.esperado - it.recebido) || 0);
                  const valorFaltaCalc = (it.valorFalta && it.valorFalta > 0) ? it.valorFalta : (faltaCalc * vUnit);
                  return {
                    ...it,
                    valorUnitario: vUnit,
                    valorFalta: Number(valorFaltaCalc.toFixed(2))
                  };
                })
              : (nota?.itens || req.itens || []).map(item => {
                  const codigoMapeado = req.mapeamento_nfe?.[item.codigo];
                  if (!codigoMapeado || codigoMapeado === 'ignorar') return null;
                  
                  let qtdEsperada = item.quantidade;
                  let qtdRecebida = 0;
                  
                  if (divergencia.itensRecebidos) {
                     qtdRecebida = divergencia.itensRecebidos[codigoMapeado] || 0;
                  }
                  
                  const valorUnit = Number(item.valor_unitario || item.valorUnitario || 0);
                  const falta = qtdEsperada - qtdRecebida;
                  return {
                    codigo: item.codigo,
                    descricao: item.descricao,
                    esperado: qtdEsperada,
                    recebido: qtdRecebida,
                    falta: falta,
                    valorUnitario: valorUnit,
                    valorFalta: falta * valorUnit
                  };
                }).filter(i => i && i.falta > 0);

            const valorFaltaTotal = (divergencia.valorDivergencia && divergencia.valorDivergencia > 0)
              ? divergencia.valorDivergencia 
              : itensAvaliados.reduce((acc, curr) => acc + (curr.valorFalta || 0), 0);

            const numeroNFExibicao = nota?.numeroNF || req.nota_fiscal || req.numeroNF || divergencia.numeroNF || req.recebimentoFisico?.numeroNF || (nota?.chaveAcesso && nota.chaveAcesso.length === 44 ? String(parseInt(nota.chaveAcesso.substring(25, 34), 10)) : null) || 'S/N';
            const fornecedorExibicao = nota?.emitente?.nome || req.fornecedor || req.solicitante || 'Fornecedor';

            return (
              <div key={req.id} className={`${styles.card} ${isExpanded ? styles.expanded : ''}`}>
                <div className={styles.cardHeader} onClick={() => handleToggleExpandir(req)}>
                  <div className={styles.cardInfo}>
                    <div className={styles.idBox}>
                      <span className={styles.label}>NF-e com Falta</span>
                      <span className={styles.value}>NF-e {numeroNFExibicao}</span>
                    </div>
                    <div className={styles.detalhe}>
                      <span className={styles.label}>Data do Recebimento</span>
                      <span className={styles.value}>{new Date(divergencia.dataRegistro).toLocaleDateString()}</span>
                    </div>
                    <div className={styles.detalhe}>
                      <span className={styles.label}>Fornecedor</span>
                      <span className={styles.value}>{fornecedorExibicao}</span>
                    </div>
                    {valorFaltaTotal > 0 && (
                      <div className={styles.detalhe}>
                        <span className={styles.label}>Valor em Falta</span>
                        <span className={styles.value} style={{ color: '#ef4444', fontWeight: 'bold' }}>
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorFaltaTotal)}
                        </span>
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    {divergencia.status === 'resolvido' ? (
                      <span style={{ 
                        background: '#f0fdf4', color: '#16a34a', padding: '6px 12px', 
                        borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px'
                      }}>
                        <CheckCircle2 size={14} /> Resolvido
                      </span>
                    ) : divergencia.status === 'aguardando_entrega' ? (
                      <span style={{ 
                        background: '#eff6ff', color: '#3b82f6', padding: '6px 12px', 
                        borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px'
                      }}>
                        <RefreshCcw size={14} /> Aguardando Restante
                      </span>
                    ) : (
                      <span style={{ 
                        background: '#fef2f2', color: '#ef4444', padding: '6px 12px', 
                        borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px'
                      }}>
                        <AlertTriangle size={14} /> Requer Atenção
                      </span>
                    )}
                    {isExpanded ? <ChevronDown size={20} color="#64748b" /> : <ChevronRight size={20} color="#64748b" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className={styles.cardBody}>
                    <div style={{ padding: '24px', display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                      
                      <div style={{ flex: 1, minWidth: '320px' }}>
                        <h4 style={{ color: '#334155', marginTop: 0, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <PackageX size={18} color="#ef4444" /> Itens Faltantes:
                        </h4>
                        
                        <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                          <thead style={{ background: '#f8fafc' }}>
                            <tr>
                              <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: '0.85rem', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>Produto</th>
                              <th style={{ padding: '10px 14px', textAlign: 'center', fontSize: '0.85rem', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>Esperado</th>
                              <th style={{ padding: '10px 14px', textAlign: 'center', fontSize: '0.85rem', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>Recebido</th>
                              <th style={{ padding: '10px 14px', textAlign: 'center', fontSize: '0.85rem', color: '#ef4444', borderBottom: '1px solid #e2e8f0' }}>Faltou</th>
                              <th style={{ padding: '10px 14px', textAlign: 'right', fontSize: '0.85rem', color: '#ef4444', borderBottom: '1px solid #e2e8f0' }}>Total Falta</th>
                            </tr>
                          </thead>
                          <tbody>
                            {itensAvaliados.map(item => (
                              <tr key={item.codigo}>
                                <td style={{ padding: '12px 14px', fontSize: '0.88rem', color: '#334155', borderBottom: '1px solid #f1f5f9' }}>{item.descricao}</td>
                                <td style={{ padding: '12px 14px', fontSize: '0.88rem', textAlign: 'center', color: '#64748b', borderBottom: '1px solid #f1f5f9' }}>{item.esperado}</td>
                                <td style={{ padding: '12px 14px', fontSize: '0.88rem', textAlign: 'center', color: '#64748b', borderBottom: '1px solid #f1f5f9' }}>{item.recebido}</td>
                                <td style={{ padding: '12px 14px', fontSize: '0.88rem', textAlign: 'center', color: '#ef4444', fontWeight: 'bold', borderBottom: '1px solid #f1f5f9' }}>{item.falta}</td>
                                <td style={{ padding: '12px 14px', fontSize: '0.88rem', textAlign: 'right', color: '#ef4444', fontWeight: 'bold', borderBottom: '1px solid #f1f5f9' }}>
                                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valorFalta || 0)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>

                        <div style={{ marginTop: '20px', background: '#fff7ed', padding: '16px', borderRadius: '8px', border: '1px solid #ffedd5' }}>
                          <strong style={{ color: '#ea580c', display: 'block', marginBottom: '4px', fontSize: '0.85rem' }}>Observação do Almoxarife:</strong>
                          <p style={{ margin: 0, color: '#9a3412', fontStyle: 'italic' }}>"{divergencia.observacao}"</p>
                        </div>
                      </div>

                      <div style={{ width: '380px' }} className={styles.resolucaoPanel}>
                        {divergencia.status === 'resolvido' ? (
                          <div style={{ background: '#f0fdf4', padding: '20px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                            <h4 style={{ color: '#166534', margin: '0 0 14px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <CheckCircle2 size={20} color="#16a34a" /> Acordo Concluído no Compras
                            </h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.88rem' }}>
                              <div>
                                <span style={{ color: '#64748b', display: 'block', fontSize: '0.8rem' }}>Ação Tomada</span>
                                <strong>
                                  {divergencia.resolucao?.acao === 'abatimento_boleto' && (
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                      <DollarSign size={16} color="#16a34a" /> Abatimento no Boleto (Desconto no Financeiro)
                                    </span>
                                  )}
                                  {divergencia.resolucao?.acao === 'nota_devolucao' && (
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                      <FileText size={16} color="#3b82f6" /> Gerar Nota de Devolução (Estorno Fiscal)
                                    </span>
                                  )}
                                  {divergencia.resolucao?.acao === 'aguardar_entrega' && (
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                      <Truck size={16} color="#f59e0b" /> Aguardar Fornecedor Enviar o Restante
                                    </span>
                                  )}
                                </strong>
                              </div>
                              {divergencia.resolucao?.acao === 'abatimento_boleto' && (
                                <div>
                                  <span style={{ color: '#64748b', display: 'block', fontSize: '0.8rem' }}>Valor do Desconto</span>
                                  <span style={{ color: '#16a34a', fontWeight: 'bold', fontSize: '1.05rem' }}>
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(divergencia.resolucao?.valorAbatimento || 0)}
                                  </span>
                                </div>
                              )}
                              {divergencia.resolucao?.acao === 'nota_devolucao' && (
                                <div>
                                  <span style={{ color: '#64748b', display: 'block', fontSize: '0.8rem' }}>Nº Nota Fiscal Devolução</span>
                                  <strong>{divergencia.resolucao?.notaDevolucao}</strong>
                                </div>
                              )}
                              {divergencia.resolucao?.observacaoResolucao && (
                                <div style={{ marginTop: '4px' }}>
                                  <span style={{ color: '#64748b', display: 'block', fontSize: '0.8rem' }}>Observações do Comprador</span>
                                  <p style={{ margin: '4px 0 0 0', fontStyle: 'italic', color: '#334155' }}>
                                    "{divergencia.resolucao.observacaoResolucao}"
                                  </p>
                                </div>
                              )}
                              <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '8px', borderTop: '1px solid #dcfce7', paddingTop: '8px' }}>
                                <strong>Data:</strong> {new Date(divergencia.resolucao?.dataResolucao || divergencia.dataRegistro).toLocaleString('pt-BR')}
                              </div>
                            </div>
                            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                              <button 
                                className={`${styles.btn} ${styles.btnSecondary}`} 
                                onClick={() => setExpandido(null)}
                              >
                                Fechar Detalhes
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <h4 style={{ color: '#334155', marginTop: 0, marginBottom: '16px' }}>Decisão de Compras</h4>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                              <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', color: '#64748b', marginBottom: '6px', fontWeight: 'bold' }}>Ação a ser tomada:</label>
                                <select 
                                  value={resolucaoDados.acao}
                                  onChange={e => setResolucaoDados({...resolucaoDados, acao: e.target.value})}
                                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', fontWeight: '600' }}
                                >
                                  <option value="abatimento_boleto">Abatimento no Boleto (Desconto no Financeiro)</option>
                                  <option value="nota_devolucao">Gerar Nota de Devolução (Estorno Fiscal)</option>
                                  <option value="aguardar_entrega">Aguardar Fornecedor Enviar o Restante</option>
                                </select>
                              </div>

                              {resolucaoDados.acao === 'abatimento_boleto' && (
                                <div>
                                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#64748b', marginBottom: '6px', fontWeight: 'bold' }}>
                                    Valor do Abatimento a Descontar no Boleto (R$):
                                  </label>
                                  <input 
                                    type="number"
                                    step="0.01"
                                    placeholder="Ex: 100.00"
                                    value={resolucaoDados.valorAbatimento}
                                    onChange={e => setResolucaoDados({...resolucaoDados, valorAbatimento: e.target.value})}
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', fontWeight: 'bold', color: '#16a34a' }}
                                  />
                                  <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                                    Este desconto será enviado para a aba de Parcelas do Recebimento Fiscal.
                                  </span>
                                </div>
                              )}

                              {resolucaoDados.acao === 'nota_devolucao' && (
                                <div>
                                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#64748b', marginBottom: '6px', fontWeight: 'bold' }}>
                                    Nº Nota Fiscal de Devolução:
                                  </label>
                                  <input 
                                    type="text"
                                    placeholder="Ex: NF-e 12345"
                                    value={resolucaoDados.notaDevolucao}
                                    onChange={e => setResolucaoDados({...resolucaoDados, notaDevolucao: e.target.value})}
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }}
                                  />
                                </div>
                              )}

                              {resolucaoDados.acao === 'aguardar_entrega' && (
                                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.85rem', color: '#475569', lineHeight: 1.4, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <Info size={18} style={{ flexShrink: 0, color: '#3b82f6' }} />
                                  <span><strong>Entrega Complementar:</strong> A ordem permanecerá em aberto no Almoxarifado para que o operador bipe o restante assim que o caminhão entregar.</span>
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
                          </>
                        )}
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
