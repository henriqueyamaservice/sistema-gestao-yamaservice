import React, { useState, useEffect } from 'react';
import PainelPedidos from './componentes/PainelPedidos';
import RelatorioRequisicoes from './componentes/RelatorioRequisicoes';
import RecebimentoProdutos from './componentes/RecebimentoProdutos';
import NecessidadeCompras from './componentes/NecessidadeCompras';
import MenuAlmoxarifado from './componentes/MenuAlmoxarifado';
import ValidacaoProduto from './componentes/ValidacaoProduto';
import Estoque from './componentes/Estoque';
import { useNotification } from '../../contextos/NotificationContext';
import styles from './DashboardAlmoxarifado.module.css';

const DashboardAlmoxarifado = () => {
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState('lista'); 
  const [itensParaRequisicao, setItensParaRequisicao] = useState([]);

  const { socket } = useNotification() || {};

  const fetchProdutos = async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      setError(null);
      const response = await fetch('/api/produtos');
      
      if (!response.ok) {
        throw new Error('Falha ao buscar produtos da API. Verifique se o servidor backend está rodando.');
      }
      
      const data = await response.json();
      setProdutos(Array.isArray(data) ? data : (data.produtos || []));
    } catch (err) {
      setError(err.message);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchProdutos(false);

    const handleAtualizacaoSilenciosa = () => {
      fetchProdutos(true);
    };

    if (socket) {
      socket.on('produtos_atualizados', handleAtualizacaoSilenciosa);
      socket.on('estoque_atualizado', handleAtualizacaoSilenciosa);
      socket.on('pedidos_pendentes_atualizados', handleAtualizacaoSilenciosa);
    }

    return () => {
      if (socket) {
        socket.off('produtos_atualizados', handleAtualizacaoSilenciosa);
        socket.off('estoque_atualizado', handleAtualizacaoSilenciosa);
        socket.off('pedidos_pendentes_atualizados', handleAtualizacaoSilenciosa);
      }
    };
  }, [socket]);

  const renderContent = () => {
    if (view === 'recebimento') {
      return (
        <div className={styles['dashboard-container']} style={{ padding: 0 }}>
          <RecebimentoProdutos produtos={produtos} fetchProdutosGlobal={fetchProdutos} />
        </div>
      );
    }

    if (view === 'nova-requisicao') {
      return (
        <div className={styles['dashboard-container']}>
          <PainelPedidos 
            produtos={produtos} 
            itensIniciais={itensParaRequisicao}
            fetchProdutosGlobal={fetchProdutos}
            onVoltar={() => {
              setView('lista');
              setItensParaRequisicao([]);
              fetchProdutos(); 
            }} 
          />
        </div>
      );
    }

    if (view === 'relatorios') {
      return (
        <div className={styles['dashboard-container']}>
          <RelatorioRequisicoes onVoltar={() => setView('lista')} />
        </div>
      );
    }

    if (view === 'necessidade-compras') {
      return (
        <div className={styles['dashboard-container']}>
          <NecessidadeCompras 
            produtos={produtos}
            onUpdate={fetchProdutos} 
          />
        </div>
      );
    }

    if (view === 'validade-produtos') {
      return (
        <div className={styles['dashboard-container']} style={{ padding: 0 }}>
          <ValidacaoProduto produtos={produtos} fetchProdutosGlobal={fetchProdutos} />
        </div>
      );
    }

    return (
      <Estoque 
        produtos={produtos}
        loading={loading}
        error={error}
        fetchProdutos={fetchProdutos}
      />
    );
  };

  const handleSetView = (newView) => {
    setView(newView);
  };

  return (
    <div className={styles['app-layout']}>
      <MenuAlmoxarifado view={view} setView={handleSetView} />
      <div className={styles['app-content']}>
        {renderContent()}
      </div>
    </div>
  );
};

export default DashboardAlmoxarifado;
