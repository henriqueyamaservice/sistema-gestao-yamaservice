import React, { useState } from 'react';
import {
  Clock, CheckCircle2,
  ChevronLeft, ChevronRight, ShieldCheck
} from 'lucide-react';
import styles from './MenuRecebimentoFiscal.module.css';
import logoYama from '../../../../assets/YAMASERVICE.jpeg';
import ThemeToggle from '../../../ThemeToggle';
import BotaoSair from '../../../BotaoSair';
import UserInfo from '../../../UserInfo';

const MenuRecebimentoFiscal = ({
  view,
  setView,
  pendentesCount = 0,
  concluidasCount = 0,
  finalizadasCount = 0,
  onAbrirConfigCertificado
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleCollapse = () => setIsCollapsed(!isCollapsed);

  return (
    <aside className={`${styles['menu-lateral']} ${isCollapsed ? styles.sidebarCollapsed : ''}`}>
      <div className={styles['menu-header']}>
        <div className={styles.brandContainer}>
          <img src={logoYama} alt="YAMASERVICE Logo" className={styles['logo']} />
          {!isCollapsed && (
            <div className={styles['brand']}>
              <h2>YAMASERVICE</h2>
              <p>Recebimento Fiscal</p>
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

      <nav className={styles['menu-nav']}>
        <ul>
          <li>
            <button
              className={`${styles['menu-item']} ${view === 'aguardando' ? styles['active'] : ''} ${isCollapsed ? styles.collapsedCenter : ''}`}
              onClick={() => setView('aguardando')}
              title="Pedidos despachados por Compras que aguardam conferência física do Almoxarifado"
            >
              <Clock size={20} style={{ flexShrink: 0 }} />
              {!isCollapsed && (
                <>
                  <span>Aguardando Almox.</span>
                  {pendentesCount > 0 && (
                    <span className={`${styles.badgeContador} ${styles.badgeAguardando}`}>
                      {pendentesCount}
                    </span>
                  )}
                </>
              )}
            </button>
          </li>

          <li>
            <button
              className={`${styles['menu-item']} ${view === 'recebidos' ? styles['active'] : ''} ${isCollapsed ? styles.collapsedCenter : ''}`}
              onClick={() => setView('recebidos')}
              title="Notas e mercadorias já recebidas fisicamente pelo Almoxarife"
            >
              <CheckCircle2 size={20} style={{ flexShrink: 0 }} />
              {!isCollapsed && (
                <>
                  <span>Recebidos no Almox.</span>
                  {concluidasCount > 0 && (
                    <span className={`${styles.badgeContador} ${styles.badgeRecebido}`}>
                      {concluidasCount}
                    </span>
                  )}
                </>
              )}
            </button>
          </li>

          <li>
            <button
              className={`${styles['menu-item']} ${view === 'finalizados' ? styles['active'] : ''} ${isCollapsed ? styles.collapsedCenter : ''}`}
              onClick={() => setView('finalizados')}
              title="Notas fiscais 100% faturadas e integradas com o sistema Omie"
            >
              <ShieldCheck size={20} style={{ flexShrink: 0 }} />
              {!isCollapsed && (
                <>
                  <span>Faturados / Concluídos</span>
                  {finalizadasCount > 0 && (
                    <span className={`${styles.badgeContador} ${styles.badgeFaturado}`}>
                      {finalizadasCount}
                    </span>
                  )}
                </>
              )}
            </button>
          </li>

          {onAbrirConfigCertificado && (
            <>
              <li className={styles.divisorMenu}></li>

              <li>
                <button
                  className={`${styles['menu-item']} ${isCollapsed ? styles.collapsedCenter : ''}`}
                  onClick={onAbrirConfigCertificado}
                  title="Configurar Certificado Digital A1 (.pfx) da SEFAZ"
                >
                  <ShieldCheck size={20} style={{ flexShrink: 0 }} />
                  {!isCollapsed && <span>Certificado SEFAZ</span>}
                </button>
              </li>
            </>
          )}
        </ul>
      </nav>

      <div className={styles['menu-footer']}>
        <ThemeToggle isCollapsed={isCollapsed} />
        {!isCollapsed && <p style={{ margin: '8px 0', color: 'var(--cor-texto-secundario)', fontSize: '0.85rem' }}>Sistema v1.0.0</p>}
        <div style={{ width: '100%', marginTop: isCollapsed ? '16px' : '0' }}>
          <BotaoSair isCollapsed={isCollapsed} />
        </div>
      </div>
    </aside>
  );
};

export default MenuRecebimentoFiscal;
