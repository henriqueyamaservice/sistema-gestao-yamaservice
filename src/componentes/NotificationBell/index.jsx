import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Bell, Check, Trash2, Info, AlertTriangle, FileText, CheckCircle2 } from 'lucide-react';
import { useNotification } from '../../contextos/NotificationContext';
import styles from './index.module.css';

const getIconForType = (type) => {
  switch (type) {
    case 'sucesso':
    case 'success':
      return <CheckCircle2 size={16} className={styles.iconSuccess} />;
    case 'erro':
    case 'error':
      return <AlertTriangle size={16} className={styles.iconError} />;
    case 'os':
      return <FileText size={16} className={styles.iconOs} />;
    default:
      return <Info size={16} className={styles.iconInfo} />;
  }
};

const NotificationBell = ({ align = 'right' }) => {
  const { historicoNotificacoes, alertasAtivos = [], limparHistorico, marcarComoLida, marcarTodasComoLidas } = useNotification();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);
  const [dropdownPosition, setDropdownPosition] = useState({});

  const unreadCount = historicoNotificacoes.filter(n => !n.lida).length + alertasAtivos.length;

  // Fechar ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleDropdown = () => {
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition(align === 'left' ? {
        top: rect.bottom + 10,
        left: rect.left
      } : {
        top: rect.bottom + 10,
        right: window.innerWidth - rect.right
      });
    }
    
    setIsOpen(!isOpen);
    if (!isOpen && unreadCount > 0) {
      marcarTodasComoLidas();
    }
  };

  const formatTime = (isoString) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className={styles.bellContainer} ref={dropdownRef}>
      <button ref={buttonRef} className={styles.bellButton} onClick={toggleDropdown} title="Notificações">
        <Bell size={24} />
        {unreadCount > 0 && (
          <span className={styles.badge}>{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {isOpen && ReactDOM.createPortal(
        <div 
          className={`${styles.dropdown} ${align === 'left' ? styles.dropdownLeft : styles.dropdownRight}`}
          style={{ ...dropdownPosition, position: 'fixed' }}
        >
          <div className={styles.dropdownHeader}>
            <h3>Notificações</h3>
            {historicoNotificacoes.length > 0 && (
              <button 
                className={styles.clearBtn} 
                onClick={limparHistorico}
                title="Limpar histórico"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
          
          <div className={styles.dropdownBody}>
            {historicoNotificacoes.length === 0 && alertasAtivos.length === 0 ? (
              <div className={styles.emptyState}>
                Nenhuma notificação ou alerta ativo.
              </div>
            ) : (
              <>
                {alertasAtivos.map(alerta => (
                  <div 
                    key={alerta.id} 
                    className={`${styles.notificationItem} ${styles.unread}`}
                    onClick={() => {
                      if (alerta.destino) {
                        window.dispatchEvent(new CustomEvent('navToAba', { detail: alerta.destino }));
                        setIsOpen(false);
                      }
                    }}
                  >
                    <div className={styles.notifIconWrapper}>
                      {getIconForType(alerta.tipo)}
                    </div>
                    <div className={styles.notifContent}>
                      <p className={styles.notifMessage} style={{ fontWeight: 'bold' }}>{alerta.mensagem}</p>
                      <span className={styles.notifTime}>🔴 Alerta Permanente (Resolva para sumir)</span>
                    </div>
                  </div>
                ))}
                
                {historicoNotificacoes.map(notif => (
                  <div 
                    key={notif.id} 
                    className={`${styles.notificationItem} ${!notif.lida ? styles.unread : ''}`}
                    onClick={() => {
                      marcarComoLida(notif.id);
                      if (notif.destino) {
                        window.dispatchEvent(new CustomEvent('navToAba', { detail: notif.destino }));
                        setIsOpen(false);
                      }
                    }}
                  >
                    <div className={styles.notifIconWrapper}>
                      {getIconForType(notif.tipo)}
                    </div>
                    <div className={styles.notifContent}>
                      <p className={styles.notifMessage}>{notif.mensagem}</p>
                      <span className={styles.notifTime}>{formatTime(notif.data)}</span>
                    </div>
                    {!notif.lida && <div className={styles.unreadDot} />}
                  </div>
                ))}
              </>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default NotificationBell;
