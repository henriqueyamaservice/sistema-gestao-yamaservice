import React, { useState } from 'react';
import {
  FileText, X, User, Car, Fuel, Camera, Eye, Gauge,
  CheckCircle2, DollarSign, Calendar, MapPin, Clock, Truck
} from 'lucide-react';
import styles from './index.module.css';

const DetalhesAbastecimentoModal = ({ requisicao, onClose }) => {
  const [fotoVisualizando, setFotoVisualizando] = useState(null);

  const currentUser = React.useMemo(() => {
    try {
      const saved = localStorage.getItem('almoxarifado_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  }, []);
  const isAdmin = currentUser?.role === 'admin';

  if (!requisicao) return null;

  const numReq = requisicao.numeroRequisicao || '';
  const isTransfer = numReq.startsWith('TRANSF-');
  const isDescarte = numReq.startsWith('DESC-');
  const nomeVeiculo = requisicao.uConsu || requisicao.veiculo || '';
  const isGerador = nomeVeiculo.toUpperCase().includes('GERADOR') ||
    nomeVeiculo.toUpperCase().includes('GRANJA') ||
    nomeVeiculo.toUpperCase().startsWith('G. ') ||
    requisicao.tipo === 'granja' ||
    requisicao.tipo === 'gerador';

  const sLower = (requisicao.status || '').toUpperCase();
  const isConcluido = sLower === 'CONCLUÍDO' || sLower === 'CONCLUIDO' || sLower === 'ABASTECIDA' || sLower === 'FINALIZADO';
  const isCancelado = sLower === 'CANCELADO' || sLower === 'CANCELADA';

  // 1. Tratamento seguro da Data/Hora de Abertura
  let dmaAbertura = '';
  let horaAbertura = requisicao.hora ? requisicao.hora.substring(0, 5) : '';
  let ymdAbertura = '';
  if (requisicao.data) {
    const [dPart, tPart] = requisicao.data.includes('T') ? requisicao.data.split('T') : requisicao.data.split(' ');
    if (dPart && dPart.includes('-')) {
      const [a, m, d] = dPart.split('-');
      ymdAbertura = `${a}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      dmaAbertura = `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${a}`;
    } else {
      dmaAbertura = dPart;
    }
    if (!horaAbertura && tPart) horaAbertura = tPart.substring(0, 5);
  }
  const dataAberturaCompleta = dmaAbertura ? `${dmaAbertura}${horaAbertura ? ` às ${horaAbertura}` : ''}` : '-';

  // 2. Tratamento seguro da Data/Hora do Abastecimento
  let dmaAbast = '';
  let horaAbast = requisicao.hora_abastecimento ? requisicao.hora_abastecimento.substring(0, 5) : '';
  let ymdAbast = '';
  const rawAbast = requisicao.data_abastecimento || (isConcluido ? (requisicao.data_hora || requisicao.data_hora_abastecimento) : '');
  if (rawAbast) {
    const [dPart, tPart] = rawAbast.includes('T') ? rawAbast.split('T') : rawAbast.split(' ');
    if (dPart && dPart.includes('-')) {
      const [a, m, d] = dPart.split('-');
      ymdAbast = `${a}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      dmaAbast = `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${a}`;
    } else {
      dmaAbast = dPart;
    }
    if (!horaAbast && tPart) horaAbast = tPart.substring(0, 5);
  }
  const dataAbastCompleta = dmaAbast ? `${dmaAbast}${horaAbast ? ` às ${horaAbast}` : ''}` : dataAberturaCompleta;

  // Verifica se o dia de abertura foi diferente do dia abastecido
  const diasDiferentes = ymdAbertura && ymdAbast && ymdAbertura !== ymdAbast;

  const fotoComprovante = requisicao.fotoNota || requisicao.fotoVisor || requisicao.foto || requisicao.fotoComprovante || null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modalCard}>
        <button type="button" onClick={onClose} className={styles.closeButton} title="Fechar modal">
          <X size={22} />
        </button>

        {/* Cabeçalho Superior com Título e Badges */}
        <div className={styles.cardHeader}>
          <div className={styles.titleArea}>
            <div className={styles.logoIcon}>
              <Fuel size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <h2 className={styles.cardTitle}>
                  {isTransfer ? 'Transferência' : isDescarte ? 'Descarte' : `Requisição #${numReq}`}
                </h2>

                {/* Badges de Status */}
                {isConcluido && (
                  <span style={{
                    backgroundColor: 'rgba(16, 185, 129, 0.15)',
                    color: '#10b981',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    padding: '3px 10px',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                    fontWeight: 'bold',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}>
                    <CheckCircle2 size={13} /> CONCLUÍDO
                  </span>
                )}
                {isCancelado && (
                  <span style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.15)',
                    color: '#ef4444',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    padding: '3px 10px',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                    fontWeight: 'bold'
                  }}>
                    🚫 CANCELADO
                  </span>
                )}
                {!isConcluido && !isCancelado && (
                  <span style={{
                    backgroundColor: 'rgba(59, 130, 246, 0.15)',
                    color: '#3b82f6',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    padding: '3px 10px',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                    fontWeight: 'bold'
                  }}>
                    ⏳ EM ANDAMENTO
                  </span>
                )}
              </div>
              <span className={styles.cardSubtitle}>
                Registro e Auditoria de Saída de Combustível
              </span>
            </div>
          </div>
        </div>

        {/* Resumo Principal em 4 Cards Modernos */}
        <div className={styles.heroSummaryGrid}>
          {/* Card 1: Veículo / Destino */}
          <div className={styles.heroCard}>
            <div className={styles.heroCardHeader}>
              <span className={styles.heroCardLabel}>Veículo / Equipamento</span>
              <div className={styles.heroCardIcon}>
                <Truck size={15} color="var(--cor-destaque)" />
              </div>
            </div>
            <div className={styles.heroCardValue} style={{ color: 'var(--cor-destaque)' }}>
              {nomeVeiculo || '-'}
            </div>
            <div className={styles.heroCardSub}>
              {isGerador ? 'Gerador / Granja' : (isTransfer ? 'Transferência' : 'Veículo de Frota')}
            </div>
          </div>

          {/* Card 2: Motorista / Solicitante */}
          <div className={styles.heroCard}>
            <div className={styles.heroCardHeader}>
              <span className={styles.heroCardLabel}>Motorista / Solicitante</span>
              <div className={styles.heroCardIcon}>
                <User size={15} color="#3b82f6" />
              </div>
            </div>
            <div className={styles.heroCardValue}>
              {requisicao.motorista || requisicao.requisitante || '-'}
            </div>
            <div className={styles.heroCardSub}>
              Condutor Responsável
            </div>
          </div>

          {/* Card 3: Posto / Fornecedor */}
          <div className={styles.heroCard}>
            <div className={styles.heroCardHeader}>
              <span className={styles.heroCardLabel}>Posto / Fornecedor</span>
              <div className={styles.heroCardIcon}>
                <MapPin size={15} color="#8b5cf6" />
              </div>
            </div>
            <div className={styles.heroCardValue}>
              {requisicao.fornecedor || '-'}
            </div>
            <div className={styles.heroCardSub}>
              Mês Referência: <strong>{requisicao.mes || '-'}</strong>
            </div>
          </div>

          {/* Card 4: Cronologia (Data e Hora de Abastecimento e Abertura) */}
          <div className={styles.heroCard}>
            <div className={styles.heroCardHeader}>
              <span className={styles.heroCardLabel}>
                {isConcluido ? 'Abastecido em' : 'Data de Abertura'}
              </span>
              <div className={styles.heroCardIcon}>
                <Clock size={15} color={isConcluido ? "#10b981" : "#3b82f6"} />
              </div>
            </div>
            <div className={styles.heroCardValue} style={{ color: isConcluido ? '#10b981' : 'var(--cor-texto-principal)', fontSize: '0.92rem' }}>
              {isConcluido ? dataAbastCompleta : dataAberturaCompleta}
            </div>
            <div className={styles.heroCardSub}>
              {isConcluido ? (
                diasDiferentes ? (
                  <span>Aberta em: {dmaAbertura}</span>
                ) : (
                  <span>Requisição aberta em: {dmaAbertura || 'mesmo dia'}</span>
                )
              ) : (
                <span>Aguardando conclusão</span>
              )}
            </div>
          </div>
        </div>

        {/* Card Único em Coluna: Combustível, Financeiro e Medição de Rodagem */}
        <div className={styles.sectionBox} style={{ marginBottom: '16px' }}>
          {/* Subseção: Combustível e Financeiro */}
          <div className={styles.sectionHeader}>
            <Fuel size={16} color="var(--cor-destaque)" />
            <span>Combustível e Financeiro</span>
          </div>

          <div className={styles.fieldsGrid}>
            <div className={styles.fieldGroup}>
              <span className={styles.fieldLabel}>Combustível</span>
              <div className={styles.fieldValueBox}>
                {requisicao.combustivel || requisicao.tipo_combustivel || '-'}
              </div>
            </div>

            {!isTransfer && !isDescarte && (
              <div className={styles.fieldGroup}>
                <span className={styles.fieldLabel}>Cupom Fiscal / Comprovante</span>
                <div className={styles.fieldValueBox}>
                  {requisicao.cupom || '-'}
                </div>
              </div>
            )}

            <div className={styles.fieldGroup}>
              <span className={styles.fieldLabel}>Quantidade Abastecida</span>
              <div className={`${styles.fieldValueBox} ${styles.fieldValueHighlight}`}>
                {requisicao.qtde ? `${parseFloat(requisicao.qtde).toFixed(2)} L` : (requisicao.litros ? `${parseFloat(requisicao.litros).toFixed(2)} L` : '-')}
              </div>
            </div>

            {!isDescarte && (
              <div className={styles.fieldGroup}>
                <span className={styles.fieldLabel}>Valor Unitário (R$/L)</span>
                <div className={styles.fieldValueBox}>
                  {requisicao.valorUnitario ? `R$ ${parseFloat(requisicao.valorUnitario).toFixed(2)}` : (requisicao.valor_litro ? `R$ ${parseFloat(requisicao.valor_litro).toFixed(2)}` : '-')}
                </div>
              </div>
            )}

            {isAdmin && !isDescarte && (
              <div className={styles.fieldGroup} style={{ gridColumn: 'span 2' }}>
                <span className={styles.fieldLabel}>Valor Total do Abastecimento</span>
                <div className={`${styles.fieldValueBox} ${styles.fieldValueSuccess}`} style={{ fontSize: '1rem' }}>
                  {requisicao.valorTotal ? `R$ ${parseFloat(requisicao.valorTotal).toFixed(2)}` : (requisicao.valor_total ? `R$ ${parseFloat(requisicao.valor_total).toFixed(2)}` : '-')}
                </div>
              </div>
            )}
          </div>

          {/* Subseção: Medição de Rodagem */}
          <div className={styles.sectionHeader} style={{ marginTop: '6px', paddingTop: '10px', borderTop: '1px solid var(--cor-borda-cartao)' }}>
            <Gauge size={16} color="var(--cor-destaque)" />
            <span>{isGerador ? 'Horímetro' : 'Km'}</span>
          </div>

          <div className={styles.fieldsGrid}>
            {!isTransfer && !isDescarte && (
              <div className={styles.fieldGroup} style={{ gridColumn: (requisicao.observacao) ? 'span 1' : 'span 2' }}>
                <span className={styles.fieldLabel}>{isGerador ? 'Horímetro Atual' : 'KM Atual'}</span>
                <div className={`${styles.fieldValueBox} ${styles.fieldValueHighlight}`} style={{ fontSize: '1rem' }}>
                  {requisicao.km ? `${Number(requisicao.km).toLocaleString('pt-BR')} ${isGerador ? 'hrs' : 'km'}` : (requisicao.km_abastecimento ? `${Number(requisicao.km_abastecimento).toLocaleString('pt-BR')} ${isGerador ? 'hrs' : 'km'}` : '-')}
                </div>
              </div>
            )}

            {(isTransfer || isDescarte || requisicao.observacao) && (
              <div className={styles.fieldGroup} style={{ gridColumn: (!isTransfer && !isDescarte) ? 'span 1' : 'span 2' }}>
                <span className={styles.fieldLabel}>Observação</span>
                <div className={styles.fieldValueBox} style={{ whiteSpace: 'pre-wrap' }}>
                  {requisicao.observacao || '-'}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Foto do Comprovante / Visor da Bomba */}
        {fotoComprovante && (
          <div className={styles.photoBox}>
            <img
              src={fotoComprovante}
              alt="Comprovante"
              className={styles.photoThumb}
              onClick={() => setFotoVisualizando(fotoComprovante)}
              title="Clique para ampliar"
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--cor-texto-principal)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Camera size={16} color="var(--cor-destaque)" />
                Comprovante Fotográfico Anexado
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--cor-texto-secundario)' }}>
                Registro capturado no ato do abastecimento para fins de auditoria e prestação de contas.
              </span>
              <div>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  style={{ padding: '6px 12px', fontSize: '0.78rem', marginTop: '4px' }}
                  onClick={() => setFotoVisualizando(fotoComprovante)}
                >
                  <Eye size={13} /> Ver em Tela Cheia
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Informações de Auditoria: Quem Criou e Quem Concluiu */}
        <div className={styles.auditoriaCard}>
          {/* Quem Criou a Requisição */}
          <div className={styles.auditoriaRow}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <User size={15} color="#3b82f6" />
              <span style={{ color: 'var(--cor-texto-secundario)' }}>
                Requisição Aberta por: <strong style={{ color: 'var(--cor-texto-principal)' }}>{requisicao.criado_por || requisicao.emitente || 'Almoxarifado'}</strong>
              </span>
            </div>
            <span style={{
              fontSize: '0.7rem',
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: '6px',
              backgroundColor: 'rgba(59, 130, 246, 0.12)',
              color: '#3b82f6',
              border: '1px solid rgba(59, 130, 246, 0.25)'
            }}>
              Abertura
            </span>
          </div>

          {/* Quem Concluiu o Abastecimento */}
          {requisicao.preenchido_por && (
            <div className={styles.auditoriaRow} style={{ borderTop: '1px solid var(--cor-borda-cartao)', paddingTop: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <User size={15} color="var(--cor-destaque)" />
                <span style={{ color: 'var(--cor-texto-secundario)' }}>
                  Abastecimento Concluído por: <strong style={{ color: 'var(--cor-texto-principal)' }}>{requisicao.preenchido_por}</strong>
                </span>
              </div>
              {requisicao.usuario_tipo && (
                <span style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '6px',
                  backgroundColor: requisicao.usuario_tipo === 'motorista' ? 'rgba(59, 130, 246, 0.15)' : requisicao.usuario_tipo === 'frentista' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 107, 0, 0.15)',
                  color: requisicao.usuario_tipo === 'motorista' ? '#3b82f6' : requisicao.usuario_tipo === 'frentista' ? '#10b981' : 'var(--cor-destaque)',
                  border: requisicao.usuario_tipo === 'motorista' ? '1px solid rgba(59, 130, 246, 0.3)' : requisicao.usuario_tipo === 'frentista' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(255, 107, 0, 0.3)'
                }}>
                  {requisicao.usuario_tipo === 'motorista' ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Car size={11} /> Motorista
                    </span>
                  ) : requisicao.usuario_tipo === 'frentista' ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Fuel size={11} /> Frentista Yamaves
                    </span>
                  ) : (
                    requisicao.usuario_tipo.toUpperCase()
                  )}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Rodapé com botão Fechar */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
          <button type="button" onClick={onClose} className={styles.btnFechar}>
            Fechar
          </button>
        </div>

        {/* Modal de Zoom da Foto em Tela Cheia */}
        {fotoVisualizando && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.92)',
              zIndex: 100000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px'
            }}
            onClick={() => setFotoVisualizando(null)}
          >
            <button
              type="button"
              style={{
                position: 'absolute',
                top: 20,
                right: 20,
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                color: '#fff',
                width: 44,
                height: 44,
                borderRadius: '50%',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onClick={() => setFotoVisualizando(null)}
            >
              <X size={24} />
            </button>
            <img
              src={fotoVisualizando}
              alt="Foto Ampliada"
              style={{ maxWidth: '95vw', maxHeight: '88vh', objectFit: 'contain', borderRadius: '8px' }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default DetalhesAbastecimentoModal;
