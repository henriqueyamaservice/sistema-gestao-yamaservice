import React, { useState, useEffect } from 'react';
import { PackagePlus, Truck, FileText, ChevronDown, ChevronRight, Save, Search, AlertCircle, CheckCircle2, PlusCircle, Link, Ban, X, Building2, Hash, Calendar, Clock, ArrowRight, Check, PackageSearch } from 'lucide-react';
import styles from './EntradaEstoque.module.css';

const EntradaEstoque = ({ setView }) => {
  const [requisicoes, setRequisicoes] = useState([]);
  const [requisicoesAguardando, setRequisicoesAguardando] = useState([]);
  const [requisicoesEntregues, setRequisicoesEntregues] = useState([]);
  const [abaAtiva, setAbaAtiva] = useState('pendentes'); // 'pendentes' | 'recebidos'
  const [fornecedores, setFornecedores] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandido, setExpandido] = useState(null);
  const [mapeamentos, setMapeamentos] = useState({}); // { reqId: { itemCodigoNaNota: 'novo' | 'ignorar' | 'PRD123' } }
  const [concluindo, setConcluindo] = useState(false);
  const [liberandoId, setLiberandoId] = useState(null);

  useEffect(() => {
    fetchDados();
    const timer = setInterval(() => {
      fetchDados();
    }, 4000);
    return () => clearInterval(timer);
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

      // Filtrar requisições:
      // reqsValidas: Pendentes de entrada (fechadas pelo compras e aguardando conferência do almoxarifado)
      const reqsValidas = dataReq.filter(r => 
        r.status_compras === 'concluido' && 
        !r.dataRecebimentoFisico && 
        !r.recebimentoFisico
      );
      const reqsAguardando = dataReq.filter(r => r.status_compras === 'aguardando_nfe');
      // reqsEntregues: Recebidas no Almoxarifado (completas OU parciais com falta física)
      const reqsEntregues = dataReq.filter(r => 
        r.status_compras === 'entregue' || 
        r.status_compras === 'entregue_parcial' || 
        Boolean(r.divergencia) || 
        Boolean(r.recebimentoFisico) || 
        Boolean(r.dataRecebimentoFisico)
      );
      setRequisicoesAguardando(reqsAguardando);
      setRequisicoesEntregues(reqsEntregues);

      // Mapeamento Automático Inteligente
      const autoMap = {};
      reqsValidas.forEach(req => {
        if (req.mapeamento_nfe) {
          autoMap[req.id] = req.mapeamento_nfe;
        } else {
          const pedidoComNota = req.pedidos_omie?.find(p => p.nota_fiscal_vinculada);
          const nota = pedidoComNota?.nota_fiscal_vinculada || req.nota_fiscal_vinculada;
          const itensNfe = nota?.itens || (req.pedidos_omie?.[0]?.itens || req.itens || []).map(i => ({
            codigo: i.codigo || i.codigo_item || 'PRD001',
            descricao: i.descricao
          }));
          autoMap[req.id] = {};
          itensNfe.forEach(itemNf => {
            const produtoExiste = dataProd.find(p => 
              (itemNf.codigo && p.codigo === itemNf.codigo) ||
              (p.descricao && itemNf.descricao && p.descricao.toLowerCase().trim() === itemNf.descricao.toLowerCase().trim())
            );
            if (produtoExiste) {
              autoMap[req.id][itemNf.codigo] = produtoExiste.codigo;
            }
          });
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

  const handleLiberarEntrada = async (reqId) => {
    setLiberandoId(reqId);
    try {
      const response = await fetch(`/api/requisicoes/${reqId}/simular-nfe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) {
        await fetch(`/api/requisicoes/${reqId}/avancar-etapa`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ novoStatus: 'concluido' })
        });
      }
      alert('NF-e vinculada com sucesso! O pedido agora está disponível para conferência de estoque abaixo.');
      fetchDados();
    } catch (error) {
      console.error(error);
      alert('Erro ao liberar entrada do pedido.');
    } finally {
      setLiberandoId(null);
    }
  };

  const handleConcluirRecebimento = async (req) => {
    setConcluindo(true);
    try {
      const maps = mapeamentos[req.id] || {};

      // Se a requisição ainda não tem nota_fiscal_vinculada salva nos pedidos, persiste antes via PUT
      if (!req.pedidos_omie?.some(p => p.nota_fiscal_vinculada)) {
        const pedidosAtualizados = (req.pedidos_omie && req.pedidos_omie.length > 0 ? req.pedidos_omie : [{}]).map(p => {
          const fornId = p.fornecedorId || req.itens?.[0]?.cotacoes?.[0]?.fornecedorId;
          const fornObj = fornecedores.find(f => String(f.codigo_cliente_omie) === String(fornId));
            const chaveBruta = req.chaveNfe || req.nota_fiscal_vinculada?.chaveAcesso || '';
            const chaveLimpa = chaveBruta && !chaveBruta.startsWith('352609') ? chaveBruta : '';
            return {
              ...p,
              fornecedorId: fornId,
              valorTotal: p.valorTotal || req.itens?.reduce((acc, i) => acc + (Number(i.quantidade) * Number(i.valor_unitario || 0)), 0) || 0,
              nota_fiscal_vinculada: req.nota_fiscal_vinculada ? {
                ...req.nota_fiscal_vinculada,
                chaveAcesso: chaveLimpa
              } : {
                chaveAcesso: chaveLimpa,
                numeroNF: req.nota_fiscal || '',
                emitente: {
                  nome: getNomeFornecedor(fornId) || 'Fornecedor',
                  cnpj_cpf: fornObj?.cnpj_cpf || 'Não informado'
                },
                dataEmissao: req.dataCriacao || new Date().toISOString(),
                valorTotal: p.valorTotal || req.itens?.reduce((acc, i) => acc + (Number(i.quantidade) * Number(i.valor_unitario || 0)), 0) || 0,
                itens: (p.itens || req.itens || []).map(i => ({
                  codigo: i.codigo || i.codigo_item || 'PRD001',
                  descricao: i.descricao || 'Item do Pedido',
                  quantidade: Number(i.quantidade) || 1,
                  valorUnitario: Number(i.valor_unitario) || 0,
                  valorTotal: (Number(i.quantidade) || 1) * (Number(i.valor_unitario) || 0)
                })),
                status: 'recebida'
              }
            };
        });

        await fetch(`/api/requisicoes/${req.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pedidos_omie: pedidosAtualizados })
        });
      }

      const res = await fetch(`/api/estoque/receber-nota/${req.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mapeamentoItens: maps })
      });

      if (!res.ok) throw new Error('Falha no recebimento');

      alert('Mapeamento salvo com sucesso! Ordem de Recebimento enviada para o Almoxarifado.\n\nO Almoxarife já pode conferir e receber fisicamente no módulo Almoxarifado > Recebimento.');
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
          <div className={styles.iconHighlight}>
            <PackagePlus size={28} />
          </div>
          <div>
            <h2>Entrada no Estoque</h2>
            <p>Recebimento físico de mercadorias via NF-e</p>
          </div>
        </div>
      </header>

      {/* Banner de alerta se houver divergência pendente no Almoxarifado */}
      {requisicoesEntregues.some(r => r.divergencia && r.divergencia.status === 'pendente_compras') && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderLeft: '4px solid var(--cor-erro)',
          borderRadius: '8px',
          padding: '14px 18px',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertCircle size={22} color="var(--cor-erro)" />
            <div>
              <strong style={{ color: 'var(--cor-erro)', fontSize: '0.95rem' }}>
                Atenção Compras: O Almoxarifado reportou entrega com falta física!
              </strong>
              <p style={{ margin: '2px 0 0 0', color: 'var(--cor-texto-secundario)', fontSize: '0.85rem' }}>
                Existem pedidos recebidos parcialmente que precisam da sua decisão comercial (abatimento no boleto ou nota de devolução).
              </p>
            </div>
          </div>
          {setView && (
            <button
              type="button"
              onClick={() => setView('divergencias')}
              style={{
                background: 'var(--cor-erro)',
                color: 'var(--cor-texto-inverso)',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                fontWeight: 'bold',
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              Resolver na Central de Divergências →
            </button>
          )}
        </div>
      )}

      {/* ABAS DE NAVEGAÇÃO DA ENTRADA */}
      <div className={styles.tabsContainer}>
        <button
          type="button"
          className={`${styles.tabBtn} ${abaAtiva === 'pendentes' ? styles.tabBtnActive : ''}`}
          onClick={() => setAbaAtiva('pendentes')}
        >
          <PackagePlus size={18} />
          <span>Pendentes de Entrada ({requisicoes.length})</span>
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${abaAtiva === 'recebidos' ? styles.tabBtnActive : ''}`}
          onClick={() => setAbaAtiva('recebidos')}
        >
          <CheckCircle2 size={18} color={abaAtiva === 'recebidos' ? 'var(--cor-sucesso)' : undefined} />
          <span>Recebidos no Almoxarifado ({requisicoesEntregues.length})</span>
        </button>
      </div>

      {abaAtiva === 'pendentes' && (
        <>
          {requisicoesAguardando.length > 0 && (
            <div className={styles.bannerAguardando}>
              <div className={styles.bannerAguardandoHeader}>
                <div className={styles.bannerAguardandoTitulo}>
                  <Clock size={20} color="#f59e0b" />
                  <strong>{requisicoesAguardando.length} pedido(s) aguardando faturamento / NF-e na etapa anterior</strong>
                </div>
                {setView && (
                  <button 
                    type="button"
                    onClick={() => setView('compras')}
                    className={styles.btnIrAguardando}
                  >
                    Ver Pedidos em Compras →
                  </button>
                )}
              </div>
              <p className={styles.bannerAguardandoSub}>
                Estes pedidos foram fechados em Compras. Se a mercadoria já chegou ou se deseja liberar a conferência de estoque agora, clique em <strong>Liberar Entrada Agora</strong>:
              </p>
              <div className={styles.bannerAguardandoLista}>
                {requisicoesAguardando.map(reqAguardando => (
                  <div key={reqAguardando.id} className={styles.bannerAguardandoItem}>
                    <div className={styles.bannerAguardandoInfo}>
                      <span className={styles.bannerBadgeId}>#{reqAguardando.id.split('-')[0]}</span>
                      <span className={styles.bannerItemDesc}>
                        {reqAguardando.itens?.[0]?.descricao || 'Item do Pedido'}
                        {reqAguardando.itens?.length > 1 ? ` (+${reqAguardando.itens.length - 1} itens)` : ''}
                      </span>
                      <span className={styles.bannerProjeto}>
                        Obra/Destino: {reqAguardando.projetoDestino || reqAguardando.projeto || 'Almoxarifado'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleLiberarEntrada(reqAguardando.id)}
                      disabled={liberandoId === reqAguardando.id}
                      className={styles.btnLiberarEntrada}
                      title="Vincular NF-e e disponibilizar imediatamente para conferência nesta tela"
                    >
                      <PackagePlus size={16} />
                      {liberandoId === reqAguardando.id ? 'Liberando...' : 'Liberar Entrada Agora'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {requisicoes.length === 0 ? (
            <div className={styles.empty}>
              <CheckCircle2 size={48} color="var(--cor-sucesso)" style={{ marginBottom: '16px' }} />
              <h3>Estoque em dia!</h3>
              <p>Nenhuma nota fiscal pendente de entrada.</p>
              {requisicoesEntregues.length > 0 && (
                <button
                  type="button"
                  onClick={() => setAbaAtiva('recebidos')}
                  className={styles.btnVerRecebidos}
                >
                  Ver {requisicoesEntregues.length} pedido(s) já recebidos no Almoxarifado →
                </button>
              )}
            </div>
          ) : (
            <div className={styles.lista}>
          {requisicoes.map(req => {
            const isExpanded = expandido === req.id;
            // Pegar a nota vinculada (do pedido, da requisição ou fallback inteligente)
            const pedidoComNota = req.pedidos_omie?.find(p => p.nota_fiscal_vinculada);
            const pedidoPrincipal = pedidoComNota || req.pedidos_omie?.[0];
            const fornId = pedidoPrincipal?.fornecedorId || req.itens?.[0]?.cotacoes?.[0]?.fornecedorId;
            const fornNome = getNomeFornecedor(fornId) || 'Fornecedor';
            const fornObj = fornecedores.find(f => String(f.codigo_cliente_omie) === String(fornId));
            const chaveBruta = req.chaveNfe || pedidoPrincipal?.chaveNfe || req.nota_fiscal_vinculada?.chaveAcesso || '';
            const chaveReal = chaveBruta && !chaveBruta.startsWith('352609') ? chaveBruta : '';

            const nota = pedidoComNota?.nota_fiscal_vinculada || req.nota_fiscal_vinculada || {
              chaveAcesso: chaveReal,
              numeroNF: req.nota_fiscal || pedidoPrincipal?.numeroNF || '',
              emitente: {
                nome: fornNome,
                cnpj_cpf: fornObj?.cnpj_cpf || 'Não informado'
              },
              dataEmissao: req.dataCriacao || new Date().toISOString(),
              valorTotal: pedidoPrincipal?.valorTotal || req.itens?.reduce((acc, i) => acc + (Number(i.quantidade) * Number(i.valor_unitario || 0)), 0) || 0,
              itens: (pedidoPrincipal?.itens || req.itens || []).map(i => ({
                codigo: i.codigo || i.codigo_item || 'PRD001',
                descricao: i.descricao || 'Item do Pedido',
                quantidade: Number(i.quantidade) || 1,
                valorUnitario: Number(i.valor_unitario) || 0,
                valorTotal: (Number(i.quantidade) || 1) * (Number(i.valor_unitario) || 0)
              }))
            };

            const itensNfe = nota.itens || [];
            const tudoMapeado = isTudoMapeado(req.id, itensNfe);

            const temChaveReal = nota.chaveAcesso && !nota.chaveAcesso.startsWith('352609');
            const displayNF = temChaveReal && nota.chaveAcesso.length === 44
              ? String(parseInt(nota.chaveAcesso.substring(25, 34), 10))
              : (nota.numeroNF || req.nota_fiscal || `PED-${String(req.id).slice(-6)}`);

            return (
              <div key={req.id} className={`${styles.card} ${isExpanded ? styles.expanded : ''}`}>

                <div className={styles.cardHeader} onClick={() => setExpandido(isExpanded ? null : req.id)}>
                  <div className={styles.cardInfo}>
                    <div className={`${styles.idBox} ${styles.nfeHighlight}`}>
                      <span className={styles.label}>{temChaveReal ? 'NF-e' : 'Pedido / Req'}</span>
                      <span className={styles.value}>{displayNF}</span>
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
                        Recebimento {temChaveReal ? `NF-e Nº ${displayNF}` : `Pedido #${req.id.split('-')[0]}`}
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
                          <label className={styles.infoLabel}>CNPJ / CPF</label>
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
                              <th style={{ textAlign: 'center', width: '50px' }}>Item</th>
                              <th style={{ textAlign: 'left', width: '150px' }}>Código Fornecedor</th>
                              <th style={{ textAlign: 'left' }}>Descrição do Produto</th>
                              <th style={{ textAlign: 'center', width: '70px' }}>Qtd</th>
                              <th style={{ textAlign: 'right', width: '120px' }}>V. Unitário</th>
                              <th style={{ textAlign: 'left', minWidth: '500px', width: '50%' }}>Situação (Destino)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {itensNfe.map((item, idx) => {
                              const selectedAction = mapeamentos[req.id]?.[item.codigo] || '';
                              const matchedProd = produtos.find(p => p.codigo === selectedAction || (p.codigo && selectedAction && p.codigo.toLowerCase() === selectedAction.toLowerCase()));

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
                                  <td className={styles.colSituacao}>
                                    {!selectedAction ? (
                                      <div className={styles.mappingActions}>
                                        <button 
                                          type="button"
                                          onClick={() => handleMapeamentoChange(req.id, item.codigo, `NOVO:${item.descricao}`)}
                                          className={`${styles.mappingBtn} ${styles.mappingBtnNovo}`}
                                        >
                                          <PlusCircle size={20} />
                                          Cadastrar como novo produto
                                        </button>
                                        <button 
                                          type="button"
                                          onClick={() => handleMapeamentoChange(req.id, item.codigo, 'ASSOCIAR:')}
                                          className={`${styles.mappingBtn} ${styles.mappingBtnAssociar}`}
                                        >
                                          <Link size={20} />
                                          Associar a produto existente
                                        </button>
                                        <button 
                                          type="button"
                                          onClick={() => handleMapeamentoChange(req.id, item.codigo, 'ignorar')}
                                          className={`${styles.mappingBtn} ${styles.mappingBtnIgnorar}`}
                                        >
                                          <Ban size={20} />
                                          Ignorar a importação
                                        </button>
                                      </div>
                                    ) : selectedAction === 'ignorar' ? (
                                      <div className={`${styles.mappingStateActive} ${styles.mappingStateIgnorado}`}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                          <Ban size={20} color="var(--cor-erro)" />
                                          <span className={styles.mappingStateLabel}>Ignorado</span>
                                          <span style={{ fontSize: '0.85rem', color: 'var(--cor-texto-secundario)', marginLeft: '4px' }}>(Item não entrará no estoque)</span>
                                        </div>
                                        <button 
                                          type="button"
                                          onClick={() => handleMapeamentoChange(req.id, item.codigo, '')}
                                          className={styles.mappingCancelBtn}
                                          title="Alterar decisão"
                                        >
                                          <X size={16} />
                                          Alterar
                                        </button>
                                      </div>
                                    ) : selectedAction.startsWith('NOVO:') ? (
                                      <div className={`${styles.mappingStateActive} ${styles.mappingStateNovo}`}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                                          <PlusCircle size={20} color="#38bdf8" />
                                          <span className={styles.mappingStateLabel}>Novo Produto:</span>
                                        </div>
                                        <input 
                                          value={selectedAction.substring(5)}
                                          onChange={(e) => handleMapeamentoChange(req.id, item.codigo, `NOVO:${e.target.value}`)}
                                          autoFocus
                                          placeholder="Digite o nome do novo produto a ser cadastrado..."
                                          className={styles.mappingInput}
                                        />
                                        <button 
                                          type="button"
                                          onClick={() => handleMapeamentoChange(req.id, item.codigo, '')}
                                          className={styles.mappingCancelBtn}
                                          title="Alterar decisão"
                                        >
                                          <X size={16} />
                                          Alterar
                                        </button>
                                      </div>
                                    ) : (
                                      <div className={`${styles.mappingStateActive} ${styles.mappingStateAssociado}`}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                                          <Link size={20} color="var(--cor-sucesso)" />
                                          <span className={styles.mappingStateLabel}>Associar Produto:</span>
                                        </div>
                                        <div className={styles.inputWithMatchedWrapper}>
                                          <input 
                                            list="opcoes-destino"
                                            value={selectedAction === 'ASSOCIAR:' ? '' : selectedAction}
                                            onChange={(e) => {
                                              const val = e.target.value;
                                              if (val === 'novo_produto') {
                                                handleMapeamentoChange(req.id, item.codigo, `NOVO:${item.descricao}`);
                                              } else if (val === 'ignorar') {
                                                handleMapeamentoChange(req.id, item.codigo, 'ignorar');
                                              } else {
                                                handleMapeamentoChange(req.id, item.codigo, val);
                                              }
                                            }}
                                            autoFocus={selectedAction === 'ASSOCIAR:'}
                                            placeholder="Pesquise o produto existente no estoque (código ou nome)..."
                                            className={styles.mappingInput}
                                          />
                                          {matchedProd && (
                                            <span className={styles.matchedBadge} title={matchedProd.descricao}>
                                              ✓ {matchedProd.descricao}
                                            </span>
                                          )}
                                        </div>
                                        <button 
                                          type="button"
                                          onClick={() => handleMapeamentoChange(req.id, item.codigo, '')}
                                          className={styles.mappingCancelBtn}
                                          title="Alterar decisão"
                                        >
                                          <X size={16} />
                                          Alterar
                                        </button>
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      <div className={styles.mappingFooterAcoes}>
                        {!tudoMapeado ? (
                          <div className={styles.statusMapeamentoIncompleto}>
                            <AlertCircle size={18} />
                            Defina a Situação de todos os itens para liberar o Recebimento.
                          </div>
                        ) : (
                          <div className={styles.statusMapeamentoCompleto}>
                            <CheckCircle2 size={18} />
                            Todos os itens mapeados. Pronto para dar entrada!
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => handleConcluirRecebimento(req)}
                          disabled={!tudoMapeado || concluindo}
                          className={styles.btnSalvarRecebimento}
                        >
                          <Save size={20} />
                          {concluindo ? 'Enviando...' : (req.mapeamento_concluido ? '✓ Reenviar ao Almoxarifado' : 'Salvar e Enviar para o Almoxarifado')}
                        </button>
                      </div>

                      {req.mapeamento_concluido && (
                        <div className={styles.ordemRecebimentoDespachada}>
                          <CheckCircle2 size={22} color="var(--cor-sucesso)" style={{ flexShrink: 0 }} />
                          <div>
                            <strong>Ordem de Recebimento Físico Despachada!</strong>
                            <p>
                              Esta mercadoria já está disponível para contagem e bipagem pelo Almoxarife no módulo <strong>Almoxarifado &gt; Recebimento</strong>.
                            </p>
                          </div>
                        </div>
                      )}

                    </div>

                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
        </>
      )}

      {abaAtiva === 'recebidos' && (
        requisicoesEntregues.length === 0 ? (
          <div className={styles.empty}>
            <PackageSearch size={48} color="var(--cor-texto-secundario)" style={{ marginBottom: '16px' }} />
            <h3>Nenhum pedido recebido ainda</h3>
            <p>Assim que o Almoxarifado conferir as mercadorias fisicamente no módulo Almoxarifado &gt; Recebimento, os pedidos estocados aparecerão aqui com data, horário e peças registradas.</p>
          </div>
        ) : (
          <div className={styles.lista}>
            {requisicoesEntregues.map(req => {
              const fornId = req.pedidos_omie?.[0]?.fornecedorId || req.itens?.[0]?.cotacoes?.[0]?.fornecedorId;
              const fornNome = getNomeFornecedor(fornId) || req.fornecedor || 'Fornecedor';
              const dataRec = req.dataRecebimentoFisico || req.recebimentoFisico?.data || req.atualizado_em;

              return (
                <div key={req.id} className={`${styles.card} ${styles.cardEntregue}`}>
                  <div className={styles.cardHeaderEntregue}>
                    <div className={styles.cardInfo}>
                      <div className={styles.idBox}>
                        <span className={styles.label}>Requisição</span>
                        <span className={styles.value}>#{req.id.split('-')[0]}</span>
                      </div>
                      {req.numeroOS && (
                        <div className={styles.detalhe}>
                          <span className={styles.label}>Ordem de Serviço</span>
                          <span className={styles.value} style={{ color: 'var(--cor-destaque)', fontWeight: 'bold' }}>
                            O.S. #{req.numeroOS}
                          </span>
                        </div>
                      )}
                      <div className={styles.detalhe}>
                        <span className={styles.label}>Fornecedor</span>
                        <span className={styles.value}>{fornNome}</span>
                      </div>
                      <div className={styles.detalhe}>
                        <span className={styles.label}>Destino / Obra</span>
                        <span className={styles.value}>{req.projetoDestino || req.projeto || req.departamento || 'Almoxarifado'}</span>
                      </div>
                      <div className={styles.detalhe}>
                        <span className={styles.label}>Data do Recebimento</span>
                        <span className={styles.value}>
                          {dataRec ? new Date(dataRec).toLocaleString('pt-BR') : 'Recentemente'}
                        </span>
                      </div>
                    </div>

                    {req.divergencia && (req.divergencia.valorDivergencia > 0 || req.status_compras === 'entregue_parcial') ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{
                          background: req.divergencia.status === 'resolvido' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                          color: req.divergencia.status === 'resolvido' ? 'var(--cor-sucesso)' : 'var(--cor-erro)',
                          border: `1px solid ${req.divergencia.status === 'resolvido' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                          padding: '6px 12px',
                          borderRadius: '20px',
                          fontSize: '0.8rem',
                          fontWeight: 'bold',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          <AlertCircle size={14} />
                          {req.divergencia.status === 'resolvido' ? '✓ Falta Resolvida' : `⚠️ Recebido com Falta (R$ ${Number(req.divergencia.valorDivergencia || 0).toFixed(2)})`}
                        </span>
                        {setView && req.divergencia.status !== 'resolvido' && (
                          <button
                            type="button"
                            onClick={() => setView('divergencias')}
                            style={{
                              background: 'var(--cor-erro)',
                              color: 'var(--cor-texto-inverso)',
                              border: 'none',
                              padding: '6px 12px',
                              borderRadius: '6px',
                              fontSize: '0.78rem',
                              fontWeight: 'bold',
                              cursor: 'pointer'
                            }}
                          >
                            Resolver Falta →
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className={styles.badgeRecebidoAlmox}>
                        <CheckCircle2 size={16} />
                        <span>Recebido pelo Almoxarifado</span>
                      </div>
                    )}
                  </div>

                  <div className={styles.corpoEntregue}>
                    <div className={styles.resumoEstoqueMsg}>
                      <Check size={18} color="var(--cor-sucesso)" />
                      <span>
                        <strong>Conferência física concluída!</strong> As peças contadas entraram no <strong>Estoque Físico</strong>.
                      </span>
                    </div>

                    <div className={styles.tabelaEntregueContainer}>
                      <table className={styles.tabelaEntregue}>
                        <thead>
                          <tr>
                            <th>Código</th>
                            <th>Descrição do Produto</th>
                            <th style={{ textAlign: 'center' }}>Qtd. Esperada</th>
                            <th style={{ textAlign: 'center' }}>Qtd. Recebida</th>
                            <th style={{ textAlign: 'center' }}>Status no Estoque</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(req.itens || req.pedidos_omie?.[0]?.itens || []).map((item, idx) => {
                            const cod = item.codigo || item.codigo_item || 'PRD';
                            const esperado = Number(item.quantidade || item.quantidadeEsperada || 1);
                            const recebido = req.recebimentoFisico?.itensRecebidos?.[cod] !== undefined
                              ? Number(req.recebimentoFisico?.itensRecebidos?.[cod])
                              : esperado;
                            const teveFalta = recebido < esperado;

                            return (
                              <tr key={idx}>
                                <td style={{ fontWeight: '600', color: 'var(--cor-destaque)' }}>
                                  {cod}
                                </td>
                                <td>{item.descricao}</td>
                                <td style={{ textAlign: 'center', color: 'var(--cor-texto-secundario)' }}>
                                  {esperado} {item.unidade || 'UN'}
                                </td>
                                <td style={{ textAlign: 'center', fontWeight: 'bold', color: teveFalta ? 'var(--cor-erro)' : 'var(--cor-sucesso)', fontSize: '1rem' }}>
                                  {recebido} {item.unidade || 'UN'}
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  {teveFalta ? (
                                    <span style={{ color: 'var(--cor-erro)', fontWeight: 'bold', fontSize: '0.8rem' }}>
                                      ⚠️ Faltou {esperado - recebido} un
                                    </span>
                                  ) : (
                                    <span className={styles.badgeEstoqueOk}>
                                      <CheckCircle2 size={14} /> Em Estoque
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {req.recebimentoFisico?.observacao && (
                      <div className={styles.obsRecebimento}>
                        <strong>Observação do Almoxarife:</strong> {req.recebimentoFisico.observacao}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
};

export default EntradaEstoque;
