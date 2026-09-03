import React, { useState } from 'react';
import { FileText, PackageCheck, Boxes, PackageOpen, AlertTriangle, CalendarDays, ShoppingCart, ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './MenuAlmoxarifado.module.css';
import logoYama from '../../../../assets/YAMASERVICE.jpeg';
import ThemeToggle from '../../../ThemeToggle';
import BotaoSair from '../../../BotaoSair';
import UserInfo from '../../../UserInfo';

const MenuAlmoxarifado = ({ view, setView }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleCollapse = () => setIsCollapsed(!isCollapsed);

  return (
    <aside className={`${styles['sidebar']} ${isCollapsed ? styles.sidebarCollapsed : ''}`}>
      <div className={styles['sidebar-header']}>
        <div className={styles.brandContainer}>
          <img src={logoYama} alt="YAMASERVICE Logo" className={styles['logo']} />
          {!isCollapsed && (
            <div className={styles['brand']}>
              <h2>YAMASERVICE</h2>
              <p>Almoxarifado</p>
            </div>
          )}
        </div>
        <button
          type="button"
          className={styles.toggleCollapseBtn}
          onClick={toggleCollapse}
          title={isCollapsed ? "Expandir Menu" : "Recuar Menu"}
        >
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <UserInfo isCollapsed={isCollapsed} />

      <nav className={styles['nav-menu']}>
        {!isCollapsed && <div className={styles['nav-section']} style={{ marginTop: '16px' }}>Menu Principal</div>}

        <button
          className={`${styles['nav-item']} ${view === 'nova-requisicao' ? styles['active'] : ''} ${isCollapsed ? styles.collapsedCenter : ''}`}
          onClick={() => setView('nova-requisicao')}
        >
          <PackageCheck size={20} className={styles['nav-icon']} />
          {!isCollapsed && <span>Painel de Pedidos</span>}
        </button>

        <button
          className={`${styles['nav-item']} ${view === 'lista' ? styles['active'] : ''} ${isCollapsed ? styles.collapsedCenter : ''}`}
          onClick={() => setView('lista')}
        >
          <Boxes size={20} className={styles['nav-icon']} />
          {!isCollapsed && <span>Estoque</span>}
        </button>

        <button
          className={`${styles['nav-item']} ${view === 'relatorios' ? styles['active'] : ''} ${isCollapsed ? styles.collapsedCenter : ''}`}
          onClick={() => setView('relatorios')}
        >
          <FileText size={20} className={styles['nav-icon']} />
          {!isCollapsed && <span>Relatórios</span>}
        </button>

        <button
          className={`${styles['nav-item']} ${view === 'recebimento' ? styles['active'] : ''} ${isCollapsed ? styles.collapsedCenter : ''}`}
          onClick={() => setView('recebimento')}
        >
          <PackageOpen size={20} className={styles['nav-icon']} />
          {!isCollapsed && <span>Recebimento</span>}
        </button>

        <button
          className={`${styles['nav-item']} ${view === 'validade-produtos' ? styles['active'] : ''} ${isCollapsed ? styles.collapsedCenter : ''}`}
          onClick={() => setView('validade-produtos')}
        >
          <CalendarDays size={20} className={styles['nav-icon']} />
          {!isCollapsed && <span>Controle de Validade</span>}
        </button>

        <button
          className={`${styles['nav-item']} ${view === 'necessidade-compras' ? styles['active'] : ''} ${isCollapsed ? styles.collapsedCenter : ''}`}
          onClick={() => setView('necessidade-compras')}
        >
          <ShoppingCart size={20} className={styles['nav-icon']} />
          {!isCollapsed && <span>Necessidade Compras</span>}
        </button>

      </nav>

      <div className={styles['sidebar-footer']}>
        <ThemeToggle isCollapsed={isCollapsed} />
        {!isCollapsed && <p style={{ margin: '8px 0' }}>Sistema v1.0.0</p>}
        <div style={{ width: '100%', marginTop: isCollapsed ? '16px' : '0' }}>
          <BotaoSair isCollapsed={isCollapsed} />
        </div>
      </div>
    </aside>
  );
};

export default MenuAlmoxarifado;
