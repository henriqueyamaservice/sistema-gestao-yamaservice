import React, { useState, useEffect } from 'react';
import { Search, X, Check, AlertCircle } from 'lucide-react';
import styles from './ModalSubstituicao.module.css';

const ModalSubstituicao = ({ isOpen, onClose, itemOriginal, onConfirm }) => {
  const [termoBusca, setTermoBusca] = useState('');
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [produtoSelecionado, setProdutoSelecionado] = useState(null);
  const [motivo, setMotivo] = useState('');

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

  // Reset do estado ao fechar ou trocar de item
  useEffect(() => {
    if (isOpen) {
      setTermoBusca('');
      setProdutos([]);
      setProdutoSelecionado(null);
      setMotivo('');
    }
  }, [isOpen, itemOriginal]);

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
    if (!produtoSelecionado || !motivo.trim()) return;
    onConfirm(produtoSelecionado, motivo);
    onClose();
  };

  if (!isOpen || !itemOriginal) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h2>Substituição por Similaridade</h2>
          <button className={styles.closeBtn} onClick={onClose}><X size={24} /></button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.infoOriginal}>
            <h4>Peça Original Solicitada:</h4>
            <div className={styles.cardItemOriginal}>
              <span className={styles.badge}>{itemOriginal.codigo}</span>
              <span className={styles.descricao}>{itemOriginal.descricao}</span>
            </div>
          </div>

          <div className={styles.searchSection}>
            <label>Buscar Produto do Estoque para Substituir:</label>
            <div className={styles.searchBar}>
              <Search size={20} className={styles.searchIcon} />
              <input 
                type="text" 
                placeholder="Digite o código ou nome da peça similar..." 
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
              <div className={styles.noResults}>Nenhuma peça encontrada com esse termo.</div>
            )}
          </div>

          {produtoSelecionado && (
            <div className={styles.substituicaoForm}>
              <div className={styles.itemSelecionadoBox}>
                <div className={styles.selecionadoHeader}>
                  <Check size={18} color="var(--cor-sucesso)" /> Peça Substituta Selecionada:
                  <button className={styles.btnTrocar} onClick={() => setProdutoSelecionado(null)}>Trocar</button>
                </div>
                <div className={styles.cardItemOriginal}>
                  <span className={styles.badge}>{produtoSelecionado.codigo}</span>
                  <span className={styles.descricao}>{produtoSelecionado.descricao}</span>
                </div>
              </div>

              <div className={styles.motivoSection}>
                <label>
                  <AlertCircle size={16} /> Motivo da Substituição / Observações:
                </label>
                <textarea 
                  placeholder="Ex: Marca diferente enviada pelo fornecedor. Original em falta."
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.btnCancelar} onClick={onClose}>Cancelar</button>
          <button 
            className={styles.btnConfirmar} 
            disabled={!produtoSelecionado || !motivo.trim()}
            onClick={handleConfirm}
          >
            Confirmar Substituição
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalSubstituicao;
