import React, { useState, useEffect } from 'react';
import { AlertTriangle, Plus, ShoppingCart, Send, X, PackagePlus, Box, Cloud, Printer, Copy, Paperclip, History, Trash2, PlusCircle, Edit } from 'lucide-react';
import styles from './NecessidadeCompras.module.css';

const NecessidadeCompras = ({ produtos, onUpdate }) => {
  const [selecionados, setSelecionados] = useState([]);
  const [modalAvulso, setModalAvulso] = useState(false);
  const [modalConfirmacao, setModalConfirmacao] = useState(false);
  const [projetos, setProjetos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState(null);

  // Itens finais que vão para o modal de confirmação
  const [itensConfirmacao, setItensConfirmacao] = useState([]);

  const [formAvulso, setFormAvulso] = useState({
    descricao: '',
    quantidade: 1
  });

  const [projetoGlobal, setProjetoGlobal] = useState('');
  const [sugestaoEntrega, setSugestaoEntrega] = useState('');
  const [categoriaCompra, setCategoriaCompra] = useState('Compra de Material Para Uso e Consumo');

  // Filtra itens abaixo do estoque
  const produtosEmAlerta = produtos.filter(p => p.estoque_minimo > 0 && (p.quantidade_estoque || 0) <= p.estoque_minimo && (p.quantidade_pedida || 0) === 0);

  useEffect(() => {
    const fetchProjetos = async () => {
      try {
        const res = await fetch('/api/projetos');
        if (res.ok) setProjetos(await res.json());
      } catch (err) {
        console.error('Erro ao buscar projetos:', err);
      }
    };
    fetchProjetos();
  }, []);

  const handleToggleSelectAll = (e) => {
    if (e.target.checked) {
      setSelecionados(produtosEmAlerta.map(p => p.codigo));
    } else {
      setSelecionados([]);
    }
  };

  const handleToggleSelect = (codigo) => {
    if (selecionados.includes(codigo)) {
      setSelecionados(selecionados.filter(c => c !== codigo));
    } else {
      setSelecionados([...selecionados, codigo]);
    }
  };

  const abrirModalConfirmacao = () => {
    const itens = produtosEmAlerta
      .filter(p => selecionados.includes(p.codigo))
      .map(p => ({
        idLocal: Date.now() + Math.random(),
        tipo: 'reposicao',
        codigo: p.codigo,
        descricao: p.descricao,
        valor_unitario: p.valor_unitario || 0,
        quantidade: 1
      }));
    setItensConfirmacao(itens);
    setModalConfirmacao(true);
  };

  const handleSalvarAvulso = () => {
    if (!formAvulso.descricao.trim()) return;
    
    // Adiciona o avulso na lista de itens da confirmação (ou se o modal estiver fechado, abre o modal direto)
    const novoAvulso = {
      id: `NOVO-${Date.now()}`,
      tipo: 'avulso',
      codigo: 'NOVO',
      descricao: formAvulso.descricao.trim().toUpperCase(),
      quantidade: Number(formAvulso.quantidade) || 1,
      valor_unitario: 0
    };

    setItensConfirmacao([...itensConfirmacao, novoAvulso]);
    
    // Se o modal de confirmação ainda não estava aberto, abre
    if (!modalConfirmacao) {
      setModalConfirmacao(true);
    }

    setModalAvulso(false);
    setFormAvulso({ descricao: '', quantidade: 1 });
  };

  const removerDaConfirmacao = (idLocal) => {
    setItensConfirmacao(itensConfirmacao.filter(i => i.idLocal !== idLocal));
  };

  const handleEnviarNecessidade = async () => {
    if (itensConfirmacao.length === 0) return;
    
    setLoading(true);
    setMensagem(null);

    const requisicaoData = {
      tipo: 'reposicao', // Mesmo sendo misto, vai pra Compras como reposição/necessidade
      status_compras: 'pendente_cotacao',
      dataRequisicao: new Date().toISOString(),
      sugestaoEntrega: sugestaoEntrega,
      projetoDestino: projetoGlobal,
      categoriaCompra: categoriaCompra,
      solicitante: 'Almoxarifado (Central)',
      itens: itensConfirmacao.map(item => ({
        codigo: item.codigo,
        descricao: item.descricao,
        quantidade: item.quantidade,
        valor_unitario: item.valor_unitario || 0,
        isAvulso: item.tipo === 'avulso'
      }))
    };

    try {
      const response = await fetch('/api/requisicoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requisicaoData)
      });

      if (!response.ok) throw new Error('Erro ao enviar necessidade de compras');

      setMensagem({ tipo: 'sucesso', texto: 'Necessidade enviada para Compras com sucesso!' });
      setSelecionados([]);
      setItensConfirmacao([]);
      setModalConfirmacao(false);
      if (onUpdate) onUpdate();
      
      setTimeout(() => setMensagem(null), 5000);
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerIcon}>
          <ShoppingCart size={32} />
        </div>
        <div className={styles.headerText}>
          <h1>Necessidade de Compras</h1>
          <p>Envie solicitações de reposição de estoque ou de produtos novos.</p>
        </div>
      </div>

      {mensagem && (
        <div style={{ padding: '16px', borderRadius: '8px', background: mensagem.tipo === 'sucesso' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)', color: mensagem.tipo === 'sucesso' ? 'var(--cor-sucesso)' : 'var(--cor-erro)', border: `1px solid ${mensagem.tipo === 'sucesso' ? 'var(--cor-sucesso)' : 'var(--cor-erro)'}` }}>
          {mensagem.texto}
        </div>
      )}

      {/* Seção 1: Alertas do Sistema */}
      <div className={styles.section}>
        <div className={styles.actionBar}>
          <div className={styles.actionBarText}>
            <h3><AlertTriangle size={24} /> Ação Necessária</h3>
            <p>Selecione os produtos abaixo do estoque mínimo que você deseja pedir reposição para o setor de Compras.</p>
          </div>
          
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <button className={styles.btnAvulsoTopo} onClick={() => setModalAvulso(true)}>
              <PackagePlus size={20} />
              Produto Novo
            </button>

            <button 
              className={styles.btnGerarReq} 
              onClick={abrirModalConfirmacao}
              disabled={selecionados.length === 0}
            >
              <ShoppingCart size={20} />
              {selecionados.length > 0 ? `Requisição (${selecionados.length})` : 'Requisição'}
            </button>
          </div>
        </div>

        {produtosEmAlerta.length === 0 ? (
          <p style={{ color: 'var(--cor-texto-secundario)', marginTop: '1rem' }}>Nenhum produto abaixo do estoque mínimo no momento.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.checkboxCell}>
                  <input 
                    type="checkbox" 
                    onChange={handleToggleSelectAll}
                    checked={selecionados.length > 0 && selecionados.length === produtosEmAlerta.length}
                  />
                </th>
                <th>Código</th>
                <th>Descrição</th>
                <th>Estoque Atual</th>
                <th>Mínimo</th>
              </tr>
            </thead>
            <tbody>
              {produtosEmAlerta.map(prod => {
                const isSelected = selecionados.includes(prod.codigo);
                return (
                  <tr key={prod.codigo_produto || prod.codigo} className={isSelected ? styles.selected : ''} onClick={() => handleToggleSelect(prod.codigo)} style={{ cursor: 'pointer' }}>
                    <td className={styles.checkboxCell} onClick={e => e.stopPropagation()}>
                      <input 
                        type="checkbox" 
                        checked={isSelected}
                        onChange={() => handleToggleSelect(prod.codigo)}
                      />
                    </td>
                    <td>
                      <span className={styles.productCode}>
                        <Box size={14} style={{ opacity: 0.7 }} /> {prod.codigo || '-'}
                      </span>
                    </td>
                    <td>
                      <span className={styles.productTitle}>
                        {prod.descricao || 'Produto sem nome'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', fontWeight: 'bold' }}>
                          <span style={{ color: 'var(--cor-sucesso)', backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                            {prod.quantidade_estoque || 0}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', fontWeight: 'bold' }}>
                          <span style={{ color: 'var(--cor-erro)', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                            {prod.estoque_minimo || 0}
                          </span>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal de Confirmação (Estilo Padrão Yama) */}
      {modalConfirmacao && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalConfirmacaoContent}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--cor-texto-principal)' }}>
                <ShoppingCart size={24} color="var(--cor-destaque)" />
                Confirmar Requisição para Compras
              </h3>
              <button 
                onClick={() => setModalConfirmacao(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--cor-texto-secundario)', cursor: 'pointer' }}
              >
                <X size={24} />
              </button>
            </div>

            <div className={styles.modalConfirmacaoScroll}>
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                <div className={styles.formGroup} style={{ flex: 1 }}>
                  <label>Categoria da Compra</label>
                  <select 
                    value={categoriaCompra}
                    onChange={(e) => setCategoriaCompra(e.target.value)}
                    style={{ background: 'var(--cor-fundo-secundario)', border: '1px solid var(--cor-borda-cartao)', padding: '10px', borderRadius: '8px', color: 'var(--cor-texto-principal)' }}
                  >
                    <option>Compra de Material Para Uso e Consumo</option>
                    <option>Reposição de Estoque</option>
                    <option>Uso e Consumo / Reposição de Estoque</option>
                  </select>
                </div>
                
                <div className={styles.formGroup} style={{ flex: 1 }}>
                  <label>Projeto Destino</label>
                  <input 
                    type="text" 
                    list="projetos-list"
                    placeholder="Buscar projeto..."
                    value={projetoGlobal}
                    onChange={(e) => setProjetoGlobal(e.target.value.toUpperCase())}
                  />
                  <datalist id="projetos-list">
                    {projetos.map(p => (
                      <option key={p.codigo} value={p.nome} />
                    ))}
                  </datalist>
                </div>

                <div className={styles.formGroup} style={{ flex: 1 }}>
                  <label>Sugestão de Entrega</label>
                  <input 
                    type="date" 
                    value={sugestaoEntrega}
                    onChange={(e) => setSugestaoEntrega(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h4 style={{ margin: 0, color: 'var(--cor-texto-principal)' }}>Itens da Requisição</h4>
                <button 
                  onClick={() => setModalAvulso(true)}
                  style={{ background: 'var(--cor-fundo-sutil)', border: '1px solid var(--cor-borda-cartao)', padding: '6px 12px', borderRadius: '6px', color: 'var(--cor-texto-principal)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', fontWeight: 'bold' }}
                >
                  <Plus size={14} /> Adicionar Produto Novo
                </button>
              </div>

              <table className={styles.table}>
                <thead>
                  <tr>
                    <th style={{ width: '40px', textAlign: 'center' }}>#</th>
                    <th>Código</th>
                    <th>Descrição do Produto</th>
                    <th style={{ textAlign: 'center' }}>Quantidade</th>
                  </tr>
                </thead>
                <tbody>
                  {itensConfirmacao.length === 0 && (
                    <tr><td colSpan="4" style={{ textAlign: 'center', padding: '2rem', color: 'var(--cor-texto-secundario)' }}>Nenhum item na lista.</td></tr>
                  )}
                  {itensConfirmacao.map((item, index) => (
                    <tr key={item.idLocal}>
                      <td style={{ textAlign: 'center', fontWeight: 'bold', color: 'var(--cor-texto-secundario)' }}>{index + 1}</td>
                      <td>
                        <span className={styles.productCode}>{item.codigo}</span>
                      </td>
                      <td>
                        <span className={styles.productTitle}>
                          {item.descricao}
                          {item.tipo === 'avulso' && <span style={{ marginLeft: '8px', fontSize: '0.65rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--cor-erro)', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>NOVO</span>}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <input 
                          type="number" 
                          min="1" 
                          value={item.quantidade} 
                          onChange={(e) => {
                            const val = e.target.value;
                            setItensConfirmacao(itensConfirmacao.map(i => i.idLocal === item.idLocal ? { ...i, quantidade: val } : i));
                          }}
                          style={{ width: '80px', padding: '6px', border: '1px solid var(--cor-borda-cartao)', borderRadius: '6px', textAlign: 'center', background: 'var(--cor-fundo-secundario)', color: 'var(--cor-texto-principal)' }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className={styles.modalActions}>
              <button className={styles.btnCancelar} onClick={() => setModalConfirmacao(false)}>
                Cancelar
              </button>
              <button 
                className={styles.btnSalvar} 
                onClick={handleEnviarNecessidade}
                disabled={loading || itensConfirmacao.length === 0}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Send size={18} /> {loading ? 'Enviando...' : 'Enviar para Compras'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Modal Avulso */}
      {modalAvulso && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3>Solicitar Novo Produto</h3>
            <div className={styles.formGroup}>
              <label>Descrição do Item (O que deseja pedir?)</label>
              <input 
                autoFocus
                type="text" 
                placeholder="Ex: TABLET SAMSUNG 10 POL..."
                value={formAvulso.descricao}
                onChange={(e) => setFormAvulso({...formAvulso, descricao: e.target.value.toUpperCase()})}
              />
            </div>
            
            <div className={styles.formGroup}>
              <label>Quantidade</label>
              <input 
                type="number" 
                min="1"
                value={formAvulso.quantidade}
                onChange={(e) => setFormAvulso({...formAvulso, quantidade: e.target.value})}
              />
            </div>

            <div className={styles.modalActions}>
              <button className={styles.btnCancelar} onClick={() => setModalAvulso(false)}>Cancelar</button>
              <button className={styles.btnSalvar} onClick={handleSalvarAvulso} disabled={!formAvulso.descricao.trim()}>Adicionar Pedido</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default NecessidadeCompras;
