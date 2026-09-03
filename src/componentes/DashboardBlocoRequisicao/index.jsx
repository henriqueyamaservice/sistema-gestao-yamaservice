import React, { useState, useEffect } from 'react';
import { PlusCircle, ClipboardList } from 'lucide-react';
import styles from './DashboardBlocoRequisicao.module.css';
import RequisicaoMobile from './componentes/RequisicaoMobile';
import AcompanhamentoMobile from './componentes/AcompanhamentoMobile';
import HeaderBlocoRequisicao from './componentes/HeaderBlocoRequisicao';

const DashboardBlocoRequisicao = () => {
  const [abaAtiva, setAbaAtiva] = useState('novo'); // 'novo' | 'acompanhamento'
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProdutos();
  }, []);

  const fetchProdutos = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/produtos/light');
      if (!res.ok) throw new Error('Falha ao buscar produtos');
      const data = await res.json();
      setProdutos(data);
    } catch (err) {
      console.error('Erro:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.mobileContainer}>
      <div className={styles.mobileView}>
        <HeaderBlocoRequisicao />

        <main className={styles.mobileContent}>
          {loading && abaAtiva === 'novo' ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
              Carregando produtos...
            </div>
          ) : abaAtiva === 'novo' ? (
            <RequisicaoMobile produtos={produtos} />
          ) : (
            <AcompanhamentoMobile />
          )}
        </main>

        <nav className={styles.bottomNav}>
          <button
            className={`${styles.navBtn} ${abaAtiva === 'novo' ? styles.navBtnAtivo : ''}`}
            onClick={() => setAbaAtiva('novo')}
          >
            <PlusCircle size={24} />
            <span>Novo Pedido</span>
          </button>

          <button
            className={`${styles.navBtn} ${abaAtiva === 'acompanhamento' ? styles.navBtnAtivo : ''}`}
            onClick={() => setAbaAtiva('acompanhamento')}
          >
            <ClipboardList size={24} />
            <span>Meus Pedidos</span>
          </button>
        </nav>
      </div>
    </div>
  );
};

export default DashboardBlocoRequisicao;
