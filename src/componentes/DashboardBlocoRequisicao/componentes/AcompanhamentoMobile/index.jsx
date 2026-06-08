import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle2, XCircle, PackageOpen } from 'lucide-react';
import styles from './AcompanhamentoMobile.module.css';

const AcompanhamentoMobile = () => {
  const [meusPedidos, setMeusPedidos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPedidos = async () => {
      try {
        setLoading(true);
        const res = await fetch('http://localhost:3000/api/requisicoes');
        if (res.ok) {
          const data = await res.json();
          // Filtra apenas requisições feitas pelo app e ordena da mais nova para mais antiga
          const filtrados = data
            .filter(r => r.origem === 'app_funcionario')
            .sort((a, b) => new Date(b.dataCriacao) - new Date(a.dataCriacao));
          
          setMeusPedidos(filtrados);
        }
      } catch (error) {
        console.error('Erro ao buscar pedidos:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPedidos();
  }, []);

  const formatarData = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  const renderStatus = (status) => {
    switch(status) {
      case 'aguardando_diretoria':
        return (
          <div className={`${styles.statusBadge} ${styles.status_aguardando_diretoria}`}>
            <Clock size={14} /> Em Aprovação
          </div>
        );
      case 'pendente':
      case 'aguardando_separacao':
        return (
          <div className={`${styles.statusBadge} ${styles.status_pendente}`}>
            <CheckCircle2 size={14} /> Aprovado (No Balcão)
          </div>
        );
      case 'rejeitado_diretoria':
        return (
          <div className={`${styles.statusBadge} ${styles.status_rejeitado_diretoria}`}>
            <XCircle size={14} /> Rejeitado
          </div>
        );
      default:
        return (
          <div className={styles.statusBadge} style={{ background: '#f1f5f9', color: '#64748b' }}>
            <PackageOpen size={14} /> Finalizado
          </div>
        );
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Buscando seu histórico...</div>;
  }

  return (
    <div className={styles.container}>
      <h3 className={styles.titulo}>Meus Pedidos</h3>
      
      {meusPedidos.length === 0 ? (
        <div className={styles.emptyState}>
          <PackageOpen size={48} color="#cbd5e1" style={{ margin: '0 auto 12px auto' }} />
          <p>Você ainda não fez nenhum pedido pelo aplicativo.</p>
        </div>
      ) : (
        meusPedidos.map(pedido => (
          <div key={pedido.id} className={styles.cardPedido}>
            <div className={styles.cardHeader}>
              <div>
                <div className={styles.protocolo}>#{pedido.id.slice(-6)}</div>
                <div className={styles.data}>{formatarData(pedido.dataCriacao)}</div>
              </div>
              {renderStatus(pedido.status)}
            </div>

            <div className={styles.infoLinha}>
              <strong>Local:</strong> {pedido.localEstoque}
            </div>
            <div className={styles.infoLinha}>
              <strong>Itens solicitados:</strong> {pedido.itens?.length || 0}
            </div>

            {pedido.status === 'rejeitado_diretoria' && pedido.motivoRejeicao && (
              <div className={styles.motivoRejeicao}>
                <strong>Motivo:</strong> {pedido.motivoRejeicao}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
};

export default AcompanhamentoMobile;
