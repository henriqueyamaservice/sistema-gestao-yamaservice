import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Database, TrendingUp, AlertCircle, Download, Edit, X, Search, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import styles from './index.module.css';
import FormularioEntradaEstoque from '../FormularioEntradaEstoque';
import FormularioTransferencia from '../FormularioTransferencia';
const CORES = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const EstoqueCombustivel = () => {
  const [entradas, setEntradas] = useState([]);
  const [saidas, setSaidas] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showTransferenciaModal, setShowTransferenciaModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [editandoSituacao, setEditandoSituacao] = useState(null);
  const [tipoRelatorio, setTipoRelatorio] = useState('entradas');

  // Estados de Filtro
  const [searchTerm, setSearchTerm] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [resEntradas, resSaidas] = await Promise.all([
        fetch('http://localhost:3000/api/combustivel/entradas'),
        fetch('http://localhost:3000/api/combustivel')
      ]);

      const dataEntradas = await resEntradas.json();
      const dataSaidas = await resSaidas.json();

      setEntradas(dataEntradas);
      setSaidas(dataSaidas);
    } catch (error) {
      console.error("Erro ao buscar dados de estoque:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddEntrada = (nova) => {
    setEntradas(prev => [...prev, nova]);
  };

  const handleUpdateSituacaoForcada = async (id, novaSituacao) => {
    try {
      const response = await fetch(`http://localhost:3000/api/combustivel/entradas/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ situacaoForcada: novaSituacao })
      });
      if (response.ok) {
        const result = await response.json();
        setEntradas(prev => prev.map(e => e.id === id ? result.entrada : e));
        setEditandoSituacao(null);
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao atualizar situação.');
    }
  };

  const entradasComFIFO = useMemo(() => {
    const saidasPorPostoEProduto = {};
    saidas.forEach(sai => {
      if (sai.status === 'CONCLUÍDO' || sai.status === 'ABASTECIDA') {
        const posto = sai.fornecedor;
        const prod = sai.combustivel;
        if (!saidasPorPostoEProduto[posto]) saidasPorPostoEProduto[posto] = {};
        if (!saidasPorPostoEProduto[posto][prod]) saidasPorPostoEProduto[posto][prod] = 0;
        saidasPorPostoEProduto[posto][prod] += parseFloat(sai.qtde) || 0;
      }
    });

    const entradasOrdenadas = [...entradas].sort((a, b) => new Date(a.data) - new Date(b.data));
    const consumoRestante = JSON.parse(JSON.stringify(saidasPorPostoEProduto));

    const entradasProcessadas = entradasOrdenadas.map(ent => {
      const posto = ent.estoque;
      const prod = ent.produto;
      const qtdEntrada = parseFloat(ent.quantidade) || 0;

      let saldo = qtdEntrada;
      let situacao = 'INTEGRO';

      if (consumoRestante[posto] && consumoRestante[posto][prod] > 0) {
        if (consumoRestante[posto][prod] >= qtdEntrada) {
          saldo = 0;
          situacao = 'ESGOTADO';
          consumoRestante[posto][prod] -= qtdEntrada;
        } else {
          saldo = qtdEntrada - consumoRestante[posto][prod];
          situacao = 'EM CONSUMO';
          consumoRestante[posto][prod] = 0;
        }
      }

      return {
        ...ent,
        saldoRestante: saldo,
        situacaoAuto: ent.situacaoForcada ? ent.situacaoForcada : situacao
      };
    });

    // Retorna ordenado do mais novo para o mais antigo para a tabela
    return entradasProcessadas.sort((a, b) => new Date(b.data) - new Date(a.data));
  }, [entradas, saidas]);

  const entradasFiltradas = useMemo(() => {
    return entradasComFIFO.filter(ent => {
      let matchesSearch = true;
      let matchesData = true;

      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const nf = ent.notaFiscal ? ent.notaFiscal.toLowerCase() : '';
        const forn = ent.fornecedor ? ent.fornecedor.toLowerCase() : '';
        matchesSearch = nf.includes(term) || forn.includes(term);
      }

      if (dataInicio) {
        matchesData = matchesData && new Date(ent.data) >= new Date(dataInicio);
      }
      if (dataFim) {
        matchesData = matchesData && new Date(ent.data) <= new Date(dataFim + 'T23:59:59');
      }

      return matchesSearch && matchesData;
    });
  }, [entradasComFIFO, searchTerm, dataInicio, dataFim]);

  const listaParaExibicao = useMemo(() => {
    return entradasFiltradas.filter(ent => {
      const isTransfer = ent.notaFiscal && ent.notaFiscal.startsWith('TRANSF-');
      if (tipoRelatorio === 'entradas') return !isTransfer;
      if (tipoRelatorio === 'transferencias') return isTransfer;
      return true;
    });
  }, [entradasFiltradas, tipoRelatorio]);

  const handleExportCSV = () => {
    if (listaParaExibicao.length === 0) {
      alert("Não há dados para exportar.");
      return;
    }

    // Usando ponto e vírgula como separador para Excel em PT-BR
    let csv = "Data;Fornecedor;Produto;Qtd (L);Nota Fiscal;Valor Un.;Valor Total;Destino;Situacao Automatica;Saldo Restante (L)\n";

    listaParaExibicao.forEach(ent => {
      const dataStr = new Date(ent.data).toLocaleDateString('pt-BR');
      const fornecedor = (ent.fornecedor || "").replace(/;/g, ",");
      const produto = (ent.produto || "").replace(/;/g, ",");
      const qtd = String(ent.quantidade || 0).replace(".", ",");
      const nf = (ent.notaFiscal || "").replace(/;/g, ",");
      const valorUn = String(ent.valorUn || 0).replace(".", ",");
      const valorTotal = String(ent.valorTotal || 0).replace(".", ",");
      const destino = (ent.estoque || "").replace(/;/g, ",");
      const situacao = (ent.situacaoAuto || "").replace(/;/g, ",");
      const saldoRestante = String(ent.saldoRestante || 0).replace(".", ",");

      csv += `${dataStr};${fornecedor};${produto};${qtd};${nf};${valorUn};${valorTotal};${destino};${situacao};${saldoRestante}\n`;
    });

    const blob = new Blob(["\ufeff" + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `relatorio_estoque_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- CÁLCULOS DE ESTOQUE FÍSICO (DINÂMICO PARA INCLUIR CAMINHÕES) ---
  const estoqueFisico = useMemo(() => {
    const controle = {};

    // Coletar todos os postos (locais de estoque) que existem nas entradas
    const postosIdentificados = new Set();
    entradas.forEach(ent => {
      if (ent.estoque) postosIdentificados.add(ent.estoque);
    });

    // Se não houver nenhum, garante os padrões
    if (postosIdentificados.size === 0) {
      postosIdentificados.add('P YAMAVES');
      postosIdentificados.add('ALMOXARIFADO');
    }

    // Inicializa
    postosIdentificados.forEach(p => {
      controle[p] = { DIESEL: 0, GASOLINA: 0, 'ARLA REDUX': 0 };
    });

    // Soma Entradas
    entradas.forEach(ent => {
      const posto = ent.estoque;
      const prod = ent.produto;
      if (controle[posto] && controle[posto][prod] !== undefined) {
        controle[posto][prod] += parseFloat(ent.quantidade) || 0;
      }
    });

    // Subtrai Saídas (Requisições Concluídas/Abastecidas)
    saidas.forEach(sai => {
      const posto = sai.fornecedor; // O fornecedor na requisição indica de onde saiu
      const prod = sai.combustivel;
      if ((sai.status === 'CONCLUÍDO' || sai.status === 'ABASTECIDA') && controle[posto] && controle[posto][prod] !== undefined) {
        controle[posto][prod] -= parseFloat(sai.qtde) || 0;
      }
    });

    return controle;
  }, [entradas, saidas]);

  // Formatar dados para o gráfico de barras (Estoque Físico)
  const postosFixosGrafico = ['P YAMAVES', 'ALMOXARIFADO', 'ORIENTE', 'POSTO DA RUA'];

  const dadosGraficoEstoqueFixos = Object.keys(estoqueFisico)
    .filter(posto => postosFixosGrafico.includes(posto.toUpperCase()))
    .map(posto => ({
      name: posto,
      DIESEL: Math.max(0, estoqueFisico[posto]?.DIESEL || 0),
      GASOLINA: Math.max(0, estoqueFisico[posto]?.GASOLINA || 0),
      'ARLA REDUX': Math.max(0, estoqueFisico[posto]?.['ARLA REDUX'] || 0),
    }));

  const dadosGraficoEstoqueMoveis = Object.keys(estoqueFisico)
    .filter(posto => !postosFixosGrafico.includes(posto.toUpperCase()))
    .map(posto => ({
      name: posto,
      DIESEL: Math.max(0, estoqueFisico[posto]?.DIESEL || 0)
    }))
    .filter(d => d.DIESEL > 0);

  // --- CÁLCULO DE SALDO TOTAL GERAL ---
  const saldoTotalGeral = useMemo(() => {
    let diesel = 0;
    let gasolina = 0;
    let arla = 0;

    Object.values(estoqueFisico).forEach(p => {
      diesel += Math.max(0, p.DIESEL || 0);
      gasolina += Math.max(0, p.GASOLINA || 0);
      arla += Math.max(0, p['ARLA REDUX'] || 0);
    });

    return { diesel, gasolina, arla };
  }, [estoqueFisico]);

  // --- CÁLCULOS FINANCEIROS (POSTOS SEM ESTOQUE) ---
  const dadosFinanceiros = useMemo(() => {
    const postosExternos = ['ORIENTE', 'POSTO DA RUA'];
    let gastoTotal = 0;
    const carrosAbastecidos = new Set();

    saidas.forEach(sai => {
      // Considera apenas as saídas com status de concluído/abastecida e que sejam dos postos externos
      // Vamos pegar tudo que NÃO está no estoqueFisico (que agora inclui os caminhões)
      if (sai.status === 'CONCLUÍDO' || sai.status === 'ABASTECIDA') {
        const fornecedor = sai.fornecedor || '';
        if (!Object.keys(estoqueFisico).includes(fornecedor)) {
          gastoTotal += parseFloat(sai.valorTotal) || 0;
          if (sai.veiculo) carrosAbastecidos.add(sai.veiculo);
        }
      }
    });

    const totalCarros = carrosAbastecidos.size;
    const mediaPorCarro = totalCarros > 0 ? gastoTotal / totalCarros : 0;

    return {
      gastoTotal,
      mediaPorCarro,
      totalCarros
    };
  }, [saidas]);

  // --- CÁLCULOS DE GRÁFICO PARA CUSTOS EXTERNOS ---
  const dadosGraficoExterno = useMemo(() => {
    const postos = {};
    const postosExternos = ['ORIENTE', 'POSTO DA RUA'];

    saidas.forEach(sai => {
      const isConcluido = sai.status === 'CONCLUÍDO' || sai.status === 'ABASTECIDA';
      const isExterno = postosExternos.includes(sai.fornecedor);

      if (isConcluido && isExterno) {
        const posto = sai.fornecedor;
        const prod = sai.combustivel;

        if (!postos[posto]) {
          postos[posto] = { name: posto, DIESEL: 0, GASOLINA: 0, 'ARLA REDUX': 0, GastoTotal: 0, veiculos: new Set() };
        }

        const valor = parseFloat(sai.valorTotal) || 0;
        const qtde = parseFloat(sai.qtde) || 0;
        
        postos[posto][prod] += qtde; // Soma em Litros
        postos[posto].GastoTotal += valor; // Soma financeira mantida
        if (sai.veiculo) postos[posto].veiculos.add(sai.veiculo);
      }
    });

    return Object.keys(postos).map(posto => {
      const data = postos[posto];
      const veiculosCount = data.veiculos.size;
      return {
        name: data.name,
        DIESEL: data.DIESEL,
        GASOLINA: data.GASOLINA,
        'ARLA REDUX': data['ARLA REDUX'],
        GastoTotal: data.GastoTotal,
        VeiculosCount: veiculosCount,
        MediaPorVeiculo: veiculosCount > 0 ? data.GastoTotal / veiculosCount : 0
      };
    }).filter(p => p.GastoTotal > 0);
  }, [saidas]);

  // --- CÁLCULOS DE CONSUMO TOTAL (SAÍDAS EM LITROS) POR POSTO ---
  const dadosGraficoSaidasPorPosto = useMemo(() => {
    const postos = {};
    saidas.forEach(sai => {
      if (sai.status === 'CONCLUÍDO' || sai.status === 'ABASTECIDA') {
        const posto = sai.fornecedor || 'Desconhecido';
        const prod = sai.combustivel;
        if (!postos[posto]) postos[posto] = { DIESEL: 0, GASOLINA: 0, 'ARLA REDUX': 0 };
        if (postos[posto][prod] !== undefined) {
          postos[posto][prod] += parseFloat(sai.qtde) || 0;
        }
      }
    });

    const postosParaPizza = ['P YAMAVES', 'ALMOXARIFADO'];

    return Object.keys(postos)
      .filter(posto => postosParaPizza.includes(posto.toUpperCase()))
      .map(posto => {
        const pData = postos[posto];
        const dataArr = [
          { name: 'DIESEL', value: pData.DIESEL, fill: '#3b82f6' },
          { name: 'GASOLINA', value: pData.GASOLINA, fill: '#10b981' },
          { name: 'ARLA REDUX', value: pData['ARLA REDUX'], fill: '#f59e0b' }
        ].filter(item => item.value > 0);

        return {
          posto,
          dataArr
        };
      }).filter(p => p.dataArr.length > 0);
  }, [saidas]);

  // Função para formatar moeda
  const formatMoeda = (valor) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
  };

  const CustomTooltipExterno = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{ backgroundColor: '#fff', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <p style={{ margin: '0 0 8px 0', fontWeight: 'bold', color: '#1e293b' }}>{label}</p>
          {payload.map((entry, index) => (
            entry.value > 0 && (
              <p key={index} style={{ margin: 0, color: entry.color, fontSize: '0.85rem' }}>
                {entry.name}: {entry.value.toFixed(2)} L
              </p>
            )
          ))}
          <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '8px 0' }} />
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Total Gasto: <strong style={{ color: '#1e293b' }}>{formatMoeda(data.GastoTotal)}</strong></p>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Carros Abast.: <strong style={{ color: '#1e293b' }}>{data.VeiculosCount}</strong></p>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Média: <strong style={{ color: '#1e293b' }}>{formatMoeda(data.MediaPorVeiculo)}/carro</strong></p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleContainer}>
          <h2 className={styles.title}>
            <Database size={24} className={styles.iconDatabase} />
            Controle de Estoque de Combustível
          </h2>
        </div>
        <div className={styles.gap10}>
          <button
            className={`${styles.btnPrimary} ${styles.btnExport}`}
            onClick={handleExportCSV}
          >
            <Download size={18} />
            Exportar Planilha
          </button>
          <button className={`${styles.btnPrimary} ${styles.btnTransfer}`} onClick={() => setShowTransferenciaModal(true)}>
            Transferência
          </button>
          <button className={styles.btnPrimary} onClick={() => setShowModal(true)}>
            <Plus size={18} />
            Nova Entrada
          </button>
        </div>
      </div>

      {isLoading ? (
        <p className={styles.loadingText}>Carregando dados...</p>
      ) : (
        <>
          {/* Resumo de Saldos Totais Gerais */}
          <div className={styles.summaryGrid}>
            <div className={`${styles.summaryCard} ${styles.summaryDiesel}`}>
              <span className={`${styles.summaryLabel} ${styles.labelDiesel}`}>Total Diesel Geral</span>
              <span className={`${styles.summaryValue} ${styles.valueDiesel}`}>{saldoTotalGeral.diesel.toFixed(2)} <span className={styles.unitText}>L</span></span>
            </div>
            <div className={`${styles.summaryCard} ${styles.summaryGasolina}`}>
              <span className={`${styles.summaryLabel} ${styles.labelGasolina}`}>Total Gasolina Geral</span>
              <span className={`${styles.summaryValue} ${styles.valueGasolina}`}>{saldoTotalGeral.gasolina.toFixed(2)} <span className={styles.unitText}>L</span></span>
            </div>
            <div className={`${styles.summaryCard} ${styles.summaryArla}`}>
              <span className={`${styles.summaryLabel} ${styles.labelArla}`}>Total Arla Redux Geral</span>
              <span className={`${styles.summaryValue} ${styles.valueArla}`}>{saldoTotalGeral.arla.toFixed(2)} <span className={styles.unitText}>L</span></span>
            </div>
          </div>

          <div className={styles.chartsGrid}>
            {/* Gráfico 1: Estoque Físico Base */}
            <div className={styles.chartCard}>
              <h3 className={styles.chartTitle}>Saldo em Estoque Fixo (Litros)</h3>
              <div className={styles.chartContainer}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dadosGraficoEstoqueFixos} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <RechartsTooltip cursor={{ fill: 'transparent' }} />
                    <Legend />
                    <Bar dataKey="DIESEL" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="GASOLINA" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="ARLA REDUX" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Gráfico 1B: Estoque Físico Caminhões */}
            {dadosGraficoEstoqueMoveis.length > 0 && (
              <div className={styles.chartCard}>
                <h3 className={styles.chartTitle}>Saldo nos Caminhões (Litros)</h3>
                <div className={styles.chartContainer}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dadosGraficoEstoqueMoveis} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <RechartsTooltip cursor={{ fill: 'transparent' }} />
                      <Legend />
                      <Bar dataKey="DIESEL" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Gráfico 2: Gastos Externos (Sem Estoque) */}
            <div className={styles.chartCard}>
              <h3 className={styles.chartTitle}>Consumo e Custos em Postos Externos (Mês Atual)</h3>

              {/* Resumo Global Externo */}
              <div className={styles.resumoExterno}>
                <div className={`${styles.resumoExternoCard} ${styles.resumoCardGasto}`}>
                  <p className={styles.resumoLabel}>Gasto Total Externo</p>
                  <p className={styles.resumoValor}>{formatMoeda(dadosFinanceiros.gastoTotal)}</p>
                </div>
                <div className={`${styles.resumoExternoCard} ${styles.resumoCardMedia}`}>
                  <p className={styles.resumoLabel}>Média por Veículo</p>
                  <p className={styles.resumoValor}>{formatMoeda(dadosFinanceiros.mediaPorCarro)}</p>
                  <p className={styles.resumoSubValor}>{dadosFinanceiros.totalCarros} veículo(s) atendido(s)</p>
                </div>
              </div>

              {/* Gráfico Moderno de Custos Externos Dividido por Produto */}
              <div className={styles.chartContainerExterno}>
                {dadosGraficoExterno.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dadosGraficoExterno} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `${val} L`} tick={{ fontSize: 12, fill: '#64748b' }} dx={-10} />
                      <RechartsTooltip content={<CustomTooltipExterno />} cursor={{ fill: 'rgba(139, 92, 246, 0.1)' }} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                      <Bar dataKey="DIESEL" stackId="a" fill="#3b82f6" maxBarSize={60} />
                      <Bar dataKey="GASOLINA" stackId="a" fill="#10b981" maxBarSize={60} />
                      <Bar dataKey="ARLA REDUX" stackId="a" fill="#f59e0b" maxBarSize={60} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className={styles.emptyDataText}>Nenhum gasto externo registrado.</p>
                )}
              </div>
            </div>

            {/* Gráficos Divididos de Saídas de Combustível (Consumo Total por Posto) */}
            {dadosGraficoSaidasPorPosto.map((grafico, idx) => (
              <div key={idx} className={styles.chartCard}>
                <h3 className={styles.chartTitle}>Consumo Total {grafico.posto} (Litros)</h3>
                <div className={styles.chartContainerFlex}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={grafico.dataArr}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {grafico.dataArr.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(value) => `${value.toFixed(2)} Litros`} />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ))}
          </div>

          <div className={styles.tableSection}>
            <div className={styles.filterSection}>
              <div className={styles.flexCenterWrap}>
                <h3 className={`${styles.chartTitle} ${styles.filterTitle}`}>Planilha de Estoque</h3>
                <button
                  onClick={() => setTipoRelatorio('entradas')}
                  className={`${styles.btnFilter} ${tipoRelatorio === 'entradas' ? styles.btnFilterActive : styles.btnFilterInactive}`}
                >
                  Entradas
                </button>
                <button
                  onClick={() => setTipoRelatorio('transferencias')}
                  className={`${styles.btnFilter} ${tipoRelatorio === 'transferencias' ? styles.btnFilterTransferActive : styles.btnFilterInactive}`}
                >
                  Transferências
                </button>
              </div>

              <div className={styles.flexCenterWrap}>
                <div className={styles.relativeContainer}>
                  <Search size={16} className={styles.searchIcon} />
                  <input
                    type="text"
                    placeholder="Buscar NF ou Fornecedor..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className={styles.searchInput}
                  />
                </div>

                <div className={styles.dateFilterContainer}>
                  <Calendar size={16} color="#64748b" />
                  <span className={styles.dateLabel}>De:</span>
                  <input
                    type="date"
                    value={dataInicio}
                    onChange={e => setDataInicio(e.target.value)}
                    className={styles.dateInput}
                  />
                  <span className={`${styles.dateLabel} ${styles.dateLabelMargin}`}>Até:</span>
                  <input
                    type="date"
                    value={dataFim}
                    onChange={e => setDataFim(e.target.value)}
                    className={styles.dateInput}
                  />
                  {(dataInicio || dataFim || searchTerm) && (
                    <button
                      onClick={() => { setDataInicio(''); setDataFim(''); setSearchTerm(''); }}
                      className={styles.clearFilterBtn}
                      title="Limpar Filtros"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Fornecedor</th>
                    <th>Produto</th>
                    <th>Qtd (L)</th>
                    <th>Nota Fiscal</th>
                    <th>Valor Un.</th>
                    <th>Valor Total</th>
                    <th>Destino</th>
                    <th>Situação (Auto)</th>
                    <th>Saldo</th>
                    <th style={{ width: '50px' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {listaParaExibicao.length > 0 ? (
                    listaParaExibicao.map((ent, idx) => (
                      <tr key={ent.id || idx}>
                        <td>{new Date(ent.data).toLocaleDateString('pt-BR')}</td>
                        <td>{ent.fornecedor}</td>
                        <td>{ent.produto}</td>
                        <td>{ent.quantidade}</td>
                        <td>{ent.notaFiscal || '-'}</td>
                        <td>{formatMoeda(ent.valorUn)}</td>
                        <td>{formatMoeda(ent.valorTotal)}</td>
                        <td>{ent.estoque}</td>
                        <td>
                          <span className={
                            ent.situacaoAuto === 'INTEGRO' ? styles.statusIntegro :
                              ent.situacaoAuto === 'EM CONSUMO' ? styles.statusEmConsumo :
                                styles.statusEsgotado
                          }>
                            {ent.situacaoAuto}
                            {ent.situacaoForcada ? ' (Manual)' : ''}
                          </span>
                        </td>
                        <td style={{ fontWeight: 'bold' }}>{ent.saldoRestante.toFixed(2)} L</td>
                        <td>
                          <button
                            className={`${styles.btnAction} ${styles.actionBtn}`}
                            onClick={() => setEditandoSituacao(ent)}
                            title="Alterar Situação Manualmente"
                          >
                            <Edit size={18} />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="11" className={styles.emptyTableText}>
                        Nenhuma entrada de combustível registrada.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {showModal && (
        <FormularioEntradaEstoque
          onClose={() => setShowModal(false)}
          onAdd={handleAddEntrada}
        />
      )}

      {showTransferenciaModal && (
        <FormularioTransferencia
          onClose={() => setShowTransferenciaModal(false)}
          onSuccess={fetchData} // Atualiza os dados após a transferência
        />
      )}

      {/* MODAL DE EDIÇÃO DE SITUAÇÃO */}
      {editandoSituacao && (
        <div className={styles.modalEditOverlay}>
          <div className={styles.modalEditContent}>
            <div className={styles.modalEditHeader}>
              <h3 className={styles.modalEditTitle}>Forçar Situação</h3>
              <button onClick={() => setEditandoSituacao(null)} className={styles.modalEditClose}><X size={20} /></button>
            </div>
            <p className={styles.modalEditSubtitle}>
              Altere a situação da nota fiscal manualmente. Isso ignorará o cálculo automático.
            </p>
            <div className={styles.modalEditActions}>
              <button
                onClick={() => handleUpdateSituacaoForcada(editandoSituacao.id, 'INTEGRO')}
                className={`${styles.btnForceStatus} ${styles.btnForceIntegro}`}
              >
                Marcar como ÍNTEGRO
              </button>
              <button
                onClick={() => handleUpdateSituacaoForcada(editandoSituacao.id, 'EM CONSUMO')}
                className={`${styles.btnForceStatus} ${styles.btnForceConsumo}`}
              >
                Marcar como EM CONSUMO
              </button>
              <button
                onClick={() => handleUpdateSituacaoForcada(editandoSituacao.id, 'ESGOTADO')}
                className={`${styles.btnForceStatus} ${styles.btnForceEsgotado}`}
              >
                Marcar como ESGOTADO
              </button>
              <button
                onClick={() => handleUpdateSituacaoForcada(editandoSituacao.id, '')}
                className={`${styles.btnForceStatus} ${styles.btnForceAuto}`}
              >
                Voltar para o Automático
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EstoqueCombustivel;
