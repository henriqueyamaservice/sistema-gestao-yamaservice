import React, { useState, useEffect, useMemo } from 'react';
import { Zap, Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import styles from './index.module.css';
import FormularioRequisicao from '../FormularioRequisicao';
import FormularioAbastecimento from '../FormularioAbastecimento';
import DetalhesAbastecimentoModal from '../DetalhesAbastecimentoModal';
import ModalCadastroGerador from '../ModalCadastroGerador';
import ModalRelatorioAnaliticoGeradores from '../ModalRelatorioAnaliticoGeradores';

const RelatorioGeradores = () => {
  const [requisicoes, setRequisicoes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNovaRequisicao, setShowNovaRequisicao] = useState(false);
  const [showNovoAbastecimento, setShowNovoAbastecimento] = useState(false);
  const [showDetalhesAbastecimento, setShowDetalhesAbastecimento] = useState(false);
  const [requisicaoParaAbastecer, setRequisicaoParaAbastecer] = useState(null);
  const [modalCadastroAberto, setModalCadastroAberto] = useState(false);
  const [modalRelatorioAnaliticoAberto, setModalRelatorioAnaliticoAberto] = useState(false);

  const fetchRequisicoes = () => {
    setIsLoading(true);
    fetch('http://localhost:3000/api/combustivel')
      .then(res => res.json())
      .then(data => {
        const filtradas = data.filter(req => 
          req.veiculo && 
          (req.veiculo.toUpperCase().includes('GERADOR') || 
           req.veiculo.toUpperCase().includes('GRANJA') || 
           req.veiculo.toUpperCase().startsWith('G. '))
        );
        filtradas.sort((a, b) => new Date(b.data) - new Date(a.data));
        setRequisicoes(filtradas);
      })
      .catch(err => console.error('Erro ao buscar combustivel:', err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchRequisicoes();
  }, []);

  const handleRowClick = (req) => {
    if (req.status === 'EM ANDAMENTO' || req.status === 'ABERTA') {
      setRequisicaoParaAbastecer(req);
      setShowNovoAbastecimento(true);
    } else if (req.status === 'CONCLUÍDO' || req.status === 'ABASTECIDA') {
      setRequisicaoParaAbastecer(req);
      setShowDetalhesAbastecimento(true);
    }
  };

  const totalLitros = useMemo(() => {
    return requisicoes.reduce((acc, req) => acc + (parseFloat(req.qtde) || 0), 0);
  }, [requisicoes]);

  const dadosGrafico = useMemo(() => {
    const consumoPorGerador = {};
    
    requisicoes.forEach(req => {
      const gerador = req.veiculo;
      if (!consumoPorGerador[gerador]) {
        consumoPorGerador[gerador] = 0;
      }
      consumoPorGerador[gerador] += parseFloat(req.qtde) || 0;
    });

    return Object.keys(consumoPorGerador).map(gerador => ({
      name: gerador,
      Litros: consumoPorGerador[gerador]
    }));
  }, [requisicoes]);

  const handleExportCSV = () => {
    if (requisicoes.length === 0) {
      alert("Não há dados para exportar.");
      return;
    }

    let csv = "Data;Gerador;Fornecedor;Produto;Qtd (L)\n";
    requisicoes.forEach(req => {
      const dataStr = new Date(req.data).toLocaleDateString('pt-BR');
      const gerador = (req.veiculo || "").replace(/;/g, ",");
      const fornecedor = (req.fornecedor || "").replace(/;/g, ",");
      const produto = (req.combustivel || "").replace(/;/g, ",");
      const qtd = String(req.qtde || 0).replace(".", ",");

      csv += `${dataStr};${gerador};${fornecedor};${produto};${qtd}\n`;
    });

    const blob = new Blob(["\ufeff" + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `relatorio_geradores_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleContainer}>
          <h2 className={styles.title}>
            <Zap size={24} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px', color: '#eab308' }} />
            Relatório de Abastecimento - Granjas
          </h2>
        </div>
        <div className={styles.gap10}>
          <button 
            className={`${styles.btnPrimary} ${styles.btnWarning}`} 
            onClick={() => setModalRelatorioAnaliticoAberto(true)}
          >
            Relatório Analítico
          </button>
          <button 
            className={`${styles.btnPrimary} ${styles.btnSecondary}`} 
            onClick={() => setModalCadastroAberto(true)}
          >
            + Cadastrar Gerador
          </button>
          <button 
            className={`${styles.btnPrimary} ${styles.btnSuccess}`} 
            onClick={handleExportCSV}
          >
            <Download size={18} />
            Exportar Planilha
          </button>
          <button 
            className={styles.btnPrimary} 
            onClick={() => setShowNovaRequisicao(true)}
          >
            <Zap size={18} />
            Nova Requisição
          </button>
        </div>
      </div>

      {isLoading ? (
        <p className={styles.emptyState} style={{marginTop: '20px'}}>Carregando dados...</p>
      ) : (
        <>
          <div className={styles.chartsGrid}>
            <div className={styles.chartCard} style={{ flex: 1 }}>
              <h3 className={styles.chartTitle}>Consumo Total de Geradores</h3>
              <div className={styles.statsContainer}>
                <p className={styles.statsLabel}>Total Abastecido</p>
                <p className={styles.statsValue}>
                  {totalLitros.toFixed(2)} L
                </p>
                <p className={styles.statsSubLabel}>Considerando todos os geradores filtrados</p>
              </div>
            </div>

            <div className={styles.chartCard} style={{ flex: 2 }}>
              <h3 className={styles.chartTitle}>Consumo por Granja (Litros)</h3>
              <div className={styles.chartWrapper}>
                {dadosGrafico.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dadosGrafico} margin={{ top: 20, right: 30, left: 0, bottom: 25 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" />
                      <YAxis />
                      <RechartsTooltip cursor={{ fill: 'transparent' }} />
                      <Bar dataKey="Litros" fill="#eab308" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className={styles.emptyState}>Sem dados de consumo.</p>
                )}
              </div>
            </div>
          </div>

          <div className={styles.tableSection}>
            <div className={styles.tableHeader}>
              <h3 className={`${styles.chartTitle} ${styles.tableTitle}`}>Histórico de Abastecimentos</h3>
            </div>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Nº Req</th>
                    <th>Data</th>
                    <th>Gerador</th>
                    <th>Status</th>
                    <th>Qtd (L)</th>
                  </tr>
                </thead>
                <tbody>
                  {requisicoes.length > 0 ? (
                    requisicoes.map((req, idx) => (
                      <tr 
                        key={req.id || idx} 
                        onClick={() => handleRowClick(req)}
                        style={{ cursor: 'pointer' }}
                        className={styles.tableRow}
                      >
                        <td>{req.numeroRequisicao}</td>
                        <td>{new Date(req.data).toLocaleDateString('pt-BR')}</td>
                        <td className={styles.textBold}>{req.veiculo}</td>
                        <td>
                          <span className={`${styles.statusBadge} ${(req.status === 'EM ANDAMENTO' || req.status === 'ABERTA') ? styles.statusWarning : styles.statusSuccess}`}>
                            {req.status}
                          </span>
                        </td>
                        <td className={styles.textBold} style={{ color: (req.status === 'CONCLUÍDO' || req.status === 'ABASTECIDA') ? '#b45309' : '#94a3b8' }}>
                          {req.qtde ? `${req.qtde} L` : '-'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className={styles.textCenter} style={{ padding: '30px' }}>
                        Nenhum abastecimento de gerador registrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <ModalCadastroGerador 
        isOpen={modalCadastroAberto}
        onClose={() => setModalCadastroAberto(false)}
        onSave={(geradorSalvo) => {
          console.log('Gerador Salvo', geradorSalvo);
        }}
      />

      <ModalRelatorioAnaliticoGeradores 
        isOpen={modalRelatorioAnaliticoAberto}
        onClose={() => setModalRelatorioAnaliticoAberto(false)}
      />

      {showNovaRequisicao && (
        <FormularioRequisicao
          tipo="granja"
          onAdd={(novaReq) => {
            fetchRequisicoes();
            setShowNovaRequisicao(false);
          }}
          onClose={() => setShowNovaRequisicao(false)}
        />
      )}

      {showNovoAbastecimento && requisicaoParaAbastecer && (
        <FormularioAbastecimento
          requisicao={requisicaoParaAbastecer}
          onAdd={(abast) => {
            fetchRequisicoes();
            setShowNovoAbastecimento(false);
            setRequisicaoParaAbastecer(null);
          }}
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
  );
};

export default RelatorioGeradores;
