import React from 'react';
import { FileText, PackageCheck, Boxes, PackageOpen, AlertTriangle } from 'lucide-react';
import styles from './MenuAlmoxarifado.module.css';
import logoYama from '../../../../assets/YAMASERVICE.jpeg';
import ThemeToggle from '../../../ThemeToggle';

const MenuAlmoxarifado = ({ view, setView }) => {
  return (
    <aside className={styles['sidebar']}>
      <div className={styles['sidebar-header']}>
        <img src={logoYama} alt="YAMASERVICE Logo" className={styles['logo']} />
        <div className={styles['brand']}>
          <h2>YAMASERVICE</h2>
          <p>Almoxarifado</p>
        </div>
      </div>

      <nav className={styles['nav-menu']}>
        <div className={styles['nav-section']}>Menu Principal</div>

        <button
          className={`${styles['nav-item']} ${view === 'nova-requisicao' ? styles['active'] : ''}`}
          onClick={() => setView('nova-requisicao')}
        >
          <PackageCheck size={20} className={styles['nav-icon']} />
          Painel de Pedidos
        </button>

        <button
          className={`${styles['nav-item']} ${view === 'lista' ? styles['active'] : ''}`}
          onClick={() => setView('lista')}
        >
          <Boxes size={20} className={styles['nav-icon']} />
          Estoque
        </button>


        <button
          className={`${styles['nav-item']} ${view === 'relatorios' ? styles['active'] : ''}`}
          onClick={() => setView('relatorios')}
        >
          <FileText size={20} className={styles['nav-icon']} />
          Relatórios
        </button>


        <button
          className={`${styles['nav-item']} ${view === 'recebimento' ? styles['active'] : ''}`}
          onClick={() => setView('recebimento')}
        >
          <PackageOpen size={20} className={styles['nav-icon']} />
          Recebimento
        </button>

        <button
          className={`${styles['nav-item']} ${view === 'validade-produtos' ? styles['active'] : ''}`}
          onClick={() => setView('validade-produtos')}
        >
          <AlertTriangle size={20} className={styles['nav-icon']} />
          Controle de Validade
        </button>

        <button
          className={`${styles['nav-item']} ${view === 'necessidade-compras' ? styles['active'] : ''}`}
          onClick={() => setView('necessidade-compras')}
        >
          <AlertTriangle size={20} className={styles['nav-icon']} />
          Necessidade Compras
        </button>

      </nav>

      <div className={styles['sidebar-footer']}>
        <ThemeToggle />
        <p style={{ marginTop: '16px' }}>Sistema v1.0.0</p>
      </div>
    </aside>
  );
};

export default MenuAlmoxarifado;
