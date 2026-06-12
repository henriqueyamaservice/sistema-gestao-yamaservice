import React, { useState, useEffect } from 'react';
import styles from './index.module.css';
import { Fuel, FileText, Truck, Plus, Settings, Database, Menu } from 'lucide-react';
import logoYamaservice from '../../../assets/YAMASERVICE.jpeg';

import FormularioRequisicao from './componentes/FormularioRequisicao';
import TabelaCombustivel from './componentes/TabelaCombustivel';
import FormularioAbastecimento from './componentes/FormularioAbastecimento';
import DetalhesAbastecimentoModal from './componentes/DetalhesAbastecimentoModal';
import CadastroVeiculos from './componentes/CadastroVeiculos';
import RevisaoVeiculo from './componentes/RevisaoVeiculo';
import EstoqueCombustivel from './componentes/EstoqueCombustivel';
import RelatorioGeradores from './componentes/RelatorioGeradores';

const DashboardControleCombustivel = ({ osList, onOpenMenu }) => {
  const [abaAtiva, setAbaAtiva] = useState('geral');
  const [requisicoes, setRequisicoes] = useState([]);

  // Buscar dados do backend
  useEffect(() => {
    fetch('http://localhost:3000/api/combustivel')
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

  const handleAddRequisicao = (req) => {
    setRequisicoes(prev => [...prev, req]);
  };

  const handleAddAbastecimento = (abast) => {
    setRequisicoes(prev => prev.map(r => r.numeroRequisicao === abast.numeroRequisicao ? abast : r));
  };

  const handleRowClick = (req) => {
    if (req.status === 'EM ANDAMENTO' || req.status === 'ABERTA') {
      setRequisicaoParaAbastecer(req);
      setShowNovoAbastecimento(true);
    } else if (req.status === 'CONCLUÍDO' || req.status === 'ABASTECIDA') {
      setRequisicaoParaAbastecer(req);
      setShowDetalhesAbastecimento(true);
    }
  };

  return (
    <div className={styles.dashboardContainer}>
      {/* Header */}
      <header className={`${styles.header} ${styles.animateFadeIn}`}>
        <div className={`${styles.logoContainer} ${styles.logoContainerHeader}`}>
          {onOpenMenu && (
            <button
              onClick={onOpenMenu}
              className={styles.menuBtn}
              title="Abrir Menu"
            >
              <Menu size={32} />
            </button>
          )}
          <img
            src={logoYamaservice}
            alt="Yamaservice Logo"
            className={styles.logoImg}
          />
          <div className={styles.title}>
            yamaservice
            <span className={styles.subtitle}>Controle de Combustível</span>
          </div>
        </div>

        <div className={styles.actions}>
          <button
            className={`${styles.btnSecondary} ${abaAtiva === 'geral' ? styles.active : ''}`}
            onClick={() => setAbaAtiva('geral')}
          >
            <FileText size={18} />
            Relatório Geral
          </button>

          <button
            className={`${styles.btnSecondary} ${abaAtiva === 'cadastro' ? styles.active : ''}`}
            onClick={() => setAbaAtiva('cadastro')}
          >
            <Truck size={18} />
            Cad. Veículos
          </button>

          <button
            className={`${styles.btnSecondary} ${abaAtiva === 'estoque' ? styles.active : ''}`}
            onClick={() => setAbaAtiva('estoque')}
          >
            <Database size={18} />
            Estoque
          </button>

          <button
            className={`${styles.btnSecondary} ${abaAtiva === 'geradores' ? styles.active : ''}`}
            onClick={() => setAbaAtiva('geradores')}
          >
            <Fuel size={18} />
            Granjas
          </button>

          <button
            className={`${styles.btnSecondary} ${abaAtiva === 'frota' ? styles.active : ''}`}
            onClick={() => setAbaAtiva('frota')}
          >
            <Settings size={18} />
            Revisão
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className={styles.animateFadeIn}>
        {abaAtiva === 'geral' && (
          <div>
            <div className={styles.flexRow}>
              <h2 className={`${styles.cardTitle} ${styles.noBorderBottom}`}>
                Gerenciamento de Abastecimentos
              </h2>
              <button
                className={`${styles.btnSecondary} ${styles.btnDestaque}`}
                onClick={() => setShowNovaRequisicao(true)}
              >
                <Plus size={18} />
                Nova Requisição
              </button>
            </div>

            <div className={`${styles.tableSection} ${styles.tableSectionTransparent}`}>
              <TabelaCombustivel requisicoes={requisicoes} onRowClick={handleRowClick} />
            </div>

            {showNovaRequisicao && (
              <FormularioRequisicao
                onAdd={handleAddRequisicao}
                onClose={() => setShowNovaRequisicao(false)}
              />
            )}

            {showNovoAbastecimento && requisicaoParaAbastecer && (
              <FormularioAbastecimento
                onAdd={handleAddAbastecimento}
                requisicao={requisicaoParaAbastecer}
                onClose={() => {
                  setShowNovoAbastecimento(false);
                  setRequisicaoParaAbastecer(null);
                }}
              />
            )}

            {showDetalhesAbastecimento && requisicaoParaAbastecer && (
              <DetalhesAbastecimentoModal
                requisicao={requisicaoParaAbastecer}
                onClose={() => {
                  setShowDetalhesAbastecimento(false);
                  setRequisicaoParaAbastecer(null);
                }}
              />
            )}
          </div>
        )}

        {abaAtiva === 'estoque' && (
          <EstoqueCombustivel />
        )}

        {abaAtiva === 'geradores' && (
          <RelatorioGeradores />
        )}

        {abaAtiva === 'cadastro' && (
          <div className={styles.tableSection}>
            <CadastroVeiculos />
          </div>
        )}

        {abaAtiva === 'frota' && (
          <div className={styles.tableSection}>
            <RevisaoVeiculo osList={osList || []} />
          </div>
        )}
      </main>
    </div>
  );
};

export default DashboardControleCombustivel;
