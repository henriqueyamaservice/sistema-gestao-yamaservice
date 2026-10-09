import React, { useState, useRef } from 'react';
import {
  Package, ShoppingCart, FileText, UserCheck, ShieldCheck,
  Wrench, Settings, Clock, ChevronDown, ChevronUp, Layers, Car, Fuel, FileCheck,
  GripHorizontal, RotateCcw
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
  const [posicao, setPosicao] = useState(null); // { x: number, y: number }
  const [arrastando, setArrastando] = useState(false);

  const containerRef = useRef(null);
  const dragInfoRef = useRef({
    ativo: false,
    startX: 0,
    startY: 0,
    initialElemX: 0,
    initialElemY: 0,
    hasMoved: false
  });

  const moduloAtual = MODULOS.find(m => m.id === moduloAtivo) || MODULOS[0];

  const handlePointerDown = (e) => {
    if (e.button !== 0) return; // Apenas clique com botão esquerdo

    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    dragInfoRef.current = {
      ativo: true,
      startX: e.clientX,
      startY: e.clientY,
      initialElemX: rect.left,
      initialElemY: rect.top,
      hasMoved: false
    };

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
  };

  const handlePointerMove = (e) => {
    if (!dragInfoRef.current.ativo) return;

    const deltaX = e.clientX - dragInfoRef.current.startX;
    const deltaY = e.clientY - dragInfoRef.current.startY;

    if (!dragInfoRef.current.hasMoved && Math.hypot(deltaX, deltaY) > 5) {
      dragInfoRef.current.hasMoved = true;
      setArrastando(true);
    }

    if (dragInfoRef.current.hasMoved) {
      const container = containerRef.current;
      const width = container ? container.offsetWidth : 260;
      const height = container ? container.offsetHeight : 50;

      const maxX = window.innerWidth - width - 8;
      const maxY = window.innerHeight - height - 6;

      const novoX = Math.max(8, Math.min(maxX, dragInfoRef.current.initialElemX + deltaX));
      const novoY = Math.max(8, Math.min(maxY, dragInfoRef.current.initialElemY + deltaY));

      setPosicao({ x: novoX, y: novoY });
    }
  };

  const handlePointerUp = (e) => {
    if (!dragInfoRef.current.ativo) return;

    const hadMoved = dragInfoRef.current.hasMoved;
    dragInfoRef.current.ativo = false;
    setArrastando(false);

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}

    // Reseta hasMoved após pequeno timeout para evitar disparo de onClick acidental
    if (hadMoved) {
      setTimeout(() => {
        dragInfoRef.current.hasMoved = false;
      }, 50);
    }
  };

  const handleToggleClick = (e) => {
    if (dragInfoRef.current.hasMoved) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    setMinimizado(prev => !prev);
  };

  const resetarPosicao = (e) => {
    e.stopPropagation();
    setPosicao(null);
  };

  const inlineStyle = posicao ? {
    left: `${posicao.x}px`,
    top: `${posicao.y}px`,
    bottom: 'auto',
    transform: 'none',
    transition: arrastando ? 'none' : 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
  } : {};

  return (
    <div
      ref={containerRef}
      className={`${styles.dockContainer} ${minimizado ? styles.minimized : ''} ${arrastando ? styles.isDragging : ''}`}
      style={inlineStyle}
    >
      {/* Botão de Alternância Minimizar / Expandir + Alça de Arraste */}
      <div className={styles.topControlBar}>
        <div
          className={`${styles.toggleBtn} ${minimizado ? styles.minimizedBtn : ''}`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onClick={handleToggleClick}
          title="Arraste para mover pela tela ou clique para recolher/expandir"
        >
          <span className={styles.dragGrip} title="Segure e arraste para qualquer lugar">
            <GripHorizontal size={13} />
          </span>

          {minimizado ? (
            <>
              <Layers size={13} />
              <span>
                Módulo: <strong>{moduloAtual.nome}</strong>
                {moduloAtual.isBeta && <span className={styles.minimizedBeta}>Beta</span>}
              </span>
              <ChevronUp size={13} />
            </>
          ) : (
            <>
              <ChevronDown size={12} />
              <span>Minimizar Menu</span>
            </>
          )}
        </div>

        {posicao && (
          <button
            type="button"
            className={styles.resetPosBtn}
            onClick={resetarPosicao}
            title="Voltar para a posição padrão no rodapé"
          >
            <RotateCcw size={11} />
          </button>
        )}
      </div>

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
