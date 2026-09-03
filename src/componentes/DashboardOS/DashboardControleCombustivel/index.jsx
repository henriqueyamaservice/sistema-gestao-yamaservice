import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import styles from './index.module.css';
import { Fuel, FileText, Truck, Plus, Settings, Database, Menu, Zap, X } from 'lucide-react';
import logoYamaservice from '../../../assets/YAMASERVICE.jpeg';

import FormularioRequisicao from './componentes/FormularioRequisicao';
import TabelaCombustivel from './componentes/TabelaCombustivel';
import FormularioAbastecimento from './componentes/FormularioAbastecimento';
import DetalhesAbastecimentoModal from './componentes/DetalhesAbastecimentoModal';
import CadastroVeiculos from './componentes/CadastroVeiculos';
import RevisaoVeiculo from './componentes/RevisaoVeiculo';
import EstoqueCombustivel from './componentes/EstoqueCombustivel';
import HistoricoCombustivel from './componentes/HistoricoCombustivel';
import RelatorioGeradores from './componentes/RelatorioGeradores';
import RevisaoGerador from './componentes/RevisaoGerador';
import NotificationRevisaoService from './componentes/NotificationRevisaoService';

const DashboardControleCombustivel = ({ osList, abaAtiva }) => {
  const [requisicoes, setRequisicoes] = useState([]);

  // Buscar dados do backend
  useEffect(() => {
    fetch(`/api/combustivel`)
      .then(res => res.json())
      .then(data => {
        setRequisicoes(data);
      })
      .catch(err => console.error('Erro ao buscar combustivel:', err));
  }, []);

  // Estados dos Modais
  const [showNovaRequisicao, setShowNovaRequisicao] = useState(false);
  const [showNovoAbastecimento, setShowNovoAbastecimento] = useState(false);
  const [showDetalhesAbastecimento, setShowDetalhesAbastecimento] = useState(false);
  const [requisicaoParaAbastecer, setRequisicaoParaAbastecer] = useState(null);
  
  // Novo estado para o modal de escolha do tipo de requisição
  const [showTipoRequisicaoModal, setShowTipoRequisicaoModal] = useState(false);
  const [tipoRequisicaoSelecionado, setTipoRequisicaoSelecionado] = useState('carro');

  const handleAddRequisicao = (req) => {
    setRequisicoes(prev => [...prev, req]);
  };

  const handleAddAbastecimento = (abast) => {
    setRequisicoes(prev => prev.map(r => (r.id === abast.id || r.numeroRequisicao === abast.numeroRequisicao) ? abast : r));
  };

  const handleRowClick = (req) => {
    if (req.status === 'EM ANDAMENTO' || req.status === 'ABERTA') {
      setRequisicaoParaAbastecer(req);
      setShowNovoAbastecimento(true);
    } else {
      setRequisicaoParaAbastecer(req);
      setShowDetalhesAbastecimento(true);
    }
  };

  return (
    <div className={styles.dashboardContainer}>
      <NotificationRevisaoService />
      
      {/* Main Content Area */}
      <main className={styles.animateFadeIn}>
        {abaAtiva === 'geral' && (
          <div className={styles.tableSection}>
            <div className={styles.flexRow}>
              <h2 className={`${styles.cardTitle} ${styles.noBorderBottom}`}>
                Relatório de Saídas (Abastecimentos)
              </h2>
              <button
                className={`${styles.btnSecondary} ${styles.btnDestaque}`}
                onClick={() => setShowTipoRequisicaoModal(true)}
              >
                <Plus size={18} />
                Nova Requisição
              </button>
            </div>

            <TabelaCombustivel requisicoes={requisicoes} onRowClick={handleRowClick} />

            {showTipoRequisicaoModal && ReactDOM.createPortal(
              <div className={styles.overlay}>
                <div className={styles.modalCard} style={{ maxWidth: '400px', textAlign: 'center' }}>
                  <button type="button" onClick={() => setShowTipoRequisicaoModal(false)} className={styles.closeButton}>
                    <X size={24} />
                  </button>
                  <h2 className={styles.cardTitle} style={{ justifyContent: 'center', borderBottom: 'none', marginBottom: '20px' }}>
                    Para onde é a saída?
                  </h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <button
                      className={styles.btnSecondary}
                      style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', fontSize: '1.1rem' }}
                      onClick={() => {
                        setTipoRequisicaoSelecionado('carro');
                        setShowTipoRequisicaoModal(false);
                        setShowNovaRequisicao(true);
                      }}
                    >
                      <Truck size={32} color="var(--cor-destaque)" />
                      Veículos / Frota
                    </button>
                    <button
                      className={styles.btnSecondary}
                      style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', fontSize: '1.1rem' }}
                      onClick={() => {
                        setTipoRequisicaoSelecionado('granja');
                        setShowTipoRequisicaoModal(false);
                        setShowNovaRequisicao(true);
                      }}
                    >
                      <Zap size={32} color="#eab308" />
                      Geradores / Granjas
                    </button>
                  </div>
                </div>
              </div>,
              document.body
            )}

            {showNovaRequisicao && ReactDOM.createPortal(
              <FormularioRequisicao
                tipo={tipoRequisicaoSelecionado}
                onAdd={handleAddRequisicao}
                onClose={() => setShowNovaRequisicao(false)}
              />,
              document.body
            )}

            {showNovoAbastecimento && requisicaoParaAbastecer && ReactDOM.createPortal(
              <FormularioAbastecimento
                onAdd={handleAddAbastecimento}
                requisicao={requisicaoParaAbastecer}
                onClose={() => {
                  setShowNovoAbastecimento(false);
                  setRequisicaoParaAbastecer(null);
                }}
              />,
              document.body
            )}

            {showDetalhesAbastecimento && requisicaoParaAbastecer && ReactDOM.createPortal(
              <DetalhesAbastecimentoModal
                requisicao={requisicaoParaAbastecer}
                onClose={() => {
                  setShowDetalhesAbastecimento(false);
                  setRequisicaoParaAbastecer(null);
                }}
              />,
              document.body
            )}
          </div>
        )}

        {abaAtiva === 'estoque' && (
          <EstoqueCombustivel />
        )}

        {abaAtiva === 'historico' && (
          <HistoricoCombustivel />
        )}

        {abaAtiva === 'geradores' && (
          <RelatorioGeradores />
        )}

        {abaAtiva === 'cadastro' && (
          <div className={styles.tableSection}>
            <CadastroVeiculos />
          </div>
        )}

        {abaAtiva === 'revisao-veiculos' && (
          <div className={styles.tableSection}>
            <RevisaoVeiculo osList={osList || []} />
          </div>
        )}

        {abaAtiva === 'revisao-geradores' && (
          <div className={styles.tableSection}>
            <RevisaoGerador osList={osList || []} />
          </div>
        )}
      </main>
    </div>
  );
};

export default DashboardControleCombustivel;
