import React, { useState, useEffect, useMemo } from 'react';
import styles from './index.module.css';

export default function RelatorioAnaliticoGeradores() {
  const [geradores, setGeradores] = useState([]);
  const [combustivel, setCombustivel] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      fetch(`/api/geradores`).then(res => res.json()),
      fetch(`/api/combustivel`).then(res => res.json())
    ])
      .then(([dadosGeradores, dadosCombustivel]) => {
        setGeradores(dadosGeradores);
        setCombustivel(dadosCombustivel);
      })
      .catch(err => console.error('Erro ao buscar dados:', err))
      .finally(() => setIsLoading(false));
  }, []);

  const dadosPlanilha = useMemo(() => {
    return geradores.map(gerador => {
      // Filtrar todas as requisições que foram abastecidas na granja desse gerador
      const requisicoesDaGranja = combustivel.filter(req => 
        req.veiculo === gerador.granja && 
        (req.status === 'CONCLUÍDO' || req.status === 'ABASTECIDA')
      );

      // Somar total de litros
      const totalLitros = requisicoesDaGranja.reduce((acc, curr) => acc + (parseFloat(curr.qtde) || 0), 0);

      // Calcular horas trabalhadas
      const hrInicial = parseFloat(gerador.horimetroInicial) || 0;
      const hrAtual = parseFloat(gerador.horimetroAtual) || 0;
      const horasTrabalhadas = Math.max(0, hrAtual - hrInicial);

      // Calcular Média (L/h)
      const media = horasTrabalhadas > 0 ? (totalLitros / horasTrabalhadas) : 0;

      return {
        ...gerador,
        totalLitros,
        horasTrabalhadas,
        media
      };
    });
  }, [geradores, combustivel]);

  return (
    <div className={styles.tableSection}>
      <div className={styles.tableHeader}>
        <h3 className={`${styles.chartTitle} ${styles.tableTitle}`}>Relatório Analítico de Geradores</h3>
      </div>
      <div className={styles.tableWrapper}>
        <div className={styles.p20}>
          {isLoading ? (
            <p>Carregando dados da planilha...</p>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Granja Associada</th>
                    <th>Marca</th>
                    <th className={styles.textRight}>Hor. Inicial</th>
                    <th className={styles.textRight}>Hor. Atual</th>
                    <th className={styles.textRight}>Total (L)</th>
                    <th className={styles.textRight}>Média (L/h)</th>
                  </tr>
                </thead>
                <tbody>
                  {dadosPlanilha.length > 0 ? (
                    dadosPlanilha.map(linha => (
                      <tr key={linha.id} className={styles.tableRow}>
                        <td className={styles.textBold}>{linha.granja}</td>
                        <td>{linha.marca || '-'}</td>
                        <td className={styles.textRight}>{linha.horimetroInicial}</td>
                        <td className={`${styles.textRight} ${styles.textBold}`}>{linha.horimetroAtual}</td>
                        <td className={`${styles.textRight} ${styles.textBold} ${styles.textPrimary}`}>
                          {linha.totalLitros.toFixed(2)} L
                        </td>
                        <td className={`${styles.textRight} ${styles.textBold} ${styles.textWarning}`}>
                          {linha.media.toFixed(2)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className={`${styles.textCenter} ${styles.p20}`}>
                        Nenhum gerador cadastrado para análise.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
