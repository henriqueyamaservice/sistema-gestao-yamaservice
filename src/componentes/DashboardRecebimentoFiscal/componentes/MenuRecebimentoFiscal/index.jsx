import React, { useState } from 'react';
import {
  Clock, CheckCircle2, Barcode, CloudDownload, RefreshCw,
  ChevronLeft, ChevronRight, FileText, Building2, ShieldCheck
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
  onAbrirModalBipagem,
  onSincronizarOmie,
  sincronizandoOmie = false,
  onSincronizarSefaz,
  sincronizandoSefaz = false,
  onAbrirConfigCertificado,
  onRecarregar,
  recarregando = false
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

          <li className={styles.divisorMenu}></li>

          {/* Ações Rápidas Fiscais */}
          <li>
            <button
              className={`${styles['menu-item']} ${styles.menuAcaoEspecial} ${isCollapsed ? styles.collapsedCenter : ''}`}
              onClick={onAbrirModalBipagem}
              title="Bipar código de barras do DANFE (44 dígitos), carregar arquivo XML ou lançar recibo"
            >
              <Barcode size={20} style={{ flexShrink: 0 }} />
              {!isCollapsed && <span>+ Bipar / Ler NF-e</span>}
            </button>
          </li>

          <li>
            <button
              className={`${styles['menu-item']} ${isCollapsed ? styles.collapsedCenter : ''}`}
              onClick={onSincronizarOmie}
              disabled={sincronizandoOmie}
              title="Consultar novas notas fiscais cadastradas no CNPJ da empresa na Omie"
            >
              <CloudDownload size={20} style={{ flexShrink: 0 }} className={sincronizandoOmie ? styles.spin : ''} />
              {!isCollapsed && (
                <span>{sincronizandoOmie ? 'Consultando...' : 'Buscar na Omie (CNPJ)'}</span>
              )}
            </button>
          </li>

          <li>
            <button
              className={`${styles['menu-item']} ${isCollapsed ? styles.collapsedCenter : ''}`}
              onClick={onSincronizarSefaz}
              disabled={sincronizandoSefaz}
              title="Consultar notas fiscais emitidas no CPF diretamente na SEFAZ Nacional (DFe)"
            >
              <Building2 size={20} style={{ flexShrink: 0 }} className={sincronizandoSefaz ? styles.spin : ''} />
              {!isCollapsed && (
                <span>{sincronizandoSefaz ? 'Consultando SEFAZ...' : 'Buscar na SEFAZ (CPF)'}</span>
              )}
            </button>
          </li>

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

          <li>
            <button
              className={`${styles['menu-item']} ${isCollapsed ? styles.collapsedCenter : ''}`}
              onClick={onRecarregar}
              disabled={recarregando}
              title="Recarregar dados do servidor"
            >
              <RefreshCw size={20} style={{ flexShrink: 0 }} className={recarregando ? styles.spin : ''} />
              {!isCollapsed && <span>Atualizar Dados</span>}
            </button>
          </li>
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
