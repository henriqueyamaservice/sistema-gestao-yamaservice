import React, { useState, useEffect } from 'react';
import {
  Home,
  Fuel,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  FileText,
  Truck,
  Database,
  BadgeDollarSign,
  FileSpreadsheet,
  Car,
  Zap,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Wrench,
  Power
} from 'lucide-react';
import styles from './MenuOs.module.css';
import logoYama from '../../../../assets/Logo-Yamaservice.png';
import ThemeToggle from '../../../ThemeToggle';
import BotaoSair from '../../../BotaoSair';
import UserInfo from '../../../UserInfo';
import NotificationBell from '../../../NotificationBell';

const MenuOs = ({ viewMode, setViewMode, abaCombustivel, setAbaCombustivel, abaRelatorio, setAbaRelatorio, setShowNovaOS, setShowGerenciadorUsuarios }) => {
  const [combustivelOpen, setCombustivelOpen] = useState(false);
  const [osOpen, setOsOpen] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      const dest = e.detail;
      if (dest) {
        setViewMode('combustivel');
        setAbaCombustivel(dest);
        setCombustivelOpen(true);
      }
    };
    window.addEventListener('navToAba', handler);
    return () => window.removeEventListener('navToAba', handler);
  }, [setViewMode, setAbaCombustivel]);

  const handleCombustivelClick = () => {
    if (isCollapsed) {
      setIsCollapsed(false);
      setViewMode('combustivel');
      setCombustivelOpen(true);
      return;
    }
    setViewMode('combustivel');
    setCombustivelOpen(!combustivelOpen);
  };

  const handleOsClick = () => {
    if (isCollapsed) {
      setIsCollapsed(false);
      setViewMode('os');
      setOsOpen(true);
      return;
    }
    setViewMode('os');
    setOsOpen(!osOpen);
  };

  const toggleCollapse = () => {
    setIsCollapsed(prev => !prev);
  };

  return (
    <aside className={`${styles.sidebar} ${isCollapsed ? styles.sidebarCollapsed : ''}`}>
      {/* Header com Logo e Botão de Retrair/Expandir estilo IDE */}
      <div className={styles.sidebarHeader}>
        <div className={styles.brandContainer}>
          <img src={logoYama} alt="YAMASERVICE Logo" className={styles.logo} />
          {!isCollapsed && (
            <div className={styles.brand}>
              <h2>YAMASERVICE</h2>
              <p>Ordens de Serviço</p>
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
        <div className={styles.navSection} style={{ marginTop: '16px', display: 'flex', justifyContent: isCollapsed ? 'center' : 'space-between', alignItems: 'center', padding: isCollapsed ? '0' : '0 8px' }}>
          {!isCollapsed && <span>Menu Principal</span>}
          <div style={{ marginLeft: isCollapsed ? '0' : '8px' }}>
            <NotificationBell align="left" />
          </div>
        </div>

        {/* Item 1: Ordens de Serviço */}
        <button
          className={`${styles.navItem} ${viewMode === 'os' ? styles.navItemActive : ''} ${isCollapsed ? styles.collapsedCenter : ''}`}
          onClick={handleOsClick}
          title="Ordens de Serviço"
          style={{ justifyContent: isCollapsed ? 'center' : 'space-between' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Home size={24} className={styles.navIcon} />
            {!isCollapsed && <span>Ordens de Serviço</span>}
          </div>
          {!isCollapsed && (osOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />)}
        </button>

        {osOpen && (
          <div className={styles.subMenu}>
            <button
              className={`${styles.subNavItem} ${viewMode === 'os' && abaRelatorio === 'os' ? styles.subNavItemActive : ''} ${isCollapsed ? styles.collapsedCenter : ''}`}
              onClick={() => { setViewMode('os'); setAbaRelatorio('os'); }}
              title="Relatório O.S."
            >
              {!isCollapsed && <span>Relatório O.S.</span>}
            </button>
            <button
              className={`${styles.subNavItem} ${viewMode === 'os' && abaRelatorio === 'prestacao-servicos' ? styles.subNavItemActive : ''} ${isCollapsed ? styles.collapsedCenter : ''}`}
              onClick={() => { setViewMode('os'); setAbaRelatorio('prestacao-servicos'); }}
              title="Serviços Prestados (Granjas)"
            >
              {!isCollapsed && <span>Serviços Prestados</span>}
            </button>
            <button
              className={`${styles.subNavItem} ${viewMode === 'os' && abaRelatorio === 'custo-mensal' ? styles.subNavItemActive : ''} ${isCollapsed ? styles.collapsedCenter : ''}`}
              onClick={() => { setViewMode('os'); setAbaRelatorio('custo-mensal'); }}
              title="Custo Mão de Obra"
            >
              {!isCollapsed && <span>Custo Mão de Obra</span>}
            </button>
          </div>
        )}

        {/* Item 2: Controle Combustível */}
        <button
          className={`${styles.navItem} ${viewMode === 'combustivel' ? styles.navItemActive : ''} ${isCollapsed ? styles.collapsedCenter : ''}`}
          onClick={handleCombustivelClick}
          title="Controle Combustível"
          style={{ justifyContent: isCollapsed ? 'center' : 'space-between', marginTop: '4px' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Fuel size={24} className={styles.navIcon} />
            {!isCollapsed && <span>Controle Combustível</span>}
          </div>
          {!isCollapsed && (combustivelOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />)}
        </button>

        {combustivelOpen && (
          <div className={styles.subMenu}>
            {/* 1. Saída Combustível (geral) */}
            <button
              className={`${styles.subNavItem} ${abaCombustivel === 'geral' && viewMode === 'combustivel' ? styles.subNavItemActive : ''} ${isCollapsed ? styles.collapsedCenter : ''}`}
              onClick={() => { setViewMode('combustivel'); setAbaCombustivel('geral'); }}
              title="Saída Combustível"
            >
              {!isCollapsed && <span>Saída Combustível</span>}
            </button>

            {/* 2. Estoque Atual (estoque) */}
            <button
              className={`${styles.subNavItem} ${abaCombustivel === 'estoque' && viewMode === 'combustivel' ? styles.subNavItemActive : ''} ${isCollapsed ? styles.collapsedCenter : ''}`}
              onClick={() => { setViewMode('combustivel'); setAbaCombustivel('estoque'); }}
              title="Estoque Atual"
            >
              {!isCollapsed && <span>Estoque Atual</span>}
            </button>

            {/* 3. Histórico Combustível (historico) */}
            <button
              className={`${styles.subNavItem} ${abaCombustivel === 'historico' && viewMode === 'combustivel' ? styles.subNavItemActive : ''} ${isCollapsed ? styles.collapsedCenter : ''}`}
              onClick={() => { setViewMode('combustivel'); setAbaCombustivel('historico'); }}
              title="Histórico Combustível"
            >
              {!isCollapsed && <span>Histórico Combustível</span>}
            </button>

            {/* 4. Check-Lists Veículos (relatorio-checklist) */}
            <button
              className={`${styles.subNavItem} ${viewMode === 'os' && (abaRelatorio === 'relatorio-checklist' || abaRelatorio === 'checklist') ? styles.subNavItemActive : ''} ${isCollapsed ? styles.collapsedCenter : ''}`}
              onClick={() => { setViewMode('os'); setAbaRelatorio('relatorio-checklist'); }}
              title="Check-Lists Veículos"
            >
              {!isCollapsed && <span>Check-Lists Veículos</span>}
            </button>

            {/* 5. Cad. Veículos (cadastro) */}
            <button
              className={`${styles.subNavItem} ${abaCombustivel === 'cadastro' && viewMode === 'combustivel' ? styles.subNavItemActive : ''} ${isCollapsed ? styles.collapsedCenter : ''}`}
              onClick={() => { setViewMode('combustivel'); setAbaCombustivel('cadastro'); }}
              title="Cad. Veículos"
            >
              {!isCollapsed && <span>Cadastro de Veículos</span>}
            </button>

            {/* 6. Revisão Veículos (revisao-veiculos) */}
            <button
              className={`${styles.subNavItem} ${abaCombustivel === 'revisao-veiculos' && viewMode === 'combustivel' ? styles.subNavItemActive : ''} ${isCollapsed ? styles.collapsedCenter : ''}`}
              onClick={() => { setViewMode('combustivel'); setAbaCombustivel('revisao-veiculos'); }}
              title="Revisão Veículos"
            >
              {!isCollapsed && <span>Revisão Veículos</span>}
            </button>

            {/* 7. Geradores Granjas (geradores) */}
            <button
              className={`${styles.subNavItem} ${abaCombustivel === 'geradores' && viewMode === 'combustivel' ? styles.subNavItemActive : ''} ${isCollapsed ? styles.collapsedCenter : ''}`}
              onClick={() => { setViewMode('combustivel'); setAbaCombustivel('geradores'); }}
              title="Geradores Granjas"
            >
              {!isCollapsed && <span>Geradores Granjas</span>}
            </button>

            {/* 8. Revisão Geradores (revisao-geradores) */}
            <button
              className={`${styles.subNavItem} ${abaCombustivel === 'revisao-geradores' && viewMode === 'combustivel' ? styles.subNavItemActive : ''} ${isCollapsed ? styles.collapsedCenter : ''}`}
              onClick={() => { setViewMode('combustivel'); setAbaCombustivel('revisao-geradores'); }}
              title="Revisão Geradores"
            >
              {!isCollapsed && <span>Revisão Geradores</span>}
            </button>
          </div>
        )}

        {/* Adicionado o Botão de Gerenciar Acessos / Configurações */}
        <button
          className={`${styles.navItem} ${isCollapsed ? styles.collapsedCenter : ''}`}
          style={{ marginTop: 'auto', backgroundColor: 'transparent', border: 'none', color: 'var(--cor-texto-secundario)' }}
          onClick={() => setShowGerenciadorUsuarios(true)}
          title="Configurações (Gerenciar Acessos)"
        >
          <Settings size={20} className={styles.navIcon} />
          {!isCollapsed && <span>Configurações</span>}
        </button>

      </nav>

      {/* Rodapé do Menu */}
      <div className={styles.sidebarFooter}>
        <ThemeToggle isCollapsed={isCollapsed} />
        {!isCollapsed && <p style={{ margin: 0 }}>Sistema v1.0.0</p>}
        <div style={{ width: '100%', marginTop: '8px' }}>
          <BotaoSair isCollapsed={isCollapsed} />
        </div>
      </div>
    </aside>
  );
};

export default MenuOs;
