import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Database, TrendingUp, AlertCircle, Download, Edit, X, Search, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import styles from './index.module.css';
import FormularioEntradaEstoque from './FormularioEntradaEstoque';

const CORES = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const EstoqueCombustivel = () => {
  const [entradas, setEntradas] = useState([]);
  const [saidas, setSaidas] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [editandoSituacao, setEditandoSituacao] = useState(null);

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

  const handleExportCSV = () => {
    if (entradasFiltradas.length === 0) {
      alert("Não há dados para exportar.");
      return;
    }

    // Usando ponto e vírgula como separador para Excel em PT-BR
    let csv = "Data;Fornecedor;Produto;Qtd (L);Nota Fiscal;Valor Un.;Valor Total;Destino;Situacao Automatica;Saldo Restante (L)\n";

    entradasFiltradas.forEach(ent => {
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

  // --- CÁLCULOS DE ESTOQUE FÍSICO (ALMOXARIFADO E P YAMAVES) ---
  const estoqueFisico = useMemo(() => {
    const postosFisicos = ['P YAMAVES', 'ALMOXARIFADO'];
    const controle = {};

    // Inicializa
    postosFisicos.forEach(p => {
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
      const posto = sai.fornecedor; // O fornecedor na requisição indica onde foi abastecido
      const prod = sai.combustivel;
      if ((sai.status === 'CONCLUÍDO' || sai.status === 'ABASTECIDA') && controle[posto] && controle[posto][prod] !== undefined) {
        controle[posto][prod] -= parseFloat(sai.qtde) || 0;
      }
    });

    return controle;
  }, [entradas, saidas]);

  // Formatar dados para o gráfico de barras (Estoque Físico)
  const dadosGraficoEstoque = [
    {
      name: 'P YAMAVES',
      DIESEL: Math.max(0, estoqueFisico['P YAMAVES']?.DIESEL || 0),
      GASOLINA: Math.max(0, estoqueFisico['P YAMAVES']?.GASOLINA || 0),
      'ARLA REDUX': Math.max(0, estoqueFisico['P YAMAVES']?.['ARLA REDUX'] || 0),
    },
    {
      name: 'ALMOXARIFADO',
      DIESEL: Math.max(0, estoqueFisico['ALMOXARIFADO']?.DIESEL || 0),
      GASOLINA: Math.max(0, estoqueFisico['ALMOXARIFADO']?.GASOLINA || 0),
      'ARLA REDUX': Math.max(0, estoqueFisico['ALMOXARIFADO']?.['ARLA REDUX'] || 0),
    }
  ];

  // --- CÁLCULOS FINANCEIROS (POSTOS SEM ESTOQUE) ---
  const dadosFinanceiros = useMemo(() => {
    const postosExternos = ['ORIENTE', 'POSTO DA RUA'];
    let gastoTotal = 0;
    const carrosAbastecidos = new Set();

    saidas.forEach(sai => {
      // Considera apenas as saídas com status de concluído/abastecida e que sejam dos postos externos
      // Alguns podem ter outro nome, mas vamos pegar tudo que NÃO é P YAMAVES e ALMOXARIFADO
      if (sai.status === 'CONCLUÍDO' || sai.status === 'ABASTECIDA') {
        const fornecedor = sai.fornecedor || '';
        if (fornecedor !== 'P YAMAVES' && fornecedor !== 'ALMOXARIFADO') {
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
        postos[posto][prod] += valor;
        postos[posto].GastoTotal += valor;
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

    return Object.keys(postos)
      .filter(posto => posto === 'ALMOXARIFADO' || posto === 'P YAMAVES')
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
                {entry.name}: {formatMoeda(entry.value)}
              </p>
            )
          ))}
          <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '8px 0' }} />
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Total Gasto: <strong style={{ color: '#1e293b'}}>{formatMoeda(data.GastoTotal)}</strong></p>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Carros Abast.: <strong style={{ color: '#1e293b'}}>{data.VeiculosCount}</strong></p>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Média: <strong style={{ color: '#1e293b'}}>{formatMoeda(data.MediaPorVeiculo)}/carro</strong></p>
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
            <Database size={24} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px', color: '#3b82f6' }} />
            Controle de Estoque de Combustível
          </h2>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            className={styles.btnPrimary} 
            onClick={handleExportCSV}
            style={{ backgroundColor: '#10b981' }}
          >
            <Download size={18} />
            Exportar Planilha
          </button>
          <button className={styles.btnPrimary} onClick={() => setShowModal(true)}>
            <Plus size={18} />
            Nova Entrada
          </button>
        </div>
      </div>

      {isLoading ? (
        <p style={{ textAlign: 'center', padding: '20px' }}>Carregando dados...</p>
      ) : (
        <>
          <div className={styles.chartsGrid}>
            {/* Gráfico 1: Estoque Físico */}
            <div className={styles.chartCard}>
              <h3 className={styles.chartTitle}>Saldo em Estoque (Litros)</h3>
              <div style={{ height: 300, width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dadosGraficoEstoque} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <RechartsTooltip cursor={{fill: 'transparent'}} />
                    <Legend />
                    <Bar dataKey="DIESEL" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="GASOLINA" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="ARLA REDUX" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Gráfico 2: Gastos Externos (Sem Estoque) */}
            <div className={styles.chartCard}>
              <h3 className={styles.chartTitle}>Custos em Postos Externos (Mês Atual)</h3>
              
              {/* Resumo Global Externo */}
              <div style={{ display: 'flex', gap: '15px', marginBottom: '16px' }}>
                <div style={{ flex: 1, backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', borderLeft: '4px solid #ef4444' }}>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>Gasto Total Externo</p>
                  <p style={{ margin: 0, fontSize: '1.2rem', fontWeight: 'bold', color: '#1e293b' }}>{formatMoeda(dadosFinanceiros.gastoTotal)}</p>
                </div>
                <div style={{ flex: 1, backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', borderLeft: '4px solid #8b5cf6' }}>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>Média por Veículo</p>
                  <p style={{ margin: 0, fontSize: '1.2rem', fontWeight: 'bold', color: '#1e293b' }}>{formatMoeda(dadosFinanceiros.mediaPorCarro)}</p>
                  <p style={{ margin: 0, fontSize: '0.65rem', color: '#94a3b8' }}>{dadosFinanceiros.totalCarros} veículo(s) atendido(s)</p>
                </div>
              </div>

              {/* Gráfico Moderno de Custos Externos Dividido por Produto */}
              <div style={{ height: 220, width: '100%', display: 'flex', justifyContent: 'center' }}>
                {dadosGraficoExterno.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dadosGraficoExterno} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `R$ ${val}`} tick={{ fontSize: 12, fill: '#64748b' }} dx={-10} />
                      <RechartsTooltip content={<CustomTooltipExterno />} cursor={{ fill: 'rgba(139, 92, 246, 0.1)' }} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                      <Bar dataKey="DIESEL" stackId="a" fill="#3b82f6" maxBarSize={60} />
                      <Bar dataKey="GASOLINA" stackId="a" fill="#10b981" maxBarSize={60} />
                      <Bar dataKey="ARLA REDUX" stackId="a" fill="#f59e0b" maxBarSize={60} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p style={{ textAlign: 'center', color: '#94a3b8', marginTop: '40px', fontSize: '0.9rem' }}>Nenhum gasto externo registrado.</p>
                )}
              </div>
            </div>

            {/* Gráficos Divididos de Saídas de Combustível (Consumo Total por Posto) */}
            {dadosGraficoSaidasPorPosto.map((grafico, idx) => (
              <div key={idx} className={styles.chartCard}>
                <h3 className={styles.chartTitle}>Consumo Total {grafico.posto} (Litros)</h3>
                <div style={{ height: 300, width: '100%', display: 'flex', justifyContent: 'center' }}>
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
                      <Legend verticalAlign="bottom" height={36}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ))}
          </div>

          <div className={styles.tableSection}>
            <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
              <h3 className={styles.chartTitle} style={{ margin: 0, color: '#0f172a' }}>Relatório (Planilha de Estoque)</h3>
              
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative' }}>
                  <Search size={16} color="#64748b" style={{ position: 'absolute', left: '10px', top: '10px' }} />
                  <input 
                    type="text" 
                    placeholder="Buscar NF ou Fornecedor..." 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    style={{ padding: '8px 8px 8px 32px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.85rem', width: '220px' }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', backgroundColor: '#f8fafc', padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                  <Calendar size={16} color="#64748b" />
                  <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 'bold' }}>De:</span>
                  <input 
                    type="date" 
                    value={dataInicio}
                    onChange={e => setDataInicio(e.target.value)}
                    style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.85rem', color: '#334155' }}
                  />
                  <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 'bold', marginLeft: '4px' }}>Até:</span>
                  <input 
                    type="date" 
                    value={dataFim}
                    onChange={e => setDataFim(e.target.value)}
                    style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.85rem', color: '#334155' }}
                  />
                  {(dataInicio || dataFim || searchTerm) && (
                    <button 
                      onClick={() => { setDataInicio(''); setDataFim(''); setSearchTerm(''); }}
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', marginLeft: '8px', padding: '4px' }}
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
                  {entradasFiltradas.length > 0 ? (
                    entradasFiltradas.map((ent, idx) => (
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
                            className={styles.btnAction} 
                            onClick={() => setEditandoSituacao(ent)}
                            title="Alterar Situação Manualmente"
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
                          >
                            <Edit size={18} />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="11" style={{ textAlign: 'center', padding: '30px' }}>
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

      {/* MODAL DE EDIÇÃO DE SITUAÇÃO */}
      {editandoSituacao && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', width: '350px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, color: '#0f172a' }}>Forçar Situação</h3>
              <button onClick={() => setEditandoSituacao(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}><X size={20}/></button>
            </div>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '16px' }}>
              Altere a situação da nota fiscal manualmente. Isso ignorará o cálculo automático.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button 
                onClick={() => handleUpdateSituacaoForcada(editandoSituacao.id, 'INTEGRO')}
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid #dcfce7', backgroundColor: '#f0fdf4', color: '#16a34a', fontWeight: 'bold', cursor: 'pointer' }}
              >
                Marcar como ÍNTEGRO
              </button>
              <button 
                onClick={() => handleUpdateSituacaoForcada(editandoSituacao.id, 'EM CONSUMO')}
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid #fef3c7', backgroundColor: '#fffbeb', color: '#d97706', fontWeight: 'bold', cursor: 'pointer' }}
              >
                Marcar como EM CONSUMO
              </button>
              <button 
                onClick={() => handleUpdateSituacaoForcada(editandoSituacao.id, 'ESGOTADO')}
                style={{ padding: '10px', borderRadius: '8px', border: '1px solid #fee2e2', backgroundColor: '#fef2f2', color: '#dc2626', fontWeight: 'bold', cursor: 'pointer' }}
              >
                Marcar como ESGOTADO
              </button>
              <button 
                onClick={() => handleUpdateSituacaoForcada(editandoSituacao.id, '')}
                style={{ padding: '10px', marginTop: '10px', borderRadius: '8px', border: 'none', backgroundColor: '#f1f5f9', color: '#475569', fontWeight: 'bold', cursor: 'pointer' }}
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
