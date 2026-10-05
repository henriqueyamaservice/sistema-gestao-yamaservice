import React, { useState } from 'react';
import {
  Package, ShoppingCart, FileText, UserCheck, ShieldCheck,
  Wrench, Settings, Clock, ChevronDown, ChevronUp, Layers, Car, Fuel, FileCheck
} from 'lucide-react';
import styles from './index.module.css';

const MODULOS = [
  {
    id: 'almoxarifado',
    nome: 'Almoxarifado',
    icone: Package,
    cor: '#f97316',
    isBeta: true
  },
  {
    id: 'compras',
    nome: 'Compras',
    icone: ShoppingCart,
    cor: '#3b82f6',
    isBeta: true
  },
  {
    id: 'recebimento_fiscal',
    nome: 'Recebimento Fiscal',
    icone: FileCheck,
    cor: '#FF6B00',
    isBeta: true
  },
  {
    id: 'funcionario',
    nome: 'Requisições',
    icone: FileText,
    cor: '#10b981',
    isBeta: true
  },
  {
    id: 'chefe',
    nome: 'Chefe de Setor',
    icone: UserCheck,
    cor: '#eab308',
    isBeta: true
  },
  {
    id: 'diretor',
    nome: 'Diretoria',
    icone: ShieldCheck,
    cor: '#6366f1',
    isBeta: true
  },
  {
    id: 'tecnico',
    nome: 'Técnico',
    icone: Wrench,
    cor: '#06b6d4',
    isBeta: true
  },
  {
    id: 'os',
    nome: 'O.S',
    icone: Settings,
    cor: '#ef4444'
  },
  {
    id: 'combustivel',
    nome: 'Combustível',
    icone: Fuel,
    cor: '#f59e0b'
  },
  {
    id: 'apontamento',
    nome: 'Apontamento',
    icone: Clock,
    cor: '#10b981'
  },
  {
    id: 'motorista',
    nome: 'Motorista',
    icone: Car,
    cor: '#6366f1',
    isBeta: true
  },
  {
    id: 'frentista',
    nome: 'Frentista',
    icone: Fuel,
    cor: '#10b981',
    isBeta: true
  },
];

const MenuTrocaModulo = ({ moduloAtivo, setModuloAtivo }) => {
  const [minimizado, setMinimizado] = useState(false);

  const moduloAtual = MODULOS.find(m => m.id === moduloAtivo) || MODULOS[0];

  return (
    <div className={`${styles.dockContainer} ${minimizado ? styles.minimized : ''}`}>
      {/* Botão de Alternância Minimizar / Expandir */}
      {minimizado ? (
        <button
          type="button"
          className={`${styles.toggleBtn} ${styles.minimizedBtn}`}
          onClick={() => setMinimizado(false)}
          title="Expandir menu de módulos"
        >
          <Layers size={14} />
          <span>
            Módulo: <strong>{moduloAtual.nome}</strong>
            {moduloAtual.isBeta && <span className={styles.minimizedBeta}>Beta</span>}
          </span>
          <ChevronUp size={14} />
        </button>
      ) : (
        <button
          type="button"
          className={styles.toggleBtn}
          onClick={() => setMinimizado(true)}
          title="Minimizar menu"
        >
          <ChevronDown size={13} />
          <span>Minimizar Menu</span>
        </button>
      )}

      {/* Barra Dock Flutuante */}
      <div className={styles.dockBar}>
        {MODULOS.map((mod) => {
          const Icone = mod.icone;
          const isActive = moduloAtivo === mod.id;

          return (
            <button
              key={mod.id}
              type="button"
              className={`${styles.dockItem} ${isActive ? styles.active : ''}`}
              onClick={() => setModuloAtivo(mod.id)}
              style={{ '--item-cor': mod.cor }}
              title={`Alternar para ${mod.nome}${mod.isBeta ? ' (Beta)' : ''}`}
            >
              <div className={styles.iconCircle}>
                <Icone size={21} strokeWidth={isActive ? 2.4 : 1.9} />
                {isActive && (
                  <span
                    className={styles.activeDot}
                    style={{
                      backgroundColor: mod.cor,
                      ...(mod.isBeta ? { top: '3px', bottom: 'auto' } : {})
                    }}
                  />
                )}
                {mod.isBeta && <span className={styles.betaBadge}>BETA</span>}
              </div>
              <span className={styles.itemLabel}>{mod.nome}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default MenuTrocaModulo;
