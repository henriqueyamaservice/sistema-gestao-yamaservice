import React, { useState, useEffect } from 'react';
import PainelPedidos from './componentes/PainelPedidos';
import RelatorioRequisicoes from './componentes/RelatorioRequisicoes';
import RecebimentoProdutos from './componentes/RecebimentoProdutos';
import NecessidadeCompras from './componentes/NecessidadeCompras';
import MenuAlmoxarifado from './componentes/MenuAlmoxarifado';
import ValidacaoProduto from './componentes/ValidacaoProduto';
import Estoque from './componentes/Estoque';
import styles from './DashboardAlmoxarifado.module.css';

const DashboardAlmoxarifado = () => {
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState('lista'); 
  const [itensParaRequisicao, setItensParaRequisicao] = useState([]);

  const fetchProdutos = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('http://localhost:3000/api/produtos');
      
      if (!response.ok) {
        throw new Error('Falha ao buscar produtos da API. Verifique se o servidor backend está rodando.');
      }
      
      const data = await response.json();
      setProdutos(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProdutos();
  }, []);

  useEffect(() => {
    fetchProdutos();
  }, []);

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
