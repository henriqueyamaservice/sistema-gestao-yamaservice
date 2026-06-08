import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

const ThemeToggle = () => {
  const [isLight, setIsLight] = useState(false);

  useEffect(() => {
    // Ao montar, verifica o localStorage ou define o padrão como dark
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

  return (
    <button
      onClick={toggleTheme}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        width: '100%',
        padding: '10px 14px',
        background: 'transparent',
        border: '1px solid rgba(161, 161, 170, 0.2)',
        color: 'var(--cor-texto-secundario)',
        fontSize: '13px',
        fontWeight: '500',
        borderRadius: '8px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        marginTop: '16px'
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.backgroundColor = 'var(--cor-fundo-secundario)';
        e.currentTarget.style.color = 'var(--cor-texto-principal)';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
        e.currentTarget.style.color = 'var(--cor-texto-secundario)';
      }}
      title={isLight ? "Mudar para Modo Escuro" : "Mudar para Modo Claro"}
    >
      {isLight ? (
        <>
          <Moon size={18} />
          <span>Modo Escuro</span>
        </>
      ) : (
        <>
          <Sun size={18} />
          <span>Modo Claro</span>
        </>
      )}
    </button>
  );
};

export default ThemeToggle;
