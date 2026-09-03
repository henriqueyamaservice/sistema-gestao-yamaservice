import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import styles from './index.module.css';

const NotificationContext = createContext();

export function useNotification() {
  return useContext(NotificationContext);
}

export function NotificationProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [socket, setSocket] = useState(null);
  const [alertasAtivos, setAlertasAtivos] = useState([]);

  const [historicoNotificacoes, setHistoricoNotificacoes] = useState(() => {
    const salvo = localStorage.getItem('almoxarifado_notificacoes');
    return salvo ? JSON.parse(salvo) : [];
  });

  useEffect(() => {
    localStorage.setItem('almoxarifado_notificacoes', JSON.stringify(historicoNotificacoes));
  }, [historicoNotificacoes]);

  useEffect(() => {
    // Instanciar a conexão
    const apiUrl = import.meta.env.VITE_API_URL;
    const newSocket = apiUrl ? io(apiUrl) : io();
    setSocket(newSocket);

    // Ouvir mudanças de status
    newSocket.on('mudanca_status', (data) => {
      console.log('📡 Evento WebSocket Recebido:', data);

      // Descobrir a role do usuário logado
      const storedUser = localStorage.getItem('almoxarifado_user');
      let userRole = null;
      if (storedUser) {
        try {
          const u = JSON.parse(storedUser);
          userRole = u.role;
        } catch(e) {}
      }

      // Normalizamos os textos para comparação
      const novoStatus = (data.novoStatus || '').toLowerCase();
      let deveNotificar = false;

      // === REGRAS DE NOTIFICAÇÃO BASEADAS NA ROLE DO USUÁRIO ===
      
      if (userRole === 'admin') {
        deveNotificar = true; // Admin sempre vê tudo
      } 
      else if (userRole === 'diretor') {
        if (novoStatus.includes('diretoria') || novoStatus.includes('investimento')) deveNotificar = true;
      } 
      else if (userRole === 'chefe_setor') {
        if (novoStatus.includes('chefe') || novoStatus.includes('autorizacao') || novoStatus.includes('emergencia')) deveNotificar = true;
      } 
      else if (userRole === 'tecnico') {
        if (novoStatus.includes('tecnico') || novoStatus === 'em_andamento') deveNotificar = true;
      }
      else if (userRole === 'almoxarife') {
        if (novoStatus.includes('almoxarifado') || novoStatus.includes('separacao')) deveNotificar = true;
      }
      else if (userRole === 'compras') {
        if (novoStatus.includes('compra') || novoStatus.includes('cotacao')) deveNotificar = true;
      }

      // Se passou nos filtros de status, dispara o Toast
      if (deveNotificar) {
        addToast(data.mensagem || 'Houve uma atualização no sistema.', data.tipo);
        
        // Adiciona ao histórico persistente
        setHistoricoNotificacoes(prev => {
          const novaNotificacao = {
            id: Date.now(),
            mensagem: data.mensagem || 'Houve uma atualização no sistema.',
            tipo: data.tipo,
            destino: data.destino || null,
            lida: false,
            data: new Date().toISOString()
          };
          // Mantém as últimas 50 notificações
          return [novaNotificacao, ...prev].slice(0, 50);
        });
      }
    });

    return () => {
      newSocket.close();
    };
  }, []);

  const addToast = useCallback((message, type = 'info', opcoes = {}) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);

    setHistoricoNotificacoes(prev => {
      const novaNotificacao = {
        id,
        mensagem: message,
        tipo: type,
        destino: opcoes.destino || null,
        lida: false,
        data: new Date().toISOString()
      };
      return [novaNotificacao, ...prev].slice(0, 50);
    });

    // Auto-remover após 6 segundos
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 6000);
  }, []);

  const limparHistorico = useCallback(() => {
    setHistoricoNotificacoes([]);
  }, []);

  const marcarComoLida = useCallback((id) => {
    setHistoricoNotificacoes(prev => prev.map(notif => 
      notif.id === id ? { ...notif, lida: true } : notif
    ));
  }, []);

  const marcarTodasComoLidas = useCallback(() => {
    setHistoricoNotificacoes(prev => prev.map(notif => ({ ...notif, lida: true })));
  }, []);

  return (
    <NotificationContext.Provider value={{ 
      addToast, 
      historicoNotificacoes, 
      limparHistorico, 
      marcarComoLida,
      marcarTodasComoLidas,
      alertasAtivos,
      setAlertasAtivos
    }}>
      {children}
      <div className={styles.toastContainer}>
        {toasts.map((toast) => (
          <div key={toast.id} className={`${styles.toast} ${styles[toast.type] || ''}`}>
            <span className={styles.toastMessage}>{toast.message}</span>
            <button 
              className={styles.toastClose} 
              onClick={() => setToasts((prev) => prev.filter(t => t.id !== toast.id))}
              title="Fechar"
            >
              &times;
            </button>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
}
