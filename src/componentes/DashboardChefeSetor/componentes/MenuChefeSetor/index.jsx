import React, { useState } from 'react';
import {
  Clock,
  Wrench,
  CheckCircle2,
  Menu,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  ClipboardList
} from 'lucide-react';
import styles from './MenuChefeSetor.module.css';
import logoYama from '../../../../assets/YAMASERVICE.jpeg';
import ThemeToggle from '../../../ThemeToggle';
import BotaoSair from '../../../BotaoSair';
import UserInfo from '../../../UserInfo';

const MenuChefeSetor = ({
  abaAtiva,
  setAbaAtiva,
  setShowGerenciadorUsuarios
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
                <h2>CHEFE SETOR</h2>
                <p>Triagem &amp; Execução</p>
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
          {!isCollapsed && <div className={styles.navSection}>Gestão de O.S.</div>}

          <button
            className={`${styles.navItem} ${abaAtiva === 'pendentes' ? styles.navItemActive : ''} ${isCollapsed ? styles.collapsedCenter : ''}`}
            onClick={() => handleTabClick('pendentes')}
            title="Triagem / Orçar"
          >
            <Clock size={18} className={styles.navIcon} />
            {!isCollapsed && <span>Triagem / Orçar</span>}
          </button>

          <button
            className={`${styles.navItem} ${abaAtiva === 'em_andamento' ? styles.navItemActive : ''} ${isCollapsed ? styles.collapsedCenter : ''}`}
            onClick={() => handleTabClick('em_andamento')}
            title="Em Execução"
          >
            <Wrench size={18} className={styles.navIcon} />
            {!isCollapsed && <span>Em Execução</span>}
          </button>

          <button
            className={`${styles.navItem} ${abaAtiva === 'historico' ? styles.navItemActive : ''} ${isCollapsed ? styles.collapsedCenter : ''}`}
            onClick={() => handleTabClick('historico')}
            title="Histórico de O.S."
          >
            <CheckCircle2 size={18} className={styles.navIcon} />
            {!isCollapsed && <span>Histórico</span>}
          </button>

          <button
            className={`${styles.navItem} ${abaAtiva === 'meus_pedidos' ? styles.navItemActive : ''} ${isCollapsed ? styles.collapsedCenter : ''}`}
            onClick={() => handleTabClick('meus_pedidos')}
            title="Meus Pedidos (Requisições)"
          >
            <ClipboardList size={18} className={styles.navIcon} /> 
            {!isCollapsed && <span>Meus Pedidos</span>}
          </button>

          {!isCollapsed && <div className={styles.navSection}>Equipe</div>}
          <button
            className={`${styles.navItem} ${isCollapsed ? styles.collapsedCenter : ''}`}
            onClick={() => {
              setShowGerenciadorUsuarios(true);
              setIsMobileOpen(false);
            }}
            title="Meus Técnicos"
          >
            <UserCheck size={18} className={styles.navIcon} />
            {!isCollapsed && <span>Meus Técnicos</span>}
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

export default MenuChefeSetor;
