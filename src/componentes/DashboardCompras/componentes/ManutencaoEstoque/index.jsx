import React, { useState, useEffect } from 'react';
import { Wrench, Edit2, Save, Check, RefreshCw, Server } from 'lucide-react';
import styles from './ManutencaoEstoque.module.css';

const ManutencaoEstoque = () => {
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [syncingId, setSyncingId] = useState(null);
  const [syncingBulk, setSyncingBulk] = useState(false);

  const fetchProdutos = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/produtos');
      if (!res.ok) throw new Error('Falha ao buscar produtos');
      const data = await res.json();
      setProdutos(data);
    } catch (err) {
      console.error(err);
      alert('Erro ao carregar produtos. Verifique se o backend está rodando.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProdutos();
  }, []);

  const handleEdit = (prod) => {
    setEditingId(prod.codigo);
    setEditValue(prod.estoque_minimo || 0);
  };

  const handleSave = async (codigo) => {
    try {
      const val = parseInt(editValue);
      if (isNaN(val) || val < 0) {
        alert('Valor inválido');
        return;
      }

      const res = await fetch(`/api/produtos/${codigo}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estoque_minimo: val })
      });

      if (!res.ok) throw new Error('Falha ao atualizar');

      // Atualiza o estado local para evitar recarregar tudo
      setProdutos(produtos.map(p => p.codigo === codigo ? { ...p, estoque_minimo: val } : p));
      setEditingId(null);
    } catch (err) {
      alert('Erro ao salvar: ' + err.message);
    }
  };

  const handleSyncEstoque = async (codigo) => {
    try {
      setSyncingId(codigo);
      const res = await fetch(`/api/produtos/${codigo}/sync-estoque`);
      if (!res.ok) throw new Error('Falha ao sincronizar');
      
      const data = await res.json();
      setProdutos(produtos.map(p => p.codigo === codigo ? { ...p, quantidade_estoque: data.saldo } : p));
      
    } catch (err) {
      alert('Erro ao puxar saldo da Omie: ' + err.message);
    } finally {
      setSyncingId(null);
    }
  };

  const handleSyncBulk = async () => {
    if (!window.confirm("Essa operação vai consultar a Omie para os primeiros 50 itens. Pode demorar. Deseja continuar?")) return;
    
    try {
      setSyncingBulk(true);
      const res = await fetch(`/api/produtos/sync-todos-estoque`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 50 })
      });
      if (!res.ok) throw new Error('Falha ao sincronizar em lote');
      
      const data = await res.json();
      alert(data.message);
      await fetchProdutos(); // Recarrega a tabela toda
      
    } catch (err) {
      alert('Erro na sincronização em lote: ' + err.message);
    } finally {
      setSyncingBulk(false);
    }
  };

  const filtered = produtos.filter(p => 
    p.descricao.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.codigo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerTitle}>
          <div className={styles.iconHighlight}>
            <Wrench size={28} />
          </div>
          <div>
            <h2>Manutenção de Parâmetros de Estoque</h2>
            <p>Defina o Estoque Mínimo para acionar a Necessidade de Compras</p>
          </div>
        </div>
        <button 
          className={styles.btnSave} 
          onClick={handleSyncBulk} 
          disabled={syncingBulk}
          style={{ background: 'var(--cor-destaque)' }}
        >
          {syncingBulk ? <RefreshCw size={18} className={styles.spin} /> : <Server size={18} />}
          {syncingBulk ? " Sincronizando Omie..." : " Sincronizar Todos os Saldos 🚀"}
        </button>
      </header>
      
      <div className={styles.content}>
        <input 
          type="text" 
          placeholder="Pesquisar por código ou descrição..." 
          className={styles.searchBar}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        {loading ? (
          <p style={{ textAlign: 'center', padding: '20px' }}>Carregando catálogo...</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Código</th>
                <th>Descrição do Produto</th>
                <th style={{ textAlign: 'center' }}>Estoque Físico</th>
                <th style={{ textAlign: 'center' }}>Estoque Mínimo</th>
                <th style={{ textAlign: 'center' }}>Ação</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 100).map(prod => (
                <tr key={prod.codigo}>
                  <td><span className={styles.codigo}>{prod.codigo}</span></td>
                  <td style={{ fontWeight: 500 }}>{prod.descricao}</td>
                  <td style={{ textAlign: 'center' }}>{prod.quantidade_estoque || 0}</td>
                  <td style={{ textAlign: 'center' }}>
                    {editingId === prod.codigo ? (
                      <input 
                        type="number" 
                        className={styles.inputMinimo}
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        autoFocus
                      />
                    ) : (
                      <span style={{ fontWeight: 'bold', color: prod.estoque_minimo > (prod.quantidade_estoque || 0) ? 'var(--cor-erro)' : 'inherit' }}>
                        {prod.estoque_minimo || 0}
                      </span>
                    )}
                  </td>
                  <td style={{ textAlign: 'center', display: 'flex', gap: '8px', justifyContent: 'center' }}>
                    {editingId === prod.codigo ? (
                      <button className={styles.btnSave} onClick={() => handleSave(prod.codigo)}>
                        <Check size={16} /> Salvar
                      </button>
                    ) : (
                      <button className={styles.btnEdit} onClick={() => handleEdit(prod)} title="Editar Estoque Mínimo">
                        <Edit2 size={18} />
                      </button>
                    )}
                    
                    <button 
                      className={styles.btnEdit} 
                      onClick={() => handleSyncEstoque(prod.codigo)} 
                      disabled={syncingId === prod.codigo}
                      title="Puxar Saldo Exato da Omie agora"
                      style={{ color: 'var(--cor-sucesso)' }}
                    >
                      <RefreshCw size={18} className={syncingId === prod.codigo ? styles.spin : ""} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default ManutencaoEstoque;
