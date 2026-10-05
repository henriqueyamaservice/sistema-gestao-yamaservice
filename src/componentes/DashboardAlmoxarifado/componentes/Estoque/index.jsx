import React, { useState, useEffect } from 'react';
import { Search, Box, AlertCircle, RefreshCw, Package, Boxes, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import ProdutoModal from '../ProdutoModal';
import styles from './Estoque.module.css';
import { obterBadgeInfo, formatarQuantidadeComUnidade, formatarQuantidade, obterRotuloUnidade } from '../../../../utils/classificadorUnidades';

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

  // PAGINAÇÃO
  const [paginaAtual, setPaginaAtual] = useState(1);
  const itensPorPagina = 100;

  useEffect(() => {
    setPaginaAtual(1); // Volta para a primeira página ao buscar
  }, [busca]);

  const indexUltimoItem = paginaAtual * itensPorPagina;
  const indexPrimeiroItem = indexUltimoItem - itensPorPagina;
  const produtosPaginados = produtosFiltrados.slice(indexPrimeiroItem, indexUltimoItem);
  const totalPaginas = Math.max(1, Math.ceil(produtosFiltrados.length / itensPorPagina));

  // Renderizador de badge corporativo para a Validade
  const renderValidadeBadge = (produto) => {
    let dataString = produto.data_validade || produto.validade;
    let lotesCount = 0;

    // Se houver lotes, pegar o lote ativo com a validade mais próxima (FEFO)
    if (produto.lotes && produto.lotes.length > 0) {
      const lotesAtivos = produto.lotes.filter(l => l.quantidade > 0);
      lotesCount = lotesAtivos.length;
      if (lotesAtivos.length > 0) {
        lotesAtivos.sort((a, b) => new Date(a.validade) - new Date(b.validade));
        dataString = lotesAtivos[0].validade;
      }
    }

    if (!dataString) return <span style={{ color: 'var(--cor-texto-secundario)', fontSize: '0.8rem' }}>-</span>;
    
    const dataVal = new Date(dataString);
    const utcDate = new Date(dataVal.getTime() + dataVal.getTimezoneOffset() * 60000);
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    const limiteProximo = new Date();
    limiteProximo.setDate(limiteProximo.getDate() + 30);
    
    // Default: No Prazo (Verde/Neutro)
    let corBase = '#10b981'; // success
    let bgBase = 'rgba(16, 185, 129, 0.1)';
    let borderBase = 'rgba(16, 185, 129, 0.2)';
    let icon = <CheckCircle size={14} />;

    if (utcDate < hoje) {
      // Vencido (Vermelho)
      corBase = '#ef4444'; 
      bgBase = 'rgba(239, 68, 68, 0.1)';
      borderBase = 'rgba(239, 68, 68, 0.2)';
      icon = <AlertTriangle size={14} />;
    } else if (utcDate <= limiteProximo) {
      // Próximo de Vencer (Laranja)
      corBase = '#f59e0b';
      bgBase = 'rgba(245, 158, 11, 0.1)';
      borderBase = 'rgba(245, 158, 11, 0.2)';
      icon = <Clock size={14} />;
    }

    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
        <span style={{
          fontSize: '0.75rem', fontWeight: '600',
          color: corBase,
          backgroundColor: bgBase,
          padding: '4px 8px', borderRadius: '6px',
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          whiteSpace: 'nowrap', border: `1px solid ${borderBase}`,
          boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
          letterSpacing: '0.01em'
        }}>
          {icon} 
          <span>{utcDate.toLocaleDateString('pt-BR')}</span>
          
          {lotesCount > 1 && (
            <span style={{ 
              fontSize: '0.65rem', 
              opacity: 0.8, 
              marginLeft: '2px',
              paddingLeft: '4px'
            }}>
              {lotesCount} lotes
            </span>
          )}
        </span>
      </div>
    );
  };

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
              placeholder="Buscar por nome, código ou código de barras..."
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
        {loading && produtos.length === 0 && (
          <div className={`${styles['state-container']} ${styles['loading']}`}>
            <div className={styles['loader']}></div>
            <p>Carregando produtos do sistema...</p>
          </div>
        )}

        {error && !loading && produtos.length === 0 && (
          <div className={`${styles['state-container']} ${styles['error']}`}>
            <AlertCircle size={48} className={styles['error-icon']} />
            <h2>Erro na Sincronização</h2>
            <p>{error}</p>
            <button className={styles['btn-retry']} onClick={fetchProdutos}>Tentar Novamente</button>
          </div>
        )}

        {(!loading || produtos.length > 0) && !error && produtosFiltrados.length === 0 && (
          <div className={`${styles['state-container']} ${styles['empty']}`}>
            <Package size={48} className={styles['empty-icon']} />
            <h2>Nenhum produto encontrado</h2>
            <p>{busca ? 'Nenhum resultado para a busca atual.' : 'Seu banco de dados parece estar vazio.'}</p>
          </div>
        )}

        {produtosFiltrados.length > 0 && (
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
                {produtosPaginados.map((produto, index) => {
                  return (
                    <tr
                      key={produto.codigo_produto || index}
                      className={styles['clickable-row']}
                    >
                      <td className={styles['col-codigo']} onClick={() => setProdutoSelecionadoParaModal(produto)}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span className={styles['product-code']}>
                            <Box size={14} className={styles['table-icon']} /> {produto.codigo || '-'}
                          </span>
                          {(() => {
                            const badge = obterBadgeInfo(produto.unidade);
                            return (
                              <span style={{
                                fontSize: '0.68rem', fontWeight: 'bold',
                                color: badge.cor, backgroundColor: badge.bg,
                                border: `1px solid ${badge.border}`,
                                padding: '1px 6px', borderRadius: '4px',
                                display: 'inline-flex', alignItems: 'center', gap: '4px',
                                width: 'fit-content'
                              }}>
                                <span>{badge.icone}</span> {badge.label}
                              </span>
                            );
                          })()}
                        </div>
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
                        {renderValidadeBadge(produto)}
                      </td>
                      <td className={styles['col-estoque']}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                          <span style={{ color: (produto.quantidade_estoque < 0 ? 'var(--cor-erro)' : 'var(--cor-sucesso)'), backgroundColor: (produto.quantidade_estoque < 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)'), padding: '2px 6px', borderRadius: '4px' }}>
                            {formatarQuantidadeComUnidade(produto.quantidade_estoque, produto.unidade)}
                          </span>
                          <span style={{ color: 'var(--cor-texto-secundario)', fontWeight: 'normal' }}>/</span>
                          <span style={{ color: 'var(--cor-erro)', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '2px 6px', borderRadius: '4px' }} title="Estoque Mínimo">
                            {formatarQuantidade(produto.estoque_minimo, produto.unidade)}
                          </span>
                        </div>
                      </td>
                      <td className={styles['col-em-compra']}>
                        {produto.quantidade_pedida > 0 ? (
                          <span 
                            title={produto.pedido_compras_info ? `Requisição #${produto.pedido_compras_info.reqId} - Solicitado por ${produto.pedido_compras_info.solicitante}` : 'Pedido em andamento no Compras'}
                            style={{
                            fontSize: '0.75rem', fontWeight: 'bold',
                            color: 'var(--cor-destaque)',
                            backgroundColor: 'rgba(255, 107, 0, 0.1)',
                            padding: '2px 8px', borderRadius: '12px',
                            display: 'inline-flex', alignItems: 'center', gap: '4px',
                            whiteSpace: 'nowrap', border: '1px solid rgba(255, 107, 0, 0.2)',
                            cursor: 'help'
                          }}>
                            🛒 {formatarQuantidadeComUnidade(produto.quantidade_pedida, produto.unidade)}
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
            
            {/* Controles de Paginação */}
            <div className={styles['pagination']}>
              <button 
                onClick={() => setPaginaAtual(p => Math.max(1, p - 1))} 
                disabled={paginaAtual === 1}
                className={styles['btn-page']}
              >
                Anterior
              </button>
              
              <span className={styles['page-info']}>
                Página <strong>{paginaAtual}</strong> de {totalPaginas} 
                <span className={styles['page-count']}>({produtosFiltrados.length} itens)</span>
              </span>
              
              <button 
                onClick={() => setPaginaAtual(p => Math.min(totalPaginas, p + 1))} 
                disabled={paginaAtual === totalPaginas}
                className={styles['btn-page']}
              >
                Próxima
              </button>
            </div>
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
