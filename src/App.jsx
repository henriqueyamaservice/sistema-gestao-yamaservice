import React, { useState } from 'react';
import DashboardAlmoxarifado from './componentes/DashboardAlmoxarifado';
import DashboardCompras from './componentes/DashboardCompras';
import DashboardBlocoRequisicao from './componentes/DashboardBlocoRequisicao';
import DashboardDiretor from './componentes/DashboardDiretor';
import DashboardChefeSetor from './componentes/DashboardChefeSetor';
import DashboardTecnico from './componentes/DashboardTecnico';
import DashboardOS from './componentes/DashboardOS';
import DashboardApontamentoOS from './componentes/DashboardApontamentoOS';
import PortalFornecedor from './componentes/DashboardCompras/componentes/PortalFornecedor';
import CheckListVeiculo from './componentes/DashboardOS/componentes/CheckListVeiculo';
import { ArrowRightLeft } from 'lucide-react';
import './index.css';

import ErrorBoundary from './componentes/ErrorBoundary';

import LoginScreen from './componentes/LoginScreen';
import { NotificationProvider } from './contextos/NotificationContext';

function App() {
  const searchParams = new URLSearchParams(window.location.search);
  const path = window.location.pathname;

  // Modo Desenvolvedor (Bypass do Login localmente se VITE_DEV_MODE=true no .env)
  const devModeEnv = import.meta.env.VITE_DEV_MODE === 'true';
  const isDevModeUrl = searchParams.get('dev') === 'true';
  const isDevBypass = devModeEnv || isDevModeUrl;

  const [usuario, setUsuario] = useState(() => {
    if (isDevBypass) return { role: 'admin', nome: 'Desenvolvedor' };
    const saved = localStorage.getItem('almoxarifado_user');
    return saved ? JSON.parse(saved) : null;
  });

  const getModuloPadrao = (role) => {
    switch(role) {
      case 'apontamento':
      case 'oficina': return 'apontamento';
      case 'tecnico': return 'tecnico';
      case 'chefe_setor': return 'chefe';
      case 'almoxarife': return 'almoxarifado';
      case 'compras': return 'compras';
      case 'diretor': return 'diretor';
      case 'os': return 'os';
      case 'admin': return 'os'; // Admin cai na OS por padrão e pode mudar depois
      default: return 'funcionario';
    }
  };

  const moduloURL = searchParams.get('modulo');
  const [moduloAtivo, setModuloAtivo] = useState(() => {
    if (!usuario) return 'os';
    if (usuario.role === 'admin' && moduloURL) return moduloURL;
    return getModuloPadrao(usuario.role);
  });

  React.useEffect(() => {
    // Remove o parâmetro ?modulo= da URL para evitar problemas com o botão de voltar do navegador
    if (window.history.replaceState && searchParams.has('modulo')) {
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }
  }, []);

  if (searchParams.get('checklist_publico') === 'true') {
    const initialData = {
      placa: searchParams.get('placa') || '',
      modelo: searchParams.get('modelo') || '',
      condutorNome: searchParams.get('condutorNome') || ''
    };

    return (
      <div style={{ backgroundColor: 'var(--cor-fundo-principal)', minHeight: '100vh', padding: '20px' }}>
        <CheckListVeiculo isPublic={true} initialData={initialData} />
      </div>
    );
  }

  if (path.startsWith('/cotacao/')) {
    const token = path.split('/')[2];
    if (token) {
      return <PortalFornecedor token={token} />;
    }
  }

  const handleLoginSuccess = (user) => {
    setUsuario(user);
    setModuloAtivo(getModuloPadrao(user.role));
  };

  if (!usuario) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  // O botão de bypass só aparece se o usuário tiver role admin
  const showDevBypass = usuario.role === 'admin';

  return (
    <NotificationProvider>
      <div className="app-container" style={{ position: 'relative' }}>

        {/* Botão flutuante de alternar módulos oculto por padrão (só exibe se for admin) */}
        {showDevBypass && (
          <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 9999 }}>
            <button
              onClick={() => {
                if (moduloAtivo === 'almoxarifado') setModuloAtivo('compras');
                else if (moduloAtivo === 'compras') setModuloAtivo('funcionario');
                else if (moduloAtivo === 'funcionario') setModuloAtivo('chefe');
                else if (moduloAtivo === 'chefe') setModuloAtivo('diretor');
                else if (moduloAtivo === 'diretor') setModuloAtivo('tecnico');
                else if (moduloAtivo === 'tecnico') setModuloAtivo('os');
                else if (moduloAtivo === 'os') setModuloAtivo('apontamento');
                else setModuloAtivo('almoxarifado');
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                backgroundColor: moduloAtivo === 'almoxarifado' ? '#f97316' :
                  moduloAtivo === 'compras' ? '#3b82f6' :
                    moduloAtivo === 'funcionario' ? '#10b981' : 
                      moduloAtivo === 'chefe' ? '#eab308' :
                        moduloAtivo === 'diretor' ? '#6366f1' :
                          moduloAtivo === 'tecnico' ? '#06b6d4' :
                            moduloAtivo === 'os' ? '#ef4444' : '#10b981',
                color: 'white', border: 'none', padding: '10px 16px', borderRadius: '8px',
                cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
              }}
            >
              <ArrowRightLeft size={18} />
              Mudar para {moduloAtivo === 'almoxarifado' ? 'COMPRAS' :
                moduloAtivo === 'compras' ? 'FUNCIONÁRIO (REQUISIÇÃO)' :
                  moduloAtivo === 'funcionario' ? 'CHEFE DE SETOR' :
                    moduloAtivo === 'chefe' ? 'DIRETOR' :
                      moduloAtivo === 'diretor' ? 'TÉCNICO' :
                        moduloAtivo === 'tecnico' ? 'MANUTENÇÃO/O.S' :
                          moduloAtivo === 'os' ? 'TERMINAL APONTAMENTO (OFICINA)' : 'ALMOXARIFADO'}
            </button>
          </div>
        )}

        <ErrorBoundary>
          {moduloAtivo === 'almoxarifado' && <DashboardAlmoxarifado />}
          {moduloAtivo === 'compras' && <DashboardCompras />}
          {moduloAtivo === 'funcionario' && <DashboardBlocoRequisicao />}
          {moduloAtivo === 'chefe' && <DashboardChefeSetor />}
          {moduloAtivo === 'diretor' && <DashboardDiretor />}
          {moduloAtivo === 'tecnico' && <DashboardTecnico />}
          {moduloAtivo === 'os' && <DashboardOS />}
          {moduloAtivo === 'apontamento' && <DashboardApontamentoOS />}
        </ErrorBoundary>

      </div>
    </NotificationProvider>
  );
}

export default App;
