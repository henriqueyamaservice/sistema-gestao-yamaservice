import React from 'react';
import { Wrench } from 'lucide-react';
import styles from './ManutencaoEstoque.module.css';

const ManutencaoEstoque = () => {
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerTitle}>
          <div className={styles.iconHighlight}>
            <Wrench size={28} />
          </div>
          <div>
            <h2>Manutenção do Estoque</h2>
            <p>Ajustes manuais, balanço e correções de inventário</p>
          </div>
        </div>
      </header>
      
      <div className={styles.content}>
        <p style={{ color: 'var(--cor-texto-secundario)', textAlign: 'center', padding: '40px' }}>
          Módulo de Manutenção do Estoque será implementado aqui.
        </p>
      </div>
    </div>
  );
};

export default ManutencaoEstoque;
