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
import DashboardChatBoxCombustivel from './componentes/DashboardOS/DashboardControleCombustivel/componentes/DashboardChatBoxCombustivel';
import DashboardMotorista from './componentes/DashboardMotorista';
import DashboardFrentistaYamaves from './componentes/DashboardFrentistaYamaves';
import DashboardRecebimentoFiscal from './componentes/DashboardRecebimentoFiscal';
import MenuTrocaModulo from './componentes/MenuTrocaModulo';
import './index.css';

import ErrorBoundary from './componentes/ErrorBoundary';

import LoginScreen from './componentes/LoginScreen';
import { NotificationProvider } from './contextos/NotificationContext';

function App() {
  const searchParams = new URLSearchParams(window.location.search);
  const path = window.location.pathname;

  // Modo Desenvolvedor: estritamente restrito ao ambiente local de desenvolvimento (Vite dev)
  const isDevBypass = import.meta.env.DEV && import.meta.env.VITE_DEV_MODE === 'true';

  const [usuario, setUsuario] = useState(() => {
    if (isDevBypass) return { role: 'admin', nome: 'Desenvolvedor' };
    
    // Validação segura de sessão e expiração do token
    const savedUser = localStorage.getItem('almoxarifado_user');
    const token = localStorage.getItem('almoxarifado_token');

    if (!savedUser || !token) {
      localStorage.removeItem('almoxarifado_user');
      localStorage.removeItem('almoxarifado_token');
      return null;
    }

    try {
      // Validação da expiração do JWT no cliente
      const payloadBase64 = token.split('.')[1];
      if (payloadBase64) {
        const payloadJson = JSON.parse(atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/')));
        if (payloadJson.exp && payloadJson.exp * 1000 < Date.now()) {
          console.warn('Sessão expirada. Redirecionando para login...');
          localStorage.removeItem('almoxarifado_user');
          localStorage.removeItem('almoxarifado_token');
          return null;
        }
      }
      return JSON.parse(savedUser);
    } catch {
      localStorage.removeItem('almoxarifado_user');
      localStorage.removeItem('almoxarifado_token');
      return null;
    }
  });

  const getModuloPadrao = (role) => {
    switch(role) {
      case 'motorista': return 'motorista';
      case 'frentista': return 'frentista';
      case 'apontamento':
      case 'oficina': return 'apontamento';
      case 'tecnico': return 'tecnico';
      case 'chefe_setor': return 'chefe';
      case 'almoxarife': return 'almoxarifado';
      case 'compras': return 'compras';
      case 'fiscal':
      case 'recebimento_fiscal': return 'recebimento_fiscal';
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

  if (searchParams.get('chat_combustivel') === 'true' || searchParams.get('abastecer') === 'true') {
    return (
      <div style={{ backgroundColor: 'var(--cor-fundo-principal)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <DashboardChatBoxCombustivel onClose={() => window.location.href = '/'} />
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

  // O menu de troca de módulo aparece para administradores ou em ambiente de desenvolvimento local (Vite)
  const showDevBypass = usuario.role === 'admin' || import.meta.env.DEV;

  return (
    <NotificationProvider>
      <div className="app-container" style={{ position: 'relative' }}>

        {/* Dock Bar deslizante com efeito de aumento dos ícones para Admin */}
        {showDevBypass && (
          <MenuTrocaModulo moduloAtivo={moduloAtivo} setModuloAtivo={setModuloAtivo} />
        )}

        <ErrorBoundary>
          {moduloAtivo === 'almoxarifado' && <DashboardAlmoxarifado />}
          {moduloAtivo === 'compras' && <DashboardCompras />}
          {moduloAtivo === 'recebimento_fiscal' && <DashboardRecebimentoFiscal />}
          {moduloAtivo === 'funcionario' && <DashboardBlocoRequisicao />}
          {moduloAtivo === 'chefe' && <DashboardChefeSetor />}
          {moduloAtivo === 'diretor' && <DashboardDiretor />}
          {moduloAtivo === 'tecnico' && <DashboardTecnico />}
          {moduloAtivo === 'os' && <DashboardOS initialViewMode="os" />}
          {moduloAtivo === 'combustivel' && <DashboardOS initialViewMode="combustivel" />}
          {moduloAtivo === 'apontamento' && <DashboardApontamentoOS />}
          {moduloAtivo === 'motorista' && <DashboardMotorista />}
          {moduloAtivo === 'frentista' && <DashboardFrentistaYamaves />}
        </ErrorBoundary>

      </div>
    </NotificationProvider>
  );
}

export default App;
