import React, { useState, useEffect } from 'react';
import styles from './index.module.css';
import { FileText, BarChart2, Menu, X, Home, Settings } from 'lucide-react';
import FormularioOS from './componentes/FormularioOS';
import TabelaOS from './componentes/TabelaOS';
import FormularioServicoOS from './componentes/FormularioServicoOS';
import ImpressaoOS from './componentes/ImpressaoOS';
import logoYamaservice from '../../assets/YAMASERVICE.jpeg';
import { Truck, Fuel } from 'lucide-react';
import DashboardControleCombustivel from './DashboardControleCombustivel';

const DashboardOS = () => {
  const [osList, setOsList] = useState([]);
  const [abaRelatorio, setAbaRelatorio] = useState('os');
  const [osSelecionada, setOsSelecionada] = useState(null);
  const [osParaImprimir, setOsParaImprimir] = useState(null);
  const [showNovaOS, setShowNovaOS] = useState(false);
  const [viewMode, setViewMode] = useState('os'); // 'os' ou 'combustivel'
  const [menuOpen, setMenuOpen] = useState(false);

  // Carregar as OS do backend ao iniciar
  useEffect(() => {
    fetch('http://localhost:3000/api/os')
      .then(res => res.json())
      .then(data => setOsList(data))
      .catch(err => console.error("Erro ao carregar O.S:", err));
  }, []);

  // Função para adicionar nova OS à lista
  const handleAddOS = (novaOS) => {
    setOsList(prev => [novaOS, ...prev]);
  };

  // Função para atualizar OS na lista após fechamento
  const handleUpdateOS = (osAtualizada) => {
    setOsList(prev => prev.map(os => os.codigo === osAtualizada.codigo ? osAtualizada : os));
  };

  const handleStartOS = async (os) => {
    try {
      const response = await fetch(`http://localhost:3000/api/os/${os.codigo}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ situacao: 'EM ANDAMENTO' })
      });
      if (!response.ok) throw new Error('Falha ao iniciar a O.S.');
      const result = await response.json();
      handleUpdateOS(result.os);
    } catch (error) {
      console.error(error);
      alert('Erro ao iniciar O.S. Verifique a conexão com o servidor.');
    }
  };

  const handleImprimirOS = (os) => {
    setOsParaImprimir(os);
    setTimeout(() => {
      window.print();
      setOsParaImprimir(null);
    }, 500);
  };

  return (
    <div className={styles.dashboardOsContainer} style={{ position: 'relative' }}>
      
      {/* --- OVERLAY E MENU LATERAL (SIDEBAR) --- */}
      {menuOpen && (
        <div 
          onClick={() => setMenuOpen(false)} 
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999 }}
        />
      )}

      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: menuOpen ? 0 : '-340px',
          width: '320px',
          height: '100vh',
          backgroundColor: '#1e293b',
          color: '#fff',
          transition: 'left 0.3s ease',
          zIndex: 10000,
          boxShadow: menuOpen ? '4px 0 15px rgba(0,0,0,0.3)' : 'none',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155' }}>
          <h2 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img src={logoYamaservice} alt="Logo" style={{ height: '30px', borderRadius: '4px' }} />
            Menu
          </h2>
          <button onClick={() => setMenuOpen(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
            <X size={24} />
          </button>
        </div>

        <nav style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
          <button 
            onClick={() => { setViewMode('os'); setMenuOpen(false); }}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '8px', 
              background: viewMode === 'os' ? '#f97316' : 'transparent', 
              border: 'none', color: '#fff', cursor: 'pointer', textAlign: 'left', fontSize: '1rem', fontWeight: 'bold',
              transition: 'background 0.2s'
            }}
          >
            <Home size={20} />
            Ordens de Serviço
          </button>

          <button 
            onClick={() => { setViewMode('combustivel'); setMenuOpen(false); }}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '8px', 
              background: viewMode === 'combustivel' ? '#f97316' : 'transparent', 
              border: 'none', color: '#fff', cursor: 'pointer', textAlign: 'left', fontSize: '1rem', fontWeight: 'bold',
              transition: 'background 0.2s'
            }}
          >
            <Fuel size={20} />
            Controle Combustível
          </button>
        </nav>
        
        <div style={{ padding: '20px', borderTop: '1px solid #334155', fontSize: '0.8rem', color: '#94a3b8', textAlign: 'center' }}>
          Yamaservice OS v1.0
        </div>
      </div>
      {/* --- FIM DO MENU LATERAL --- */}

      {viewMode === 'combustivel' ? (
        <DashboardControleCombustivel osList={osList} onOpenMenu={() => setMenuOpen(true)} />
      ) : (
        <>
          {/* Cabeçalho */}
          <header className={`${styles.osHeader} ${styles.animateFadeIn}`}>
            <div className={styles.osLogoContainer} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button 
                onClick={() => setMenuOpen(true)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#1e293b', padding: '4px', display: 'flex', alignItems: 'center' }}
                title="Abrir Menu"
              >
                <Menu size={32} />
              </button>
              <img 
                src={logoYamaservice} 
                alt="Yamaservice Logo" 
                style={{ height: '48px', width: 'auto', borderRadius: '8px' }} 
              />
              <div className={styles.osTitle}>
                yamaservice
                <span className={styles.osSubtitle}>Gestão de Ordens de Serviço</span>
              </div>
            </div>
            
            <div className={styles.osActions} style={{ display: 'flex', gap: '8px' }}>
              <button 
                className={styles.btnPrimary}
                onClick={() => setShowNovaOS(true)}
                style={{ marginRight: '16px' }}
              >
                + Criar Nova O.S.
              </button>
              
              <button 
                className={styles.btnSecondary}
                onClick={() => setAbaRelatorio(abaRelatorio === 'os' ? null : 'os')}
                style={abaRelatorio === 'os' ? { backgroundColor: 'var(--cor-fundo-sutil-forte)', borderColor: 'var(--cor-destaque)' } : {}}
              >
                <FileText size={18} />
                Ordens de Serviço
              </button>
            </div>
          </header>

      {/* Corpo principal */}
      <main className={osParaImprimir ? styles.noPrint : ''}>
        {/* Formulário de Cadastro Modal */}
        {showNovaOS && (
          <FormularioOS 
            onAddOS={handleAddOS} 
            osList={osList} 
            onClose={() => setShowNovaOS(false)}
          />
        )}

        {/* Tabela de Relatórios (condicional) */}
        {abaRelatorio === 'os' && (
          <TabelaOS 
            osList={osList} 
            onRowClick={(os) => setOsSelecionada(os)} 
            onPrint={handleImprimirOS} 
            onStart={handleStartOS}
          />
        )}


        {/* Modal de Fechamento de OS */}
        {osSelecionada && (
          <FormularioServicoOS 
            os={osSelecionada} 
            onClose={() => setOsSelecionada(null)} 
            onUpdateOS={handleUpdateOS} 
          />
        )}
      </main>
      </>
      )}

      {/* Componente de Impressão (Oculto na tela normal) */}
      {osParaImprimir && <ImpressaoOS os={osParaImprimir} />}
    </div>
  );
};

export default DashboardOS;
