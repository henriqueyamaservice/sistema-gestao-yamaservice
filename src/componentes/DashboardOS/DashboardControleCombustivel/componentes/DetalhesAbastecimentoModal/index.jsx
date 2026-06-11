import React from 'react';
import { FileText, X } from 'lucide-react';
import styles from '../../index.module.css';

const DetalhesAbastecimentoModal = ({ requisicao, onClose }) => {
  if (!requisicao) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modalCard} style={{ maxWidth: '700px' }}>
        <button type="button" onClick={onClose} className={styles.closeButton}>
          <X size={24} />
        </button>

        <h2 className={styles.cardTitle}>
          <FileText size={20} className={styles.logoIcon} />
          Detalhes do Abastecimento - Req. {requisicao.numeroRequisicao}
        </h2>

        <div style={{ marginTop: '8px' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px', marginBottom: '12px', padding: '8px', backgroundColor: 'var(--cor-fundo-sutil)', borderRadius: '8px' }}>
            <div>
              <span className={styles.label} style={{ display: 'block', fontSize: '0.7rem' }}>Data</span>
              <strong style={{ fontSize: '0.85rem' }}>{requisicao.data ? requisicao.data.split('-').reverse().join('/') : ''}</strong>
            </div>
            <div>
              <span className={styles.label} style={{ display: 'block', fontSize: '0.7rem' }}>Mês</span>
              <strong style={{ fontSize: '0.85rem' }}>{requisicao.mes}</strong>
            </div>
            <div>
              <span className={styles.label} style={{ display: 'block', fontSize: '0.7rem' }}>Motorista</span>
              <strong style={{ fontSize: '0.85rem' }}>{requisicao.motorista || requisicao.requisitante}</strong>
            </div>
            <div>
              <span className={styles.label} style={{ display: 'block', fontSize: '0.7rem' }}>Veículo</span>
              <strong style={{ fontSize: '0.85rem' }}>{requisicao.uConsu || requisicao.veiculo}</strong>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '8px' }}>
            <div className={styles.formGroup} style={{ marginBottom: 0 }}>
              <label className={styles.label} style={{ fontSize: '0.75rem' }}>Fornecedor</label>
              <input type="text" readOnly value={requisicao.fornecedor || ''} className={`${styles.input} ${styles.inputReadOnly}`} style={{ padding: '6px 8px', fontSize: '0.85rem' }} />
            </div>
            <div className={styles.formGroup} style={{ marginBottom: 0 }}>
              <label className={styles.label} style={{ fontSize: '0.75rem' }}>Cupom Fiscal</label>
              <input type="text" readOnly value={requisicao.cupom || ''} className={`${styles.input} ${styles.inputReadOnly}`} style={{ padding: '6px 8px', fontSize: '0.85rem' }} />
            </div>
            <div className={styles.formGroup} style={{ marginBottom: 0 }}>
              <label className={styles.label} style={{ fontSize: '0.75rem' }}>Combustível</label>
              <input type="text" readOnly value={requisicao.combustivel || ''} className={`${styles.input} ${styles.inputReadOnly}`} style={{ padding: '6px 8px', fontSize: '0.85rem' }} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '8px' }}>
            <div className={styles.formGroup} style={{ marginBottom: 0 }}>
              <label className={styles.label} style={{ fontSize: '0.75rem' }}>Último KM</label>
              <input type="text" readOnly value={requisicao.ultimoKm || ''} className={`${styles.input} ${styles.inputReadOnly}`} style={{ padding: '6px 8px', fontSize: '0.85rem' }} />
            </div>
            <div className={styles.formGroup} style={{ marginBottom: 0 }}>
              <label className={styles.label} style={{ fontSize: '0.75rem' }}>KM Atual</label>
              <input type="text" readOnly value={requisicao.km || ''} className={`${styles.input} ${styles.inputReadOnly}`} style={{ padding: '6px 8px', fontSize: '0.85rem' }} />
            </div>
            <div className={styles.formGroup} style={{ marginBottom: 0 }}>
              <label className={styles.label} style={{ fontSize: '0.75rem' }}>Média KM/L</label>
              <input 
                type="text" 
                readOnly 
                value={requisicao.km && requisicao.ultimoKm && requisicao.qtde ? ((requisicao.km - requisicao.ultimoKm) / requisicao.qtde).toFixed(2) : '-'} 
                className={`${styles.input} ${styles.inputReadOnly}`} 
                style={{ padding: '6px 8px', fontSize: '0.85rem', fontWeight: 'bold' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '8px' }}>
            <div className={styles.formGroup} style={{ marginBottom: 0 }}>
              <label className={styles.label} style={{ fontSize: '0.75rem' }}>Qtd (Litros)</label>
              <input type="text" readOnly value={requisicao.qtde ? `${requisicao.qtde} L` : ''} className={`${styles.input} ${styles.inputReadOnly}`} style={{ padding: '6px 8px', fontSize: '0.85rem' }} />
            </div>
            <div className={styles.formGroup} style={{ marginBottom: 0 }}>
              <label className={styles.label} style={{ fontSize: '0.75rem' }}>Valor Unit (R$)</label>
              <input type="text" readOnly value={requisicao.valorUnitario ? `R$ ${requisicao.valorUnitario}` : ''} className={`${styles.input} ${styles.inputReadOnly}`} style={{ padding: '6px 8px', fontSize: '0.85rem' }} />
            </div>
            <div className={styles.formGroup} style={{ marginBottom: 0 }}>
              <label className={styles.label} style={{ fontSize: '0.75rem' }}>Valor Total</label>
              <input type="text" readOnly value={requisicao.valorTotal ? `R$ ${requisicao.valorTotal}` : ''} className={`${styles.input} ${styles.inputReadOnly}`} style={{ padding: '6px 8px', fontSize: '0.85rem', color: 'var(--cor-destaque)', fontWeight: 'bold' }} />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default DetalhesAbastecimentoModal;
