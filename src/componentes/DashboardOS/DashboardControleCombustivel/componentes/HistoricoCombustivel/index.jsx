import React, { useState, useEffect, useMemo } from 'react';
import {
  History, Calendar, Droplets, TrendingUp, DollarSign,
  Gauge, Award, AlertTriangle, Filter, Truck, Zap,
  ShieldAlert, Clock, ChevronRight, Info
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import styles from './index.module.css';

const HistoricoCombustivel = () => {
  // Controle de Permissão do Administrador
  const currentUser = useMemo(() => {
    try {
      const saved = localStorage.getItem('almoxarifado_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  }, []);
  const isAdmin = currentUser?.role === 'admin';

  // Estados de Dados
  const [entradas, setEntradas] = useState([]);
  const [saidas, setSaidas] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Estados de Filtros Avançados
  const [periodo, setPeriodo] = useState('6M'); // '7D', '15D', '1M', '6M', '1A', 'TUDO', 'CUSTOM'
  const [dataInicioCustom, setDataInicioCustom] = useState('');
  const [dataFimCustom, setDataFimCustom] = useState('');
  const [combustivelFiltro, setCombustivelFiltro] = useState('TODOS'); // 'TODOS', 'DIESEL', 'GASOLINA', 'ARLA REDUX'
  const [tipoOperacao, setTipoOperacao] = useState('TODOS'); // 'TODOS', 'FROTA', 'GERADORES'
  const [abaRanking, setAbaRanking] = useState('ECONOMICOS'); // 'ECONOMICOS' ou 'GASTOES'

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [resEntradas, resSaidas] = await Promise.all([
          fetch(`/api/combustivel/entradas`),
          fetch(`/api/combustivel`)
        ]);

        const dataEntradas = await resEntradas.json();
        const dataSaidas = await resSaidas.json();

        setEntradas(Array.isArray(dataEntradas) ? dataEntradas : []);
        setSaidas(Array.isArray(dataSaidas) ? dataSaidas : []);
      } catch (error) {
        console.error("Erro ao buscar dados históricos de combustível:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // Intervalo de Data Limite
  const { dataInicioEfetiva, dataFimEfetiva, isDailyGroup } = useMemo(() => {
    const hoje = new Date();
    let inicio = new Date('2000-01-01');
    let fim = new Date();

    if (periodo === 'CUSTOM') {
      if (dataInicioCustom) inicio = new Date(`${dataInicioCustom}T00:00:00`);
      if (dataFimCustom) fim = new Date(`${dataFimCustom}T23:59:59`);
      const diffDias = Math.round((fim - inicio) / (1000 * 60 * 60 * 24));
      return { dataInicioEfetiva: inicio, dataFimEfetiva: fim, isDailyGroup: diffDias <= 35 };
    }

    if (periodo === '7D') inicio = new Date(new Date().setDate(hoje.getDate() - 7));
    else if (periodo === '15D') inicio = new Date(new Date().setDate(hoje.getDate() - 15));
    else if (periodo === '1M') inicio = new Date(new Date().setMonth(hoje.getMonth() - 1));
    else if (periodo === '6M') inicio = new Date(new Date().setMonth(hoje.getMonth() - 6));
    else if (periodo === '1A') inicio = new Date(new Date().setFullYear(hoje.getFullYear() - 1));

    const isDaily = ['7D', '15D', '1M'].includes(periodo);
    return { dataInicioEfetiva: inicio, dataFimEfetiva: fim, isDailyGroup: isDaily };
  }, [periodo, dataInicioCustom, dataFimCustom]);

  // Formatação de data da chave do gráfico
  const formatPeriodKey = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString.includes('T') ? dateString : `${dateString}T12:00:00`);
    if (isNaN(date)) return null;

    if (isDailyGroup) {
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    }
    return date.toLocaleString('pt-BR', { month: 'short', year: '2-digit' });
  };

  // Helper para identificar Gerador / Granja
  const isGeradorItem = (veiculo) => {
    if (!veiculo) return false;
    const v = String(veiculo).toUpperCase();
    return v.includes('GERADOR') || v.includes('GRANJA') || v.startsWith('G. ');
  };

  // 1. Processamento e Cálculo Avançado de Eficiência por Veículo
  const {
    saidasProcessadas,
    veiculosEficiencia,
    anomaliasDetectadas,
    kpiGeralFrota
  } = useMemo(() => {
    // Agrupa saídas por placa/veículo
    const mapaVeiculos = new Map();

    saidas.forEach(sai => {
      if (sai.status === 'CANCELADO' || sai.status === 'CANCELADA') return;
      if (!sai.veiculo) return;

      const placa = String(sai.veiculo).toUpperCase().trim();
      const isTransf = sai.numeroRequisicao && String(sai.numeroRequisicao).toUpperCase().startsWith('TRANSF-');
      const isInternal = isTransf || placa === 'DESCARTE' || placa.includes('RESERVATÓRIO');
      if (isInternal) return;

      const dataStr = sai.data_hora || sai.data;
      if (!dataStr) return;
      const dataObj = new Date(dataStr.includes('T') ? dataStr : `${dataStr}T12:00:00`);
      if (isNaN(dataObj)) return;

      if (!mapaVeiculos.has(placa)) {
        mapaVeiculos.set(placa, []);
      }
      mapaVeiculos.get(placa).push({
        ...sai,
        dataObj,
        placa,
        litrosNum: parseFloat(sai.litros || sai.qtde || 0) || 0,
        kmNum: parseFloat(sai.km_abastecimento || sai.km || 0) || 0,
        valorTotalNum: parseFloat(sai.valorTotal || sai.valor_total || 0) || 0,
        combustivelNorm: String(sai.tipo_combustivel || sai.combustivel || 'DIESEL').toUpperCase().trim(),
        isGerador: isGeradorItem(placa)
      });
    });

    const todasSaidasProcessadas = [];
    const anomalias = [];
    const listaEficiencia = [];

    let totalLitrosPeriodo = 0;
    let totalKmRodadosPeriodo = 0;
    let totalLitrosComKmPeriodo = 0;
    let totalGastoPeriodo = 0;

    mapaVeiculos.forEach((abastecimentosDoVeiculo, placa) => {
      // Ordena cronologicamente para calcular rodagem entre abastecimentos
      abastecimentosDoVeiculo.sort((a, b) => a.dataObj.getTime() - b.dataObj.getTime());

      let somaKmDoVeiculo = 0;
      let somaLitrosDoVeiculo = 0;
      let somaGastoDoVeiculo = 0;
      let countAbastecimentosNoPeriodo = 0;
      const registrosNoPeriodo = [];
      const isGerador = abastecimentosDoVeiculo[0]?.isGerador;

      for (let i = 0; i < abastecimentosDoVeiculo.length; i++) {
        const atual = abastecimentosDoVeiculo[i];
        const anterior = i > 0 ? abastecimentosDoVeiculo[i - 1] : null;

        let diffOdometro = 0;
        let kmL = null;
        let litrosPorHora = null;

        if (anterior && atual.kmNum > anterior.kmNum && anterior.kmNum > 0 && atual.litrosNum > 0) {
          diffOdometro = atual.kmNum - anterior.kmNum;
          if (isGerador) {
            litrosPorHora = atual.litrosNum / diffOdometro; // L/H
          } else {
            kmL = diffOdometro / atual.litrosNum; // KM/L
          }
        }

        const itemProcessado = {
          ...atual,
          kmAnterior: anterior?.kmNum || null,
          diffOdometro,
          kmL,
          litrosPorHora
        };

        todasSaidasProcessadas.push(itemProcessado);

        // Verifica se este abastecimento está dentro do período e filtros selecionados
        const dentroPeriodo = atual.dataObj >= dataInicioEfetiva && atual.dataObj <= dataFimEfetiva;
        const matchCombustivel = combustivelFiltro === 'TODOS' || atual.combustivelNorm.includes(combustivelFiltro);
        const matchOperacao = tipoOperacao === 'TODOS' ||
          (tipoOperacao === 'FROTA' && !isGerador) ||
          (tipoOperacao === 'GERADORES' && isGerador);

        if (dentroPeriodo && matchCombustivel && matchOperacao) {
          countAbastecimentosNoPeriodo++;
          registrosNoPeriodo.push(itemProcessado);
          totalLitrosPeriodo += atual.litrosNum;
          totalGastoPeriodo += atual.valorTotalNum;

          if (diffOdometro > 0 && !isGerador && kmL && kmL >= 0.5 && kmL <= 20) {
            somaKmDoVeiculo += diffOdometro;
            somaLitrosDoVeiculo += atual.litrosNum;
            somaGastoDoVeiculo += atual.valorTotalNum;

            totalKmRodadosPeriodo += diffOdometro;
            totalLitrosComKmPeriodo += atual.litrosNum;
          } else if (diffOdometro > 0 && isGerador) {
            somaKmDoVeiculo += diffOdometro; // horas trabalhadas
            somaLitrosDoVeiculo += atual.litrosNum;
            somaGastoDoVeiculo += atual.valorTotalNum;
          }
        }
      }

      // Se teve abastecimentos válidos no período, compõe ranking do veículo
      if (registrosNoPeriodo.length > 0) {
        const mediaKmL = somaLitrosDoVeiculo > 0 && !isGerador ? (somaKmDoVeiculo / somaLitrosDoVeiculo) : null;
        const mediaLh = somaKmDoVeiculo > 0 && isGerador ? (somaLitrosDoVeiculo / somaKmDoVeiculo) : null;
        const custoKm = somaKmDoVeiculo > 0 ? (somaGastoDoVeiculo / somaKmDoVeiculo) : null;

        listaEficiencia.push({
          placa,
          isGerador,
          modelo: registrosNoPeriodo[0]?.modelo || '',
          totalLitros: registrosNoPeriodo.reduce((acc, r) => acc + r.litrosNum, 0),
          totalGasto: registrosNoPeriodo.reduce((acc, r) => acc + r.valorTotalNum, 0),
          totalKm: somaKmDoVeiculo,
          abastecimentos: countAbastecimentosNoPeriodo,
          mediaKmL,
          mediaLh,
          custoKm,
          registros: registrosNoPeriodo
        });

        // 2. DETECTOR DE ANOMALIAS NO PERÍODO (Focado em Eficiência e Reabastecimento Rápido)
        registrosNoPeriodo.forEach((reg, idx) => {
          // Anomalia A: Queda drástica de rendimento em relação à média habitual do veículo (> 35% de queda)
          if (!isGerador && mediaKmL && reg.kmL && reg.kmL < (mediaKmL * 0.65) && reg.kmL > 0) {
            anomalias.push({
              id: `${reg.id || reg.placa}-${idx}-queda`,
              data: reg.dataObj,
              placa,
              motorista: reg.motorista || '-',
              tipo: 'QUEDA_RENDIMENTO',
              titulo: 'Rendimento Abaixo do Habitual',
              descricao: `Fez ${reg.kmL.toFixed(2)} km/l neste abastecimento (Média do veículo: ${mediaKmL.toFixed(2)} km/l)`,
              litros: reg.litrosNum,
              severidade: 'alerta'
            });
          }

          // Anomalia B: Múltiplos abastecimentos na mesma data para o mesmo veículo
          const outrosNoMesmoDia = registrosNoPeriodo.filter(other =>
            other !== reg &&
            other.dataObj.toISOString().split('T')[0] === reg.dataObj.toISOString().split('T')[0]
          );

          if (outrosNoMesmoDia.length > 0 && idx > 0) {
            const jaAdicionouHoje = anomalias.find(a =>
              a.placa === placa &&
              a.tipo === 'MULTI_ABASTECIMENTO' &&
              a.data.toISOString().split('T')[0] === reg.dataObj.toISOString().split('T')[0]
            );

            if (!jaAdicionouHoje) {
              const somaLitrosDia = [reg, ...outrosNoMesmoDia].reduce((acc, x) => acc + x.litrosNum, 0);
              anomalias.push({
                id: `${reg.id || reg.placa}-${idx}-multi`,
                data: reg.dataObj,
                placa,
                motorista: reg.motorista || '-',
                tipo: 'MULTI_ABASTECIMENTO',
                titulo: 'Múltiplos Abastecimentos no Dia',
                descricao: `${outrosNoMesmoDia.length + 1} abastecimentos registrados na mesma data (Total: ${somaLitrosDia.toFixed(1)} L)`,
                litros: somaLitrosDia,
                severidade: 'atencao'
              });
            }
          }
        });
      }
    });

    // Média Geral Ponderada da Frota
    const mediaGeralFrotaKmL = totalLitrosComKmPeriodo > 0 ? (totalKmRodadosPeriodo / totalLitrosComKmPeriodo) : 0;
    const custoGeralPorKm = totalKmRodadosPeriodo > 0 ? (totalGastoPeriodo / totalKmRodadosPeriodo) : 0;

    return {
      saidasProcessadas: todasSaidasProcessadas,
      veiculosEficiencia: listaEficiencia,
      anomaliasDetectadas: anomalias.sort((a, b) => b.data.getTime() - a.data.getTime()),
      kpiGeralFrota: {
        totalLitros: totalLitrosPeriodo,
        totalKmRodados: totalKmRodadosPeriodo,
        mediaGeralKmL: mediaGeralFrotaKmL,
        custoMedioKm: custoGeralPorKm,
        totalGasto: totalGastoPeriodo
      }
    };
  }, [saidas, dataInicioEfetiva, dataFimEfetiva, combustivelFiltro, tipoOperacao]);

  // 2. Preço Médio de Aquisição (Compras no Período)
  const precoMedioAquisicao = useMemo(() => {
    let gastoTotalCompras = 0;
    let litrosTotaisCompras = 0;

    entradas.forEach(ent => {
      if (ent.situacao === 'AGUARDANDO COMBUSTIVEL' || !ent.data) return;

      const d = new Date(ent.data.includes('T') ? ent.data : `${ent.data}T12:00:00`);
      if (isNaN(d) || d < dataInicioEfetiva || d > dataFimEfetiva) return;

      const isTransfer = ent.notaFiscal && String(ent.notaFiscal).toUpperCase().startsWith('TRANSF-');
      if (isTransfer) return;

      const produtoNorm = String(ent.produto || ent.tipo_combustivel || '').toUpperCase();
      if (combustivelFiltro !== 'TODOS' && !produtoNorm.includes(combustivelFiltro)) return;

      const qtd = parseFloat(ent.quantidade || ent.quantidade_litros || 0) || 0;
      const valorTot = parseFloat(ent.valorTotal || ent.valor_total || 0) || 0;

      if (qtd > 0 && valorTot > 0) {
        litrosTotaisCompras += qtd;
        gastoTotalCompras += valorTot;
      }
    });

    return litrosTotaisCompras > 0 ? (gastoTotalCompras / litrosTotaisCompras) : 0;
  }, [entradas, dataInicioEfetiva, dataFimEfetiva, combustivelFiltro]);

  // 3. Dados do Gráfico de Evolução ao Longo do Tempo
  const historicoGrafico = useMemo(() => {
    const agrupaPeriodos = {};

    saidasProcessadas.forEach(sai => {
      if (sai.dataObj < dataInicioEfetiva || sai.dataObj > dataFimEfetiva) return;
      if (combustivelFiltro !== 'TODOS' && !sai.combustivelNorm.includes(combustivelFiltro)) return;

      const key = formatPeriodKey(sai.data_hora || sai.data);
      if (!key) return;

      if (!agrupaPeriodos[key]) {
        agrupaPeriodos[key] = {
          chave: key,
          timestamp: sai.dataObj.getTime(),
          consumoL: 0,
          gastoR$: 0,
          somaKm: 0,
          somaLitrosComKm: 0
        };
      }

      agrupaPeriodos[key].consumoL += sai.litrosNum;
      agrupaPeriodos[key].gastoR$ += sai.valorTotalNum;

      if (sai.diffOdometro > 0 && !sai.isGerador && sai.kmL && sai.kmL >= 0.5 && sai.kmL <= 20) {
        agrupaPeriodos[key].somaKm += sai.diffOdometro;
        agrupaPeriodos[key].somaLitrosComKm += sai.litrosNum;
      }
    });

    return Object.values(agrupaPeriodos)
      .sort((a, b) => a.timestamp - b.timestamp)
      .map(item => ({
        periodo: item.chave,
        'Consumo (L)': parseFloat(item.consumoL.toFixed(1)),
        'Média Frota (KM/L)': item.somaLitrosComKm > 0 ? parseFloat((item.somaKm / item.somaLitrosComKm).toFixed(2)) : null,
        'Gasto (R$)': parseFloat(item.gastoR$.toFixed(2))
      }));
  }, [saidasProcessadas, dataInicioEfetiva, dataFimEfetiva, combustivelFiltro, isDailyGroup]);

  // 4. Rankings de Veículos (Mais Econômicos vs. Mais Gastões)
  const { topEconomicos, topGastoes } = useMemo(() => {
    // Apenas veículos terrestres com média calculada
    const apenasVeiculos = veiculosEficiencia.filter(v => !v.isGerador && v.mediaKmL && v.mediaKmL > 0);

    const ordenadosMaior = [...apenasVeiculos].sort((a, b) => b.mediaKmL - a.mediaKmL);
    const ordenadosMenor = [...apenasVeiculos].sort((a, b) => a.mediaKmL - b.mediaKmL);

    return {
      topEconomicos: ordenadosMaior.slice(0, 6),
      topGastoes: ordenadosMenor.slice(0, 6)
    };
  }, [veiculosEficiencia]);

  const formatMoeda = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

  return (
    <div className={styles.container}>
      {/* Cabeçalho e Barra de Filtros Avançados */}
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <div className={styles.titleContainer}>
            <History size={26} color="var(--cor-destaque)" />
            <div>
              <h2 className={styles.title}>Histórico & Inteligência de Frota</h2>
              <span className={styles.subtitle}>Análise de telemetria, eficiência de consumo e auditoria de abastecimentos</span>
            </div>
          </div>

          {/* Botões de Período Rápido */}
          <div className={styles.periodoButtons}>
            {['7D', '15D', '1M', '6M', '1A', 'TUDO'].map(p => (
              <button
                key={p}
                type="button"
                className={`${styles.btnPeriodo} ${periodo === p ? styles.btnPeriodoActive : ''}`}
                onClick={() => setPeriodo(p)}
              >
                {p === '7D' ? '7 Dias' : p === '15D' ? '15 Dias' : p === '1M' ? '1 Mês' : p === '6M' ? '6 Meses' : p === '1A' ? '1 Ano' : 'Tudo'}
              </button>
            ))}
            <button
              type="button"
              className={`${styles.btnPeriodo} ${periodo === 'CUSTOM' ? styles.btnPeriodoActive : ''}`}
              onClick={() => setPeriodo('CUSTOM')}
            >
              Personalizado
            </button>
          </div>
        </div>

        {/* Linha de Filtros Secundários */}
        <div className={styles.filterBar}>
          <div className={styles.filterLeftGroup}>
            {/* Filtro de Combustível */}
            <div className={styles.filterItem}>
              <Droplets size={15} color="var(--cor-destaque)" />
              <span className={styles.filterLabel}>Combustível:</span>
              <select
                className={styles.selectFiltro}
                value={combustivelFiltro}
                onChange={(e) => setCombustivelFiltro(e.target.value)}
              >
                <option value="TODOS">Todos os Tipos</option>
                <option value="DIESEL">Diesel</option>
                <option value="GASOLINA">Gasolina</option>
                <option value="ARLA">Arla Redux</option>
              </select>
            </div>

            {/* Filtro de Operação */}
            <div className={styles.filterItem}>
              <Truck size={15} color="var(--cor-destaque)" />
              <span className={styles.filterLabel}>Operação:</span>
              <select
                className={styles.selectFiltro}
                value={tipoOperacao}
                onChange={(e) => setTipoOperacao(e.target.value)}
              >
                <option value="TODOS">Toda a Frota</option>
                <option value="FROTA">Apenas Veículos / Caminhões</option>
                <option value="GERADORES">Apenas Geradores / Granjas</option>
              </select>
            </div>
          </div>

          {/* Intervalo Customizado de Datas */}
          {periodo === 'CUSTOM' && (
            <div className={styles.dateRangeGroup}>
              <Calendar size={15} />
              <span>De:</span>
              <input
                type="date"
                className={styles.dateInput}
                value={dataInicioCustom}
                onChange={(e) => setDataInicioCustom(e.target.value)}
              />
              <span>Até:</span>
              <input
                type="date"
                className={styles.dateInput}
                value={dataFimCustom}
                onChange={(e) => setDataFimCustom(e.target.value)}
              />
            </div>
          )}
        </div>
      </div>

      {isLoading ? (
        <p className={styles.loadingText}>Processando métricas e telemetria da frota...</p>
      ) : (
        <>
          {/* Linha de KPIs no Topo */}
          <div className={styles.summaryGrid}>
            {/* 1. Volume Total Abastecido */}
            <div className={styles.summaryCard}>
              <div className={styles.iconWrapper} style={{ backgroundColor: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6' }}>
                <Droplets size={24} />
              </div>
              <div className={styles.summaryInfo}>
                <div className={styles.summaryLabelRow}>
                  <span className={styles.summaryLabel}>Volume Total Abastecido</span>
                  <div className={styles.tooltipWrapper}>
                    <Info size={14} className={styles.infoIcon} />
                    <div className={styles.tooltipBox}>
                      <strong>Volume Total Abastecido</strong>
                      <p>Soma total de litros de combustível consumidos pela frota e equipamentos no período selecionado.</p>
                      <span>Km monitorados: distância auditada e comprovada entre odômetros de abastecimentos consecutivos.</span>
                    </div>
                  </div>
                </div>
                <span className={styles.summaryValue}>
                  {kpiGeralFrota.totalLitros.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} L
                </span>
                <span className={styles.summarySubtext}>
                  {kpiGeralFrota.totalKmRodados > 0 ? `${kpiGeralFrota.totalKmRodados.toLocaleString('pt-BR')} km monitorados` : 'Consumo registrado'}
                </span>
              </div>
            </div>

            {/* 2. Média Geral da Frota (KM/L) */}
            <div className={styles.summaryCard}>
              <div className={styles.iconWrapper} style={{ backgroundColor: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}>
                <Gauge size={24} />
              </div>
              <div className={styles.summaryInfo}>
                <div className={styles.summaryLabelRow}>
                  <span className={styles.summaryLabel}>Média Geral da Frota</span>
                  <div className={styles.tooltipWrapper}>
                    <Info size={14} className={styles.infoIcon} />
                    <div className={styles.tooltipBox}>
                      <strong>Média Geral da Frota (KM/L)</strong>
                      <p>Eficiência média ponderada de rodagem. Mede quantos quilômetros os veículos rodam para cada litro consumido.</p>
                      <span>Fórmula: KM Total Rodado comprovado ÷ Litros consumidos em trajetos rastreados.</span>
                    </div>
                  </div>
                </div>
                <span className={styles.summaryValue}>
                  {kpiGeralFrota.mediaGeralKmL > 0 ? `${kpiGeralFrota.mediaGeralKmL.toFixed(2)} KM/L` : '-'}
                </span>
                <span className={styles.summarySubtext}>Eficiência média de rodagem</span>
              </div>
            </div>

            {/* 3. Custo Médio por KM (Exclusivo Admin) */}
            {isAdmin && (
              <div className={styles.summaryCard}>
                <div className={styles.iconWrapper} style={{ backgroundColor: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}>
                  <TrendingUp size={24} />
                </div>
                <div className={styles.summaryInfo}>
                  <div className={styles.summaryLabelRow}>
                    <span className={styles.summaryLabel}>Custo Médio por KM</span>
                    <div className={styles.tooltipWrapper}>
                      <Info size={14} className={styles.infoIcon} />
                      <div className={styles.tooltipBox}>
                        <strong>Custo Médio por KM (R$/KM)</strong>
                        <p>Custo financeiro direto de combustível para a frota percorrer cada quilômetro nas operações.</p>
                        <span>Reflete o custo integral da operação (inclui deslocamento e tomada de força / basculamento).</span>
                      </div>
                    </div>
                  </div>
                  <span className={styles.summaryValue}>
                    {kpiGeralFrota.custoMedioKm > 0 ? formatMoeda(kpiGeralFrota.custoMedioKm) : 'R$ 0,00'}/km
                  </span>
                  <span className={styles.summarySubtext}>Total gasto: {formatMoeda(kpiGeralFrota.totalGasto)}</span>
                </div>
              </div>
            )}

            {/* 4. Preço Médio de Aquisição (Exclusivo Admin) */}
            {isAdmin && (
              <div className={styles.summaryCard}>
                <div className={styles.iconWrapper} style={{ backgroundColor: 'rgba(139, 92, 246, 0.12)', color: '#8b5cf6' }}>
                  <DollarSign size={24} />
                </div>
                <div className={styles.summaryInfo}>
                  <div className={styles.summaryLabelRow}>
                    <span className={styles.summaryLabel}>Preço Médio Aquisição</span>
                    <div className={styles.tooltipWrapper}>
                      <Info size={14} className={styles.infoIcon} />
                      <div className={styles.tooltipBox}>
                        <strong>Preço Médio de Aquisição (R$/L)</strong>
                        <p>Preço médio unitário pago na compra de combustível no atacado para estocar nos tanques próprios.</p>
                        <span>Fórmula: Valor Total Financeiro das NFs de Entrada ÷ Volume Total Adquirido (L).</span>
                      </div>
                    </div>
                  </div>
                  <span className={styles.summaryValue}>
                    {precoMedioAquisicao > 0 ? formatMoeda(precoMedioAquisicao) : 'R$ 0,00'}/L
                  </span>
                  <span className={styles.summarySubtext}>Média de compra em tanques</span>
                </div>
              </div>
            )}
          </div>

          {/* Painel Central: Gráfico de Eficiência vs. Rankings */}
          <div className={styles.mainContentGrid}>
            {/* Gráfico de Evolução e Eficiência */}
            <div className={styles.cardSection}>
              <div className={styles.sectionHeader}>
                <h3 className={styles.sectionTitle}>
                  <TrendingUp size={18} color="var(--cor-destaque)" />
                  {isDailyGroup ? 'Evolução Diária de Consumo & Eficiência' : 'Evolução Mensal de Consumo & Eficiência'}
                </h3>
              </div>

              <div className={styles.chartContainer}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={historicoGrafico} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorConsumoHistorico" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorGastoHistorico" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--cor-borda-cartao)" />
                    <XAxis
                      dataKey="periodo"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: 'var(--cor-texto-secundario)' }}
                      dy={8}
                    />
                    <YAxis
                      yAxisId="left"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: 'var(--cor-texto-secundario)' }}
                      tickFormatter={(val) => `${val} L`}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: 'var(--cor-texto-secundario)' }}
                      tickFormatter={(val) => `${val} km/l`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--cor-fundo-cartao)',
                        borderRadius: '8px',
                        border: '1px solid var(--cor-borda-cartao)',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                      }}
                      formatter={(value, name) => {
                        if (name === 'Gasto (R$)') return formatMoeda(value);
                        if (name === 'Média Frota (KM/L)') return `${Number(value).toFixed(2)} KM/L`;
                        return `${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 1 })} L`;
                      }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '15px' }} />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="Consumo (L)"
                      stroke="#3b82f6"
                      fillOpacity={1}
                      fill="url(#colorConsumoHistorico)"
                      strokeWidth={2.5}
                    />
                    <Area
                      yAxisId="right"
                      type="monotone"
                      dataKey="Média Frota (KM/L)"
                      stroke="#10b981"
                      fill="none"
                      strokeWidth={3}
                      dot={{ r: 4, fill: '#10b981' }}
                    />
                    {isAdmin && (
                      <Area
                        yAxisId="left"
                        type="monotone"
                        dataKey="Gasto (R$)"
                        stroke="#ef4444"
                        fillOpacity={0.4}
                        fill="url(#colorGastoHistorico)"
                        strokeWidth={1.5}
                        strokeDasharray="4 4"
                      />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Ranking de Eficiência da Frota */}
            <div className={styles.cardSection}>
              <div className={styles.sectionHeader}>
                <h3 className={styles.sectionTitle}>
                  <Award size={18} color="var(--cor-destaque)" />
                  Ranking de Eficiência da Frota
                </h3>

                {/* Alternador de Abas de Ranking */}
                <div className={styles.rankingTabs}>
                  <button
                    type="button"
                    className={`${styles.rankingTabBtn} ${abaRanking === 'ECONOMICOS' ? styles.rankingTabBtnActiveGreen : ''}`}
                    onClick={() => setAbaRanking('ECONOMICOS')}
                  >
                    <Award size={14} /> Mais Econômicos
                  </button>
                  <button
                    type="button"
                    className={`${styles.rankingTabBtn} ${abaRanking === 'GASTOES' ? styles.rankingTabBtnActiveAmber : ''}`}
                    onClick={() => setAbaRanking('GASTOES')}
                  >
                    <AlertTriangle size={14} /> Menor Autonomia
                  </button>
                </div>
              </div>

              {/* Lista dos Veículos */}
              <div className={styles.rankingList}>
                {(() => {
                  const listaExibicao = abaRanking === 'ECONOMICOS' ? topEconomicos : topGastoes;

                  if (listaExibicao.length === 0) {
                    return (
                      <p className={styles.emptyStateText}>
                        Nenhum dado de rodagem/KM suficiente no período para calcular o ranking.
                      </p>
                    );
                  }

                  return listaExibicao.map((v, idx) => (
                    <div key={v.placa} className={styles.rankingRow}>
                      <div className={styles.rankingRowLeft}>
                        <div className={`${styles.rankingPosition} ${abaRanking === 'ECONOMICOS' ? styles.posEcon : styles.posAlerta}`}>
                          {idx + 1}º
                        </div>
                        <div className={styles.rankingInfo}>
                          <span className={styles.rankingPlaca}>{v.placa}</span>
                          <span className={styles.rankingMeta}>
                            {v.modelo || 'Veículo'} • {v.abastecimentos} abastecimento(s) • {v.totalLitros.toFixed(0)} L
                          </span>
                        </div>
                      </div>

                      <div className={styles.rankingRowRight}>
                        <span className={`${styles.badgeMedia} ${abaRanking === 'ECONOMICOS' ? styles.badgeMediaEcon : styles.badgeMediaAlerta}`}>
                          <Gauge size={13} />
                          {v.mediaKmL.toFixed(2)} KM/L
                        </span>
                        {isAdmin && v.custoKm && (
                          <span className={styles.rankingCustoKm}>
                            {formatMoeda(v.custoKm)}/km
                          </span>
                        )}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>

          {/* Tabela de Auditoria e Alertas de Anomalias */}
          <div className={styles.anomaliasCard}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>
                <ShieldAlert size={19} color="#ef4444" />
                Auditoria de Anomalias & Inconsistências de Consumo
                <div className={styles.tooltipWrapper}>
                  <Info size={15} className={styles.infoIcon} />
                  <div className={`${styles.tooltipBox} ${styles.tooltipBoxWide}`}>
                    <strong>Auditoria de Anomalias & Telemetria</strong>
                    <p>Varredura inteligente nos registros para identificar desvios operacionais que exigem atenção da gestão:</p>
                    <span>
                      • <strong>Queda Crítica de Rendimento:</strong> O veículo rendeu mais de 35% abaixo da sua média histórica (alerta de possível vazamento, avaria mecânica, excesso de marcha lenta/tomada de força ou desvio).<br />
                      • <strong>Reabastecimento no Mesmo Dia:</strong> Mais de um abastecimento lançado para o mesmo veículo na mesma data (alerta de duplicidade de lançamento ou desvio de rota).<br />
                      <em>*Nota: Divergências de odômetro foram desabilitadas para permitir lançamentos de O.S. retroativas sem gerar alarmes indevidos.</em>
                    </span>
                  </div>
                </div>
              </h3>
              <span className={styles.subtitle}>
                {anomaliasDetectadas.length === 0
                  ? 'Nenhuma anomalia crítica encontrada no período'
                  : `${anomaliasDetectadas.length} apontamento(s) que exigem atenção da gestão`}
              </span>
            </div>

            {anomaliasDetectadas.length === 0 ? (
              <p className={styles.emptyStateText}>
                ✅ Todos os abastecimentos dentro dos padrões normais de rendimento e consumo.
              </p>
            ) : (
              <div className={styles.tableAnomaliasWrapper}>
                <table className={styles.tableAnomalias}>
                  <thead>
                    <tr>
                      <th style={{ width: '12%' }}>Data</th>
                      <th style={{ width: '15%' }}>Veículo / Placa</th>
                      <th style={{ width: '18%' }}>Motorista</th>
                      <th style={{ width: '22%' }}>Tipo de Alerta</th>
                      <th style={{ width: '23%' }}>Diagnóstico Operacional</th>
                      <th style={{ width: '10%', textAlign: 'right' }}>Litros</th>
                    </tr>
                  </thead>
                  <tbody>
                    {anomaliasDetectadas.map((a) => (
                      <tr key={a.id}>
                        <td>{a.data.toLocaleDateString('pt-BR')}</td>
                        <td style={{ fontWeight: 'bold' }}>{a.placa}</td>
                        <td>{a.motorista}</td>
                        <td>
                          <span className={`${styles.badgeAnomalia} ${a.severidade === 'grave' ? styles.badgeAnomaliaGrave : styles.badgeAnomaliaAlerta}`}>
                            {a.tipo === 'QUEDA_RENDIMENTO' ? (
                              <>
                                <AlertTriangle size={12} /> Queda de Rendimento
                              </>
                            ) : (
                              <>
                                <Clock size={12} /> Reabastecimento Rápido
                              </>
                            )}
                          </span>
                        </td>
                        <td>{a.descricao}</td>
                        <td style={{ textAlign: 'right', fontWeight: 'bold', color: 'var(--cor-destaque)' }}>
                          {a.litros.toFixed(1)} L
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default HistoricoCombustivel;
