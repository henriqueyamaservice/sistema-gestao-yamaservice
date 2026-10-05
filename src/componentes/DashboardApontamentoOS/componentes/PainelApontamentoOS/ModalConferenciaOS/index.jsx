import React from 'react';
import { 
  X, 
  CheckCircle, 
  Clock, 
  User, 
  Package, 
  Car, 
  Calendar, 
  AlertCircle, 
  FileText, 
  Pencil, 
  Eye, 
  Camera, 
  ArrowLeft, 
  CheckCheck,
  Wrench,
  Droplet,
  Users,
  Loader2
} from 'lucide-react';
import styles from './ModalConferenciaOS.module.css';
import { formatarOdometroDisplay } from '../../../../../utils/formatadorOdometro';
import { formatarHorariosTurno } from '../index';

const ModalConferenciaOS = ({
  os = {},
  executorPrincipal = '',
  turnos = [],
  totalHorasGeral = 0,
  isOSDeVeiculo = false,
  labelMedicao = 'KM Atual',
  kmManutencao = '',
  unidadeMedicao = 'km',
  trocouOleo = false,
  descarteBorra = '',
  fezRevisao = false,
  isAtrasada = false,
  observacaoJustificativa = '',
  dataJustificativa = '',
  calcularHorasTurno = () => '0.0',
  formatarDataBR = (d) => d,
  onConfirmar,
  onVoltarParaEditar,
  onEditarDia,
  onVerFotoNota,
  salvando = false
}) => {
  const totalPecasCount = turnos.reduce((acc, t) => acc + (t.pecasUtilizadas || []).length, 0);

  return (
    <div className={styles.overlayModal} onClick={onVoltarParaEditar}>
      <div className={styles.modalCard} onClick={e => e.stopPropagation()}>
        
        {/* CABEÇALHO */}
        <div className={styles.modalHeader}>
          <div className={styles.headerTitleGroup}>
            <div className={styles.headerIconBubble}>
              <CheckCheck size={26} />
            </div>
            <div className={styles.headerTitles}>
              <h2>Conferência Final da O.S. #{os.codigo}</h2>
              <p>Confira o espelho de apontamento antes de finalizar definitivamente.</p>
            </div>
          </div>
          <button 
            type="button" 
            className={styles.btnClose} 
            onClick={onVoltarParaEditar}
            title="Fechar e voltar à edição"
          >
            <X size={20} />
          </button>
        </div>

        {/* CORPO DO MODAL */}
        <div className={styles.modalBody}>
          
          {/* GRID DE RESUMO PRINCIPAL */}
          <div className={styles.summaryGrid}>
            <div className={styles.summaryCard}>
              <span className={styles.summaryCardLabel}>
                <User size={13} /> Executor Responsável
              </span>
              <span className={styles.summaryCardValue}>
                {executorPrincipal || 'Não informado'}
              </span>
            </div>

            <div className={styles.summaryCard}>
              <span className={styles.summaryCardLabel}>
                <Clock size={13} color="var(--cor-sucesso)" /> Total de Horas
              </span>
              <span className={styles.summaryCardValue} style={{ color: 'var(--cor-sucesso)' }}>
                {Number(totalHorasGeral).toFixed(1)} horas ({turnos.length} {turnos.length === 1 ? 'turno' : 'turnos'})
              </span>
            </div>

            <div className={styles.summaryCard}>
              <span className={styles.summaryCardLabel}>
                <Package size={13} color="var(--cor-destaque)" /> Peças & Materiais
              </span>
              <span className={styles.summaryCardValue}>
                {totalPecasCount} {totalPecasCount === 1 ? 'item apontado' : 'itens apontados'}
              </span>
            </div>

            {isOSDeVeiculo && (
              <div className={styles.summaryCard} style={{ borderColor: 'var(--cor-destaque)' }}>
                <span className={styles.summaryCardLabel}>
                  <Car size={13} color="var(--cor-destaque)" /> {labelMedicao} ({os.centroCusto})
                </span>
                <span className={styles.summaryCardValue} style={{ color: 'var(--cor-destaque)' }}>
                  {kmManutencao ? formatarOdometroDisplay(kmManutencao, unidadeMedicao) : 'Não informado'}
                </span>
              </div>
            )}
          </div>

          {/* MANUTENÇÕES ESPECIAIS (SE HOUVER) */}
          {isOSDeVeiculo && (trocouOleo || fezRevisao) && (
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {trocouOleo && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(59, 130, 246, 0.12)', border: '1px solid rgba(59, 130, 246, 0.35)', padding: '6px 12px', borderRadius: '10px', fontSize: '0.85rem', color: '#2563eb', fontWeight: 800 }}>
                  <Droplet size={15} />
                  <span>Óleo Trocado {descarteBorra ? `(${descarteBorra} Litros de descarte)` : ''}</span>
                </div>
              )}
              {fezRevisao && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.35)', padding: '6px 12px', borderRadius: '10px', fontSize: '0.85rem', color: '#d97706', fontWeight: 800 }}>
                  <Wrench size={15} />
                  <span>Revisão Periódica / Geral Feita</span>
                </div>
              )}
            </div>
          )}

          {/* ALERTA DE ATRASO COM JUSTIFICATIVA (SE HOUVER) */}
          {isAtrasada && (
            <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--cor-erro, #ef4444)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertCircle size={15} />
                Justificativa de Atraso Registrada:
              </span>
              <span style={{ fontSize: '0.85rem', color: 'var(--cor-texto-principal)', fontStyle: 'italic' }}>
                "{observacaoJustificativa || 'Não informada'}" ({formatarDataBR(dataJustificativa)})
              </span>
            </div>
          )}

          {/* DETALHAMENTO DE CADA DIA */}
          <div className={styles.secaoDiasContainer}>
            <div className={styles.secaoTitulo}>
              <Calendar size={18} color="var(--cor-destaque)" />
              <span>Detalhamento dos {turnos.length} {turnos.length === 1 ? 'Dia Apontado' : 'Dias Apontados'}:</span>
            </div>

            {turnos.map((t, idx) => (
              <div key={t.id || idx} className={styles.cardDiaEspelho}>
                <div className={styles.cardDiaEspelhoHeader}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span className={styles.diaTag}>
                      <Calendar size={15} /> Dia #{idx + 1} - {formatarDataBR(t.data)}
                    </span>
                    <span className={styles.horasTag}>
                      <Clock size={13} /> {calcularHorasTurno(t)}h ({formatarHorariosTurno(t)})
                    </span>
                  </div>
                  <button
                    type="button"
                    className={styles.btnEditarDiaEspelho}
                    onClick={() => {
                      onVoltarParaEditar();
                      if (onEditarDia) onEditarDia(idx, t);
                    }}
                    title="Editar dados deste dia"
                  >
                    <Pencil size={13} />
                    <span>Editar Dia #{idx + 1}</span>
                  </button>
                </div>

                <div style={{ fontSize: '0.94rem', color: 'var(--cor-texto-principal)', lineHeight: '1.4' }}>
                  <strong>Serviço Realizado:</strong> {t.descricao || 'Sem descrição'}
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '0.86rem', color: 'var(--cor-texto-secundario)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Users size={15} color="var(--cor-destaque)" />
                    <strong>Equipe:</strong> {(t.maoDeObra || []).map(m => m.nome).filter(Boolean).join(', ') || 'Nenhum membro'}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Car size={15} color="var(--cor-destaque)" />
                    <strong>Veículos:</strong> {(t.veiculosUtilizados || []).map(v => `${v.placa} (${v.km || 0} km)`).join(', ') || 'Nenhum'}
                  </span>
                </div>

                {/* PEÇAS DO DIA */}
                {t.pecasUtilizadas && t.pecasUtilizadas.length > 0 && (
                  <div style={{ borderTop: '1px dashed var(--cor-borda-cartao)', paddingTop: '10px', marginTop: '4px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {t.pecasUtilizadas.map((p, pIdx) => {
                      const isExterna = p.tipo === 'EXTERNA' || p.codigo === 'EXTERNO';
                      return (
                        <div key={pIdx} className={styles.pecaItemTag}>
                          {isExterna ? (
                            <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '2px 6px', borderRadius: '6px', backgroundColor: 'rgba(217, 119, 6, 0.18)', color: '#d97706' }}>
                              Externa
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '2px 6px', borderRadius: '6px', backgroundColor: 'rgba(59, 130, 246, 0.18)', color: '#2563eb' }}>
                              Estoque
                            </span>
                          )}
                          <span>{p.quantidade}x <strong>{p.descricao || p.codigo}</strong></span>
                          {isExterna && p.valor_unitario > 0 && (
                            <span style={{ color: 'var(--cor-destaque)', fontWeight: 800, marginLeft: '2px' }}>
                              R$ {(Number(p.valor_unitario) * Number(p.quantidade || 1)).toFixed(2)}
                            </span>
                          )}
                          {p.fotoNota && (
                            <button
                              type="button"
                              onClick={() => onVerFotoNota && onVerFotoNota(p.fotoNota)}
                              style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.35)', color: '#059669', padding: '3px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            >
                              <Eye size={12} /> Ver NF
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>

        </div>

        {/* RODAPÉ DO MODAL DE CONFERÊNCIA */}
        <div className={styles.modalFooter}>
          <button
            type="button"
            className={styles.btnVoltarEdicao}
            onClick={onVoltarParaEditar}
            disabled={salvando}
          >
            <ArrowLeft size={16} />
            <span>Voltar e Corrigir Algo</span>
          </button>

          <button
            type="button"
            className={styles.btnConfirmarFinal}
            onClick={() => {
              if (!salvando) onConfirmar();
            }}
            disabled={salvando}
          >
            {salvando ? (
              <Loader2 size={18} className={styles.spin} />
            ) : (
              <CheckCircle size={18} />
            )}
            <span>{salvando ? 'Concluindo O.S...' : 'Confirmar & Concluir Definitivamente'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};

export default ModalConferenciaOS;
