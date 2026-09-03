import React, { useState, useEffect } from 'react';
import { User } from 'lucide-react';
import styles from './UserInfo.module.css';

const UserInfo = ({ isCollapsed = false, inline = false }) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const userData = localStorage.getItem('almoxarifado_user');
    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (e) {
        console.error('Erro ao ler dados do usuário:', e);
      }
    }
  }, []);

  if (!user) return null;

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const formatRole = (role) => {
    if (role === 'admin') return 'Administrador';
    if (role === 'diretor') return 'Diretoria';
    if (role === 'os') return 'Gestor de O.S.';
    if (role === 'chefe_setor') return 'Chefe de Setor';
    if (role === 'almoxarife') return 'Almoxarifado';
    if (role === 'compras') return 'Compras';
    if (role === 'apontamento' || role === 'oficina') return 'Colaborador';
    if (role === 'tecnico') return 'Técnico';
    if (role === 'funcionario') return 'Funcionário';
    return role;
  };

  const displayName = user.nome || user.name || user.login || user.username || 'Usuário';

  if (isCollapsed) {
    return (
      <div className={`${styles.container} ${styles.collapsed}`} title={`${displayName} (${user.setor || formatRole(user.role)})`}>
        <div className={styles.avatar}>
          {getInitials(displayName)}
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.container} ${inline ? styles.inline : ''}`}>
      <div className={styles.avatar}>
        {getInitials(displayName)}
      </div>
      <div className={styles.info}>
        <span className={styles.name}>{displayName}</span>
        <span className={styles.role}>{user.setor || formatRole(user.role)}</span>
      </div>
    </div>
  );
};

export default UserInfo;
