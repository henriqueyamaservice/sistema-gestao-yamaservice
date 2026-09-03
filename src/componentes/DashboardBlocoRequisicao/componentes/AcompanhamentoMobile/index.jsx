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
        const usuarioString = localStorage.getItem('almoxarifado_user');
        const usuarioLogado = usuarioString ? JSON.parse(usuarioString) : null;
        
        if (!usuarioLogado) return;

        const res = await fetch(`/api/os`);
        if (res.ok) {
          const data = await res.json();
          // Filtra apenas O.S. abertas por este usuário e ordena
          const filtrados = data
            .filter(r => r.abertoPor === usuarioLogado.nome)
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
    const s = (status || '').toUpperCase();
    if (s.includes('AGUARDANDO_CHEFE') || s.includes('EMERGENCIA')) {
      return (
        <div className={`${styles.statusBadge} ${styles.status_aguardando_diretoria}`}>
          <Clock size={14} /> Em Triagem
        </div>
      );
    }
    if (s.includes('AGUARDANDO_GERENTE') || s.includes('AGUARDANDO_DIRETORIA')) {
      return (
        <div className={`${styles.statusBadge} ${styles.status_aguardando_diretoria}`}>
          <Clock size={14} /> Em Aprovação
        </div>
      );
    }
    if (s.includes('REJEITADO') || s.includes('CANCELADO')) {
      return (
        <div className={`${styles.statusBadge} ${styles.status_rejeitado_diretoria}`}>
          <XCircle size={14} /> Rejeitado/Cancelado
        </div>
      );
    }
    if (s === 'CONCLUIDO') {
      return (
        <div className={styles.statusBadge} style={{ background: 'rgba(22, 101, 52, 0.1)', color: '#166534', border: '1px solid rgba(22, 101, 52, 0.2)' }}>
          <CheckCircle2 size={14} /> Concluído
        </div>
      );
    }
    // Para todos os outros (Em andamento, peças, etc)
    return (
      <div className={`${styles.statusBadge} ${styles.status_pendente}`}>
        <PackageOpen size={14} /> Em Andamento
      </div>
    );
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '40px', color: 'var(--cor-texto-secundario)' }}>Buscando seu histórico...</div>;
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
                <div className={styles.protocolo}>O.S. {pedido.codigo || pedido.id.slice(-6)}</div>
                <div className={styles.data}>{formatarData(pedido.dataCriacao)}</div>
              </div>
              {renderStatus(pedido.status || pedido.situacao)}
            </div>

            <div className={styles.infoLinha}>
              <strong>Setor:</strong> {pedido.setor} | <strong>C.C.:</strong> {pedido.centroCusto}
            </div>
            <div className={styles.infoLinha}>
              <strong>Peças/Materiais Solicitados:</strong> {pedido.pecasSolicitadas?.length || 0}
            </div>
            <div className={styles.infoLinha}>
              <strong>Descrição:</strong> {pedido.descricao?.substring(0, 40)}{pedido.descricao?.length > 40 ? '...' : ''}
            </div>

            {(pedido.situacao === 'REJEITADO_DIRETORIA' || pedido.situacao === 'CANCELADO' || pedido.situacao === 'REJEITADO_CHEFE') && pedido.motivoRejeicao && (
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
