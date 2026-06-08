import React, { useState, useMemo } from 'react';
import { AlertTriangle, Trash2, Calendar, Package, Info } from 'lucide-react';
import styles from './ValidacaoProduto.module.css';

const ValidacaoProduto = ({ produtos, fetchProdutosGlobal }) => {
  const [abaAberta, setAbaAberta] = useState('vencidos'); // 'vencidos' | 'proximos' | 'no-prazo' | 'todos'
  
  // Estado do Modal de Descarte
  const [produtoDescarte, setProdutoDescarte] = useState(null);
  const [formDescarte, setFormDescarte] = useState({ quantidade: '', observacao: '', nome: '', senha: '' });
  const [loadingDescarte, setLoadingDescarte] = useState(false);

  const produtosValidade = useMemo(() => {
    const comValidade = produtos.filter(p => p.produto_lote === 'S' && p.data_validade);
    
    // Sort by expiration date ascending (FEFO - First Expired, First Out)
    comValidade.sort((a, b) => new Date(a.data_validade) - new Date(b.data_validade));

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    const limiteProximo = new Date();
    limiteProximo.setDate(limiteProximo.getDate() + 30); // 30 days threshold

    return comValidade.map(p => {
      const dataVal = new Date(p.data_validade);
      // Ajuste para evitar fuso horário mudando o dia
      const utcDate = new Date(dataVal.getTime() + dataVal.getTimezoneOffset() * 60000);
      
      let status = 'no-prazo';
      if (utcDate < hoje) {
        status = 'vencidos';
      } else if (utcDate <= limiteProximo) {
        status = 'proximos';
      }

      return { ...p, statusValidade: status, utcDate };
    });
  }, [produtos]);

  const filtrados = produtosValidade.filter(p => {
    if (abaAberta === 'todos') return true;
    return p.statusValidade === abaAberta;
  });

  const contadores = {
    todos: produtosValidade.length,
    vencidos: produtosValidade.filter(p => p.statusValidade === 'vencidos').length,
    proximos: produtosValidade.filter(p => p.statusValidade === 'proximos').length,
    'no-prazo': produtosValidade.filter(p => p.statusValidade === 'no-prazo').length
  };

  const handleDescarteClick = (produto) => {
    setProdutoDescarte(produto);
    setFormDescarte({ quantidade: '1', observacao: '', nome: '', senha: '' });
  };

  const confirmarDescarte = async () => {
    if (!formDescarte.quantidade || !formDescarte.nome || !formDescarte.senha) {
      alert('Preencha todos os campos!');
      return;
    }

    const quantidade = Number(formDescarte.quantidade);
    if (isNaN(quantidade) || quantidade <= 0) {
      alert('Quantidade inválida.');
      return;
    }

    if (quantidade > produtoDescarte.quantidade_estoque) {
      alert(`Você não pode descartar mais do que tem no estoque (${produtoDescarte.quantidade_estoque}).`);
      return;
    }

    setLoadingDescarte(true);
    try {
      const response = await fetch(`http://localhost:3000/api/produtos/${produtoDescarte.codigo}/descarte`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          quantidade, 
          motivo: 'Vencimento da validade',
          observacao: formDescarte.observacao,
          usuario: formDescarte.nome // Simulando envio de login
        })
      });

      if (!response.ok) throw new Error('Falha ao registrar descarte');
      
      alert('Descarte registrado com sucesso!');
      fetchProdutosGlobal(); // Reload products to update stock
      setProdutoDescarte(null);
    } catch (error) {
      console.error(error);
      alert('Erro ao registrar o descarte.');
    } finally {
      setLoadingDescarte(false);
    }
  };

  return (
    <div className={styles['container']}>
      <header className={styles['header']}>
        <div className={styles['icon-highlight']}>
          <AlertTriangle size={28} />
        </div>
        <div>
          <h2>Controle de Validade (FEFO)</h2>
          <p>Acompanhamento de vencimentos e política de "Primeiro a Vencer, Primeiro a Sair"</p>
        </div>
      </header>

      <div className={styles['tabs']}>
        <button 
          className={`${styles['tab']} ${abaAberta === 'todos' ? styles['active'] : ''}`}
          onClick={() => setAbaAberta('todos')}
        >
          Todos ({contadores.todos})
        </button>
        <button 
          className={`${styles['tab']} ${abaAberta === 'vencidos' ? styles['active'] : ''}`}
          onClick={() => setAbaAberta('vencidos')}
        >
          Vencidos ({contadores.vencidos})
        </button>
        <button 
          className={`${styles['tab']} ${abaAberta === 'proximos' ? styles['active'] : ''}`}
          onClick={() => setAbaAberta('proximos')}
        >
          Próximos do Vencimento ({contadores.proximos})
        </button>
        <button 
          className={`${styles['tab']} ${abaAberta === 'no-prazo' ? styles['active'] : ''}`}
          onClick={() => setAbaAberta('no-prazo')}
        >
          No Prazo ({contadores['no-prazo']})
        </button>
      </div>

      <div className={styles['list-container']}>
        {filtrados.length === 0 ? (
          <div className={styles['empty-state']}>
            <p>Nenhum produto encontrado nesta categoria.</p>
          </div>
        ) : (
          filtrados.map(prod => {
            let cardClass = styles['card'];
            if (prod.statusValidade === 'vencidos') cardClass += ` ${styles['vencido']}`;
            if (prod.statusValidade === 'proximos') cardClass += ` ${styles['proximo']}`;
            if (prod.statusValidade === 'no-prazo') cardClass += ` ${styles['no-prazo']}`;

            let dataClass = styles['data-ok'];
            if (prod.statusValidade === 'vencidos') dataClass = styles['data-vencida'];
            if (prod.statusValidade === 'proximos') dataClass = styles['data-proxima'];

            return (
              <div key={prod.codigo} className={cardClass}>
                <div className={styles['info-box']}>
                  <div className={styles['prod-title']}>
                    <span className={styles['badge-codigo']}>{prod.codigo}</span>
                    {prod.descricao}
                  </div>
                  <div className={styles['detalhes']}>
                    <span><Package size={14} /> Estoque: <strong>{prod.quantidade_estoque || 0}</strong> {prod.unidade}</span>
                    <span><Info size={14} /> Marca: {prod.marca || prod.caracteristicas?.find(c => c.cNomeCaract?.toUpperCase() === 'MARCA')?.cConteudo || '-'}</span>
                  </div>
                </div>

                <div className={styles['validade-box']}>
                  <div className={dataClass}>
                    <Calendar size={14} style={{ marginRight: '4px', verticalAlign: 'text-bottom' }} />
                    {prod.utcDate.toLocaleDateString('pt-BR')}
                  </div>
                  {(prod.statusValidade === 'vencidos' || prod.statusValidade === 'proximos') && (
                    <button 
                      className={styles['btn-descarte']}
                      onClick={() => handleDescarteClick(prod)}
                    >
                      <Trash2 size={14} /> Descartar
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL DE DESCARTE */}
      {produtoDescarte && (
        <div className={styles['modal-overlay']} onClick={() => !loadingDescarte && setProdutoDescarte(null)}>
          <div className={styles['modal-content']} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0, color: '#0f172a' }}>Confirmar Descarte</h3>
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '20px' }}>
              <strong>{produtoDescarte.descricao}</strong><br/>
              Estoque Atual: {produtoDescarte.quantidade_estoque}
            </p>

            <div className={styles['form-group']}>
              <label>Quantidade a Descartar:</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input 
                  type="number" 
                  min="1"
                  max={produtoDescarte.quantidade_estoque}
                  value={formDescarte.quantidade}
                  onChange={(e) => setFormDescarte({...formDescarte, quantidade: e.target.value})}
                  className={styles['input']}
                  style={{ flex: 1 }}
                />
                <button 
                  type="button"
                  style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0 12px', fontWeight: 'bold', cursor: 'pointer' }}
                  onClick={() => setFormDescarte({...formDescarte, quantidade: produtoDescarte.quantidade_estoque})}
                >
                  TODOS
                </button>
              </div>
            </div>

            <div className={styles['form-group']}>
              <label>Observação (Opcional):</label>
              <textarea 
                placeholder="Ex: Embalagem danificada..."
                value={formDescarte.observacao}
                onChange={(e) => setFormDescarte({...formDescarte, observacao: e.target.value})}
                className={styles['input']}
                style={{ resize: 'vertical', minHeight: '60px', fontFamily: 'inherit' }}
              />
            </div>
            
            <div className={styles['form-group']}>
              <label>Seu Nome (Login):</label>
              <input 
                type="text" 
                placeholder="Ex: João Almoxarifado"
                value={formDescarte.nome}
                onChange={(e) => setFormDescarte({...formDescarte, nome: e.target.value})}
                className={styles['input']}
              />
            </div>

            <div className={styles['form-group']}>
              <label>Senha:</label>
              <input 
                type="password" 
                placeholder="Sua senha..."
                value={formDescarte.senha}
                onChange={(e) => setFormDescarte({...formDescarte, senha: e.target.value})}
                className={styles['input']}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
              <button 
                className={styles['btn-cancelar']} 
                onClick={() => setProdutoDescarte(null)}
                disabled={loadingDescarte}
              >
                Cancelar
              </button>
              <button 
                className={styles['btn-salvar']} 
                style={{ background: '#ef4444' }}
                onClick={confirmarDescarte}
                disabled={loadingDescarte || !formDescarte.nome || !formDescarte.senha || !formDescarte.quantidade}
              >
                {loadingDescarte ? 'Registrando...' : 'Confirmar Descarte'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ValidacaoProduto;
