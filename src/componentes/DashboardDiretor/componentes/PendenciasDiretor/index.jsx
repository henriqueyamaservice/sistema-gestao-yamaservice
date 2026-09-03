import React from 'react';
import { Inbox } from 'lucide-react';
import styles from './PendenciasDiretor.module.css';
import CardAprovacao from '../CardAprovacao';

const PendenciasDiretor = ({ requisicoesAguardando, onAcao }) => {
  if (requisicoesAguardando.length === 0) {
    return (
      <div className={styles.emptyState}>
        <Inbox size={48} color="#cbd5e1" style={{ margin: '0 auto' }} />
        <h3>Tudo Limpo!</h3>
        <p>Não há requisições ou O.S. aguardando a sua aprovação no momento.</p>
      </div>
    );
  }

  return (
    <div className={styles.listaPendentes}>
      {requisicoesAguardando.map(req => (
        <CardAprovacao key={req.codigo || req.id} req={req} onAcao={onAcao} />
      ))}
    </div>
  );
};

export default PendenciasDiretor;
