import { parseMoeda } from '../../../../../utils/parseMoeda';
import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { Plus, Database, TrendingUp, AlertCircle, Download, Edit, X, Search, Calendar, BarChart2, Eye, ArrowRightLeft, Droplet } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import styles from './index.module.css';
import FormularioEntradaEstoque from '../FormularioEntradaEstoque';
import FormularioTransferencia from '../FormularioTransferencia';
import FormularioRecebimentoEstoque from '../FormularioRecebimentoEstoque';
import ModalDetalhesCombustivel from '../ModalDetalhesCombustivel';
import FormularioDescarte from '../FormularioDescarte';

const AnimatedNumber = ({ value }) => {
  const [displayValue, setDisplayValue] = useState(Number(value) || 0);

  useEffect(() => {
    let startTimestamp = null;
    let animationFrameId;
    const duration = 1500;
    const finalValue = Number(value) || 0;
    
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setDisplayValue(finalValue * ease);
      
      if (progress < 1) {
        animationFrameId = window.requestAnimationFrame(step);
      } else {
        setDisplayValue(finalValue);
      }
    };
    
    animationFrameId = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(animationFrameId);
  }, [value]);

  return <>{Number(displayValue).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</>;
};

const CORES = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const EstoqueCombustivel = () => {
  const currentUser = useMemo(() => {
    try {
      const saved = localStorage.getItem('almoxarifado_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  }, []);
  const isAdmin = currentUser?.role === 'admin';

  const [entradas, setEntradas] = useState([]);
  const [saidas, setSaidas] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showTransferenciaModal, setShowTransferenciaModal] = useState(false);
  const [descarteEntradaSelecionada, setDescarteEntradaSelecionada] = useState(null);
  const [entradaSelecionadaParaReceber, setEntradaSelecionadaParaReceber] = useState(null);
  const [visualizandoEntrada, setVisualizandoEntrada] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editandoSituacao, setEditandoSituacao] = useState(null);
  const [tipoRelatorio, setTipoRelatorio] = useState('entradas');
  const [mostrarGrafico, setMostrarGrafico] = useState(true);

  // Estados de Filtro
  const [searchTerm, setSearchTerm] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  const fetchData = async () => {
    setIsLoading(true);
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
      const response = await fetch(`/api/combustivel/entradas/${id}`, {
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
    // 1. Clonar e ordenar entradas da mais antiga para a mais nova (FIFO)
    const entradasProcessadas = [...entradas].sort((a, b) => new Date(a.data) - new Date(b.data)).map(ent => ({
      ...ent,
      saldoRestante: parseMoeda(ent.quantidade) || 0,
      historicoConsumo: [],
      situacaoAuto: ent.situacao === 'AGUARDANDO COMBUSTIVEL' ? 'AGUARDANDO COMBUSTIVEL' : 'INTEGRO'
    }));

    // 2. Ordenar saidas cronologicamente
    const saidasOrdenadas = [...saidas].filter(s => s.status === 'CONCLUÍDO' || s.status === 'ABASTECIDA').sort((a, b) => new Date(a.data) - new Date(b.data));

    // 3. Processar cada saida (Abater Manuais primeiro, depois Automáticas)
    const saidasManuais = saidasOrdenadas.filter(s => s.lote_origem_id);
    const saidasAutomaticas = saidasOrdenadas.filter(s => !s.lote_origem_id);

    // 3.1 Abater Manuais
    saidasManuais.forEach(sai => {
      let qtdePendente = parseMoeda(sai.qtde) || 0;
      if (qtdePendente <= 0) return;

      const lote = entradasProcessadas.find(e => String(e.id) === String(sai.lote_origem_id));
      if (lote && lote.situacaoAuto !== 'AGUARDANDO COMBUSTIVEL') {
        lote.saldoRestante -= qtdePendente;
        // Permite saldo negativo temporariamente para não perder litros se o FIFO bagunçar
        
        const isTransfer = sai.numeroRequisicao && sai.numeroRequisicao.startsWith('TRANSF-');
        const descr = isTransfer ? `Transf. p/ ${sai.veiculo}` : `Abast. ${sai.veiculo}`;
        lote.historicoConsumo.push({
          data: sai.data,
          descricao: descr,
          qtde: qtdePendente,
          req: sai.numeroRequisicao
        });
      } else {
        // Se não achou o lote ou está aguardando, cai pro FIFO
        saidasAutomaticas.push(sai);
      }
    });

    // 3.2 Abater Automáticas (FIFO)
    saidasAutomaticas.forEach(sai => {
      const posto = sai.fornecedor;
      const prod = sai.combustivel;
      let qtdePendente = parseMoeda(sai.qtde) || 0;
      if (qtdePendente <= 0) return;

      const isTransfer = sai.numeroRequisicao && sai.numeroRequisicao.startsWith('TRANSF-');
      const descr = isTransfer ? `Transf. p/ ${sai.veiculo}` : `Abast. ${sai.veiculo}`;

      for (let lote of entradasProcessadas) {
        if (qtdePendente <= 0) break;
        
        const loteEstoque = lote.estoque ? lote.estoque.toUpperCase() : '';
        const postoUpperCase = posto ? posto.toUpperCase() : '';
        const loteProduto = lote.produto ? lote.produto.toUpperCase() : '';
        const prodUpperCase = prod ? prod.toUpperCase() : '';

        if (loteEstoque === postoUpperCase && loteProduto === prodUpperCase && lote.situacaoAuto !== 'AGUARDANDO COMBUSTIVEL' && lote.saldoRestante > 0) {
          const consumivel = Math.min(lote.saldoRestante, qtdePendente);
          lote.saldoRestante -= consumivel;
          qtdePendente -= consumivel;
          lote.historicoConsumo.push({
            data: sai.data,
            descricao: descr + ' (Auto)',
            qtde: consumivel,
            req: sai.numeroRequisicao
          });
        }
      }
    });

    // Corrige qualquer saldo negativo residual
    entradasProcessadas.forEach(lote => {
      if (lote.saldoRestante < 0) lote.saldoRestante = 0;
    });

    // 4. Atualizar situação baseada no saldo final
    entradasProcessadas.forEach(lote => {
      if (lote.situacaoAuto !== 'AGUARDANDO COMBUSTIVEL') {
        if (lote.saldoRestante <= 0) {
          lote.situacaoAuto = 'ESGOTADO';
        } else if (lote.saldoRestante < parseMoeda(lote.quantidade)) {
          lote.situacaoAuto = 'EM CONSUMO';
        }
      }
      if (lote.situacaoForcada) {
        lote.situacaoAuto = lote.situacaoForcada;
      }
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
      const isAguardando = ent.situacaoAuto === 'AGUARDANDO COMBUSTIVEL';

      if (tipoRelatorio === 'entradas') return !isTransfer && !isAguardando;
      if (tipoRelatorio === 'transferencias') return isTransfer;
      if (tipoRelatorio === 'aguardando') return isAguardando;

      return true;
    });
  }, [entradasFiltradas, tipoRelatorio]);

  // --- CÁLCULOS DE ESTOQUE FÍSICO (DINÂMICO PARA INCLUIR CAMINHÕES E SINCRONIZADO COM FIFO) ---
  const estoqueFisico = useMemo(() => {
    const controle = {};

    // Inicializa com os postos fixos para garantir que os gráficos renderizem mesmo vazios
    ['P YAMAVES', 'ALMOXARIFADO'].forEach(p => {
      controle[p] = { DIESEL: 0, GASOLINA: 0, 'ARLA REDUX': 0 };
    });

    // Soma os saldos reais de cada lote, garantindo sincronia perfeita com a tabela
    entradasComFIFO.forEach(lote => {
      const posto = lote.estoque ? lote.estoque.toUpperCase() : '';
      const prod = lote.produto ? lote.produto.toUpperCase() : '';
      
      if (posto && prod && lote.situacaoAuto !== 'AGUARDANDO COMBUSTIVEL') {
        if (!controle[posto]) controle[posto] = { DIESEL: 0, GASOLINA: 0, 'ARLA REDUX': 0 };
        if (controle[posto][prod] === undefined) controle[posto][prod] = 0;
        
        controle[posto][prod] += Math.max(0, lote.saldoRestante);
      }
    });

    return controle;
  }, [entradas, saidas]);

  const postosFixosGrafico = ['P YAMAVES', 'ALMOXARIFADO', 'ORIENTE', 'POSTO DA RUA'];

  const dadosGraficoEstoqueFixos = Object.keys(estoqueFisico)
    .filter(posto => postosFixosGrafico.includes(posto.toUpperCase()))
    .map(posto => ({
      name: posto,
      DIESEL: Math.max(0, estoqueFisico[posto]?.DIESEL || 0),
      GASOLINA: Math.max(0, estoqueFisico[posto]?.GASOLINA || 0),
      'ARLA REDUX': Math.max(0, estoqueFisico[posto]?.['ARLA REDUX'] || 0),
    }));

  const dadosGraficoReservatorios = Object.keys(estoqueFisico)
    .filter(posto => posto.toUpperCase().includes('RESERVATÓRIO'))
    .map(posto => ({
      name: posto,
      DIESEL: Math.max(0, estoqueFisico[posto]?.DIESEL || 0)
    }))
    .filter(d => d.DIESEL > 0);

  const dadosGraficoEstoqueMoveis = Object.keys(estoqueFisico)
    .filter(posto => !postosFixosGrafico.includes(posto.toUpperCase()) && !posto.toUpperCase().includes('RESERVATÓRIO'))
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
          gastoTotal += parseMoeda(sai.valorTotal) || 0;
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

        const valor = parseMoeda(sai.valorTotal) || 0;
        const qtde = parseMoeda(sai.qtde) || 0;

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
          postos[posto][prod] += parseMoeda(sai.qtde) || 0;
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

  // --- CÁLCULO DE FLUXO DE MOVIMENTAÇÃO (ÁREA) ---
  const dadosGraficoFluxo = useMemo(() => {
    const dias = {};
    const hoje = new Date();

    // Inicializar os últimos 15 dias
    for (let i = 14; i >= 0; i--) {
      const d = new Date(hoje);
      d.setDate(d.getDate() - i);
      const dataStr = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      dias[dataStr] = { date: dataStr, Entradas: 0, Saidas: 0 };
    }

    entradas.forEach(ent => {
      if (ent.situacao === 'AGUARDANDO COMBUSTIVEL') return;

      const isTransfer = ent.notaFiscal && ent.notaFiscal.toUpperCase().startsWith('TRANSF-');
      if (isTransfer) return;

      if (!ent.data) return;
      const dataObj = new Date(ent.data);
      if (isNaN(dataObj)) return;
      const dataStr = dataObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      if (dias[dataStr]) {
        dias[dataStr].Entradas += parseMoeda(ent.quantidade) || 0;
      }
    });

    saidas.forEach(sai => {
      if (sai.status !== 'CONCLUÍDO' && sai.status !== 'ABASTECIDA') return;

      const placa = sai.veiculo ? sai.veiculo.toUpperCase() : '';
      const isTransf = sai.numeroRequisicao && sai.numeroRequisicao.toUpperCase().startsWith('TRANSF-');
      const isInternal = isTransf || placa === 'DESCARTE' || placa.includes('RESERVATÓRIO');
      if (isInternal) return;

      if (!sai.data_hora) return;
      const dataISO = sai.data_hora.split('T')[0] || sai.data_hora.split(' ')[0];
      const dataObj = new Date(dataISO);
      if (isNaN(dataObj)) return;
      const dataStr = dataObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      if (dias[dataStr]) {
        dias[dataStr].Saidas += parseMoeda(sai.qtde) || 0;
      }
    });

    return Object.values(dias);
  }, [entradas, saidas]);

  // Função para formatar moeda
  const formatMoeda = (valor) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
  };

  const CustomTooltipExterno = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{ backgroundColor: 'var(--cor-fundo-cartao)', padding: '12px', border: '1px solid var(--cor-borda-cartao)', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.2)', color: 'var(--cor-texto-principal)' }}>
          <p style={{ margin: '0 0 8px 0', fontWeight: 'bold', color: 'var(--cor-texto-principal)' }}>{label}</p>
          {payload.map((entry, index) => (
            entry.value > 0 && (
              <p key={index} style={{ margin: 0, color: entry.color, fontSize: '0.85rem' }}>
                {entry.name}: {entry.value.toFixed(2)} L
              </p>
            )
          ))}
          <hr style={{ border: 'none', borderTop: '1px solid var(--cor-borda-cartao)', margin: '8px 0' }} />
          {isAdmin && (
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--cor-texto-secundario)' }}>Total Gasto: <strong style={{ color: 'var(--cor-texto-principal)' }}>{formatMoeda(data.GastoTotal)}</strong></p>
          )}
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--cor-texto-secundario)' }}>Carros Abast.: <strong style={{ color: 'var(--cor-texto-principal)' }}>{data.VeiculosCount}</strong></p>
          {isAdmin && (
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--cor-texto-secundario)' }}>Média: <strong style={{ color: 'var(--cor-texto-principal)' }}>{formatMoeda(data.MediaPorVeiculo)}/carro</strong></p>
          )}
        </div>
      );
    }
    return null;
  };

  const CustomTooltipClean = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ 
          backgroundColor: 'var(--cor-fundo-cartao)', 
          padding: '16px', 
          border: '1px solid var(--cor-borda-cartao)', 
          borderRadius: '12px', 
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)', 
          color: 'var(--cor-texto-principal)',
          minWidth: '200px'
        }}>
          <p style={{ margin: '0 0 12px 0', fontWeight: 'bold', fontSize: '1rem', color: 'var(--cor-texto-principal)', borderBottom: '1px solid var(--cor-borda-cartao)', paddingBottom: '8px' }}>
            {label}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {payload.map((entry, index) => (
              entry.value > 0 && (
                <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--cor-texto-secundario)', fontSize: '0.85rem' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: entry.color, display: 'inline-block' }}></span>
                    {entry.name}
                  </span>
                  <strong style={{ color: 'var(--cor-texto-principal)', fontSize: '0.9rem' }}>
                    {parseMoeda(entry.value).toLocaleString('pt-BR', { maximumFractionDigits: 2, minimumFractionDigits: 2 })} L
                  </strong>
                </div>
              )
            ))}
          </div>
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
            type="button"
            className={styles.clearFilterBtn}
            onClick={() => setMostrarGrafico(!mostrarGrafico)}
            title={mostrarGrafico ? "Ocultar Gráficos" : "Mostrar Gráficos"}
            style={{ display: 'flex', alignItems: 'center', alignSelf: 'center', marginRight: '8px' }}
          >
            <BarChart2 size={18} style={{ marginRight: '6px' }} />
            {mostrarGrafico ? "Ocultar Gráficos" : "Mostrar Gráficos"}
          </button>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button className={styles.btnPrimary} onClick={() => setShowModal(true)}>
              <Plus size={18} /> Nova Entrada
            </button>
            <button className={styles.btnPrimary} onClick={() => setShowTransferenciaModal(true)} style={{ backgroundColor: '#8b5cf6' }}>
              <ArrowRightLeft size={18} /> Transferência
            </button>
          </div>
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
              <span className={`${styles.summaryValue} ${styles.valueDiesel}`}><AnimatedNumber value={saldoTotalGeral.diesel} /> <span className={styles.unitText}>L</span></span>
            </div>
            <div className={`${styles.summaryCard} ${styles.summaryGasolina}`}>
              <span className={`${styles.summaryLabel} ${styles.labelGasolina}`}>Total Gasolina Geral</span>
              <span className={`${styles.summaryValue} ${styles.valueGasolina}`}><AnimatedNumber value={saldoTotalGeral.gasolina} /> <span className={styles.unitText}>L</span></span>
            </div>
            <div className={`${styles.summaryCard} ${styles.summaryArla}`}>
              <span className={`${styles.summaryLabel} ${styles.labelArla}`}>Total Arla Redux Geral</span>
              <span className={`${styles.summaryValue} ${styles.valueArla}`}><AnimatedNumber value={saldoTotalGeral.arla} /> <span className={styles.unitText}>L</span></span>
            </div>
          </div>

          {mostrarGrafico && (
            <>
              {/* Defs para os Gráficos Premium */}
              <svg style={{ height: 0, width: 0, position: 'absolute' }}>
                <defs>
                  {/* Gradientes dos Tanques */}
                  <linearGradient id="gradDiesel" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.9} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={1} />
                  </linearGradient>
                  <linearGradient id="gradGasolina" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.9} />
                    <stop offset="95%" stopColor="#059669" stopOpacity={1} />
                  </linearGradient>
                  <linearGradient id="gradArla" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.9} />
                    <stop offset="95%" stopColor="#d97706" stopOpacity={1} />
                  </linearGradient>

                  {/* Gradientes do Gráfico de Área */}
                  <linearGradient id="colorEntradas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorSaidas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
              </svg>

              <div className={styles.chartsMainGrid}>
                {/* Gráfico 1: Tanques (Estoque Fixo) */}
                <div className={styles.chartCard}>
                  <h3 className={styles.chartTitle}>Tanques Físicos (Saldos em Litros)</h3>
                  <div className={styles.chartContainer}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dadosGraficoEstoqueFixos} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `${Number(val).toLocaleString('pt-BR')} L`} tick={{ fontSize: 12, fill: '#64748b' }} dx={-10} />
                        <RechartsTooltip formatter={(value) => `${Number(parseMoeda(value)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} L`} cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }} contentStyle={{ backgroundColor: 'var(--cor-fundo-cartao)', borderRadius: '8px', border: '1px solid var(--cor-borda-cartao)', boxShadow: '0 4px 6px rgba(0,0,0,0.5)' }} itemStyle={{ color: 'var(--cor-texto-principal)' }} />
                        <Legend 
                          content={({ payload }) => {
                            const getColor = (name) => {
                              if (name === 'DIESEL') return '#3b82f6';
                              if (name === 'GASOLINA') return '#10b981';
                              if (name === 'ARLA REDUX') return '#f59e0b';
                              return '#ccc';
                            };
                            return (
                              <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '10px' }}>
                                {payload.map((entry, index) => (
                                  <div 
                                    key={`item-${index}`} 
                                    style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: getColor(entry.value), cursor: 'pointer' }} 
                                    title={entry.value} 
                                  />
                                ))}
                              </div>
                            );
                          }} 
                        />
                        <Bar dataKey="DIESEL" fill="url(#gradDiesel)" radius={[8, 8, 0, 0]} maxBarSize={50} />
                        <Bar dataKey="GASOLINA" fill="url(#gradGasolina)" radius={[8, 8, 0, 0]} maxBarSize={50} />
                        <Bar dataKey="ARLA REDUX" fill="url(#gradArla)" radius={[8, 8, 0, 0]} maxBarSize={50} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Gráfico 2: Fluxo de Movimentação (Área) */}
                <div className={styles.chartCard}>
                  <h3 className={styles.chartTitle}>Fluxo: Entradas vs Saídas (Últimos 15 Dias)</h3>
                  <div className={styles.chartContainer}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={dadosGraficoFluxo} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `${Number(val).toLocaleString('pt-BR')} L`} tick={{ fontSize: 11, fill: '#64748b' }} dx={-10} />
                        <RechartsTooltip formatter={(value) => `${Number(parseMoeda(value)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} L`} contentStyle={{ backgroundColor: 'var(--cor-fundo-cartao)', borderRadius: '8px', border: '1px solid var(--cor-borda-cartao)', boxShadow: '0 4px 6px rgba(0,0,0,0.5)' }} itemStyle={{ color: 'var(--cor-texto-principal)' }} />
                        <Legend wrapperStyle={{ fontSize: '12px' }} iconType="circle" />
                        <Area type="monotone" dataKey="Entradas" stroke="#10b981" fillOpacity={1} fill="url(#colorEntradas)" strokeWidth={3} />
                        <Area type="monotone" dataKey="Saidas" stroke="#ef4444" fillOpacity={1} fill="url(#colorSaidas)" strokeWidth={3} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className={styles.chartsSecondaryGrid}>
                {/* Gráfico 3: Reservatórios e Caminhões Combinados (Tanques Menores) */}
                {(dadosGraficoReservatorios.length > 0 || dadosGraficoEstoqueMoveis.length > 0) && (
                  <div className={styles.chartCard} style={{ gridColumn: 'span 2' }}>
                    <h3 className={styles.chartTitle}>Capacidade: Reservatórios & Caminhões-Tanque</h3>
                    <div className={styles.chartContainer}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={[...dadosGraficoReservatorios, ...dadosGraficoEstoqueMoveis]} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dy={10} />
                          <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `${Number(val).toLocaleString('pt-BR')} L`} tick={{ fontSize: 11, fill: '#64748b' }} dx={-10} />
                          <RechartsTooltip formatter={(value) => `${Number(parseMoeda(value)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} L`} cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }} contentStyle={{ backgroundColor: 'var(--cor-fundo-cartao)', borderRadius: '8px', border: '1px solid var(--cor-borda-cartao)', boxShadow: '0 4px 6px rgba(0,0,0,0.5)' }} itemStyle={{ color: 'var(--cor-texto-principal)' }} />
                          <Bar dataKey="DIESEL" fill="url(#gradDiesel)" radius={[8, 8, 0, 0]} maxBarSize={40} name="Diesel (L)" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Gráfico 4: Custos Externos Modernizado */}
                <div className={styles.chartCard}>
                  <h3 className={styles.chartTitle}>Custos em Postos Externos</h3>
                  <div className={styles.resumoExterno}>
                    <div className={`${styles.resumoExternoCard} ${styles.resumoCardGasto}`}>
                      <p className={styles.resumoLabel}>Gasto Total Externo</p>
                      <p className={styles.resumoValor}>{isAdmin ? formatMoeda(dadosFinanceiros.gastoTotal) : '—'}</p>
                    </div>
                    <div className={styles.resumoExternoCard} style={{ borderLeft: '4px solid #3b82f6' }}>
                      <p className={styles.resumoLabel}>Veículos Abastecidos</p>
                      <p className={styles.resumoValor}>{dadosFinanceiros.totalCarros}</p>
                    </div>
                  </div>
                  <div className={styles.chartContainerExterno}>
                    {dadosGraficoExterno.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dadosGraficoExterno} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dy={10} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dx={-10} />
                          <RechartsTooltip content={<CustomTooltipExterno />} cursor={{ fill: 'rgba(139, 92, 246, 0.05)' }} />
                          <Bar dataKey="DIESEL" stackId="a" fill="#3b82f6" maxBarSize={30} radius={[0, 0, 4, 4]} />
                          <Bar dataKey="GASOLINA" stackId="a" fill="#10b981" maxBarSize={30} />
                          <Bar dataKey="ARLA REDUX" stackId="a" fill="#f59e0b" maxBarSize={30} radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className={styles.emptyDataText}>Nenhum gasto externo registrado.</p>
                    )}
                  </div>
                </div>

              </div>
            </>
          )}

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
                  onClick={() => setTipoRelatorio('aguardando')}
                  className={`${styles.btnFilter} ${tipoRelatorio === 'aguardando' ? styles.btnFilterAguardandoActive : styles.btnFilterInactive}`}
                >
                  Aguardando Combustível
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
                    <th>Prazo Entrega</th>
                    <th>Fornecedor</th>
                    <th>Produto</th>
                    <th>Qtd (L)</th>
                    <th>Nota Fiscal</th>
                    <th>Valor Un.</th>
                    {isAdmin && <th>Valor Total</th>}
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
                        <td>{ent.prazoEntrega ? new Date(ent.prazoEntrega + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}</td>
                        <td>{ent.fornecedor}</td>
                        <td>{ent.produto}</td>
                        <td>{ent.quantidade ? parseMoeda(ent.quantidade).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}</td>
                        <td>{ent.notaFiscal || '-'}</td>
                        <td>{formatMoeda(ent.valorUn)}</td>
                        {isAdmin && <td>{formatMoeda(ent.valorTotal)}</td>}
                        <td>{ent.estoque}</td>
                        <td>
                          <span className={
                            ent.situacaoAuto === 'INTEGRO' ? styles.statusIntegro :
                              ent.situacaoAuto === 'EM CONSUMO' ? styles.statusEmConsumo :
                                ent.situacaoAuto === 'AGUARDANDO COMBUSTIVEL' ? styles.statusAguardando :
                                  styles.statusEsgotado
                          }>
                            {ent.situacaoAuto}
                            {ent.situacaoForcada ? ' (Manual)' : ''}
                          </span>
                        </td>
                        <td style={{ fontWeight: 'bold' }}>{ent.saldoRestante.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} L</td>
                        <td>
                          {ent.situacaoAuto === 'AGUARDANDO COMBUSTIVEL' ? (
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                className={`${styles.btnAction} ${styles.actionBtn}`}
                                onClick={() => setVisualizandoEntrada(ent)}
                                title="Ver Detalhes do Pedido"
                                style={{ color: '#0ea5e9', background: 'transparent' }}
                              >
                                <Eye size={18} />
                              </button>
                              <button
                                className={`${styles.btnAction} ${styles.actionBtn}`}
                                onClick={() => setEntradaSelecionadaParaReceber(ent)}
                                title="Receber Combustível"
                                style={{ color: '#f59e0b', background: 'transparent' }}
                              >
                                <Edit size={18} />
                              </button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                className={`${styles.btnAction} ${styles.actionBtn}`}
                                onClick={() => setVisualizandoEntrada(ent)}
                                title="Ver Detalhes do Combustível"
                                style={{ color: '#0ea5e9', background: 'transparent' }}
                              >
                                <Eye size={18} />
                              </button>
                              <button
                                className={`${styles.btnAction} ${styles.actionBtn}`}
                                onClick={() => setEditandoSituacao(ent)}
                                title="Alterar Situação Manualmente"
                                style={{ color: 'var(--cor-texto-secundario)', background: 'transparent' }}
                              >
                                <Edit size={18} />
                              </button>
                              <button
                                className={`${styles.btnAction} ${styles.actionBtn}`}
                                onClick={() => setDescarteEntradaSelecionada(ent)}
                                title="Descarte de Borra"
                                style={{ color: 'var(--cor-erro)', background: 'transparent' }}
                              >
                                <Droplet size={18} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={isAdmin ? "12" : "11"} className={styles.emptyTableText}>
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

      {showModal && ReactDOM.createPortal(
        <FormularioEntradaEstoque
          onClose={() => setShowModal(false)}
          onAdd={handleAddEntrada}
        />,
        document.body
      )}

      {showTransferenciaModal && ReactDOM.createPortal(
        <FormularioTransferencia
          onClose={() => setShowTransferenciaModal(false)}
          onSuccess={() => fetchData()}
          estoqueFisico={estoqueFisico}
        />,
        document.body
      )}

      {descarteEntradaSelecionada && ReactDOM.createPortal(
        <FormularioDescarte
          entrada={descarteEntradaSelecionada}
          onClose={() => setDescarteEntradaSelecionada(null)}
          onSuccess={() => fetchData()}
        />,
        document.body
      )}

      {entradaSelecionadaParaReceber && ReactDOM.createPortal(
        <FormularioRecebimentoEstoque
          entrada={entradaSelecionadaParaReceber}
          onClose={() => setEntradaSelecionadaParaReceber(null)}
          onUpdate={(entradaAtualizada) => {
            setEntradas(prev => prev.map(e => e.id === entradaAtualizada.id ? entradaAtualizada : e));
          }}
        />,
        document.body
      )}

      {visualizandoEntrada && ReactDOM.createPortal(
        <ModalDetalhesCombustivel
          entrada={visualizandoEntrada}
          onClose={() => setVisualizandoEntrada(null)}
        />,
        document.body
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


