import React, { useState, useEffect } from 'react';
import { ShoppingCart, ListChecks, Truck, Building2, Scale, Calculator, PackagePlus, Wrench, FileText, FileWarning } from 'lucide-react';
import styles from './MenuCompras.module.css';
import logoYama from '../../../../assets/YAMASERVICE.jpeg';
import ThemeToggle from '../../../ThemeToggle';

const MenuCompras = ({ view, setView }) => {
  const [divergenciasCount, setDivergenciasCount] = useState(0);

  useEffect(() => {
    fetch('http://localhost:3000/api/requisicoes')
      .then(res => res.json())
      .then(data => {
        const div = data.filter(r => r.status_compras === 'entregue_parcial' && r.divergencia);
        setDivergenciasCount(div.length);
      })
      .catch(err => console.error(err));
  }, [view]); // Recarrega sempre que mudar de view

  return (
    <aside className={styles['menu-lateral']}>
      <div className={styles['menu-header']}>
        <img src={logoYama} alt="YAMASERVICE Logo" className={styles['logo']} />
        <div className={styles['brand']}>
          <h2>YAMASERVICE</h2>
          <p>Setor de Compras</p>
        </div>
      </div>
      
      <nav className={styles['menu-nav']}>
        <ul>
          <li>
            <button 
              className={`${styles['menu-item']} ${view === 'requisicoes' ? styles['active'] : ''}`}
              onClick={() => setView('requisicoes')}
            >
              <ListChecks size={20} />
              Fila de Requisições
            </button>
          </li>
          <li>
            <button 
              className={`${styles['menu-item']} ${view === 'concorrencia' ? styles['active'] : ''}`}
              onClick={() => setView('concorrencia')}
            >
              <Scale size={20} />
              Concorrência
            </button>
          </li>
          <li>
            <button 
              className={`${styles['menu-item']} ${view === 'orcamentos' ? styles['active'] : ''}`}
              onClick={() => setView('orcamentos')}
            >
              <Calculator size={20} />
              Orçamentos
            </button>
          </li>
          <li>
            <button 
              className={`${styles['menu-item']} ${view === 'compras' ? styles['active'] : ''}`}
              onClick={() => setView('compras')}
            >
              <ShoppingCart size={20} />
              Compras / Pedidos
            </button>
          </li>
          <li>
            <button 
              className={`${styles['menu-item']} ${view === 'aguardando' ? styles['active'] : ''}`}
              onClick={() => setView('aguardando')}
            >
              <Truck size={20} />
              Aguardando NF-e
            </button>
          </li>
          <li>
            <button 
              className={`${styles['menu-item']} ${view === 'entrada' ? styles['active'] : ''}`}
              onClick={() => setView('entrada')}
            >
              <PackagePlus size={20} />
              Entrada no Estoque
            </button>
          </li>
          <li>
            <button 
              className={`${styles['menu-item']} ${view === 'notas' ? styles['active'] : ''}`}
              onClick={() => setView('notas')}
            >
              <FileText size={20} />
              Notas (SEFAZ)
            </button>
          </li>
          <li>
            <button 
              className={`${styles['menu-item']} ${view === 'divergencias' ? styles['active'] : ''}`}
              onClick={() => setView('divergencias')}
              style={divergenciasCount > 0 ? { color: '#ef4444', fontWeight: 'bold', background: view === 'divergencias' ? '#fef2f2' : 'transparent' } : {}}
            >
              <FileWarning size={20} />
              Divergências / Faltas
              {divergenciasCount > 0 && (
                <span style={{ background: '#ef4444', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', marginLeft: 'auto' }}>
                  {divergenciasCount}
                </span>
              )}
            </button>
          </li>
          <li>
            <button 
              className={`${styles['menu-item']} ${view === 'manutencao' ? styles['active'] : ''}`}
              onClick={() => setView('manutencao')}
            >
              <Wrench size={20} />
              Manutenção do Estoque
            </button>
          </li>
        </ul>
      </nav>

      <div className={styles['menu-footer']}>
        <ThemeToggle />
        <p style={{ marginTop: '16px', color: 'var(--cor-texto-secundario)', fontSize: '0.85rem' }}>Sistema v1.0.0</p>
      </div>
    </aside>
  );
};

export default MenuCompras;
