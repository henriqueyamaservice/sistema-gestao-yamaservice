import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import styles from './index.module.css';
import { FileText, BarChart2, Menu, Settings } from 'lucide-react';
import FormularioOS from './componentes/FormularioOS';
import TabelaOS from './componentes/TabelaOS';
import FormularioServicoOS from './componentes/FormularioServicoOS';
import ImpressaoOS from './componentes/ImpressaoOS';
import TabelaPrestacaoServicos from './componentes/TabelaPrestacaoServicos';
import FormularioPrestacaoServico from './componentes/FormularioPrestacaoServico';
import ImpressaoPrestacaoServico from './componentes/ImpressaoPrestacaoServico';
import logoYamaservice from '../../assets/YAMASERVICE.jpeg';
import { Truck, Fuel } from 'lucide-react';
import DashboardControleCombustivel from './DashboardControleCombustivel';
import MenuOs from './componentes/MenuOs';
import CheckListVeiculo from './componentes/CheckListVeiculo';
import TabelaCheckList from './componentes/TabelaCheckList';
import GestaoCustos from './componentes/GestaoCustos';
import ModalVerificacaoCentroCustoOS from './componentes/ModalVerificacaoCentroCustoOS';
import { EM_ANDAMENTO } from '../../utils/osStatus';
import GerenciadorUsuarios from '../GerenciadorUsuarios';
import { ShieldAlert } from 'lucide-react';

const DashboardOS = ({ initialViewMode = 'os' }) => {
  const [osList, setOsList] = useState([]);
  const [abaRelatorio, setAbaRelatorio] = useState('os');
  const [osSelecionada, setOsSelecionada] = useState(null);
  const [osParaImprimir, setOsParaImprimir] = useState(null);
  const [showNovaOS, setShowNovaOS] = useState(false);
  const [showTriagemOS, setShowTriagemOS] = useState(false);
  const [centroCustoPreSelecionado, setCentroCustoPreSelecionado] = useState('');
  const [tipoNovaOS, setTipoNovaOS] = useState('CORRETIVA');
  const [viewMode, setViewMode] = useState(initialViewMode); // 'os' ou 'combustivel'
  const [abaCombustivel, setAbaCombustivel] = useState('geral');
  const [checklists, setChecklists] = useState([]);
  const [checklistSelecionado, setChecklistSelecionado] = useState(null);
  const [showGerenciadorUsuarios, setShowGerenciadorUsuarios] = useState(false);

  useEffect(() => {
    if (initialViewMode) {
      setViewMode(initialViewMode);
    }
  }, [initialViewMode]);

  // Carregar checklists do backend
  useEffect(() => {
    fetch('/api/checklists')
      .then(res => res.json())
      .then(data => setChecklists(data))
      .catch(err => console.error("Erro ao carregar checklists:", err));
  }, []);

  // Carregar as OS do backend ao iniciar
  useEffect(() => {
    fetch('/api/os')
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

  const handleAddChecklist = async (novoChecklist) => {
    try {
      const res = await fetch('/api/checklists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(novoChecklist)
      });
      if (res.ok) {
        const result = await res.json();
        setChecklists(prev => [result.checklist, ...prev]);
      }
    } catch (err) {
      console.error("Erro ao salvar checklist:", err);
    }
  };

  const handleStartOS = async (os) => {
    try {
      const response = await fetch(`/api/os/${os.codigo}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ situacao: EM_ANDAMENTO })
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

  const isPrestacaoOS = (os) => Boolean(
    os && (
      os.tipo === 'PRESTACAO_SERVICO' ||
      os.isPrestacaoServico === true ||
      os.modalidade === 'PRESTACAO_SERVICO' ||
      (Array.isArray(os.itensPrestacao) && os.itensPrestacao.length > 0)
    )
  );

  return (
    <div className={styles.appLayout}>
      <MenuOs 
        viewMode={viewMode} 
        setViewMode={setViewMode} 
        abaCombustivel={abaCombustivel}
        setAbaCombustivel={setAbaCombustivel}
        abaRelatorio={abaRelatorio}
        setAbaRelatorio={setAbaRelatorio}
        setShowNovaOS={setShowNovaOS}
        setShowGerenciadorUsuarios={setShowGerenciadorUsuarios}
      />
      
      {showGerenciadorUsuarios && (
        <GerenciadorUsuarios onClose={() => setShowGerenciadorUsuarios(false)} />
      )}
      
      <div className={styles.appContent}>
        <div className={styles.dashboardOsContainer} style={{ position: 'relative' }}>
          {viewMode === 'combustivel' ? (
            <DashboardControleCombustivel osList={osList} abaAtiva={abaCombustivel} />
          ) : (
        <>
      {/* Corpo principal */}
      <main className={osParaImprimir ? styles.noPrint : ''}>
        {/* Modal de Verificação / Triagem Prévia de Centro de Custo para Prevenção de Duplicidade */}
        {showTriagemOS && (
          <ModalVerificacaoCentroCustoOS 
            isOpen={showTriagemOS}
            onClose={() => setShowTriagemOS(false)}
            osList={osList}
            isPrestacao={tipoNovaOS === 'PRESTACAO_SERVICO'}
            onContinuar={(centroEscolhido) => {
              setCentroCustoPreSelecionado(centroEscolhido);
              setShowTriagemOS(false);
              setShowNovaOS(true);
            }}
            onVerOS={(os) => {
              setShowTriagemOS(false);
              setOsSelecionada(os);
            }}
          />
        )}

        {/* Formulário de Cadastro Modal */}
        {showNovaOS && (
          <FormularioOS 
            onAddOS={handleAddOS} 
            osList={osList} 
            initialTipo={tipoNovaOS}
            isPrestacaoMode={tipoNovaOS === 'PRESTACAO_SERVICO'}
            initialCentroCusto={centroCustoPreSelecionado}
            onClose={() => {
              setShowNovaOS(false);
              setCentroCustoPreSelecionado('');
            }}
          />
        )}

        {/* Tabela de Relatórios (condicional) */}
        {abaRelatorio === 'os' && (
          <TabelaOS 
            osList={osList} 
            onRowClick={(os) => setOsSelecionada(os)} 
            onPrint={handleImprimirOS} 
            onStart={handleStartOS}
            onNovoClick={() => {
              setTipoNovaOS('CORRETIVA');
              setShowTriagemOS(true);
            }}
          />
        )}

        {/* Tabela de Prestação de Serviços (Granjas) */}
        {abaRelatorio === 'prestacao-servicos' && (
          <TabelaPrestacaoServicos 
            osList={osList} 
            onRowClick={(os) => setOsSelecionada(os)} 
            onPrint={handleImprimirOS} 
            onNovoClick={() => {
              setTipoNovaOS('PRESTACAO_SERVICO');
              setShowTriagemOS(true);
            }}
          />
        )}

        {abaRelatorio === 'checklist' && (
          <CheckListVeiculo 
            onSave={(novoCheck) => {
              handleAddChecklist(novoCheck);
              setAbaRelatorio('relatorio-checklist');
            }} 
            onClose={() => setAbaRelatorio('relatorio-checklist')}
          />
        )}

        {abaRelatorio === 'relatorio-checklist' && (
          <TabelaCheckList 
            checklists={checklists} 
            onView={setChecklistSelecionado} 
            onNovoCheckList={() => setAbaRelatorio('checklist')}
          />
        )}

        {abaRelatorio === 'custo-mensal' && (
          <GestaoCustos osList={osList} />
        )}

        {/* Modal de Visualização de Check-List */}
        {checklistSelecionado && (
          <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}>
            <CheckListVeiculo 
              checklist={checklistSelecionado} 
              readOnly={true} 
              onClose={() => setChecklistSelecionado(null)} 
            />
          </div>
        )}

        {/* Modal de Fechamento / Apontamento de OS */}
        {osSelecionada && (
          isPrestacaoOS(osSelecionada) ? (
            <FormularioPrestacaoServico 
              os={osSelecionada} 
              onClose={() => setOsSelecionada(null)} 
              onUpdateOS={handleUpdateOS} 
              onPrint={handleImprimirOS}
            />
          ) : (
            <FormularioServicoOS 
              os={osSelecionada} 
              onClose={() => setOsSelecionada(null)} 
              onUpdateOS={handleUpdateOS} 
            />
          )
        )}
      </main>
          </>
          )}

          {/* Componente de Impressão (Oculto na tela normal) */}
          {osParaImprimir && ReactDOM.createPortal(
            isPrestacaoOS(osParaImprimir) ? (
              <ImpressaoPrestacaoServico os={osParaImprimir} />
            ) : (
              <ImpressaoOS os={osParaImprimir} />
            ),
            document.body
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardOS;
