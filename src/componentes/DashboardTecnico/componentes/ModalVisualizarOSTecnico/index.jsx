import React from 'react';
import { X, CheckCircle, Clock, Package, Truck, User, FileText, Calendar, ShieldAlert } from 'lucide-react';
import styles from './ModalVisualizarOSTecnico.module.css';

const ModalVisualizarOSTecnico = ({ os, onClose }) => {
  if (!os) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.titleGroup}>
            <span className={styles.codigoOS}>O.S. #{os.codigo}</span>
            <span className={styles.statusBadge}>
              <CheckCircle size={14} /> CONCLUÍDA
            </span>
          </div>
          <button className={styles.btnClose} onClick={onClose}>
            <X size={22} />
          </button>
        </div>

        <div className={styles.modalBody}>
          {os.isEmergencia && (
            <div style={{ backgroundColor: '#fef2f2', color: '#dc2626', padding: '10px 14px', borderRadius: '8px', border: '1px solid #fca5a5', fontWeight: 'bold', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldAlert size={18} /> CHAMADO FINALIZADO EM CARÁTER DE EMERGÊNCIA
            </div>
          )}

          {/* DADOS GERAIS */}
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Solicitante</span>
              <span className={styles.infoValue}>{os.requisitante || 'Não informado'}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Setor</span>
              <span className={styles.infoValue}>{os.setor || 'GERAL'}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Centro de Custo / Veículo</span>
              <span className={styles.infoValue}>{os.centroCusto || '-'}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Técnico Responsável</span>
              <span className={styles.infoValue}>{os.tecnicoResponsavel || 'Técnico'}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Data da Abertura</span>
              <span className={styles.infoValue}>{os.dataCriacao ? new Date(os.dataCriacao).toLocaleDateString('pt-BR') : '-'}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Data da Conclusão</span>
              <span className={styles.infoValue}>{os.dataFim ? new Date(os.dataFim).toLocaleDateString('pt-BR') : (os.dataConclusao ? new Date(os.dataConclusao).toLocaleDateString('pt-BR') : 'Concluído')}</span>
            </div>
          </div>

          {/* PROBLEMA RELATADO */}
          <div>
            <h4 className={styles.sectionTitle}><FileText size={18} /> Serviço Solicitado / Descrição</h4>
            <p style={{ margin: 0, padding: '12px', backgroundColor: 'var(--cor-fundo-principal)', borderRadius: '8px', border: '1px solid var(--cor-borda-cartao)', fontSize: '0.9rem', color: 'var(--cor-texto-principal)', lineHeight: '1.4' }}>
              {os.descricao || 'Sem descrição cadastrada.'}
            </p>
          </div>

          {/* APONTAMENTOS DO DIÁRIO DE BORDO */}
          {os.servicosExecutados && os.servicosExecutados.length > 0 && (
            <div>
              <h4 className={styles.sectionTitle}><Clock size={18} /> Diário de Bordo (Histórico de Apontamentos)</h4>
              {os.servicosExecutados.map((serv, idx) => (
                <div key={idx} className={styles.cardDiario}>
                  <div className={styles.diarioHeader}>
                    <strong style={{ color: 'var(--cor-destaque)' }}>{serv.data ? serv.data.split('-').reverse().join('/') : ''}</strong>
                    <span style={{ fontWeight: 'bold' }}>
                      {(serv.horaInicio2 || (serv.horaFim1 && serv.horaFim && serv.horaFim1 !== serv.horaFim)) ? (
                        `${serv.horaInicio || ''} às ${serv.horaFim1 || ''} | ${serv.horaInicio2 || ''} às ${serv.horaFim || ''}`
                      ) : (
                        `${serv.horaInicio || ''} às ${serv.horaFim || serv.horaFim1 || ''}`
                      )}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.9rem', margin: '0 0 10px 0', color: 'var(--cor-texto-principal)' }}>{serv.descricao}</p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem' }}>
                    {serv.maoDeObra && serv.maoDeObra.length > 0 && (
                      <div style={{ backgroundColor: 'var(--cor-fundo-secundario)', padding: '8px', borderRadius: '6px' }}>
                        <strong style={{ display: 'block', marginBottom: '4px', color: 'var(--cor-texto-principal)' }}>Mão de Obra no Turno:</strong>
                        {serv.maoDeObra.map((m, i) => <div key={i}>• {m.nome} {m.horas ? `(${String(m.horas).replace(/h/gi, '')}h)` : ''}</div>)}
                      </div>
                    )}
                    {serv.pecasUtilizadas && serv.pecasUtilizadas.length > 0 && (
                      <div style={{ backgroundColor: '#ecfdf5', padding: '8px', borderRadius: '6px', color: '#065f46', border: '1px solid #10b981' }}>
                        <strong style={{ display: 'block', marginBottom: '4px' }}>Peças Utilizadas:</strong>
                        {serv.pecasUtilizadas.map((p, i) => <div key={i}>• {p.quantidade}x {p.descricao || p.codigo}</div>)}
                      </div>
                    )}
                    {serv.veiculosUtilizados && serv.veiculosUtilizados.length > 0 && (
                      <div style={{ backgroundColor: '#eff6ff', padding: '8px', borderRadius: '6px', color: '#1e40af', border: '1px solid #3b82f6' }}>
                        <strong style={{ display: 'block', marginBottom: '4px' }}>Frota / Veículo Utilizado:</strong>
                        {serv.veiculosUtilizados.map((v, i) => <div key={i}>• {v.placa} ({v.km} KM)</div>)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* LISTA DE PEÇAS SOLICITADAS */}
          {os.pecasSolicitadas && os.pecasSolicitadas.length > 0 && (
            <div>
              <h4 className={styles.sectionTitle}><Package size={18} /> Peças Solicitadas para a O.S.</h4>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--cor-borda-cartao)', color: 'var(--cor-texto-secundario)' }}>
                      <th style={{ textAlign: 'left', padding: '8px' }}>Código</th>
                      <th style={{ textAlign: 'left', padding: '8px' }}>Descrição</th>
                      <th style={{ textAlign: 'center', padding: '8px' }}>Qtd</th>
                      <th style={{ textAlign: 'left', padding: '8px' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {os.pecasSolicitadas.map((p, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--cor-borda-cartao)' }}>
                        <td style={{ padding: '8px', fontWeight: 'bold', color: 'var(--cor-destaque)' }}>{p.codigo}</td>
                        <td style={{ padding: '8px' }}>{p.descricao}</td>
                        <td style={{ padding: '8px', textAlign: 'center', fontWeight: 'bold' }}>{p.quantidade}</td>
                        <td style={{ padding: '8px', fontSize: '0.8rem', color: '#10b981', fontWeight: 'bold' }}>{p.status || 'ENTREGUE'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* LISTA DE PEÇAS DEVOLVIDAS AO ALMOXARIFADO */}
          {os.pecasDevolvidas && os.pecasDevolvidas.length > 0 && (
            <div>
              <h4 className={styles.sectionTitle} style={{ color: '#c2410c' }}><Package size={18} color="#ea580c" /> Devolução de Peças ao Almoxarifado</h4>
              <div style={{ backgroundColor: '#fff7ed', padding: '12px', borderRadius: '8px', border: '1px solid #fdba74' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #fed7aa', color: '#9a3412' }}>
                      <th style={{ textAlign: 'left', padding: '6px' }}>Material</th>
                      <th style={{ textAlign: 'center', padding: '6px' }}>Retiradas</th>
                      <th style={{ textAlign: 'center', padding: '6px' }}>Aplicadas</th>
                      <th style={{ textAlign: 'center', padding: '6px', color: '#c2410c' }}>Devolvidas</th>
                      <th style={{ textAlign: 'left', padding: '6px' }}>Motivo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {os.pecasDevolvidas.map((p, i) => (
                      <tr key={i} style={{ borderBottom: '1px dashed #fed7aa' }}>
                        <td style={{ padding: '6px', fontWeight: 'bold', color: '#9a3412' }}>{p.descricao}</td>
                        <td style={{ padding: '6px', textAlign: 'center' }}>{p.qtdLiberada}x</td>
                        <td style={{ padding: '6px', textAlign: 'center' }}>{p.qtdConsumida}x</td>
                        <td style={{ padding: '6px', textAlign: 'center', fontWeight: 'bold', color: '#c2410c' }}>{p.quantidadeDevolvida}x</td>
                        <td style={{ padding: '6px', fontStyle: 'italic', fontSize: '0.8rem', color: '#9a3412' }}>{p.motivoDevolucao || 'Sobra de manutenção'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.btnFecharModal} onClick={onClose}>
            Fechar Visualização
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalVisualizarOSTecnico;
