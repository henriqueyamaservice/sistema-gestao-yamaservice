import React from 'react';
import { ShieldAlert, AlertTriangle, Eye, Sparkles, Cog, Package } from 'lucide-react';
import styles from '../../DashboardChefeSetor.module.css';

const CardOSChefeSetor = ({
  os,
  abaAtiva,
  tecnicos,
  tecnicoSelecionadoNome,
  valorAtual,
  onAbrirModal,
  onSelectTecnico,
  onRejeitar,
  onAprovarEEnviar
}) => {
  const osKey = os.codigo || os.id;
  const isAcimaAlcada = os.tipo === 'INVESTIMENTO' && valorAtual > 5000;

  return (
    <div className={`${styles.cardOS} ${os.isEmergencia ? styles.cardEmergencia : ''}`}>
      {os.isEmergencia && (
        <div className={styles.badgeEmergencia}>
          <ShieldAlert size={16} /> EMERGÊNCIA - MÁQUINA PARADA
        </div>
      )}

      {os.situacao === 'AGUARDANDO_CHEFE_SETOR' && !os.isEmergencia && (
        <div style={{ backgroundColor: '#ecfdf5', color: '#047857', padding: '8px 12px', fontSize: '0.8rem', fontWeight: 'bold', borderRadius: '6px', border: '1px solid #10b981', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={16} color="#059669" />
          <span>NOVA REQUISIÇÃO RECEBIDA</span>
        </div>
      )}

      {os.pecasSolicitadas?.some(p => p.status === 'AGUARDANDO_CHEFE_ADICIONAL') && (
        <div style={{ backgroundColor: '#fef3c7', color: '#b45309', padding: '10px 14px', fontSize: '0.8rem', fontWeight: 'bold', borderRadius: '6px', border: '1px solid #f59e0b', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertTriangle size={18} color="#d97706" />
          <span>ALERTA: O Técnico adicionou mais peças ao orçamento desta O.S.!</span>
        </div>
      )}

      <div className={styles.cardHeader}>
        <span className={styles.codigoOS}>{os.codigo}</span>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <span className={styles.setorBadge}>{os.setor || 'SETOR GERAL'}</span>
          <button 
            className={styles.btnOrcarModal}
            onClick={() => onAbrirModal(os)}
            title="Abrir detalhes e elaborar orçamento"
          >
            <Eye size={14} /> Ver / Orçar
          </button>
        </div>
      </div>

      <div className={styles.cardBody}>
        {/* DESTAQUE DO SERVIÇO SOLICITADO */}
        <div className={styles.servicoBox}>
          <span className={styles.servicoLabel}>SERVIÇO SOLICITADO:</span>
          <p className={styles.servicoTexto}>{os.descricao || 'Sem descrição informada.'}</p>
        </div>

        <div className={styles.infoMeta}>
          <span>Solicitante: <strong>{os.requisitante || 'Funcionário'}</strong></span>
          <span>Aberto por: <strong>{os.abertoPor || 'Desconhecido'}</strong></span>
          <span>Tipo: <strong>{os.tipo || 'CORRETIVA'}</strong></span>
        </div>

        {abaAtiva !== 'pendentes' && (
          <div className={styles.infoMeta} style={{ marginTop: '4px' }}>
            <span>Valor Orçado: <strong style={{ color: 'var(--cor-destaque)' }}>
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorAtual)}
            </strong></span>
          </div>
        )}

        {os.itensCarrinho && os.itensCarrinho.length > 0 && (
          <div className={styles.pecasBox}>
            <span className={styles.pecasTitle}>Peças Solicitadas ({os.itensCarrinho.length}):</span>
            <ul>
              {os.itensCarrinho.map((item, idx) => (
                <li key={idx}>
                  {item.quantidade}x - {item.descricao}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {abaAtiva === 'pendentes' ? (
        <div className={styles.cardFooter} style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '10px', marginTop: '10px', borderTop: '1px dashed var(--cor-borda-cartao)' }}>
          <button 
            className={styles.btnOrcarModal}
            onClick={() => onAbrirModal(os)}
            style={{ width: '100%', justifyContent: 'center', padding: '10px 14px', fontSize: '0.85rem' }}
          >
            <Eye size={16} /> Abrir Orçamento &amp; Triagem
          </button>
        </div>
      ) : (
        <div className={styles.cardFooter} style={{ borderTop: '1px dashed var(--cor-borda-cartao)', paddingTop: '10px', marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--cor-texto-secundario)', display: 'block' }}>Técnico Escalado:</span>
            <strong style={{ fontSize: '0.85rem', color: 'var(--cor-texto-principal)', textTransform: 'uppercase' }}>
              {os.tecnicoResponsavel || tecnicoSelecionadoNome || 'Não Atribuído'}
            </strong>
          </div>

          <span style={{
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '0.75rem',
            fontWeight: 'bold',
            backgroundColor: os.situacao === 'EM_ANDAMENTO' ? '#dbeafe' : (os.situacao === 'AGUARDANDO_INSUMO' ? '#fef3c7' : 'var(--cor-fundo-secundario)'),
            color: os.situacao === 'EM_ANDAMENTO' ? '#1e40af' : (os.situacao === 'AGUARDANDO_INSUMO' ? '#b45309' : 'var(--cor-texto-secundario)'),
            border: '1px solid var(--cor-borda-cartao)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            {os.situacao === 'EM_ANDAMENTO' ? <><Cog size={14} /> EM ANDAMENTO</> : 
             os.situacao === 'AGUARDANDO_INSUMO' ? <><Package size={14} /> AGUARDANDO INSUMO</> : 
             os.situacao === 'AGUARDANDO_ALMOXARIFADO' ? <><Package size={14} /> ALMOXARIFADO</> : 
             os.situacao || 'ATRIBUÍDO'}
          </span>
        </div>
      )}
    </div>
  );
};

export default CardOSChefeSetor;
