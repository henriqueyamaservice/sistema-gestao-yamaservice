import React from 'react';
import { X, ClipboardList, Beaker, ArrowDownRight, Package } from 'lucide-react';
import styles from './index.module.css';

const ModalDetalhesCombustivel = ({ entrada, onClose }) => {
  if (!entrada) return null;

  const conf = entrada.conferencia || {};
  const isTransfer = entrada.notaFiscal && entrada.notaFiscal.startsWith('TRANSF-');

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            <ClipboardList size={22} color="var(--cor-destaque)" />
            Detalhes do Lote
            {isTransfer && (
              <span className={styles.badgeTransferencia}>
                TRANSFERÊNCIA
              </span>
            )}
          </h2>
          <button onClick={onClose} className={styles.closeBtn}>
            <X size={24} />
          </button>
        </div>

        <div className={styles.modalBody}>
          
          {/* Informações do Pedido / Entrada */}
          <div className={styles.sectionContainer}>
            <h3 className={styles.sectionTitle}>
              <Package size={18} />
              {isTransfer ? 'Dados da Transferência' : 'Dados da Entrada'}
            </h3>
            <div className={styles.gridInfo}>
              <div>
                <span className={styles.infoLabel}>{isTransfer ? 'Origem' : 'Fornecedor'}</span>
                <div className={styles.infoValue}>{entrada.fornecedor || '-'}</div>
              </div>
              <div>
                <span className={styles.infoLabel}>{isTransfer ? 'Doc. Origem' : 'Nota Fiscal'}</span>
                <div className={styles.infoValue}>{entrada.notaFiscal || '-'}</div>
              </div>
              <div>
                <span className={styles.infoLabel}>Data</span>
                <div className={styles.infoValue}>{entrada.data ? new Date(entrada.data).toLocaleDateString('pt-BR') : '-'}</div>
              </div>
              {!isTransfer && (
                <div>
                  <span className={styles.infoLabel}>Prazo Entrega</span>
                  <div className={styles.infoValue}>{entrada.prazoEntrega ? new Date(entrada.prazoEntrega + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}</div>
                </div>
              )}
              <div>
                <span className={styles.infoLabel}>Volume Original (L)</span>
                <div className={styles.infoValueLarge} style={{ color: 'var(--cor-texto-principal)' }}>{entrada.quantidadeNf ? entrada.quantidadeNf : entrada.quantidade} L</div>
              </div>
              <div>
                <span className={styles.infoLabel}>Valor Unitário</span>
                <div className={styles.infoValueSuccess}>R$ {parseFloat(entrada.valorUn || 0).toFixed(2)}</div>
              </div>
            </div>
          </div>

          {/* Dados da Conferência */}
          {!isTransfer && (
            <div className={styles.sectionContainer}>
              <h3 className={styles.sectionTitle}>
                <Beaker size={18} />
                Conferência Densimétrica
              </h3>
              {conf.pesoBruto ? (
                <div style={{ backgroundColor: 'var(--cor-fundo-sutil)', padding: '16px', borderRadius: '12px', border: '1px solid var(--cor-fundo-sutil-forte)' }}>
                  <div className={styles.gridInfo} style={{ padding: 0, border: 'none', backgroundColor: 'transparent' }}>
                    <div>
                      <span className={styles.infoLabel}>Status Amostra</span>
                      <div className={styles.infoValue} style={{ color: conf.status?.includes('OK') ? 'var(--cor-sucesso)' : 'var(--cor-erro)' }}>{conf.status || '-'}</div>
                    </div>
                    <div>
                      <span className={styles.infoLabel}>Peso (Bruto / Tara)</span>
                      <div className={styles.infoValue}>{conf.pesoBruto} / {conf.pesoTara} KG</div>
                    </div>
                    <div>
                      <span className={styles.infoLabel}>Peso Líquido</span>
                      <div className={styles.infoValue}>{conf.pesoLiquido} KG</div>
                    </div>
                    <div>
                      <span className={styles.infoLabel}>Temp / Densidade</span>
                      <div className={styles.infoValue}>{conf.temperatura} ºC / {conf.densidade}</div>
                    </div>
                    <div>
                      <span className={styles.infoLabel}>Volume Real (L)</span>
                      <div className={styles.infoValueLarge}>{conf.volumeReal ? parseFloat(conf.volumeReal).toFixed(2) : '-'} L</div>
                    </div>
                    <div>
                      <span className={styles.infoLabel}>Diferença NF (L)</span>
                      <div className={styles.infoValueLarge} style={{ color: conf.diferencaLitros < 0 ? 'var(--cor-erro)' : 'var(--cor-texto-principal)' }}>
                        {conf.diferencaLitros ? parseFloat(conf.diferencaLitros).toFixed(2) : '-'} L
                      </div>
                    </div>
                  </div>
                  
                  {conf.diferencaLitros < 0 && (
                    <div className={styles.quebraFinanceira}>
                      <span className={styles.quebraFinanceiraLabel}>Quebra Financeira Estimada</span>
                      <strong className={styles.quebraFinanceiraValue}>R$ {parseFloat(conf.valorQuebra || 0).toFixed(2)}</strong>
                    </div>
                  )}
                </div>
              ) : (
                <div className={styles.emptyState}>
                  Este lote não passou pela conferência densimétrica.
                </div>
              )}
            </div>
          )}

          {/* Extrato de Consumo */}
          {entrada.historicoConsumo && entrada.historicoConsumo.length > 0 && (
            <div className={styles.sectionContainer}>
              <h3 className={styles.sectionTitle}>
                <ArrowDownRight size={18} />
                Extrato de Consumo deste Lote
              </h3>
              <div className={styles.extratoContainer}>
                <div className={styles.extratoTableContainer}>
                  <table className={styles.extratoTable}>
                    <thead className={styles.extratoThead}>
                      <tr>
                        <th className={styles.extratoTh}>Data</th>
                        <th className={styles.extratoTh}>Descrição / Veículo</th>
                        <th className={styles.extratoTh}>Doc. Ref.</th>
                        <th className={styles.extratoThRight}>Qtd (L)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entrada.historicoConsumo.map((hist, idx) => (
                        <tr key={idx} className={styles.extratoTr}>
                          <td className={styles.extratoTd}>{new Date(hist.data).toLocaleDateString('pt-BR')}</td>
                          <td className={styles.extratoTdDesc}>{hist.descricao}</td>
                          <td className={styles.extratoTdReq}>{hist.req || '-'}</td>
                          <td className={styles.extratoTdQtd}>
                            - {parseFloat(hist.qtde).toFixed(2)} L
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModalDetalhesCombustivel;
