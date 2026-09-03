import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

const ThemeToggle = ({ isCollapsed = false }) => {
  const [isLight, setIsLight] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('@YamaTheme');
    if (savedTheme === 'light') {
      setIsLight(true);
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      setIsLight(false);
      document.documentElement.removeAttribute('data-theme');
    }
  }, []);

  const toggleTheme = () => {
    if (isLight) {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('@YamaTheme', 'dark');
      setIsLight(false);
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
      localStorage.setItem('@YamaTheme', 'light');
      setIsLight(true);
    }
  };

  if (isCollapsed) {
    return (
      <button
        onClick={toggleTheme}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '36px',
          height: '36px',
          padding: '0',
          background: 'transparent',
          border: 'none',
          color: 'var(--cor-texto-secundario)',
          borderRadius: '8px',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          margin: '0 auto'
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--cor-fundo-sutil-forte)';
          e.currentTarget.style.color = 'var(--cor-texto-principal)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.color = 'var(--cor-texto-secundario)';
        }}
        title={isLight ? "Mudar para Modo Escuro" : "Mudar para Modo Claro"}
      >
        {isLight ? <Moon size={18} color="var(--cor-texto-principal)" /> : <Sun size={18} color="var(--cor-texto-principal)" />}
      </button>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        padding: '8px 12px',
        background: 'transparent',
        border: 'none',
        color: 'var(--cor-texto-secundario)',
        fontSize: '13px',
        fontWeight: '500',
        borderRadius: '8px',
        cursor: 'pointer',
        transition: 'all 0.2s ease'
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.backgroundColor = 'var(--cor-fundo-sutil-forte)';
        e.currentTarget.style.color = 'var(--cor-texto-principal)';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
        e.currentTarget.style.color = 'var(--cor-texto-secundario)';
      }}
      title={isLight ? "Mudar para Modo Escuro" : "Mudar para Modo Claro"}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {isLight ? <Moon size={18} color="var(--cor-texto-principal)" /> : <Sun size={18} color="var(--cor-texto-principal)" />}
        <span>{isLight ? "Modo Escuro" : "Modo Claro"}</span>
      </div>
    </button>
  );
};

export default ThemeToggle;
