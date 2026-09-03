import React, { useState, useEffect } from 'react';
import { Calculator, ChevronDown, ChevronUp, CheckCircle, PackageCheck, AlertTriangle, Truck, Link, Building, Copy, Check, Plus, X, RefreshCw } from 'lucide-react';
import styles from './Orcamentos.module.css'; // reaproveitando os estilos

const Orcamentos = () => {
  const [requisicoes, setRequisicoes] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [expandido, setExpandido] = useState(null);
  const [loading, setLoading] = useState(true);
  const [vencedoresItem, setVencedoresItem] = useState({}); // { reqId: { itemCodigo: cotacaoId } }

  // States para gerador de link externo
  const [fornecedorSelecionado, setFornecedorSelecionado] = useState({});
  const [linksGerados, setLinksGerados] = useState({});
  const [gerandoLink, setGerandoLink] = useState(false);
  
  // State para o Modal da Planilha Detalhada do Fornecedor
  const [modalPlanilha, setModalPlanilha] = useState(null);

  // States para Cadastro de Novo Fornecedor
  const [modalFornecedorAberto, setModalFornecedorAberto] = useState(false);
  const [novoForn, setNovoForn] = useState({ razao_social: '', nome_fantasia: '', cnpj_cpf: '' });
  const [salvandoFornecedor, setSalvandoFornecedor] = useState(false);
  const [reqIdParaNovoFornecedor, setReqIdParaNovoFornecedor] = useState(null);

  const [gerandoPedidoId, setGerandoPedidoId] = useState(null);

  useEffect(() => {
    fetchDados();
  }, []);

  const fetchDados = async () => {
    setLoading(true);
    try {
      const resReq = await fetch('/api/requisicoes');
      const reqs = await resReq.json();
      
      const resForn = await fetch('/api/fornecedores');
      const forns = await resForn.json();
      
      setFornecedores(forns);
      
      // Filtrar apenas requisições que estão em "em_orcamento"
      const orcamentos = reqs.filter(r => r.status_compras === 'em_orcamento');
      setRequisicoes(orcamentos);

      // Auto-selecionar o menor preço para cada item (Mastigado)
      const autoSelecionados = {};
      orcamentos.forEach(req => {
        autoSelecionados[req.id] = {};
        req.itens?.forEach(item => {
          if (item.cotacoes && item.cotacoes.length > 0) {
            // Acha o menor valorUnitario
            const cotacaoVencedora = item.cotacoes.reduce((min, atual) => {
              return Number(atual.valorUnitario) < Number(min.valorUnitario) ? atual : min;
            });
            autoSelecionados[req.id][item.codigo] = cotacaoVencedora.id;
          }
        });
      });
      setVencedoresItem(autoSelecionados);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getNomeFornecedor = (fornId) => {
    const f = fornecedores.find(x => x.codigo_cliente_omie == fornId);
    return f ? (f.nome_fantasia || f.razao_social) : 'Fornecedor Desconhecido';
  };

  const toggleExpand = (id) => {
    setExpandido(expandido === id ? null : id);
  };

  const selecionarVencedorGlobal = (reqId, fornId) => {
    const req = requisicoes.find(r => r.id === reqId);
    const novasSelecoes = { ...vencedoresItem[reqId] };
    
    req.itens.forEach(item => {
      if (item.cotacoes) {
        const cotFornecedor = item.cotacoes.find(c => c.fornecedorId == fornId);
        if (cotFornecedor) {
          novasSelecoes[item.codigo] = cotFornecedor.id;
        }
      }
    });

    setVencedoresItem({
      ...vencedoresItem,
      [reqId]: novasSelecoes
    });
  };

  const handleAprovarOrcamento = async (reqId) => {
    const vencedores = vencedoresItem[reqId];
    if (!vencedores || Object.keys(vencedores).length === 0) {
      alert('Nenhum vencedor selecionado para gerar o pedido.');
      return;
    }

    setGerandoPedidoId(reqId);
    try {
      const response = await fetch(`/api/requisicoes/${reqId}/gerar-pedidos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vencedores })
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Erro ao aprovar orçamento e gerar pedidos');
      
      alert(`Sucesso! ${data.pedidosGerados?.length || 0} pedido(s) gerado(s) na Omie.`);
      fetchDados();
      setExpandido(null);
    } catch (error) {
      console.error(error);
      alert('Ocorreu um erro ao gerar o pedido: ' + error.message);
    } finally {
      setGerandoPedidoId(null);
    }
  };

  // ----- Gerador de Link Externo -----
  const gerarLinkFornecedor = async (reqId) => {
    const fornId = fornecedorSelecionado[reqId];
    if (!fornId) {
      alert('Selecione um fornecedor para gerar o link.');
      return;
    }

    setGerandoLink(true);
    try {
      const response = await fetch('/api/cotacao-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requisicaoId: reqId, fornecedorId: fornId })
      });
      
      if (!response.ok) throw new Error('Falha ao gerar link');
      
      const data = await response.json();
      const urlCompleta = `${window.location.origin}${data.link}`;
      
      setLinksGerados(prev => ({
        ...prev,
        [reqId]: {
          ...prev[reqId],
          [fornId]: { url: urlCompleta, copiado: false }
        }
      }));
    } catch (error) {
      console.error(error);
      alert('Erro ao gerar o link.');
    } finally {
      setGerandoLink(false);
    }
  };

  const copiarLink = (reqId, fornId, url) => {
    navigator.clipboard.writeText(url);
    setLinksGerados(prev => ({
      ...prev,
      [reqId]: {
        ...prev[reqId],
        [fornId]: { ...prev[reqId]?.[fornId], url, copiado: true }
      }
    }));
    setTimeout(() => {
      setLinksGerados(prev => ({
        ...prev,
        [reqId]: {
          ...prev[reqId],
          [fornId]: { ...prev[reqId][fornId], copiado: false }
        }
      }));
    }, 2000);
  };

  const gerarOuCopiarLinkEspecifico = async (reqId, fornId) => {
    // Se o link já foi gerado, apenas copia novamente
    if (linksGerados[reqId]?.[fornId]?.url) {
      copiarLink(reqId, fornId, linksGerados[reqId][fornId].url);
      return;
    }

    setGerandoLink(fornId);
    try {
      const response = await fetch('/api/cotacao-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requisicaoId: reqId, fornecedorId: fornId })
      });
      
      if (!response.ok) throw new Error('Falha ao gerar link');
      
      const data = await response.json();
      const urlCompleta = `${window.location.origin}${data.link}`;
      
      copiarLink(reqId, fornId, urlCompleta);
    } catch (error) {
      console.error(error);
      alert('Erro ao gerar o link.');
    } finally {
      setGerandoLink(null);
    }
  };

  const gerarResumoFornecedores = (req) => {
    const resumo = {}; // { fornId: { totalItens: 0, valorTotal: 0, prazos: [], cotacoes: [], descontoGeral: 0 } }
    
    req.itens?.forEach(item => {
      item.cotacoes?.forEach(cot => {
        if (!resumo[cot.fornecedorId]) {
          resumo[cot.fornecedorId] = { totalItens: 0, valorTotal: 0, prazos: [], cotacoes: [], origem: 'sistema', descontoGeral: cot.descontoGeral || 0 };
        }
        if (cot.origem === 'portal') {
          resumo[cot.fornecedorId].origem = 'portal';
        }
        resumo[cot.fornecedorId].totalItens += 1;
        
        // Calculo real do subtotal
        const tipo = cot.tipoUnidade || 'Unidade';
        const qtdInterna = Number(cot.quantidadePacote) || 1;
        let qtdComprar = item.quantidade;
        if (tipo === 'Pacote' || tipo === 'Caixa') {
          qtdComprar = Math.ceil(item.quantidade / (qtdInterna > 0 ? qtdInterna : 1));
        }
        const descItem = Number(cot.desconto) || 0;
        const subtotalBase = (Number(cot.valorUnitario) * qtdComprar) * (1 - descItem / 100);
        
        resumo[cot.fornecedorId].valorTotal += subtotalBase;
        
        if (cot.previsaoDias) {
          resumo[cot.fornecedorId].prazos.push(cot.previsaoDias);
        }
        resumo[cot.fornecedorId].cotacoes.push(cot);
      });
    });

    return Object.entries(resumo).map(([fornId, dados]) => {
      const prazosUnicos = [...new Set(dados.prazos)];
      const prazoExibicao = prazosUnicos.join(' / ') || 'Não informado';
      
      const valorComDescontoGeral = dados.valorTotal * (1 - (Number(dados.descontoGeral) / 100));
      
      return {
        fornId,
        ...dados,
        valorTotal: valorComDescontoGeral,
        valorSemDescontoGeral: dados.valorTotal,
        prazoFormatado: prazoExibicao
      };
    }).sort((a, b) => {
      // Prioriza quem tem todos os itens, e depois menor valor
      if (b.totalItens !== a.totalItens) return b.totalItens - a.totalItens;
      return a.valorTotal - b.valorTotal;
    });
  };

  const calcularTotalAprovado = (reqId) => {
    const req = requisicoes.find(r => r.id === reqId);
    if (!req) return 0;
    
    let totalPorFornecedor = {};
    
    req.itens.forEach(item => {
      const vencedorId = vencedoresItem[reqId]?.[item.codigo];
      if (vencedorId && item.cotacoes) {
        const cot = item.cotacoes.find(c => c.id === vencedorId);
        if (cot) {
          if (!totalPorFornecedor[cot.fornecedorId]) {
            totalPorFornecedor[cot.fornecedorId] = { soma: 0, descontoGeral: Number(cot.descontoGeral) || 0 };
          }
          const tipo = cot.tipoUnidade || 'Unidade';
          const qtdInterna = Number(cot.quantidadePacote) || 1;
          let qtdComprar = item.quantidade;
          if (tipo === 'Pacote' || tipo === 'Caixa') {
            qtdComprar = Math.ceil(item.quantidade / (qtdInterna > 0 ? qtdInterna : 1));
          }
          const descItem = Number(cot.desconto) || 0;
          const subtotalBase = (Number(cot.valorUnitario) * qtdComprar) * (1 - descItem / 100);
          
          totalPorFornecedor[cot.fornecedorId].soma += subtotalBase;
        }
      }
    });
    
    let totalFinal = 0;
    Object.values(totalPorFornecedor).forEach(forn => {
      totalFinal += forn.soma * (1 - forn.descontoGeral / 100);
    });
    return totalFinal;
  };

  const salvarNovoFornecedor = async () => {
    setSalvandoFornecedor(true);
    try {
      const res = await fetch('/api/fornecedores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(novoForn)
      });
      if (!res.ok) throw new Error('Erro ao salvar fornecedor');
      const fornecedorCriado = await res.json();
      
      // Atualiza a lista
      setFornecedores([...fornecedores, fornecedorCriado]);
      
      // Auto-seleciona para a requisição que estava aberta
      if (reqIdParaNovoFornecedor) {
        setFornecedorSelecionado(prev => ({
          ...prev,
          [reqIdParaNovoFornecedor]: fornecedorCriado.codigo_cliente_omie
        }));
      }

      setModalFornecedorAberto(false);
      setNovoForn({ razao_social: '', nome_fantasia: '', cnpj_cpf: '' });
    } catch (err) {
      alert('Erro: ' + err.message);
    } finally {
      setSalvandoFornecedor(false);
    }
  };

  // Sub-componente inline para o Autocomplete
  const FornecedorAutocomplete = ({ reqId, fornecedores, valorSelecionado, setValorSelecionado, onOpenModal }) => {
    const [busca, setBusca] = useState('');
    const [aberto, setAberto] = useState(false);

    useEffect(() => {
      if (valorSelecionado) {
        const f = fornecedores.find(f => f.codigo_cliente_omie == valorSelecionado);
        if (f) setBusca(f.nome_fantasia || f.razao_social);
      }
    }, [valorSelecionado, fornecedores]);

    const filtrados = fornecedores.filter(f => {
      if (!busca) return true;
      const termo = busca.toLowerCase();
      return (f.nome_fantasia?.toLowerCase().includes(termo) ||
              f.razao_social?.toLowerCase().includes(termo) ||
              f.cnpj_cpf?.includes(termo));
    }).slice(0, 50); // limita exibição p/ performance

    return (
      <div style={{ position: 'relative', width: '100%', display: 'flex' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <div style={{ position: 'absolute', top: '10px', left: '10px', color: '#94a3b8' }}>
            <Building size={16} />
          </div>
          <input 
            type="text"
            value={busca}
            onChange={(e) => { 
              setBusca(e.target.value); 
              setAberto(true); 
              setValorSelecionado(''); 
            }}
            onFocus={() => setAberto(true)}
            onBlur={() => setTimeout(() => setAberto(false), 200)} // delay pra dar tempo do click
            placeholder="Buscar Fornecedor (Nome ou CNPJ)..."
            style={{ width: '100%', padding: '8px 8px 8px 32px', border: '1px solid #cbd5e1', borderRadius: '4px 0 0 4px', fontSize: '0.9rem', outline: 'none' }}
          />
          {aberto && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e2e8f0', zIndex: 10, maxHeight: '250px', overflowY: 'auto', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
              {filtrados.length > 0 ? filtrados.map(f => (
                <div 
                  key={f.codigo_cliente_omie} 
                  style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}
                  onMouseDown={() => {
                    setValorSelecionado(f.codigo_cliente_omie);
                    setBusca(f.nome_fantasia || f.razao_social);
                    setAberto(false);
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = '#f8fafc'}
                  onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#0f172a' }}>{f.nome_fantasia || f.razao_social}</div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>CNPJ/CPF: {f.cnpj_cpf || 'Não informado'}</div>
                </div>
              )) : (
                <div style={{ padding: '10px 12px', fontSize: '0.9rem', color: '#64748b' }}>
                  Nenhum fornecedor encontrado. Clique em + para cadastrar.
                </div>
              )}
            </div>
          )}
        </div>
        <button 
          type="button"
          onClick={onOpenModal}
          style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderLeft: 'none', padding: '0 15px', borderRadius: '0 4px 4px 0', cursor: 'pointer', color: '#0ea5e9' }}
          title="Cadastrar Novo Fornecedor"
        >
          <Plus size={18} />
        </button>
      </div>
    );
  };

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Carregando orçamentos...</div>;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerTitle}>
          <div className={styles.iconHighlight}>
            <Calculator size={28} />
          </div>
          <div>
            <h2>Aprovação de Orçamentos</h2>
            <p>Análise inteligente de cotações para tomada de decisão de compra</p>
          </div>
        </div>
      </header>
      
      <div className={styles.content}>
        {requisicoes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
            <PackageCheck size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
            <p>Não há nenhum orçamento aguardando aprovação.</p>
          </div>
        ) : (
          <div className={styles.lista}>
            {requisicoes.map((req) => {
              const isExpanded = expandido === req.id;
              const fornecedoresResumo = gerarResumoFornecedores(req);
              const totalAprovado = calcularTotalAprovado(req.id);
              
              return (
                <div key={req.id} className={`${styles.card} ${isExpanded ? styles.expanded : ''}`}>
                  <div className={styles.cardHeader} onClick={() => toggleExpand(req.id)}>
                    <div className={styles.cardInfo}>
                      <div className={styles.idBox}>
                        <span className={styles.label}>Requisição</span>
                        <span className={styles.value}>#{req.id.slice(-6)}</span>
                      </div>
                      <div className={styles.detalhe}>
                        <span className={styles.label}>Itens Solicitados</span>
                        <span className={styles.value}>{req.itens?.length || 0}</span>
                      </div>
                      <div className={styles.detalhe}>
                        <span className={styles.label}>Fornecedores Participantes</span>
                        <span className={styles.value}>{fornecedoresResumo.length}</span>
                      </div>
                    </div>
                    
                    <div className={styles.cardActions}>
                      {isExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className={styles.cardBody}>
                      
                      {/* Painel de Geração de Link */}
                      <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #e2e8f0', display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'center' }}>
                        <div style={{ flex: 1, minWidth: '250px' }}>
                          <h4 style={{ margin: '0 0 10px 0', fontSize: '0.95rem', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Link size={16} color="#0ea5e9" /> Enviar para Fornecedor Externo
                          </h4>
                            <FornecedorAutocomplete 
                              reqId={req.id}
                              fornecedores={fornecedores}
                              valorSelecionado={fornecedorSelecionado[req.id]}
                              setValorSelecionado={(valor) => setFornecedorSelecionado({...fornecedorSelecionado, [req.id]: valor})}
                              onOpenModal={() => {
                                setReqIdParaNovoFornecedor(req.id);
                                setModalFornecedorAberto(true);
                              }}
                            />
                        </div>
                        
                        <button 
                          onClick={() => gerarLinkFornecedor(req.id)}
                          disabled={gerandoLink || !fornecedorSelecionado[req.id]}
                          style={{ height: '38px', marginTop: 'auto', padding: '0 15px', background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: '4px', cursor: (gerandoLink || !fornecedorSelecionado[req.id]) ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
                        >
                          {gerandoLink ? 'Gerando...' : 'Gerar Link Seguro'}
                        </button>

                        {fornecedorSelecionado[req.id] && linksGerados[req.id]?.[fornecedorSelecionado[req.id]] && (
                          <div style={{ width: '100%', background: '#fff', border: '1px dashed #cbd5e1', padding: '10px', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.85rem', color: '#64748b', wordBreak: 'break-all' }}>
                              {linksGerados[req.id][fornecedorSelecionado[req.id]].url}
                            </span>
                            <button 
                              onClick={() => copiarLink(req.id, fornecedorSelecionado[req.id], linksGerados[req.id][fornecedorSelecionado[req.id]].url)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0ea5e9', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 'bold' }}
                            >
                              {linksGerados[req.id][fornecedorSelecionado[req.id]].copiado ? <><Check size={16} color="#10b981" /> Copiado!</> : <><Copy size={16} /> Copiar</>}
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Resumo Mastigado */}
                      <div style={{ marginBottom: '30px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                          <h4 style={{ color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <CheckCircle size={18} color="#10b981" /> 
                            Resumo por Fornecedor (Oportunidades de Compra Única)
                          </h4>
                          <button 
                            onClick={fetchDados} 
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', color: '#475569', fontWeight: 'bold', fontSize: '0.8rem', transition: 'all 0.2s' }}
                            onMouseOver={(e) => e.currentTarget.style.background = '#e2e8f0'}
                            onMouseOut={(e) => e.currentTarget.style.background = '#f1f5f9'}
                            title="Buscar novas respostas dos fornecedores"
                          >
                            <RefreshCw size={14} /> Atualizar Cotações
                          </button>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                          {fornecedoresResumo.map((resumo, idx) => {
                            const temTudo = resumo.totalItens === req.itens.length;
                            return (
                              <div key={resumo.fornId} 
                                onClick={() => setModalPlanilha({ req, fornId: resumo.fornId, resumo })}
                                style={{ 
                                  background: resumo.origem === 'portal' ? '#f0fdf4' : '#fff7ed', 
                                  border: `1px solid ${resumo.origem === 'portal' ? '#86efac' : '#fdba74'}`,
                                  borderLeft: `5px solid ${resumo.origem === 'portal' ? '#22c55e' : '#f97316'}`,
                                  padding: '15px', borderRadius: '8px', position: 'relative',
                                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '15px',
                                  cursor: 'pointer', transition: 'transform 0.1s'
                                }}
                                onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.01)'}
                                onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                              >
                                {resumo.origem === 'portal' && (
                                  <div style={{ position: 'absolute', top: '-10px', right: '15px', background: '#22c55e', color: '#fff', fontSize: '0.7rem', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold' }}>
                                    FORNECEDOR ATUALIZOU PREÇO
                                  </div>
                                )}
                                {idx === 0 && (
                                  <div style={{ position: 'absolute', top: '-10px', left: '15px', background: '#3b82f6', color: '#fff', fontSize: '0.7rem', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold' }}>
                                    MELHOR OPÇÃO
                                  </div>
                                )}
                                
                                <div style={{ flex: '1 1 250px' }}>
                                  <h5 style={{ margin: '0 0 5px 0', fontSize: '1rem', color: '#1e293b' }}>{getNomeFornecedor(resumo.fornId)}</h5>
                                  <div style={{ display: 'flex', gap: '15px', fontSize: '0.9rem', color: '#64748b' }}>
                                    <span>Itens: <strong style={{ color: temTudo ? '#10b981' : '#f59e0b' }}>{resumo.totalItens} de {req.itens.length} {temTudo && '(Todos)'}</strong></span>
                                    <span>Prazo: <strong>{resumo.prazoFormatado} {resumo.prazoFormatado.match(/^[0-9 \/]+$/) ? (resumo.prazoFormatado === '1' ? 'dia' : 'dias') : ''}</strong></span>
                                  </div>
                                </div>
                                
                                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                  <div style={{ textAlign: 'right' }}>
                                    <span style={{ color: '#64748b', fontSize: '0.85rem', display: 'block' }}>Valor Total</span>
                                    <strong style={{ fontSize: '1.2rem', color: '#0f172a' }}>
                                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(resumo.valorTotal)}
                                    </strong>
                                  </div>
                                  
                                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
                                    <button 
                                      onClick={() => gerarOuCopiarLinkEspecifico(req.id, resumo.fornId)}
                                      title="Copiar Link para este fornecedor"
                                      style={{
                                        padding: '10px 12px', borderRadius: '6px', cursor: 'pointer',
                                        background: '#eff6ff', border: '1px solid #bfdbfe', color: '#2563eb',
                                        display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s', fontWeight: '500', fontSize: '0.9rem'
                                      }}
                                    >
                                      {gerandoLink === resumo.fornId ? 'Gerando...' : linksGerados[req.id]?.[resumo.fornId]?.copiado ? <><Check size={16} color="#10b981" /> Copiado</> : <><Link size={16} /> Link</>}
                                    </button>
                                    
                                    <button 
                                      onClick={() => selecionarVencedorGlobal(req.id, resumo.fornId)}
                                      style={{ 
                                        padding: '10px 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600',
                                        background: '#fff', border: '1px solid #cbd5e1', color: '#334155', transition: 'all 0.2s',
                                        whiteSpace: 'nowrap'
                                      }}
                                      onMouseOver={(e) => { e.currentTarget.style.background = '#f1f5f9' }}
                                      onMouseOut={(e) => { e.currentTarget.style.background = '#fff' }}
                                    >
                                      Selecionar principal
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Análise Detalhada (Item a Item) */}
                      <div>
                        <h4 style={{ color: '#0f172a', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
                          <Calculator size={18} color="#0ea5e9" /> 
                          Análise Detalhada por Item
                        </h4>
                        
                        <div style={{ overflowX: 'auto' }}>
                          <table className={styles.tabelaCotacoes} style={{ width: '100%' }}>
                            <thead>
                              <tr>
                                <th>Produto</th>
                                <th style={{ textAlign: 'center' }}>Qtd.</th>
                                <th>Opções de Compra (Cotações Recebidas)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {req.itens?.map(item => {
                                const cotacoes = item.cotacoes || [];
                                const vencedorAtual = vencedoresItem[req.id]?.[item.codigo];
                                
                                return (
                                  <tr key={item.codigo}>
                                    <td style={{ verticalAlign: 'top', width: '30%' }}>
                                      <span style={{ fontSize: '0.8rem', background: '#f1f5f9', padding: '2px 4px', borderRadius: '4px' }}>{item.codigo}</span>
                                      <p style={{ margin: '5px 0 0', fontWeight: '500', fontSize: '0.95rem' }}>{item.descricao}</p>
                                    </td>
                                    <td style={{ verticalAlign: 'top', textAlign: 'center', fontWeight: 'bold' }}>
                                      {item.quantidade}
                                    </td>
                                    <td style={{ verticalAlign: 'top' }}>
                                      {cotacoes.length === 0 ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#ef4444', fontSize: '0.9rem' }}>
                                          <AlertTriangle size={16} /> Nenhuma cotação recebida
                                        </div>
                                      ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                          {cotacoes.map(cot => {
                                            const isVencedor = vencedorAtual === cot.id;
                                            
                                            // Cálculo do subtotal desta opção
                                            const tipo = cot.tipoUnidade || 'Unidade';
                                            const qtdInterna = Number(cot.quantidadePacote) || 1;
                                            let qtdComprar = item.quantidade;
                                            if (tipo === 'Pacote' || tipo === 'Caixa') {
                                              qtdComprar = Math.ceil(item.quantidade / (qtdInterna > 0 ? qtdInterna : 1));
                                            }
                                            const descItem = Number(cot.desconto) || 0;
                                            const descGeral = Number(cot.descontoGeral) || 0;
                                            const subtotalDaOpcao = (Number(cot.valorUnitario) * qtdComprar) * (1 - descItem / 100) * (1 - descGeral / 100);
                                            
                                            return (
                                              <label key={cot.id} style={{ 
                                                display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 8px',
                                                border: `1px solid ${isVencedor ? '#3b82f6' : (cot.origem === 'portal' ? '#86efac' : '#fdba74')}`,
                                                borderLeft: `4px solid ${isVencedor ? '#3b82f6' : (cot.origem === 'portal' ? '#22c55e' : '#f97316')}`,
                                                background: isVencedor ? '#eff6ff' : (cot.origem === 'portal' ? '#f0fdf4' : '#fff7ed'),
                                                borderRadius: '4px', cursor: 'pointer', transition: 'all 0.2s'
                                              }}>
                                                <input 
                                                  type="radio" 
                                                  name={`vencedor-${req.id}-${item.codigo}`}
                                                  checked={isVencedor}
                                                  onChange={() => setVencedoresItem(prev => ({
                                                    ...prev, [req.id]: { ...prev[req.id], [item.codigo]: cot.id }
                                                  }))}
                                                />
                                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                                  <strong style={{ fontSize: '0.85rem' }}>{getNomeFornecedor(cot.fornecedorId)}</strong>
                                                  <div style={{ display: 'flex', gap: '6px', fontSize: '0.7rem', color: '#64748b', marginTop: '0px', flexWrap: 'wrap' }}>
                                                    {cot.marca && <span><span style={{fontWeight: 600}}>Marca:</span> {cot.marca}</span>}
                                                    {cot.tipoUnidade && cot.tipoUnidade !== 'Unidade' && (
                                                      <span><span style={{fontWeight: 600}}>Emb:</span> {cot.tipoUnidade} c/ {cot.quantidadePacote}</span>
                                                    )}
                                                    {Number(cot.desconto) > 0 && (
                                                      <span style={{ color: '#10b981', fontWeight: 500 }}>-{cot.desconto}% Desc. Item</span>
                                                    )}
                                                    {Number(cot.descontoGeral) > 0 && (
                                                      <span style={{ color: '#059669', fontWeight: 600, background: '#d1fae5', padding: '0 4px', borderRadius: '4px' }}>-{cot.descontoGeral}% Desc. Geral</span>
                                                    )}
                                                  </div>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                  <span style={{ display: 'flex', alignItems: 'center', gap: '2px', color: '#64748b', fontSize: '0.75rem' }}>
                                                    <Truck size={12} /> {cot.previsaoDias} {String(cot.previsaoDias).match(/^[0-9]+$/) ? (cot.previsaoDias == 1 ? 'dia' : 'dias') : ''}
                                                  </span>
                                                  <div style={{ textAlign: 'right' }}>
                                                    <span style={{ fontSize: '0.65rem', color: '#64748b', display: 'block' }}>
                                                      Unit: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cot.valorUnitario)}
                                                      {cot.tipoUnidade && cot.tipoUnidade !== 'Unidade' && ` / ${cot.tipoUnidade}`}
                                                    </span>
                                                    <strong style={{ color: isVencedor ? '#1d4ed8' : '#0f172a', display: 'block', fontSize: '0.9rem', marginTop: '2px' }}>
                                                      Total: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(subtotalDaOpcao)}
                                                    </strong>
                                                  </div>
                                                </div>
                                              </label>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Footer de Aprovação */}
                      <div style={{ marginTop: '20px', padding: '20px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '0 0 8px 8px' }}>
                        <div>
                          <p style={{ margin: '0 0 5px 0', color: '#64748b', fontSize: '0.9rem' }}>Valor Total Aprovado:</p>
                          <h3 style={{ margin: 0, color: '#0ea5e9', fontSize: '1.5rem' }}>
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalAprovado)}
                          </h3>
                        </div>
                        <button 
                          onClick={() => handleAprovarOrcamento(req.id)}
                          disabled={gerandoPedidoId === req.id}
                          style={{ 
                            background: gerandoPedidoId === req.id ? '#94a3b8' : '#10b981', color: '#fff', border: 'none', padding: '12px 24px',
                            borderRadius: '6px', fontSize: '1rem', fontWeight: 'bold', cursor: gerandoPedidoId === req.id ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center', gap: '8px', boxShadow: gerandoPedidoId === req.id ? 'none' : '0 4px 6px rgba(16, 185, 129, 0.2)'
                          }}
                        >
                          <CheckCircle size={20} />
                          {gerandoPedidoId === req.id ? 'Gerando Pedido Omie...' : 'Aprovar Orçamento e Gerar Pedido'}
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

      {/* Modal de Cadastro de Fornecedor */}
      {modalFornecedorAberto && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', width: '450px', maxWidth: '95%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Building size={20} color="#0ea5e9" /> Novo Fornecedor
              </h3>
              <button onClick={() => setModalFornecedorAberto(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={24} />
              </button>
            </div>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', fontWeight: '500', color: '#475569' }}>Razão Social *</label>
              <input 
                type="text" 
                value={novoForn.razao_social} 
                onChange={e => setNovoForn({...novoForn, razao_social: e.target.value})} 
                placeholder="Nome oficial da empresa"
                style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none' }} 
              />
            </div>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', fontWeight: '500', color: '#475569' }}>Nome Fantasia</label>
              <input 
                type="text" 
                value={novoForn.nome_fantasia} 
                onChange={e => setNovoForn({...novoForn, nome_fantasia: e.target.value})} 
                placeholder="Como a empresa é conhecida (Opcional)"
                style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none' }} 
              />
            </div>
            
            <div style={{ marginBottom: '25px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', fontWeight: '500', color: '#475569' }}>CNPJ ou CPF *</label>
              <input 
                type="text" 
                value={novoForn.cnpj_cpf} 
                onChange={e => setNovoForn({...novoForn, cnpj_cpf: e.target.value})} 
                placeholder="Somente números ou com pontuação"
                style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none' }} 
              />
            </div>
            
            <button 
              onClick={salvarNovoFornecedor}
              disabled={salvandoFornecedor || !novoForn.razao_social || !novoForn.cnpj_cpf}
              style={{ 
                width: '100%', padding: '12px', background: '#0ea5e9', color: '#fff', border: 'none', 
                borderRadius: '6px', cursor: (salvandoFornecedor || !novoForn.razao_social || !novoForn.cnpj_cpf) ? 'not-allowed' : 'pointer', 
                fontWeight: 'bold', fontSize: '1rem', transition: 'background 0.2s',
                opacity: (salvandoFornecedor || !novoForn.razao_social || !novoForn.cnpj_cpf) ? 0.6 : 1
              }}
            >
              {salvandoFornecedor ? 'Salvando...' : 'Cadastrar Fornecedor'}
            </button>
          </div>
        </div>
      )}

      {/* Modal da Planilha Detalhada */}
      {modalPlanilha && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={() => setModalPlanilha(null)}>
          <div style={{ background: '#fff', borderRadius: '12px', width: '900px', maxWidth: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', borderRadius: '12px 12px 0 0' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <PackageCheck size={20} color="#0ea5e9" /> Planilha de Cotação: {getNomeFornecedor(modalPlanilha.fornId)}
                </h3>
                <p style={{ margin: '5px 0 0', color: '#64748b', fontSize: '0.9rem' }}>Requisição #{modalPlanilha.req.id}</p>
              </div>
              <button onClick={() => setModalPlanilha(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '5px' }}>
                <X size={24} />
              </button>
            </div>
            
            <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
              <table className={styles.tabelaCotacoes} style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', textAlign: 'left' }}>
                    <th style={{ padding: '10px', borderBottom: '2px solid #cbd5e1' }}>Produto</th>
                    <th style={{ padding: '10px', borderBottom: '2px solid #cbd5e1', textAlign: 'center' }}>Qtd. Pedida</th>
                    <th style={{ padding: '10px', borderBottom: '2px solid #cbd5e1' }}>Marca</th>
                    <th style={{ padding: '10px', borderBottom: '2px solid #cbd5e1' }}>Emb.</th>
                    <th style={{ padding: '10px', borderBottom: '2px solid #cbd5e1' }}>Prazo</th>
                    <th style={{ padding: '10px', borderBottom: '2px solid #cbd5e1', textAlign: 'right' }}>Preço Unit.</th>
                    <th style={{ padding: '10px', borderBottom: '2px solid #cbd5e1', textAlign: 'right' }}>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {modalPlanilha.req.itens.map(item => {
                    const cot = item.cotacoes?.find(c => c.fornecedorId === modalPlanilha.fornId);
                    if (!cot) {
                      return (
                        <tr key={item.codigo} style={{ borderBottom: '1px solid #e2e8f0', opacity: 0.5 }}>
                          <td style={{ padding: '10px' }}>{item.descricao}</td>
                          <td style={{ padding: '10px', textAlign: 'center' }}>{item.quantidade}</td>
                          <td colSpan={5} style={{ padding: '10px', textAlign: 'center', color: '#ef4444' }}>Não ofertado</td>
                        </tr>
                      );
                    }
                    
                    const tipo = cot.tipoUnidade || 'Unidade';
                    const qtdInterna = Number(cot.quantidadePacote) || 1;
                    let qtdComprar = item.quantidade;
                    if (tipo === 'Pacote' || tipo === 'Caixa') {
                      qtdComprar = Math.ceil(item.quantidade / (qtdInterna > 0 ? qtdInterna : 1));
                    }
                    const descItem = Number(cot.desconto) || 0;
                    const subtotal = (Number(cot.valorUnitario) * qtdComprar) * (1 - descItem / 100);
                    
                    return (
                      <tr key={item.codigo} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '10px' }}>{item.descricao}</td>
                        <td style={{ padding: '10px', textAlign: 'center', fontWeight: 'bold' }}>{item.quantidade}</td>
                        <td style={{ padding: '10px' }}>{cot.marca || '-'}</td>
                        <td style={{ padding: '10px' }}>
                          {tipo === 'Unidade' ? 'Unid.' : `${tipo} c/${qtdInterna}`}
                        </td>
                        <td style={{ padding: '10px' }}>{cot.previsaoDias} d</td>
                        <td style={{ padding: '10px', textAlign: 'right' }}>
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cot.valorUnitario)}
                          {descItem > 0 && <div style={{ fontSize: '0.75rem', color: '#10b981' }}>-{descItem}% Desc</div>}
                        </td>
                        <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold', color: '#0f172a' }}>
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(subtotal)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            <div style={{ padding: '20px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', borderRadius: '0 0 12px 12px', display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{ textAlign: 'right', background: '#fff', padding: '15px 25px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                <div style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '5px' }}>Total Calculado:</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0ea5e9' }}>
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(modalPlanilha.resumo.valorSemDescontoGeral || modalPlanilha.resumo.valorTotal)}
                </div>
                {Number(modalPlanilha.resumo.descontoGeral) > 0 && (
                  <>
                    <div style={{ fontSize: '0.9rem', color: '#10b981', marginTop: '5px' }}>Desconto Geral: -{modalPlanilha.resumo.descontoGeral}%</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#10b981', marginTop: '5px', borderTop: '1px solid #e2e8f0', paddingTop: '5px' }}>
                      Valor Final Ofertado: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(modalPlanilha.resumo.valorTotal)}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orcamentos;
