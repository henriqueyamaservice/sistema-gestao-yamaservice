import React, { useState, useEffect } from 'react';
import { PackagePlus, Truck, FileText, ChevronDown, ChevronRight, Save, Search, AlertCircle, CheckCircle2, PlusCircle, Link, Ban, X, Building2, Hash, Calendar } from 'lucide-react';
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
        fetch('/api/requisicoes'),
        fetch('/api/fornecedores'),
        fetch('/api/produtos')
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

      const res = await fetch(`/api/estoque/receber-nota/${req.id}`, {
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
                    <div className={`${styles.idBox} ${styles.nfeHighlight}`}>
                      <span className={styles.label}>NF-e</span>
                      <span className={styles.value}>{nota.chaveAcesso.substring(25, 34)}</span>
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
                      <span className={`${styles.badgeStatus} ${styles.badgeWaiting}`}>
                        ⏳ Aguardando Almoxarifado
                      </span>
                    ) : (
                      <span className={`${styles.badgeStatus} ${styles.badgePending}`}>
                        <Truck size={16} strokeWidth={2.5} /> Mapeamento Pendente
                      </span>
                    )}
                    {isExpanded ? <ChevronDown size={24} color="var(--cor-texto-secundario)" /> : <ChevronRight size={24} color="var(--cor-texto-secundario)" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className={styles.cardBody}>

                    {/* Header estilo Enterprise */}
                    <div className={styles.expandedHeader}>
                      <h3 className={styles.expandedTitle}>
                        <FileText size={24} />
                        Recebimento NF-e Nº {nota.chaveAcesso.substring(25, 34)}
                      </h3>

                      <div className={styles.infoGrid}>
                        <div className={styles.infoCol}>
                          <label className={styles.infoLabel}>Fornecedor (encontrado)</label>
                          <div className={styles.infoValue} style={{ fontWeight: '700' }}>
                            <Building2 size={16} color="var(--cor-texto-secundario)" />
                            {nota.emitente.nome}
                          </div>
                        </div>
                        <div className={styles.infoCol}>
                          <label className={styles.infoLabel}>CNPJ</label>
                          <div className={styles.infoValue}>
                            <Hash size={16} color="var(--cor-texto-secundario)" />
                            {nota.emitente.cnpj_cpf}
                          </div>
                        </div>
                        <div className={styles.infoCol}>
                          <label className={styles.infoLabel}>Data de Emissão</label>
                          <div className={styles.infoValue}>
                            <Calendar size={16} color="var(--cor-texto-secundario)" />
                            {new Date(nota.dataEmissao).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div style={{ padding: '24px' }}>
                      <div className={styles.instructionText}>
                        <PackagePlus size={20} color="var(--cor-destaque)" />
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

                      <div className={styles.tableContainer}>
                        <table className={styles.dataTable}>
                          <thead>
                            <tr>
                              <th style={{ textAlign: 'center', width: '60px' }}>Item</th>
                              <th style={{ textAlign: 'left' }}>Código Fornecedor</th>
                              <th style={{ textAlign: 'left' }}>Descrição do Produto</th>
                              <th style={{ textAlign: 'center' }}>Qtd</th>
                              <th style={{ textAlign: 'right' }}>V. Unitário</th>
                              <th style={{ textAlign: 'left', width: '350px' }}>Situação (Destino)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {itensNfe.map((item, idx) => {
                              const selectedAction = mapeamentos[req.id]?.[item.codigo] || '';

                              return (
                                <tr key={idx} className={styles.dataTableRow}>
                                  <td className={styles.itemNumber}>
                                    {idx + 1}
                                  </td>
                                  <td>
                                    {item.codigo}
                                  </td>
                                  <td style={{ fontWeight: '600' }}>
                                    {item.descricao}
                                  </td>
                                  <td style={{ textAlign: 'center' }}>
                                    {item.quantidade}
                                  </td>
                                  <td style={{ textAlign: 'right' }}>
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valorUnitario)}
                                  </td>
                                  <td>
                                    {!selectedAction ? (
                                      <div className={styles.mappingActions}>
                                        <button 
                                          onClick={() => handleMapeamentoChange(req.id, item.codigo, `NOVO:${item.descricao}`)}
                                          className={`${styles.mappingBtn} ${styles.mappingBtnNovo}`}
                                        >
                                          <PlusCircle size={18} />
                                          Cadastrar como novo produto
                                        </button>
                                        <button 
                                          onClick={() => handleMapeamentoChange(req.id, item.codigo, 'ASSOCIAR:')}
                                          className={`${styles.mappingBtn} ${styles.mappingBtnAssociar}`}
                                        >
                                          <Link size={18} />
                                          Associar a produto existente
                                        </button>
                                        <button 
                                          onClick={() => handleMapeamentoChange(req.id, item.codigo, 'ignorar')}
                                          className={`${styles.mappingBtn} ${styles.mappingBtnIgnorar}`}
                                        >
                                          <Ban size={18} />
                                          Ignorar a importação
                                        </button>
                                      </div>
                                    ) : selectedAction === 'ignorar' ? (
                                      <div className={styles.mappingStateActive} style={{ borderColor: '#fca5a5', backgroundColor: '#fef2f2' }}>
                                        <Ban size={18} color="#dc2626" />
                                        <span className={styles.mappingStateLabel} style={{ color: '#dc2626' }}>Ignorado</span>
                                        <div style={{ flex: 1 }}></div>
                                        <span 
                                          onClick={() => handleMapeamentoChange(req.id, item.codigo, '')}
                                          className={styles.mappingCancelBtn}
                                          title="Alterar"
                                        >
                                          <X size={18} />
                                        </span>
                                      </div>
                                    ) : selectedAction.startsWith('NOVO:') ? (
                                      <div className={styles.mappingStateActive} style={{ borderColor: '#bae6fd', backgroundColor: '#f0f9ff' }}>
                                        <PlusCircle size={18} color="#0284c7" />
                                        <span className={styles.mappingStateLabel} style={{ color: '#0284c7' }}>Novo:</span>
                                        <input 
                                          value={selectedAction.substring(5)}
                                          onChange={(e) => handleMapeamentoChange(req.id, item.codigo, `NOVO:${e.target.value}`)}
                                          autoFocus
                                          placeholder="Nome do novo produto..."
                                          className={styles.mappingInput}
                                        />
                                        <span 
                                          onClick={() => handleMapeamentoChange(req.id, item.codigo, '')}
                                          className={styles.mappingCancelBtn}
                                          title="Cancelar"
                                        >
                                          <X size={18} />
                                        </span>
                                      </div>
                                    ) : (
                                      <div className={styles.mappingStateActive} style={{ borderColor: '#bbf7d0', backgroundColor: '#f0fdf4' }}>
                                        <Link size={18} color="#16a34a" />
                                        <span className={styles.mappingStateLabel} style={{ color: '#16a34a' }}>Associar:</span>
                                        <input 
                                          list="opcoes-destino"
                                          value={selectedAction === 'ASSOCIAR:' ? '' : selectedAction}
                                          onChange={(e) => handleMapeamentoChange(req.id, item.codigo, e.target.value)}
                                          autoFocus={selectedAction === 'ASSOCIAR:'}
                                          placeholder="Pesquise o produto..."
                                          className={styles.mappingInput}
                                        />
                                        <span 
                                          onClick={() => handleMapeamentoChange(req.id, item.codigo, '')}
                                          className={styles.mappingCancelBtn}
                                          title="Cancelar"
                                        >
                                          <X size={18} />
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
