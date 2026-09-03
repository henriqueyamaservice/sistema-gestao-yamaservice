import React from 'react';
import { LogOut } from 'lucide-react';
import styles from './BotaoSair.module.css';

const BotaoSair = ({ isCollapsed = false, inline = false }) => {
  const handleLogout = () => {
    if (window.confirm('Tem certeza que deseja sair do sistema?')) {
      localStorage.removeItem('almoxarifado_user');
      localStorage.removeItem('almoxarifado_token');
      window.location.reload();
    }
  };

  return (
    <button
      className={`${styles.btnSair} ${isCollapsed ? styles.collapsed : ''} ${inline ? styles.inline : ''}`}
      onClick={handleLogout}
      title="Sair do Sistema"
    >
      <LogOut size={20} className={styles.icon} />
      {!isCollapsed && <span>Sair</span>}
    </button>
  );
};

export default BotaoSair;
