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
          className={styles.overlay}
        />
      )}

      <div className={`${styles.sidebar} ${menuOpen ? styles.sidebarOpen : styles.sidebarClosed}`}>
        <div className={styles.sidebarHeader}>
          <h2 className={styles.sidebarLogoTitle}>
            <img src={logoYamaservice} alt="Logo" className={styles.sidebarLogoImg} />
            Menu
          </h2>
          <button onClick={() => setMenuOpen(false)} className={styles.closeMenuBtn}>
            <X size={24} />
          </button>
        </div>

        <nav className={styles.sidebarNav}>
          <button 
            onClick={() => { setViewMode('os'); setMenuOpen(false); }}
            className={`${styles.navItem} ${viewMode === 'os' ? styles.navItemActive : ''}`}
          >
            <Home size={20} />
            Ordens de Serviço
          </button>

          <button 
            onClick={() => { setViewMode('combustivel'); setMenuOpen(false); }}
            className={`${styles.navItem} ${viewMode === 'combustivel' ? styles.navItemActive : ''}`}
          >
            <Fuel size={20} />
            Controle Combustível
          </button>
        </nav>
        
        <div className={styles.sidebarFooter}>
          Yamaservice OS v1.0
        </div>
      </div>
      {/* --- FIM DO MENU LATERAL --- */}

      {viewMode === 'combustivel' ? (
        <DashboardControleCombustivel osList={osList} onOpenMenu={() => setMenuOpen(true)} />
      ) : (
        <>
          <header className={`${styles.osHeader} ${styles.animateFadeIn}`}>
            <div className={styles.osLogoContainer}>
              <button 
                onClick={() => setMenuOpen(true)}
                className={styles.openMenuBtn}
                title="Abrir Menu"
              >
                <Menu size={32} />
              </button>
              <img 
                src={logoYamaservice} 
                alt="Yamaservice Logo" 
                className={styles.headerLogoImg}
              />
              <div className={styles.osTitle}>
                yamaservice
                <span className={styles.osSubtitle}>Gestão de Ordens de Serviço</span>
              </div>
            </div>
            
            <div className={styles.osActions}>
              <button 
                className={`${styles.btnPrimary} ${styles.btnPrimaryMargin}`}
                onClick={() => setShowNovaOS(true)}
              >
                + Criar Nova O.S.
              </button>
              
              <button 
                className={`${styles.btnSecondary} ${abaRelatorio === 'os' ? styles.btnSecondaryActive : ''}`}
                onClick={() => setAbaRelatorio(abaRelatorio === 'os' ? null : 'os')}
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
