import React, { useState, useEffect } from 'react';
import { ShoppingCart, ListChecks, Truck, Building2, Scale, Calculator, PackagePlus, Wrench, FileText, FileWarning, ChevronLeft, ChevronRight, Archive } from 'lucide-react';
import styles from './MenuCompras.module.css';
import logoYama from '../../../../assets/YAMASERVICE.jpeg';
import ThemeToggle from '../../../ThemeToggle';
import BotaoSair from '../../../BotaoSair';
import UserInfo from '../../../UserInfo';

const MenuCompras = ({ view, setView }) => {
  const [divergenciasCount, setDivergenciasCount] = useState(0);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleCollapse = () => setIsCollapsed(!isCollapsed);

  const carregarContadorDivergencias = () => {
    fetch('/api/requisicoes')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const div = data.filter(r => 
            (r.status_compras === 'entregue_parcial' || r.divergencia?.status === 'pendente_compras') && 
            r.divergencia
          );
          setDivergenciasCount(div.length);
        }
      })
      .catch(err => console.error(err));
  };

  useEffect(() => {
    carregarContadorDivergencias();
    const interval = setInterval(carregarContadorDivergencias, 4000);
    return () => clearInterval(interval);
  }, [view]);

  return (
    <aside className={`${styles['menu-lateral']} ${isCollapsed ? styles.sidebarCollapsed : ''}`}>
      <div className={styles['menu-header']}>
        <div className={styles.brandContainer}>
          <img src={logoYama} alt="YAMASERVICE Logo" className={styles['logo']} />
          {!isCollapsed && (
            <div className={styles['brand']}>
              <h2>YAMASERVICE</h2>
              <p>Setor de Compras</p>
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
              className={`${styles['menu-item']} ${view === 'requisicoes' ? styles['active'] : ''} ${isCollapsed ? styles.collapsedCenter : ''}`}
              onClick={() => setView('requisicoes')}
            >
              <ListChecks size={20} style={{ flexShrink: 0 }} />
              {!isCollapsed && <span>Fila de Requisições</span>}
            </button>
          </li>
          <li>
            <button 
              className={`${styles['menu-item']} ${view === 'concorrencia' ? styles['active'] : ''} ${isCollapsed ? styles.collapsedCenter : ''}`}
              onClick={() => setView('concorrencia')}
            >
              <Scale size={20} style={{ flexShrink: 0 }} />
              {!isCollapsed && <span>Concorrência</span>}
            </button>
          </li>
          <li>
            <button 
              className={`${styles['menu-item']} ${view === 'orcamentos' ? styles['active'] : ''} ${isCollapsed ? styles.collapsedCenter : ''}`}
              onClick={() => setView('orcamentos')}
            >
              <Calculator size={20} style={{ flexShrink: 0 }} />
              {!isCollapsed && <span>Orçamentos</span>}
            </button>
          </li>

          <li>
            <button 
              className={`${styles['menu-item']} ${view === 'compras' ? styles['active'] : ''} ${isCollapsed ? styles.collapsedCenter : ''}`}
              onClick={() => setView('compras')}
            >
              <ShoppingCart size={20} style={{ flexShrink: 0 }} />
              {!isCollapsed && <span>Compras / Pedidos</span>}
            </button>
          </li>
          <li>
            <button 
              className={`${styles['menu-item']} ${view === 'entrada' ? styles['active'] : ''} ${isCollapsed ? styles.collapsedCenter : ''}`}
              onClick={() => setView('entrada')}
            >
              <PackagePlus size={20} style={{ flexShrink: 0 }} />
              {!isCollapsed && <span>Entrada no Estoque</span>}
            </button>
          </li>
          <li>
            <button 
              className={`${styles['menu-item']} ${view === 'arquivocotacoes' ? styles['active'] : ''} ${isCollapsed ? styles.collapsedCenter : ''}`}
              onClick={() => setView('arquivocotacoes')}
            >
              <Archive size={20} style={{ flexShrink: 0 }} />
              {!isCollapsed && <span>Arquivo de Cotações</span>}
            </button>
          </li>
          <li>
            <button 
              className={`${styles['menu-item']} ${view === 'divergencias' ? styles['active'] : ''} ${isCollapsed ? styles.collapsedCenter : ''}`}
              onClick={() => setView('divergencias')}
              style={divergenciasCount > 0 ? { color: '#ef4444', fontWeight: 'bold', background: view === 'divergencias' ? '#fef2f2' : 'transparent' } : {}}
            >
              <FileWarning size={20} style={{ flexShrink: 0 }} />
              {!isCollapsed && <span>Divergências / Faltas</span>}
              {!isCollapsed && divergenciasCount > 0 && (
                <span style={{ background: '#ef4444', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', marginLeft: 'auto' }}>
                  {divergenciasCount}
                </span>
              )}
            </button>
          </li>
          <li>
            <button 
              className={`${styles['menu-item']} ${view === 'manutencao' ? styles['active'] : ''} ${isCollapsed ? styles.collapsedCenter : ''}`}
              onClick={() => setView('manutencao')}
            >
              <Wrench size={20} style={{ flexShrink: 0 }} />
              {!isCollapsed && <span>Manutenção do Estoque</span>}
            </button>
          </li>
        </ul>
      </nav>

      <div className={styles['menu-footer']} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
        <ThemeToggle isCollapsed={isCollapsed} />
        {!isCollapsed && <p style={{ margin: '8px 0', color: 'var(--cor-texto-secundario)', fontSize: '0.85rem' }}>Sistema v1.0.0</p>}
        <div style={{ width: '100%', marginTop: isCollapsed ? '16px' : '0' }}>
          <BotaoSair isCollapsed={isCollapsed} />
        </div>
      </div>
    </aside>
  );
};

export default MenuCompras;
