import React, { useState, useEffect } from 'react';
import { PackagePlus, Truck, FileText, ChevronDown, ChevronRight, Save, Search, AlertCircle, CheckCircle2 } from 'lucide-react';
import styles from './EntradaEstoque.module.css';

const EntradaEstoque = () => {
  const [requisicoes, setRequisicoes] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandido, setExpandido] = useState(null);
  const [mapeamentos, setMapeamentos] = useState({}); // { reqId: { itemCodigoNaNota: 'novo' | 'ignorar' | 'PRD123' } }
  const [concluindo, setConcluindo] = useState(false);

  useEffect(() => {
    fetchDados();
  }, []);

  const fetchDados = async () => {
    try {
      const [resReq, resForn, resProd] = await Promise.all([
        fetch('http://localhost:3000/api/requisicoes'),
        fetch('http://localhost:3000/api/fornecedores'),
        fetch('http://localhost:3000/api/produtos')
      ]);
      const dataReq = await resReq.json();
      const dataForn = await resForn.json();
      const dataProd = await resProd.json();

      // Filtrar requisições que tiveram a NF-e pareada (concluido) e AINDA NÃO FORAM recebidas pelo almoxarifado
      const reqsValidas = dataReq.filter(r => r.status_compras === 'concluido' || r.status_compras === 'entregue_parcial');

      // Mapeamento Automático Inteligente
      const autoMap = {};
      reqsValidas.forEach(req => {
        if (req.mapeamento_nfe) {
          autoMap[req.id] = req.mapeamento_nfe;
        } else {
          const pedidoComNota = req.pedidos_omie?.find(p => p.nota_fiscal_vinculada);
          if (pedidoComNota) {
            const itensNfe = pedidoComNota.nota_fiscal_vinculada.itens || [];
            autoMap[req.id] = {};
            itensNfe.forEach(itemNf => {
              const produtoExiste = dataProd.find(p => p.codigo === itemNf.codigo);
              if (produtoExiste) {
                autoMap[req.id][itemNf.codigo] = produtoExiste.codigo;
              }
            });
          }
        }
      });
      setMapeamentos(autoMap);

      setRequisicoes(reqsValidas);
      setFornecedores(dataForn);
      setProdutos(dataProd);
      setLoading(false);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      setLoading(false);
    }
  };

  const getNomeFornecedor = (id) => {
    const f = fornecedores.find(f => String(f.codigo_cliente_omie) === String(id));
    if (!f) return 'Fornecedor Desconhecido';
    return f.nome_fantasia || f.razao_social || 'Fornecedor Sem Nome';
  };

  const handleMapeamentoChange = (reqId, itemCodigo, valor) => {
    setMapeamentos(prev => ({
      ...prev,
      [reqId]: {
        ...(prev[reqId] || {}),
        [itemCodigo]: valor
      }
    }));
  };

  const isTudoMapeado = (reqId, itensNfe) => {
    const maps = mapeamentos[reqId] || {};
    // Verifica se todos os itens da nota têm uma decisão tomada
    return itensNfe.every(item => maps[item.codigo]);
  };

  const handleConcluirRecebimento = async (req) => {
    setConcluindo(true);
    try {
      const maps = mapeamentos[req.id] || {};

      const res = await fetch(`http://localhost:3000/api/estoque/receber-nota/${req.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mapeamentoItens: maps })
      });

      if (!res.ok) throw new Error('Falha no recebimento');

      alert('Mapeamento salvo e ordem de recebimento enviada para o Almoxarifado!');
      // Atualiza o estado da requisição localmente para mostrar a badge, mas não remove da tela
      setRequisicoes(requisicoes.map(r => r.id === req.id ? { ...r, mapeamento_concluido: true, mapeamento_nfe: maps } : r));
      if (expandido === req.id) setExpandido(null);
    } catch (error) {
      console.error(error);
      alert('Erro ao processar recebimento no estoque.');
    } finally {
      setConcluindo(false);
    }
  };

  if (loading) {
    return <div className={styles.loading}>Buscando notas pareadas prontas para recebimento...</div>;
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerTitle}>
          <div className={styles.iconHighlight} style={{ background: '#ffedd5', color: '#ea580c' }}>
            <PackagePlus size={28} />
          </div>
          <div>
            <h2>Entrada no Estoque</h2>
            <p>Recebimento físico de mercadorias via NF-e</p>
          </div>
        </div>
      </header>

      {requisicoes.length === 0 ? (
        <div className={styles.empty}>
          <CheckCircle2 size={48} color="#10b981" style={{ marginBottom: '16px' }} />
          <h3>Estoque em dia!</h3>
          <p>Nenhuma nota fiscal pendente de entrada.</p>
        </div>
      ) : (
        <div className={styles.lista}>
          {requisicoes.map(req => {
            const isExpanded = expandido === req.id;
            // Pegar a nota vinculada (assumimos que a primeira que tiver nota_fiscal_vinculada é a que importa para a tela)
            const pedidoComNota = req.pedidos_omie?.find(p => p.nota_fiscal_vinculada);
            if (!pedidoComNota) return null; // Fallback de segurança

            const nota = pedidoComNota.nota_fiscal_vinculada;
            const itensNfe = nota.itens || [];
            const tudoMapeado = isTudoMapeado(req.id, itensNfe);

            return (
              <div key={req.id} className={`${styles.card} ${isExpanded ? styles.expanded : ''}`}>

                <div className={styles.cardHeader} onClick={() => setExpandido(isExpanded ? null : req.id)}>
                  <div className={styles.cardInfo}>
                    <div className={styles.idBox} style={{ background: '#fef2f2', color: '#ef4444' }}>
                      <span className={styles.label}>NF-e</span>
                      <span className={styles.value} style={{ color: '#ef4444' }}>{nota.chaveAcesso.substring(25, 34)}</span>
                    </div>
                    <div className={styles.detalhe}>
                      <span className={styles.label}>Fornecedor</span>
                      <span className={styles.value}>{nota.emitente.nome}</span>
                    </div>
                    <div className={styles.detalhe}>
                      <span className={styles.label}>Valor da Nota</span>
                      <span className={styles.value} style={{ fontWeight: 'bold' }}>
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(nota.valorTotal)}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    {req.mapeamento_concluido ? (
                      <span style={{ 
                        background: '#fef9c3', color: '#854d0e', padding: '6px 12px', 
                        borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px'
                      }}>
                        ⏳ Aguardando Almoxarifado
                      </span>
                    ) : (
                      <span style={{ 
                        background: '#fff7ed', color: '#ea580c', padding: '6px 12px', 
                        borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px'
                      }}>
                        <Truck size={14} /> Mapeamento Pendente
                      </span>
                    )}
                    {isExpanded ? <ChevronDown size={20} color="#64748b" /> : <ChevronRight size={20} color="#64748b" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className={styles.cardBody} style={{ background: '#f8fafc', padding: '0' }}>

                    {/* Header estilo Omie */}
                    <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '20px' }}>
                      <h3 style={{ color: '#ea580c', margin: '0 0 16px 0', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        Recebimento NF-e Nº {nota.chaveAcesso.substring(25, 34)}
                      </h3>

                      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: '250px' }}>
                          <label style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginBottom: '4px' }}>Fornecedor (encontrado)</label>
                          <div style={{ padding: '8px 12px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.9rem', color: '#334155', fontWeight: 'bold' }}>
                            {nota.emitente.nome}
                          </div>
                        </div>
                        <div>
                          <label style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginBottom: '4px' }}>CNPJ</label>
                          <div style={{ padding: '8px 12px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.9rem', color: '#334155' }}>
                            {nota.emitente.cnpj_cpf}
                          </div>
                        </div>
                        <div>
                          <label style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginBottom: '4px' }}>Data de Emissão</label>
                          <div style={{ padding: '8px 12px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.9rem', color: '#334155' }}>
                            {new Date(nota.dataEmissao).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div style={{ padding: '20px' }}>
                      <div style={{ marginBottom: '16px', color: '#ea580c', fontSize: '0.9rem', fontWeight: '600' }}>
                        Selecione ou digite abaixo de que forma deseja importar cada um dos itens da NF-e
                      </div>

                      {/* Lista de opções nativa para o Autocomplete editável */}
                      <datalist id="opcoes-destino">
                        <option value="novo_produto">+ Cadastrar como novo produto</option>
                        <option value="ignorar">🚫 Ignorar a importação do item</option>
                        {produtos.map(p => (
                          <option key={p.codigo} value={p.codigo}>
                            {p.descricao}
                          </option>
                        ))}
                      </datalist>

                      <div style={{ width: '100%', overflowX: 'auto', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ background: '#f8fafc' }}>
                              <th style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.85rem', width: '60px' }}>Item</th>
                              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.85rem' }}>Código Fornecedor</th>
                              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.85rem' }}>Descrição do Produto</th>
                              <th style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.85rem' }}>Qtd</th>
                              <th style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.85rem' }}>V. Unitário</th>
                              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.85rem', width: '350px' }}>Situação (Destino)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {itensNfe.map((item, idx) => {
                              const selectedAction = mapeamentos[req.id]?.[item.codigo] || '';

                              return (
                                <tr key={idx} style={{ background: idx % 2 === 0 ? '#fff' : '#fcfcfc' }}>
                                  <td style={{ padding: '12px', borderBottom: '1px solid #f1f5f9', textAlign: 'center', fontSize: '0.9rem', color: '#ea580c', fontWeight: 'bold' }}>
                                    {idx + 1}
                                  </td>
                                  <td style={{ padding: '12px', borderBottom: '1px solid #f1f5f9', fontSize: '0.9rem', color: '#334155' }}>
                                    {item.codigo}
                                  </td>
                                  <td style={{ padding: '12px', borderBottom: '1px solid #f1f5f9', fontSize: '0.9rem', color: '#334155', fontWeight: '600' }}>
                                    {item.descricao}
                                  </td>
                                  <td style={{ padding: '12px', borderBottom: '1px solid #f1f5f9', textAlign: 'center', fontSize: '0.9rem', color: '#334155' }}>
                                    {item.quantidade}
                                  </td>
                                  <td style={{ padding: '12px', borderBottom: '1px solid #f1f5f9', textAlign: 'right', fontSize: '0.9rem', color: '#334155' }}>
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valorUnitario)}
                                  </td>
                                  <td style={{ padding: '12px', borderBottom: '1px solid #f1f5f9' }}>
                                    {!selectedAction ? (
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-start' }}>
                                        <span 
                                          onClick={() => handleMapeamentoChange(req.id, item.codigo, `NOVO:${item.descricao}`)}
                                          style={{ 
                                            color: '#0369a1', background: '#e0f2fe', padding: '6px 12px', 
                                            borderRadius: '4px', fontSize: '0.8rem', cursor: 'pointer', 
                                            fontWeight: '600', display: 'inline-block' 
                                          }}>
                                          + Cadastrar como novo produto
                                        </span>
                                        <span 
                                          onClick={() => handleMapeamentoChange(req.id, item.codigo, 'ASSOCIAR:')}
                                          style={{ 
                                            color: '#15803d', background: '#dcfce7', padding: '6px 12px', 
                                            borderRadius: '4px', fontSize: '0.8rem', cursor: 'pointer', 
                                            fontWeight: '600', display: 'inline-block' 
                                          }}>
                                          ✓ Associar a produto existente
                                        </span>
                                        <span 
                                          onClick={() => handleMapeamentoChange(req.id, item.codigo, 'ignorar')}
                                          style={{ 
                                            color: '#b91c1c', background: '#fee2e2', padding: '6px 12px', 
                                            borderRadius: '4px', fontSize: '0.8rem', cursor: 'pointer', 
                                            fontWeight: '600', display: 'inline-block' 
                                          }}>
                                          🚫 Ignorar a importação
                                        </span>
                                      </div>
                                    ) : selectedAction === 'ignorar' ? (
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ color: '#ef4444', fontSize: '0.85rem', fontWeight: '600' }}>🚫 Ignorado</span>
                                        <span 
                                          onClick={() => handleMapeamentoChange(req.id, item.codigo, '')}
                                          style={{ color: '#94a3b8', cursor: 'pointer', fontSize: '0.8rem', textDecoration: 'underline' }}>
                                          Alterar
                                        </span>
                                      </div>
                                    ) : selectedAction.startsWith('NOVO:') ? (
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'nowrap' }}>
                                        <span style={{ color: '#ea580c', fontSize: '0.85rem', fontWeight: 'bold', whiteSpace: 'nowrap' }}>+ Novo:</span>
                                        <input 
                                          value={selectedAction.substring(5)}
                                          onChange={(e) => handleMapeamentoChange(req.id, item.codigo, `NOVO:${e.target.value}`)}
                                          autoFocus
                                          placeholder="Nome do novo produto..."
                                          style={{
                                            flex: 1, minWidth: '150px', padding: '8px 12px', borderRadius: '4px', border: '1px solid #cbd5e1',
                                            fontSize: '0.85rem', color: '#334155', outline: 'none'
                                          }}
                                        />
                                        <span 
                                          onClick={() => handleMapeamentoChange(req.id, item.codigo, '')}
                                          style={{ color: '#94a3b8', cursor: 'pointer', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                                          Cancelar
                                        </span>
                                      </div>
                                    ) : (
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'nowrap' }}>
                                        <span style={{ color: '#166534', fontSize: '0.85rem', fontWeight: 'bold', whiteSpace: 'nowrap' }}>✓ Associar:</span>
                                        <input 
                                          list="opcoes-destino"
                                          value={selectedAction === 'ASSOCIAR:' ? '' : selectedAction}
                                          onChange={(e) => handleMapeamentoChange(req.id, item.codigo, e.target.value)}
                                          autoFocus={selectedAction === 'ASSOCIAR:'}
                                          placeholder="Pesquise o produto..."
                                          style={{
                                            flex: 1, minWidth: '150px', padding: '8px 12px', borderRadius: '4px', border: '1px solid #bbf7d0',
                                            fontSize: '0.85rem', color: '#166534', outline: 'none', background: '#f0fdf4'
                                          }}
                                        />
                                        <span 
                                          onClick={() => handleMapeamentoChange(req.id, item.codigo, '')}
                                          style={{ color: '#94a3b8', cursor: 'pointer', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                                          Cancelar
                                        </span>
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px' }}>
                        {!tudoMapeado ? (
                          <div style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', fontWeight: '600' }}>
                            <AlertCircle size={18} />
                            Defina a Situação de todos os itens para liberar o Recebimento.
                          </div>
                        ) : (
                          <div style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', fontWeight: '600' }}>
                            <CheckCircle2 size={18} />
                            Todos os itens mapeados. Pronto para dar entrada!
                          </div>
                        )}

                        <button
                          onClick={() => handleConcluirRecebimento(req)}
                          disabled={!tudoMapeado || concluindo}
                          style={{
                            background: tudoMapeado ? '#ea580c' : '#cbd5e1',
                            color: '#fff', border: 'none', padding: '12px 24px',
                            borderRadius: '6px', fontSize: '1rem', fontWeight: 'bold',
                            cursor: (!tudoMapeado || concluindo) ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center', gap: '8px',
                            boxShadow: tudoMapeado ? '0 4px 6px rgba(234, 88, 12, 0.2)' : 'none',
                            transition: 'all 0.2s'
                          }}
                        >
                          <Save size={20} />
                          {concluindo ? 'Salvando...' : 'Salvar Mapeamento'}
                        </button>
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

export default EntradaEstoque;
