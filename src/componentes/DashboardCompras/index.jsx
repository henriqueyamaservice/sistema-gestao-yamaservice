import React, { useState } from 'react';
import MenuCompras from './componentes/MenuCompras';
import RequisicaoCompras from './componentes/RequisicaoCompras';
import Concorrencia from './componentes/Concorrencia';
import Orcamentos from './componentes/Orcamentos';
import Compras from './componentes/Compras';
import EntradaEstoque from './componentes/EntradaEstoque';
import ManutencaoEstoque from './componentes/ManutencaoEstoque';
import DivergenciasDevolucao from './componentes/DivergenciasDevolucao';
import styles from './DashboardCompras.module.css';

const DashboardCompras = () => {
  const [view, setView] = useState('requisicoes');

  return (
    <div className={styles.dashboardContainer}>
      <MenuCompras view={view} setView={setView} />
      
      <main className={styles.mainContent}>
        {view === 'requisicoes' && <RequisicaoCompras setView={setView} />}
        {view === 'concorrencia' && <Concorrencia setView={setView} />}
        {view === 'orcamentos' && <Orcamentos setView={setView} />}
        {view === 'compras' && <Compras setView={setView} />}
        {view === 'entrada' && <EntradaEstoque setView={setView} />}
        {view === 'manutencao' && <ManutencaoEstoque setView={setView} />}
        {view === 'divergencias' && <DivergenciasDevolucao setView={setView} />}
      </main>
    </div>
  );
};

export default DashboardCompras;
