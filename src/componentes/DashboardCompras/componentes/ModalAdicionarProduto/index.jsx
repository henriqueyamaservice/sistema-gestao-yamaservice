import React, { useState, useEffect } from 'react';
import { Search, X, Check, PackagePlus } from 'lucide-react';
import styles from './ModalAdicionarProduto.module.css';

const ModalAdicionarProduto = ({ isOpen, onClose, onConfirm }) => {
  const [termoBusca, setTermoBusca] = useState('');
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [produtoSelecionado, setProdutoSelecionado] = useState(null);
  const [quantidade, setQuantidade] = useState('');

  // Busca produtos na API
  useEffect(() => {
    if (!isOpen) return;
    
    const delayDebounceFn = setTimeout(() => {
      if (termoBusca.length >= 3) {
        buscarProdutos(termoBusca);
      } else {
        setProdutos([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [termoBusca, isOpen]);

  // Reset do estado ao fechar
  useEffect(() => {
    if (isOpen) {
      setTermoBusca('');
      setProdutos([]);
      setProdutoSelecionado(null);
      setQuantidade('');
    }
  }, [isOpen]);

  const buscarProdutos = async (termo) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/produtos?busca=${encodeURIComponent(termo)}`);
      if (!response.ok) throw new Error('Falha ao buscar produtos');
      const data = await response.json();
      setProdutos(data.slice(0, 50)); // Limitar a 50 resultados para a lista não ficar gigante
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
      setProdutos([]);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (!produtoSelecionado || !quantidade || Number(quantidade) <= 0) return;
    onConfirm(produtoSelecionado, Number(quantidade));
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h2>Adicionar Novo Produto</h2>
          <button className={styles.closeBtn} onClick={onClose}><X size={24} /></button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.searchSection}>
            <label>Buscar Produto do Estoque:</label>
            <div className={styles.searchBar}>
              <Search size={20} className={styles.searchIcon} />
              <input 
                type="text" 
                placeholder="Digite o código ou nome do produto..." 
                value={termoBusca}
                onChange={(e) => setTermoBusca(e.target.value)}
                autoFocus
              />
            </div>
            
            {loading && <div className={styles.loading}>Buscando produtos...</div>}

            {produtos.length > 0 && !produtoSelecionado && (
              <div className={styles.listaProdutos}>
                {produtos.map(prod => (
                  <div 
                    key={prod.codigo} 
                    className={styles.produtoItem}
                    onClick={() => setProdutoSelecionado(prod)}
                  >
                    <span className={styles.badgeItem}>{prod.codigo}</span>
                    <span className={styles.descItem}>{prod.descricao}</span>
                  </div>
                ))}
              </div>
            )}
            
            {produtos.length === 0 && termoBusca.length >= 3 && !loading && !produtoSelecionado && (
              <div className={styles.noResults}>Nenhum produto encontrado com esse termo.</div>
            )}
          </div>

          {produtoSelecionado && (
            <div className={styles.substituicaoForm}>
              <div className={styles.itemSelecionadoBox}>
                <div className={styles.selecionadoHeader}>
                  <Check size={18} color="var(--cor-sucesso)" /> Produto Selecionado:
                  <button className={styles.btnTrocar} onClick={() => setProdutoSelecionado(null)}>Trocar</button>
                </div>
                <div className={styles.cardItemOriginal}>
                  <span className={styles.badge}>{produtoSelecionado.codigo}</span>
                  <span className={styles.descricao}>{produtoSelecionado.descricao}</span>
                </div>
              </div>

              <div className={styles.quantidadeSection}>
                <label>
                  <PackagePlus size={16} /> Quantidade a Solicitar:
                </label>
                <input 
                  type="number"
                  placeholder="Ex: 10"
                  value={quantidade}
                  onChange={(e) => setQuantidade(e.target.value)}
                  min="1"
                />
              </div>
            </div>
          )}
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.btnCancelar} onClick={onClose}>Cancelar</button>
          <button 
            className={styles.btnConfirmar} 
            disabled={!produtoSelecionado || !quantidade || Number(quantidade) <= 0}
            onClick={handleConfirm}
          >
            Adicionar à Requisição
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalAdicionarProduto;
