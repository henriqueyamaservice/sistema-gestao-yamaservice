import React, { useState } from 'react';
import DashboardAlmoxarifado from './componentes/DashboardAlmoxarifado';
import DashboardCompras from './componentes/DashboardCompras';
import DashboardBlocoRequisicao from './componentes/DashboardBlocoRequisicao';
import DashboardDiretor from './componentes/DashboardDiretor';
import DashboardOS from './componentes/DashboardOS';
import PortalFornecedor from './componentes/DashboardCompras/componentes/PortalFornecedor';
import { ArrowRightLeft } from 'lucide-react';
import './index.css';

function App() {
  const [moduloAtivo, setModuloAtivo] = useState('almoxarifado'); // almoxarifado | compras

  // Roteamento simples sem react-router-dom
  const path = window.location.pathname;
  if (path.startsWith('/cotacao/')) {
    const token = path.split('/')[2];
    if (token) {
      return <PortalFornecedor token={token} />;
    }
  }

  return (
    <div className="app-container" style={{ position: 'relative' }}>

      {/* Botão flutuante temporário para alternar entre os módulos */}
      <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 9999 }}>
        <button
          onClick={() => {
            if (moduloAtivo === 'almoxarifado') setModuloAtivo('compras');
            else if (moduloAtivo === 'compras') setModuloAtivo('funcionario');
            else if (moduloAtivo === 'funcionario') setModuloAtivo('diretor');
            else if (moduloAtivo === 'diretor') setModuloAtivo('os');
            else setModuloAtivo('almoxarifado');
          }}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            backgroundColor: moduloAtivo === 'almoxarifado' ? '#f97316' :
              moduloAtivo === 'compras' ? '#3b82f6' :
                moduloAtivo === 'funcionario' ? '#10b981' : 
                  moduloAtivo === 'diretor' ? '#6366f1' : '#ef4444',
            color: 'white', border: 'none', padding: '10px 16px', borderRadius: '8px',
            cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
          }}
        >
          <ArrowRightLeft size={18} />
          Mudar para {moduloAtivo === 'almoxarifado' ? 'COMPRAS' :
            moduloAtivo === 'compras' ? 'FUNCIONÁRIO' :
              moduloAtivo === 'funcionario' ? 'DIRETOR' : 
                moduloAtivo === 'diretor' ? 'MANUTENÇÃO/O.S' : 'ALMOXARIFADO'}
        </button>
      </div>

      {moduloAtivo === 'almoxarifado' && <DashboardAlmoxarifado />}
      {moduloAtivo === 'compras' && <DashboardCompras />}
      {moduloAtivo === 'funcionario' && <DashboardBlocoRequisicao />}
      {moduloAtivo === 'diretor' && <DashboardDiretor />}
      {moduloAtivo === 'os' && <DashboardOS />}

    </div>
  );
}

export default App;
