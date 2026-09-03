import React, { useState, useEffect, useMemo } from 'react';
import { History, Calendar, Droplets, TrendingUp, DollarSign } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import styles from './index.module.css';

const HistoricoCombustivel = () => {
  const [entradas, setEntradas] = useState([]);
  const [saidas, setSaidas] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [periodo, setPeriodo] = useState('6M'); // '7D', '15D', '1M', '6M', '1A', 'TUDO'

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [resEntradas, resSaidas] = await Promise.all([
          fetch(`/api/combustivel/entradas`),
          fetch(`/api/combustivel`)
        ]);

        const dataEntradas = await resEntradas.json();
        const dataSaidas = await resSaidas.json();

        setEntradas(dataEntradas);
        setSaidas(dataSaidas);
      } catch (error) {
        console.error("Erro ao buscar dados históricos:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const isDailyGroup = ['7D', '15D', '1M'].includes(periodo);

  // Formatação de data auxiliar (Dinâmico: Dia/Mês ou Mês/Ano)
  const formatPeriodKey = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    if (isNaN(date)) return null;

    if (isDailyGroup) {
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    }
    return date.toLocaleString('pt-BR', { month: 'short', year: '2-digit' });
  };

  const getFiltroData = () => {
    const hoje = new Date();
    if (periodo === '7D') return new Date(hoje.setDate(hoje.getDate() - 7));
    if (periodo === '15D') return new Date(hoje.setDate(hoje.getDate() - 15));
    if (periodo === '1M') return new Date(hoje.setMonth(hoje.getMonth() - 1));
    if (periodo === '6M') return new Date(hoje.setMonth(hoje.getMonth() - 6));
    if (periodo === '1A') return new Date(hoje.setFullYear(hoje.getFullYear() - 1));
    return new Date('2000-01-01'); // 'TUDO'
  };

  const dataLimite = useMemo(() => getFiltroData(), [periodo]);

  // CÁLCULOS HISTÓRICOS
  const historicoData = useMemo(() => {
    const meses = {};

    // Processar Entradas (Compras e Preço Médio)
    entradas.forEach(ent => {
      if (ent.situacao === 'AGUARDANDO COMBUSTIVEL' || !ent.data) return;

      const d = new Date(ent.data);
      if (d < dataLimite) return;

      const keyAno = formatPeriodKey(ent.data);
      if (!keyAno) return;

      // Ignora transferências internas nas compras
      const isTransfer = ent.notaFiscal && ent.notaFiscal.toUpperCase().startsWith('TRANSF-');
      if (isTransfer) return;

      if (!meses[keyAno]) {
        meses[keyAno] = { mes: keyAno, timestamp: d.getTime(), ConsumoL: 0, GastoR$: 0, QtdCompras: 0, PrecoSoma: 0 };
      }

      if (ent.valorTotal) {
        meses[keyAno].GastoR$ += parseFloat(ent.valorTotal) || 0;
      }
      if (ent.valorUn) {
        meses[keyAno].PrecoSoma += parseFloat(ent.valorUn) || 0;
        meses[keyAno].QtdCompras += 1;
      }
    });

    // Processar Saídas (Consumo Efetivo)
    saidas.forEach(sai => {
      if (sai.status !== 'CONCLUÍDO' && sai.status !== 'ABASTECIDA') return;
      const dataReq = sai.data_hora ? sai.data_hora.split('T')[0] : null;
      if (!dataReq) return;

      const d = new Date(dataReq);
      if (isNaN(d) || d < dataLimite) return;

      const keyAno = formatPeriodKey(dataReq);
      if (!keyAno) return;

      // Ignora saídas que são movimentações internas (Descarte, Transferência)
      const placa = sai.veiculo ? sai.veiculo.toUpperCase() : '';
      const isTransf = sai.numeroRequisicao && sai.numeroRequisicao.toUpperCase().startsWith('TRANSF-');
      const isInternal = isTransf || placa === 'DESCARTE' || placa.includes('RESERVATÓRIO');
      if (isInternal) return;

      if (!meses[keyAno]) {
        meses[keyAno] = { mes: keyAno, timestamp: d.getTime(), ConsumoL: 0, GastoR$: 0, QtdCompras: 0, PrecoSoma: 0 };
      }

      meses[keyAno].ConsumoL += parseFloat(sai.qtde) || 0;
    });

    // Transformar em array e ordenar cronologicamente
    return Object.values(meses)
      .sort((a, b) => a.timestamp - b.timestamp)
      .map(m => ({
        mes: m.mes,
        'Consumo (L)': m.ConsumoL,
        'Gasto (R$)': m.GastoR$,
        'Preço Médio (R$)': m.QtdCompras > 0 ? (m.PrecoSoma / m.QtdCompras) : null
      }));

  }, [entradas, saidas, dataLimite]);

  // RANKING DE CAMINHÕES
  const rankingVeiculos = useMemo(() => {
    const ranking = {};

    saidas.forEach(sai => {
      if (sai.status !== 'CONCLUÍDO' && sai.status !== 'ABASTECIDA') return;
      if (!sai.veiculo) return;

      const dataReq = sai.data_hora ? sai.data_hora.split('T')[0] : null;
      if (dataReq) {
        const d = new Date(dataReq);
        if (!isNaN(d) && d < dataLimite) return;
      }

      const placa = sai.veiculo.toUpperCase();
      const isTransf = sai.numeroRequisicao && sai.numeroRequisicao.toUpperCase().startsWith('TRANSF-');
      const isInternal = isTransf || placa === 'DESCARTE' || placa.includes('RESERVATÓRIO');
      if (isInternal) return;

      if (!ranking[placa]) ranking[placa] = { placa, totalL: 0, totalR$: 0, abastecimentos: 0 };

      ranking[placa].totalL += parseFloat(sai.qtde) || 0;
      ranking[placa].totalR$ += parseFloat(sai.valorTotal) || 0;
      ranking[placa].abastecimentos += 1;
    });

    return Object.values(ranking)
      .sort((a, b) => b.totalL - a.totalL)
      .slice(0, 10); // Top 10
  }, [saidas, dataLimite]);

  // RESUMO DOS TOTAIS DO PERÍODO
  const totaisPeriodo = useMemo(() => {
    let litrosConsumidos = 0;
    let gastosCompras = 0;
    let somaPrecoUn = 0;
    let qtdCompras = 0;

    // Calcula Consumo
    historicoData.forEach(h => {
      litrosConsumidos += h['Consumo (L)'];
    });

    // Calcula Gastos e Média de Preço com base nas Entradas reais
    entradas.forEach(ent => {
      if (ent.situacao === 'AGUARDANDO COMBUSTIVEL' || !ent.data) return;
      const d = new Date(ent.data);
      if (d < dataLimite) return;

      const isTransfer = ent.notaFiscal && ent.notaFiscal.toUpperCase().startsWith('TRANSF-');
      if (isTransfer) return;

      if (ent.valorTotal) gastosCompras += parseFloat(ent.valorTotal) || 0;
      if (ent.valorUn) {
        somaPrecoUn += parseFloat(ent.valorUn) || 0;
        qtdCompras += 1;
      }
    });

    const mediaPreco = qtdCompras > 0 ? somaPrecoUn / qtdCompras : 0;

    return { litros: litrosConsumidos, gastos: gastosCompras, mediaPreco };
  }, [historicoData, entradas, dataLimite]);

  const formatMoeda = (valor) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleContainer} style={{ display: 'flex', alignItems: 'center' }}>
          <History size={24} style={{ marginRight: '8px', color: 'var(--cor-destaque)' }} />
          <h2 className={styles.title} style={{ margin: 0, padding: 0 }}>Histórico Combustível</h2>
        </div>
        <div className={styles.filterGroup}>
          <Calendar size={18} color="var(--cor-texto-secundario)" />
          <span className={styles.filterLabel}>Período:</span>
          <select
            className={styles.selectPeriodo}
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
          >
            <option value="7D">Últimos 7 Dias</option>
            <option value="15D">Últimos 15 Dias</option>
            <option value="1M">Último Mês</option>
            <option value="6M">Últimos 6 Meses</option>
            <option value="1A">Último Ano</option>
            <option value="TUDO">Todo o Histórico</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <p className={styles.loadingText}>Processando histórico de dados...</p>
      ) : (
        <>
          {/* Indicadores Principais */}
          <div className={styles.summaryGrid}>
            <div className={styles.summaryCard}>
              <div className={styles.iconWrapper} style={{ backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
                <Droplets size={24} />
              </div>
              <div className={styles.summaryInfo}>
                <span className={styles.summaryLabel}>Volume Total Abastecido</span>
                <span className={styles.summaryValue}>{totaisPeriodo.litros.toFixed(2)} L</span>
              </div>
            </div>
            <div className={styles.summaryCard}>
              <div className={styles.iconWrapper} style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
                <DollarSign size={24} />
              </div>
              <div className={styles.summaryInfo}>
                <span className={styles.summaryLabel}>Custo de Aquisição (Compras)</span>
                <span className={styles.summaryValue}>{formatMoeda(totaisPeriodo.gastos)}</span>
              </div>
            </div>
            <div className={styles.summaryCard}>
              <div className={styles.iconWrapper} style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                <TrendingUp size={24} />
              </div>
              <div className={styles.summaryInfo}>
                <span className={styles.summaryLabel}>Preço Médio por Litro</span>
                <span className={styles.summaryValue}>
                  {totaisPeriodo.mediaPreco > 0 ? formatMoeda(totaisPeriodo.mediaPreco) : 'R$ 0,00'}
                </span>
              </div>
            </div>
          </div>

          <div className={styles.chartsGrid}>
            {/* Gráfico Principal: Evolução */}
            <div className={styles.chartCard} style={{ display: 'flex', flexDirection: 'column' }}>
              <h3 className={styles.chartTitle}>{isDailyGroup ? 'Evolução Diária' : 'Evolução Mensal'}</h3>
              <div className={styles.chartContainer}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={historicoData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorConsumo" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorGasto" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--cor-borda-cartao)" />
                    <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--cor-texto-secundario)' }} dy={10} />
                    <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--cor-texto-secundario)' }} tickFormatter={(val) => `${val} L`} dx={-10} />
                    <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--cor-texto-secundario)' }} tickFormatter={(val) => `R$${val / 1000}k`} dx={10} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'var(--cor-fundo-cartao)', borderRadius: '8px', border: '1px solid var(--cor-borda-cartao)' }}
                      formatter={(value, name) => {
                        if (name === 'Gasto (R$)') return formatMoeda(value);
                        return `${value.toFixed(2)} L`;
                      }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Area yAxisId="left" type="monotone" dataKey="Consumo (L)" stroke="#3b82f6" fillOpacity={1} fill="url(#colorConsumo)" strokeWidth={3} />
                    <Area yAxisId="right" type="monotone" dataKey="Gasto (R$)" stroke="#ef4444" fillOpacity={1} fill="url(#colorGasto)" strokeWidth={3} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Ranking Lateral */}
            <div className={styles.chartCard}>
              <h3 className={styles.chartTitle}>Ranking por Veículos e Geradores</h3>
              <div className={styles.rankingContainer}>
                {rankingVeiculos.length > 0 ? (
                  rankingVeiculos.map((v, index) => {
                    let posClass = '';
                    if (index === 0) posClass = styles.pos1;
                    else if (index === 1) posClass = styles.pos2;
                    else if (index === 2) posClass = styles.pos3;

                    return (
                      <div key={v.placa} className={styles.rankingItem}>
                        <div className={`${styles.rankingPos} ${posClass}`}>{index + 1}º</div>
                        <div className={styles.rankingDetails}>
                          <span className={styles.rankingPlaca}>{v.placa}</span>
                          <span className={styles.rankingSubtitle}>{v.abastecimentos} abastecimentos</span>
                        </div>
                        <div className={styles.rankingValue}>
                          {v.totalL.toFixed(1)} L
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className={styles.loadingText}>Nenhum consumo no período.</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default HistoricoCombustivel;
