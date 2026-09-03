import React, { useState, useEffect } from 'react';
import { Scale, ChevronDown, ChevronUp, Plus, Trash2, Building, DollarSign, Zap } from 'lucide-react';
import ModalSubstituicao from '../ModalSubstituicao';
import styles from './Concorrencia.module.css';

const Concorrencia = ({ setView }) => {
  const [requisicoes, setRequisicoes] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandido, setExpandido] = useState(null);
  
  // Modal de Substituição
  const [itemParaSubstituir, setItemParaSubstituir] = useState(null);
  const [reqIdParaSubstituir, setReqIdParaSubstituir] = useState(null);

  // Estado temporário das cotações sendo digitadas
  // Formato: { reqId: { itemCodigo: [ { fornecedorId, valorUnitario, previsaoDias } ] } }
  const [cotacoesTemp, setCotacoesTemp] = useState({});

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
    } catch (error) {
      console.error('Erro ao carregar dados da concorrência:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id) => {
    setExpandido(expandido === id ? null : id);
  };

  // ----- Manipulação de Cotações Temporárias -----
  const getCotacoesItem = (reqId, codigoItem) => {
    // Retorna as cotações salvas no banco OU as temporárias que estão sendo digitadas
    const req = requisicoes.find(r => r.id === reqId);
    const item = req?.itens.find(i => i.codigo === codigoItem);
    
    // Se o banco já tiver cotações salvas, mostra elas misturadas com as temporárias?
    // Para simplificar, vamos manipular tudo no cotacoesTemp ao expandir a primeira vez.
    if (!cotacoesTemp[reqId]) return [];
    return cotacoesTemp[reqId][codigoItem] || [];
  };

  const addCotacao = (reqId, codigoItem) => {
    setCotacoesTemp(prev => {
      const reqState = { ...(prev[reqId] || {}) };
      let arrayAtual = reqState[codigoItem] || [];
      
      // Se o item já tiver cotações salvas no banco, traz elas para o estado temporário primeiro
      if (arrayAtual.length === 0) {
        const req = requisicoes.find(r => r.id === reqId);
        const item = req?.itens.find(i => i.codigo === codigoItem);
        if (item?.cotacoes?.length > 0) {
          arrayAtual = [...item.cotacoes];
        }
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
    try {
      const response = await fetch(`/api/produtos/${codigoItem}/sugestao-precos`);
      if (!response.ok) throw new Error('Falha ao buscar sugestão de preços');
      const sugestoes = await response.json();
      
      setCotacoesTemp(prev => {
        const novoEstado = { ...prev };
        if (!novoEstado[reqId]) novoEstado[reqId] = {};
        
        const existentes = novoEstado[reqId][codigoItem] || [];
        novoEstado[reqId][codigoItem] = [...existentes, ...sugestoes];
        
        return novoEstado;
      });
    } catch (error) {
      console.error('Erro na auto-cotação:', error);
      alert('Erro ao buscar sugestões de preços automáticas.');
    }
  };

  const removeCotacao = (reqId, codigoItem, cotacaoId) => {
    setCotacoesTemp(prev => {
      const reqState = prev[reqId] || {};
      const itemState = reqState[codigoItem] || [];
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
      const itemState = reqState[codigoItem] || [];
      
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
      // 1. Salvar as cotações no backend
      const cotacoesReq = cotacoesTemp[reqId] || {};
      
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
                                    <td>
                                      <div className={styles.inputIconWrapper}>
                                        <Building size={16} />
                                        <select 
                                          value={cot.fornecedorId}
                                          onChange={(e) => updateCotacao(req.id, item.codigo, cot.id, 'fornecedorId', e.target.value)}
                                        >
                                          <option value="">Selecione o fornecedor...</option>
                                          {fornecedores.map(f => (
                                            <option key={f.codigo_cliente_omie} value={f.codigo_cliente_omie}>
                                              {f.nome_fantasia || f.razao_social} ({f.cnpj_cpf})
                                            </option>
                                          ))}
                                        </select>
                                      </div>
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
                          
                          <div className={styles.acoesCotacaoGroup} style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                            <button 
                              className={styles.btnAddCotacao} 
                              onClick={() => addCotacao(req.id, item.codigo)}
                            >
                              <Plus size={16} /> Adicionar Preço Manual
                            </button>
                            <button 
                              className={styles.btnAddCotacao}
                              style={{ backgroundColor: '#f59e0b', color: '#fff', border: 'none' }}
                              onClick={() => autoCotar(req.id, item.codigo)}
                              title="Busca sugestões de preços no histórico"
                            >
                              <Zap size={16} fill="currentColor" /> Auto-Cotar (Omie)
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
    </div>
  );
};

export default Concorrencia;
