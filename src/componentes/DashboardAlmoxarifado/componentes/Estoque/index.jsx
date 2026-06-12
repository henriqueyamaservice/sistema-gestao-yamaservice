import React, { useState } from 'react';
import { Search, Box, AlertCircle, RefreshCw, Package, Boxes } from 'lucide-react';
import ProdutoModal from '../ProdutoModal';
import styles from './Estoque.module.css';

const Estoque = ({ produtos, loading, error, fetchProdutos }) => {
  const [busca, setBusca] = useState('');
  const [produtoSelecionadoParaModal, setProdutoSelecionadoParaModal] = useState(null);

  const produtosFiltrados = produtos.filter((prod) => {
    const nome = prod.descricao?.toLowerCase() || '';
    const codigo = prod.codigo?.toLowerCase() || '';
    const ean = prod.ean?.toLowerCase() || '';
    const termo = busca.toLowerCase();

    const bateLote = prod.lotes?.some(l => (l.ean || '').toLowerCase().includes(termo));

    return nome.includes(termo) || codigo.includes(termo) || ean.includes(termo) || bateLote;
  });

  return (
    <div className={styles['dashboard-container']}>
      <header className={styles['dashboard-header']}>
        <div className={styles['header-title']} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ color: 'var(--cor-destaque)', background: 'var(--cor-fundo-sutil-forte)', padding: '8px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Boxes size={28} />
          </div>
          <div>
            <h1 style={{ margin: 0 }}>Estoque Atual</h1>
            <p style={{ margin: '4px 0 0 0' }}>Visão geral de todos os produtos cadastrados</p>
          </div>
        </div>

        <div className={styles['header-actions']}>
          <div className={styles['search-box']}>
            <Search size={20} className={styles['search-icon']} />
            <input
              type="text"
              placeholder="Buscar por nome ou código..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          <button className={styles['btn-refresh']} onClick={fetchProdutos} title="Atualizar dados">
            <RefreshCw size={20} className={loading ? styles['spin'] : ''} />
          </button>
        </div>
      </header>

      <main className={styles['dashboard-content']}>
        {loading && (
          <div className={`${styles['state-container']} ${styles['loading']}`}>
            <div className={styles['loader']}></div>
            <p>Carregando produtos do sistema...</p>
          </div>
        )}

        {error && !loading && (
          <div className={`${styles['state-container']} ${styles['error']}`}>
            <AlertCircle size={48} className={styles['error-icon']} />
            <h2>Erro na Sincronização</h2>
            <p>{error}</p>
            <button className={styles['btn-retry']} onClick={fetchProdutos}>Tentar Novamente</button>
          </div>
        )}

        {!loading && !error && produtosFiltrados.length === 0 && (
          <div className={`${styles['state-container']} ${styles['empty']}`}>
            <Package size={48} className={styles['empty-icon']} />
            <h2>Nenhum produto encontrado</h2>
            <p>{busca ? 'Nenhum resultado para a busca atual.' : 'Seu banco de dados parece estar vazio.'}</p>
          </div>
        )}

        {!loading && !error && produtosFiltrados.length > 0 && (
          <div className={styles['table-container']}>
            <table className={styles['products-table']}>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Descrição</th>
                  <th>Endereço</th>
                  <th>Marca</th>
                  <th>Validade</th>
                  <th>Estoque</th>
                  <th>Em Compra</th>
                </tr>
              </thead>
              <tbody>
                {produtosFiltrados.map((produto, index) => {
                  return (
                    <tr
                      key={produto.codigo_produto || index}
                      className={styles['clickable-row']}
                    >
                      <td className={styles['col-codigo']} onClick={() => setProdutoSelecionadoParaModal(produto)}>
                        <span className={styles['product-code']}>
                          <Box size={14} className={styles['table-icon']} /> {produto.codigo || '-'}
                        </span>
                      </td>
                      <td className={styles['col-descricao']} onClick={() => setProdutoSelecionadoParaModal(produto)}>
                        <span className={styles['product-title']}>
                          {produto.descricao || 'Produto sem nome'}
                        </span>
                      </td>
                      <td className={styles['col-endereco']}>
                        <span className={styles['product-brand']}>
                          {(() => {
                            const c = produto.caracteristicas || [];
                            const endereco = c.find(x => x.cNomeCaract?.toUpperCase() === 'ENDEREÇO');
                            if (endereco) return endereco.cConteudo;
                            const corredor = c.find(x => x.cNomeCaract?.toUpperCase() === 'CORREDOR');
                            const prateleira = c.find(x => x.cNomeCaract?.toUpperCase() === 'PRATELEIRA');
                            if (corredor || prateleira) return `Corr: ${corredor?.cConteudo || '-'} / Prat: ${prateleira?.cConteudo || '-'}`;
                            return produto.endereco || '-';
                          })()}
                        </span>
                      </td>
                      <td className={styles['col-marca']}>
                        <span className={styles['product-brand']}>
                          {produto.marca || produto.caracteristicas?.find(c => c.cNomeCaract?.toUpperCase() === 'MARCA')?.cConteudo || '-'}
                        </span>
                      </td>
                      <td className={styles['col-validade']}>
                        {produto.produto_lote === 'S' && produto.data_validade ? (
                          <span style={{
                            fontSize: '0.75rem', fontWeight: 'bold',
                            color: 'var(--cor-destaque)',
                            backgroundColor: 'rgba(255, 107, 0, 0.1)',
                            padding: '2px 8px', borderRadius: '12px',
                            display: 'inline-flex', alignItems: 'center', gap: '4px',
                            whiteSpace: 'nowrap', border: '1px solid rgba(255, 107, 0, 0.2)'
                          }}>
                            ⏳ {new Date(produto.data_validade).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--cor-texto-secundario)', fontSize: '0.8rem' }}>-</span>
                        )}
                      </td>
                      <td className={styles['col-estoque']}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', fontWeight: 'bold' }}>
                          <span style={{ color: 'var(--cor-sucesso)', backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                            {produto.quantidade_estoque || 0}
                          </span>
                          <span style={{ color: 'var(--cor-texto-secundario)', fontWeight: 'normal' }}>/</span>
                          <span style={{ color: 'var(--cor-erro)', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                            {produto.estoque_minimo || 0}
                          </span>
                        </div>
                      </td>
                      <td className={styles['col-em-compra']}>
                        {produto.quantidade_pedida > 0 ? (
                          <span style={{
                            fontSize: '0.75rem', fontWeight: 'bold',
                            color: 'var(--cor-destaque)',
                            backgroundColor: 'rgba(255, 107, 0, 0.1)',
                            padding: '2px 8px', borderRadius: '12px',
                            display: 'inline-flex', alignItems: 'center', gap: '4px',
                            whiteSpace: 'nowrap', border: '1px solid rgba(255, 107, 0, 0.2)'
                          }}>
                            🛒 {produto.quantidade_pedida} un.
                          </span>
                        ) : (
                          <span style={{ color: 'var(--cor-texto-secundario)', fontSize: '0.8rem' }}>-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {produtoSelecionadoParaModal && (
          <ProdutoModal
            produto={produtoSelecionadoParaModal}
            onClose={() => setProdutoSelecionadoParaModal(null)}
            fetchProdutosGlobal={fetchProdutos}
          />
        )}
      </main>
    </div>
  );
};

export default Estoque;
