import React, { useState } from 'react';
import { Check, X, ShieldAlert, Clock, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import styles from './CardAprovacao.module.css';

const CardAprovacao = ({ req, onAcao }) => {
  const [expandido, setExpandido] = useState(false);

  const itens = req.itens || req.itensCarrinho || [];
  const valorTotal = req.valorEstimado !== undefined && req.valorEstimado !== null && Number(req.valorEstimado) > 0
    ? Number(req.valorEstimado)
    : itens.reduce((acc, i) => acc + (Number(i.quantidade || 0) * Number(i.valor_unitario || 0)), 0);

  const solicitanteNome = req.solicitante || req.requisitante || 'Funcionário';
  const setorNome = req.departamento || req.setor || 'GERAL';
  const codigoOS = req.codigo || req.id || 'O.S.';
  const isUrgente = req.prioridade === 'urgente' || req.isEmergencia;

  return (
    <div className={styles.listRow}>
      <div className={styles.rowMain}>
        <div className={styles.rowInfo}>
          <div className={styles.solicitante}>{solicitanteNome}</div>
          <div className={styles.departamento}>
            <Clock size={12} color="#f97316" />
            {setorNome}
            {isUrgente ? (
              <span className={styles.badgeUrgente}>
                <ShieldAlert size={12} /> URGENTE
              </span>
            ) : (
              <span className={styles.badgeNormal}>#{codigoOS}</span>
            )}
          </div>
        </div>

        <div className={styles.rowValorBlock}>
          <span className={styles.valorLabel}>Valor Orçado</span>
          <div className={styles.valorTotalList}>
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorTotal)}
          </div>
        </div>

        <div className={styles.rowActions}>
          <button className={styles.btnVerItensList} onClick={() => setExpandido(!expandido)}>
            <FileText size={14} />
            {itens.length} {itens.length === 1 ? 'Item' : 'Itens'} {expandido ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          
          <div className={styles.actionButtonsList}>
            <button className={styles.btnRejeitarList} onClick={() => onAcao(codigoOS, 'rejeitar')} title="Rejeitar">
              <X size={20} />
            </button>
            <button className={styles.btnAprovarList} onClick={() => onAcao(codigoOS, 'aprovar')} title="Aprovar">
              <Check size={20} />
            </button>
          </div>
        </div>
      </div>

      {expandido && (
        <div className={styles.rowExpanded}>
          {itens.length === 0 ? (
            <div style={{ padding: '12px 16px', fontSize: '0.85rem', color: 'var(--cor-texto-principal)' }}>
              <strong>Descrição / Serviço Solicitado:</strong> {req.descricao || 'Sem detalhamento cadastrado.'}
              {req.observacaoChefe && (
                <div className={styles.parecerChefe}>
                  <strong>💬 Parecer Técnico do Chefe:</strong><br />
                  {req.observacaoChefe}
                </div>
              )}
            </div>
          ) : (
            <div style={{ padding: '12px 16px' }}>
              <ul className={styles.itensList}>
                {itens.map((item, index) => (
                  <li key={index} className={styles.item}>
                    <div>
                      <div className={styles.itemCodigo}>{item.codigo || '-'}</div>
                      <div className={styles.itemDescricao}>{item.descricao || item.nome || 'Item sem nome'}</div>
                    </div>
                    <div className={styles.itemQtd}>{item.quantidade || 1}x</div>
                  </li>
                ))}
              </ul>
              {req.observacaoChefe && (
                <div className={styles.parecerChefe}>
                  <strong>💬 Parecer Técnico do Chefe:</strong><br />
                  {req.observacaoChefe}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CardAprovacao;
