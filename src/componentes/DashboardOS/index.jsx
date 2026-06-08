import React, { useState, useEffect } from 'react';
import styles from './index.module.css';
import { FileText, BarChart2 } from 'lucide-react';
import FormularioOS from './componentes/FormularioOS';
import TabelaOS from './componentes/TabelaOS';
import FormularioServicoOS from './componentes/FormularioServicoOS';
import ImpressaoOS from './componentes/ImpressaoOS';
import logoYamaservice from '../../assets/YAMASERVICE.jpeg';

const DashboardOS = () => {
  const [osList, setOsList] = useState([]);
  const [mostrarRelatorio, setMostrarRelatorio] = useState(true);
  const [osSelecionada, setOsSelecionada] = useState(null);
  const [osParaImprimir, setOsParaImprimir] = useState(null);

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
    <div className={styles.dashboardOsContainer}>
      {/* Cabeçalho */}
      <header className={`${styles.osHeader} ${styles.animateFadeIn}`}>
        <div className={styles.osLogoContainer}>
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
        
        <div className={styles.osActions}>
          <button 
            className={styles.btnSecondary}
            onClick={() => setMostrarRelatorio(!mostrarRelatorio)}
          >
            {mostrarRelatorio ? <FileText size={18} /> : <BarChart2 size={18} />}
            {mostrarRelatorio ? 'Ocultar Relatórios' : 'Mostrar Relatórios'}
          </button>
        </div>
      </header>

      {/* Corpo principal */}
      <main className={osParaImprimir ? styles.noPrint : ''}>
        {/* Formulário de Cadastro */}
        <FormularioOS onAddOS={handleAddOS} osList={osList} />

        {/* Tabela de Relatórios (condicional) */}
        {mostrarRelatorio && (
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

      {/* Componente de Impressão (Oculto na tela normal) */}
      {osParaImprimir && <ImpressaoOS os={osParaImprimir} />}
    </div>
  );
};

export default DashboardOS;
