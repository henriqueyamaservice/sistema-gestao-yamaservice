import React from 'react';
import { FileText, X } from 'lucide-react';
import styles from '../../index.module.css';

const DetalhesAbastecimentoModal = ({ requisicao, onClose }) => {
  if (!requisicao) return null;
  const numReq = requisicao.numeroRequisicao || '';
  const isTransfer = numReq.startsWith('TRANSF-');
  const isDescarte = numReq.startsWith('DESC-');
  const nomeVeiculo = requisicao.uConsu || requisicao.veiculo || '';
  const isGerador = nomeVeiculo.toUpperCase().includes('GERADOR') || nomeVeiculo.toUpperCase().includes('GRANJA') || nomeVeiculo.toUpperCase().startsWith('G. ');

  return (
    <div className={styles.overlay}>
      <div className={styles.modalCard} style={{ maxWidth: '700px' }}>
        <button type="button" onClick={onClose} className={styles.closeButton}>
          <X size={24} />
        </button>

        <h2 className={styles.cardTitle}>
          <FileText size={20} className={styles.logoIcon} />
          Detalhes - {isTransfer ? 'Transferência' : isDescarte ? 'Descarte' : `Req. ${numReq}`}
          {requisicao.status === 'CANCELADO' && (
            <span style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem', marginLeft: 'auto', fontWeight: 'bold' }}>
              🚫 CANCELADO
            </span>
          )}
        </h2>

        <div style={{ marginTop: '8px' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px', marginBottom: '12px', padding: '8px', backgroundColor: 'var(--cor-fundo-sutil)', borderRadius: '8px' }}>
            <div>
              <span className={styles.label} style={{ display: 'block', fontSize: '0.7rem' }}>Data</span>
              <strong style={{ fontSize: '0.85rem' }}>{requisicao.data ? requisicao.data.split('T')[0].split('-').reverse().join('/') : ''}</strong>
            </div>
            <div>
              <span className={styles.label} style={{ display: 'block', fontSize: '0.7rem' }}>Mês</span>
              <strong style={{ fontSize: '0.85rem' }}>{requisicao.mes || '-'}</strong>
            </div>
            {!isTransfer && !isDescarte ? (
              <div>
                <span className={styles.label} style={{ display: 'block', fontSize: '0.7rem' }}>Motorista</span>
                <strong style={{ fontSize: '0.85rem' }}>{requisicao.motorista || requisicao.requisitante || '-'}</strong>
              </div>
            ) : <div></div>}
            <div>
              <span className={styles.label} style={{ display: 'block', fontSize: '0.7rem' }}>{isTransfer ? 'Destino' : isDescarte ? 'Origem Descarte' : 'Veículo / Equipamento'}</span>
              <strong style={{ fontSize: '0.85rem' }}>{nomeVeiculo || '-'}</strong>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: !isTransfer && !isDescarte ? '1fr 1fr 1fr' : '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
            <div className={styles.formGroup} style={{ marginBottom: 0 }}>
              <label className={styles.label} style={{ fontSize: '0.75rem' }}>{isTransfer ? 'Origem' : 'Fornecedor'}</label>
              <input type="text" readOnly value={requisicao.fornecedor || ''} className={`${styles.input} ${styles.inputReadOnly}`} style={{ padding: '6px 8px', fontSize: '0.85rem' }} />
            </div>
            {!isTransfer && !isDescarte && (
              <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                <label className={styles.label} style={{ fontSize: '0.75rem' }}>Cupom Fiscal</label>
                <input type="text" readOnly value={requisicao.cupom || ''} className={`${styles.input} ${styles.inputReadOnly}`} style={{ padding: '6px 8px', fontSize: '0.85rem' }} />
              </div>
            )}
            <div className={styles.formGroup} style={{ marginBottom: 0 }}>
              <label className={styles.label} style={{ fontSize: '0.75rem' }}>Combustível</label>
              <input type="text" readOnly value={requisicao.combustivel || ''} className={`${styles.input} ${styles.inputReadOnly}`} style={{ padding: '6px 8px', fontSize: '0.85rem' }} />
            </div>
          </div>

          {!isTransfer && !isDescarte && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '8px' }}>
              <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                <label className={styles.label} style={{ fontSize: '0.75rem' }}>{isGerador ? 'Último Horímetro' : 'Último KM'}</label>
                <input type="text" readOnly value={requisicao.ultimoKm || ''} className={`${styles.input} ${styles.inputReadOnly}`} style={{ padding: '6px 8px', fontSize: '0.85rem' }} />
              </div>
              <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                <label className={styles.label} style={{ fontSize: '0.75rem' }}>{isGerador ? 'Horímetro Atual' : 'KM Atual'}</label>
                <input type="text" readOnly value={requisicao.km || ''} className={`${styles.input} ${styles.inputReadOnly}`} style={{ padding: '6px 8px', fontSize: '0.85rem' }} />
              </div>
              <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                <label className={styles.label} style={{ fontSize: '0.75rem' }}>{isGerador ? 'Média L/H' : 'Média KM/L'}</label>
                <input 
                  type="text" 
                  readOnly 
                  value={requisicao.km && requisicao.ultimoKm && requisicao.qtde ? ((requisicao.km - requisicao.ultimoKm) / requisicao.qtde).toFixed(2) : '-'} 
                  className={`${styles.input} ${styles.inputReadOnly}`} 
                  style={{ padding: '6px 8px', fontSize: '0.85rem', fontWeight: 'bold' }}
                />
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '8px' }}>
            <div className={styles.formGroup} style={{ marginBottom: 0 }}>
              <label className={styles.label} style={{ fontSize: '0.75rem' }}>Qtd (Litros)</label>
              <input type="text" readOnly value={requisicao.qtde ? `${requisicao.qtde} L` : ''} className={`${styles.input} ${styles.inputReadOnly}`} style={{ padding: '6px 8px', fontSize: '0.85rem' }} />
            </div>
            {!isDescarte && (
              <>
                <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                  <label className={styles.label} style={{ fontSize: '0.75rem' }}>Valor Unit (R$)</label>
                  <input type="text" readOnly value={requisicao.valorUnitario ? `R$ ${requisicao.valorUnitario}` : ''} className={`${styles.input} ${styles.inputReadOnly}`} style={{ padding: '6px 8px', fontSize: '0.85rem' }} />
                </div>
                <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                  <label className={styles.label} style={{ fontSize: '0.75rem' }}>Valor Total</label>
                  <input type="text" readOnly value={requisicao.valorTotal ? `R$ ${requisicao.valorTotal}` : ''} className={`${styles.input} ${styles.inputReadOnly}`} style={{ padding: '6px 8px', fontSize: '0.85rem', color: 'var(--cor-destaque)', fontWeight: 'bold' }} />
                </div>
              </>
            )}
          </div>

          {(isTransfer || isDescarte || requisicao.observacao) && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px', marginBottom: '8px' }}>
              <div className={styles.formGroup} style={{ marginBottom: 0 }}>
                <label className={styles.label} style={{ fontSize: '0.75rem' }}>Observação</label>
                <input type="text" readOnly value={requisicao.observacao || '-'} className={`${styles.input} ${styles.inputReadOnly}`} style={{ padding: '6px 8px', fontSize: '0.85rem' }} />
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default DetalhesAbastecimentoModal;
