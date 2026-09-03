import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { Zap, Download, BarChart2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import styles from './index.module.css';
import FormularioRequisicao from '../FormularioRequisicao';
import FormularioAbastecimento from '../FormularioAbastecimento';
import DetalhesAbastecimentoModal from '../DetalhesAbastecimentoModal';
import ModalCadastroGerador from '../ModalCadastroGerador';
import RelatorioAnaliticoGeradores from '../RelatorioAnaliticoGeradores';

const RelatorioGeradores = () => {
  const [requisicoes, setRequisicoes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalCadastroAberto, setModalCadastroAberto] = useState(false);
  const [mostrarGrafico, setMostrarGrafico] = useState(true);

  const fetchRequisicoes = () => {
    setIsLoading(true);
    fetch(`/api/combustivel`)
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

  const totalLitros = useMemo(() => {
    return requisicoes.reduce((acc, req) => acc + (parseFloat(req.qtde) || 0), 0);
  }, [requisicoes]);

  const dadosGrafico = useMemo(() => {
    const reqsPorGerador = {};
    
    requisicoes.forEach(req => {
      const gerador = req.veiculo;
      if (!reqsPorGerador[gerador]) {
        reqsPorGerador[gerador] = [];
      }
      reqsPorGerador[gerador].push({
        qtde: parseFloat(req.qtde) || 0,
        data: new Date(req.data)
      });
    });

    return Object.keys(reqsPorGerador).map(gerador => {
      const reqs = reqsPorGerador[gerador].sort((a, b) => b.data - a.data);
      
      return {
        name: gerador,
        antepenultimo: reqs[2] ? reqs[2].qtde : 0,
        penultimo: reqs[1] ? reqs[1].qtde : 0,
        ultimo: reqs[0] ? reqs[0].qtde : 0
      };
    });
  }, [requisicoes]);


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
            className={styles.btnToggleGrafico} 
            onClick={() => setMostrarGrafico(!mostrarGrafico)}
          >
            <BarChart2 size={16} />
            {mostrarGrafico ? "Ocultar Gráficos" : "Mostrar Gráficos"}
          </button>
          <button 
            className={`${styles.btnPrimary} ${styles.btnSecondary}`} 
            onClick={() => setModalCadastroAberto(true)}
          >
            + Cadastrar Gerador
          </button>
        </div>
      </div>

      {isLoading ? (
        <p className={styles.emptyState} style={{marginTop: '20px'}}>Carregando dados...</p>
      ) : (
        <>
          {mostrarGrafico && (
            <div className={styles.chartsGrid}>
              <div className={styles.chartCard} style={{ flex: 1 }}>
                <h3 className={styles.chartTitle}>Consumo Total de Geradores</h3>
                <div className={styles.statsContainer}>
                  <p className={styles.statsLabel}>Total Abastecido</p>
                  <p className={styles.statsValue}>
                    {totalLitros.toFixed(2)} L
                  </p>
                  <p className={styles.statsSubLabel}>Considerando todos os geradores filtrados no período</p>
                </div>
              </div>

              <div className={styles.chartCard} style={{ flex: 2 }}>
                <h3 className={styles.chartTitle}>Comparativo de Abastecimentos Recentes</h3>
                <div className={styles.chartWrapper}>
                  {dadosGrafico.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dadosGrafico} margin={{ top: 20, right: 30, left: 0, bottom: 25 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" />
                        <YAxis />
                        <RechartsTooltip cursor={{ fill: 'transparent' }} formatter={(value) => `${value.toFixed(2)} L`} />
                        <Legend verticalAlign="top" height={36} />
                        <Bar dataKey="antepenultimo" name="3º Último Abast." fill="#ef4444" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="penultimo" name="Penúltimo Abast." fill="#f97316" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="ultimo" name="Último Abast." fill="#22c55e" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className={styles.emptyState}>Sem dados de consumo.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          <RelatorioAnaliticoGeradores />
        </>
      )}

      {ReactDOM.createPortal(
        <ModalCadastroGerador 
          isOpen={modalCadastroAberto}
          onClose={() => setModalCadastroAberto(false)}
          onSave={(geradorSalvo) => {
            console.log('Gerador Salvo', geradorSalvo);
          }}
        />,
        document.body
      )}

    </div>
  );
};

export default RelatorioGeradores;
