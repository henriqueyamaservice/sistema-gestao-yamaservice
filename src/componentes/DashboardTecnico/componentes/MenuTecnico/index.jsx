import React, { useState } from 'react';
import {
  Wrench,
  CheckCircle2,
  Menu,
  ChevronLeft,
  ChevronRight,
  ClipboardList
} from 'lucide-react';
import styles from './MenuTecnico.module.css';
import logoYama from '../../../../assets/YAMASERVICE.jpeg';
import ThemeToggle from '../../../ThemeToggle';
import BotaoSair from '../../../BotaoSair';
import UserInfo from '../../../UserInfo';

const MenuTecnico = ({
  abaAtiva,
  setAbaAtiva,
  totalMinhas = 0,
  totalHistorico = 0
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const toggleCollapse = () => {
    setIsCollapsed(prev => !prev);
  };

  const toggleMobileMenu = () => {
    setIsMobileOpen(prev => !prev);
  };

  const handleTabClick = (aba) => {
    setAbaAtiva(aba);
    setIsMobileOpen(false); // fecha o menu no mobile ao clicar
  };

  return (
    <>
      {/* Botão flutuante para mobile */}
      <button 
        className={styles.mobileMenuBtn} 
        onClick={toggleMobileMenu}
        title="Abrir Menu"
      >
        <Menu size={24} />
      </button>

      {/* Overlay escuro para mobile */}
      <div 
        className={`${styles.mobileMenuOverlay} ${isMobileOpen ? styles.isOpen : ''}`}
        onClick={() => setIsMobileOpen(false)}
      ></div>

      <aside className={`${styles.sidebar} ${isCollapsed ? styles.sidebarCollapsed : ''} ${isMobileOpen ? styles.mobileOpen : ''}`}>
        {/* Header com Logo e Botão de Retrair/Expandir estilo IDE */}
        <div className={styles.sidebarHeader}>
          <div className={styles.brandContainer}>
            <img src={logoYama} alt="YAMASERVICE Logo" className={styles.logo} />
            {!isCollapsed && (
              <div className={styles.brand}>
                <h2>TÉCNICO</h2>
                <p>Oficina &amp; Manutenção</p>
              </div>
            )}
          </div>

          <button
            type="button"
            className={styles.toggleCollapseBtn}
            onClick={toggleCollapse}
            title={isCollapsed ? "Expandir Menu" : "Recuar Menu (Modo Focado)"}
          >
            {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        <UserInfo isCollapsed={isCollapsed} />

        {/* Menu de Navegação */}
        <nav className={styles.navMenu}>
          {!isCollapsed && <div className={styles.navSection}>Minhas O.S.</div>}

          <button
            className={`${styles.navItem} ${abaAtiva === 'minhas' ? styles.navItemActive : ''} ${isCollapsed ? styles.collapsedCenter : ''}`}
            onClick={() => handleTabClick('minhas')}
            title="Em Andamento / Pendentes"
            style={{ justifyContent: isCollapsed ? 'center' : 'space-between' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Wrench size={18} className={styles.navIcon} />
              {!isCollapsed && <span>Em Andamento</span>}
            </div>
            {!isCollapsed && <span className={styles.badge}>{totalMinhas}</span>}
          </button>

          <button
            className={`${styles.navItem} ${abaAtiva === 'historico' ? styles.navItemActive : ''} ${isCollapsed ? styles.collapsedCenter : ''}`}
            onClick={() => handleTabClick('historico')}
            title="Histórico de O.S."
            style={{ justifyContent: isCollapsed ? 'center' : 'space-between' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <CheckCircle2 size={18} className={styles.navIcon} />
              {!isCollapsed && <span>Histórico</span>}
            </div>
            {!isCollapsed && <span className={styles.badge}>{totalHistorico}</span>}
          </button>

          <button
            className={`${styles.navItem} ${abaAtiva === 'meus_pedidos' ? styles.navItemActive : ''} ${isCollapsed ? styles.collapsedCenter : ''}`}
            onClick={() => handleTabClick('meus_pedidos')}
            title="Meus Pedidos (Requisições)"
            style={{ justifyContent: isCollapsed ? 'center' : 'flex-start' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <ClipboardList size={18} className={styles.navIcon} />
              {!isCollapsed && <span>Meus Pedidos</span>}
            </div>
          </button>
        </nav>

        {/* Footer com Ações Globais */}
        <div className={styles.sidebarFooter} style={{ alignItems: isCollapsed ? 'center' : 'stretch' }}>
          <ThemeToggle isCollapsed={isCollapsed} />
          <div style={{ width: '100%', marginTop: '8px' }}>
            <BotaoSair isCollapsed={isCollapsed} />
          </div>
        </div>
      </aside>
    </>
  );
};

export default MenuTecnico;
