import React, { useState } from 'react';
import {
  Printer,
  Search,
  Plus,
  PieChart,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  FileSpreadsheet,
  Layers,
  RotateCcw,
  DollarSign,
  BarChart2,
  UserCheck
} from 'lucide-react';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend
} from 'recharts';
import styles from './index.module.css';
import { CONCLUIDO, EM_ANDAMENTO, AGUARDANDO_INSUMO, CANCELADO, ATRIBUIDO_TECNICO, AGUARDANDO_ALMOXARIFADO, PECAS_ENTREGUES, FASE_1_TRIAGEM, FASE_4_ENCERRAMENTO, REJEITADO_DIRETORIA } from '../../../../utils/osStatus';
import { parseMoeda } from '../../../../utils/parseMoeda';

const TabelaOS = ({ osList = [], onRowClick, onPrint, onStart, onNovoClick }) => {
  const currentUser = React.useMemo(() => {
    try {
      const saved = localStorage.getItem('almoxarifado_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  }, []);
  const isAdmin = currentUser?.role === 'admin';

  const [termoBusca, setTermoBusca] = useState('');
  const [dataInicioBusca, setDataInicioBusca] = useState('');
  const [dataFimBusca, setDataFimBusca] = useState('');
  const [setorFiltro, setSetorFiltro] = useState('');
  const [situacaoFiltro, setSituacaoFiltro] = useState('');
  const [mostrarGrafico, setMostrarGrafico] = useState(true);
  const [mostrarCusto, setMostrarCusto] = useState(false);

  // Filtra apenas Ordens de Serviço gerais (exclui Prestação de Serviços que possuem tabela própria)
  const osListGeral = React.useMemo(() => {
    return (osList || []).filter(os => {
      const isPrestacao = os.tipo === 'PRESTACAO_SERVICO' || os.isPrestacaoServico === true || os.modalidade === 'PRESTACAO_SERVICO' || (Array.isArray(os.itensPrestacao) && os.itensPrestacao.length > 0);
      return !isPrestacao;
    });
  }, [osList]);

  // Helper para renderizar badges de prioridade
  const renderPrioridadeBadge = (prioridade) => {
    const prioStr = prioridade || '';
    let classe = styles.badgeNeutral;
    if (prioStr.includes('1')) classe = styles.badgeSuccess;
    else if (prioStr.includes('2')) classe = styles.badgeWarning;
    else if (prioStr.includes('3')) classe = styles.badgeDanger;

    return <span className={`${styles.badge} ${classe}`}>{prioStr}</span>;
  };

  // Helper para renderizar badges de situação com os novos status canônicos
  const renderSituacaoBadge = (situacao = '') => {
    let classe = styles.badgeNeutral;
    // Fase 1 - Aguardando aprovacao
    if (FASE_1_TRIAGEM.includes(situacao)) classe = styles.badgeWarning;
    // Fase 2 - Em preparo
    else if (situacao === ATRIBUIDO_TECNICO) classe = styles.badgeInfo;
    else if (situacao === AGUARDANDO_ALMOXARIFADO) classe = styles.badgeWarning;
    else if (situacao === PECAS_ENTREGUES) classe = styles.badgeInfo;
    // Fase 3 - Em execucao
    else if (situacao === EM_ANDAMENTO) classe = styles.badgeInfo;
    else if (situacao === AGUARDANDO_INSUMO) classe = styles.badgeWarning;
    // Fase 4 - Encerrado
    else if (situacao === CONCLUIDO) classe = styles.badgeSuccess;
    else if (situacao === CANCELADO) classe = styles.badgeDanger;
    else if (FASE_4_ENCERRAMENTO.includes(situacao)) classe = styles.badgeDanger;

    // Labels amigáveis para o usuário
    const labels = {
      EMERGENCIA_CHEFE_SETOR: '🚨 EMERGÊNCIA',
      AGUARDANDO_CHEFE_SETOR: 'Aguard. Chefe',
      AGUARDANDO_GERENTE_SERVICOS: 'Aguard. Gerente',
      AGUARDANDO_DIRETORIA: 'Aguard. Diretoria',
      ATRIBUIDO_TECNICO: 'Atribuído Téc.',
      AGUARDANDO_ALMOXARIFADO: 'Aguard. Almox.',
      PECAS_ENTREGUES: 'Peças Entregues',
      EM_ANDAMENTO: 'Em Andamento',
      AGUARDANDO_INSUMO: 'Aguard. Insumo',
      CONCLUIDO: 'Concluído',
      CANCELADO: 'Cancelado',
      REJEITADO_DIRETORIA: 'Rejeitado Dir.',
    };
    return <span className={`${styles.badge} ${classe}`}>{labels[situacao] || situacao}</span>;
  };

  // 1. Filtragem Geral (Termo de Busca, Datas e Situação)
  const osFiltradasBase = osListGeral.filter(os => {
    let matchTermo = true;
    let matchData = true;
    let matchSituacao = true;

    if (termoBusca) {
      const termo = termoBusca.toLowerCase();
      matchTermo =
        (os.requisitante && os.requisitante.toLowerCase().includes(termo)) ||
        (os.codigo && os.codigo.toLowerCase().includes(termo)) ||
        (os.descricao && os.descricao.toLowerCase().includes(termo)) ||
        (os.setor && os.setor.toLowerCase().includes(termo)) ||
        (os.centroCusto && os.centroCusto.toLowerCase().includes(termo));
    }

    if (dataInicioBusca || dataFimBusca) {
      const dataOs = os.data; // formato YYYY-MM-DD
      if (dataInicioBusca && dataOs < dataInicioBusca) matchData = false;
      if (dataFimBusca && dataOs > dataFimBusca) matchData = false;
    }

    if (situacaoFiltro) {
      const normOS = (os.situacao || '').toUpperCase().trim().replace(/\s+/g, '_').normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const normFiltro = (situacaoFiltro || '').toUpperCase().trim().replace(/\s+/g, '_').normalize("NFD").replace(/[\u0300-\u036f]/g, "");

      if (situacaoFiltro === 'EM_ANDAMENTO_GERAL') {
        matchSituacao = normOS === 'EM_ANDAMENTO' || normOS === 'ATRIBUIDO_TECNICO' || normOS === 'PECAS_ENTREGUES' || normOS === 'A_EXECUTAR';
      } else if (situacaoFiltro === 'AGUARDANDO INSUMO') {
        matchSituacao = normOS === 'AGUARDANDO_INSUMO' || normOS === 'AGUARDANDO_ALMOXARIFADO';
      } else if (situacaoFiltro === 'CANCELADO') {
        matchSituacao = normOS === 'CANCELADO' || normOS === 'REJEITADO_DIRETORIA';
      } else if (situacaoFiltro === 'PENDENTE') {
        matchSituacao = normOS === 'AGUARDANDO_CHEFE_SETOR' || normOS === 'AGUARDANDO_GERENTE_SERVICOS' || normOS === 'AGUARDANDO_DIRETORIA' || normOS === 'PENDENTE';
      } else {
        matchSituacao = normOS === normFiltro;
      }
    }

    return matchTermo && matchData && matchSituacao;
  });

  // 2. Extrair setores disponíveis dentro dos filtros ativos
  const setoresDisponiveis = Array.from(
    new Set((setorFiltro ? osListGeral : osFiltradasBase).map(os => os.setor).filter(Boolean))
  ).sort();

  // 3. Métricas por Setor para Recharts (Respeita filtros de Data, Termo de Busca e Situação)
  const baseParaGrafico = setorFiltro
    ? osFiltradasBase.filter(os => os.setor === setorFiltro)
    : osFiltradasBase;

  const setoresParaGrafico = setorFiltro
    ? [setorFiltro]
    : Array.from(new Set(osFiltradasBase.map(os => os.setor).filter(Boolean))).sort();

  const estatisticasPorSetor = setoresParaGrafico.map(setor => {
    const osDoSetor = baseParaGrafico.filter(os => os.setor === setor);
    const totalSetor = osDoSetor.length;

    const contagemStatus = {
      concluido: osDoSetor.filter(os => {
        const s = (os.situacao || '').trim().replace(/\s+/g, '_');
        return s === CONCLUIDO;
      }).length,
      emAndamento: osDoSetor.filter(os => {
        const s = (os.situacao || '').trim().replace(/\s+/g, '_');
        return s === EM_ANDAMENTO || s === ATRIBUIDO_TECNICO || s === PECAS_ENTREGUES;
      }).length,
      pendente: osDoSetor.filter(os => {
        const s = (os.situacao || '').trim().replace(/\s+/g, '_');
        return FASE_1_TRIAGEM.includes(s) || s === 'A_EXECUTAR';
      }).length,
      aguardandoInsumo: osDoSetor.filter(os => {
        const s = (os.situacao || '').trim().replace(/\s+/g, '_');
        return s === AGUARDANDO_INSUMO || s === AGUARDANDO_ALMOXARIFADO;
      }).length,
      cancelado: osDoSetor.filter(os => {
        const s = (os.situacao || '').trim().replace(/\s+/g, '_');
        return s === CANCELADO || s === REJEITADO_DIRETORIA;
      }).length,
    };

    return {
      setor,
      total: totalSetor,
      contagemStatus
    };
  });

  // Dados formatados para o Recharts BarChart (Dinâmico)
  const rechartsData = estatisticasPorSetor
    .map(({ setor, total, contagemStatus }) => ({
      setor: setor,
      'Concluído': contagemStatus.concluido || 0,
      'Em Andamento': (contagemStatus.emAndamento || 0) + (contagemStatus.pendente || 0),
      'Aguardando Insumo': contagemStatus.aguardandoInsumo || 0,
      'Cancelado': contagemStatus.cancelado || 0,
      totalOS: total
    }))
    .filter(item => item.totalOS > 0)
    .sort((a, b) => b.totalOS - a.totalOS);

  // 4. Lista Final da Tabela (Filtra por Setor se selecionado)
  const osListFiltrada = setorFiltro
    ? osFiltradasBase.filter(os => os.setor === setorFiltro)
    : osFiltradasBase;

  // 5. KPIs Dinâmicos baseados na seleção atual
  const osBaseKPI = setorFiltro
    ? osListGeral.filter(os => os.setor === setorFiltro)
    : osListGeral;

  const totalOSCount = osBaseKPI.length;
  const emAndamentoCount = osBaseKPI.filter(os => {
    const s = (os.situacao || '').trim().replace(/\s+/g, '_');
    return s === EM_ANDAMENTO || s === ATRIBUIDO_TECNICO || s === PECAS_ENTREGUES || s === 'EM_ANDAMENTO';
  }).length;

  const aguardandoInsumoCount = osBaseKPI.filter(os => {
    const s = (os.situacao || '').trim().replace(/\s+/g, '_');
    return s === AGUARDANDO_INSUMO || s === AGUARDANDO_ALMOXARIFADO;
  }).length;

  const concluidoCount = osBaseKPI.filter(os => {
    const s = (os.situacao || '').trim().replace(/\s+/g, '_');
    return s === CONCLUIDO;
  }).length;

  const canceladoCount = osBaseKPI.filter(os => {
    const s = (os.situacao || '').trim().replace(/\s+/g, '_');
    return s === CANCELADO || s === REJEITADO_DIRETORIA;
  }).length;

  // Ordenar lista final pelo CÓDIGO de forma cronológica decrescente: Ano -> Mês -> Número da O.S.
  osListFiltrada.sort((a, b) => {
    const parseCod = (os) => {
      const cod = os?.codigo || '';
      // Formato padrão: NUM-MMAA (ex: 01-0926, 162-0826)
      const match = cod.match(/^(\d+)-(\d{2})(\d{2})$/);
      if (match) {
        return {
          num: parseInt(match[1], 10) || 0,
          mes: parseInt(match[2], 10) || 0,
          ano: parseInt(match[3], 10) || 0,
          ts: os.dataCriacao ? new Date(os.dataCriacao).getTime() : 0
        };
      }
      const rawNum = parseInt((cod.match(/^(\d+)/) || [])[1], 10) || 0;
      const ts = os.dataCriacao ? new Date(os.dataCriacao).getTime() : 0;
      return { num: rawNum, mes: 0, ano: 0, ts };
    };

    const pA = parseCod(a);
    const pB = parseCod(b);

    // 1. Comparar Ano (ex: 2026 > 2025)
    if (pB.ano !== pA.ano) return pB.ano - pA.ano;

    // 2. Comparar Mês (ex: Setembro (09) > Agosto (08))
    if (pB.mes !== pA.mes) return pB.mes - pA.mes;

    // 3. Se for do mesmo mês e ano, ordenar pelo número da OS decrescente (ex: 03-0926 > 02-0926 > 01-0926)
    if (pB.num !== pA.num) return pB.num - pA.num;

    // 4. Fallback por data de criação
    return pB.ts - pA.ts;
  });

  // Helper unificado para calcular custo de peças da OS (seja consumíveis diretos ou turnos)
  const calcularCustoOS = (os) => {
    let total = (os.consumiveis || []).reduce((sum, item) => sum + (parseMoeda(item.quantidade) * parseMoeda(item.valor_unitario)), 0);
    if (total === 0 && os.servicosExecutados && Array.isArray(os.servicosExecutados)) {
      os.servicosExecutados.forEach(s => {
        (s.pecasUtilizadas || []).forEach(p => {
          total += parseMoeda(p.quantidade) * parseMoeda(p.valor_unitario);
        });
      });
    }
    return total;
  };

  // Custo Total de Peças da seleção/filtro ATUAL (Recalcula com qualquer busca, data, setor ou status)
  const custoTotalPecas = osListFiltrada.reduce((acc, os) => acc + calcularCustoOS(os), 0);


  return (
    <div className={`${styles.card} ${styles.animateFadeIn}`} style={{ animationDelay: '0.1s' }}>
      {/* Cabeçalho */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <h2 className={styles.cardTitle} style={{ marginBottom: 0 }}>
          <PieChart size={22} color="var(--cor-destaque)" />
          Relatório Dinâmico & Gestão de Ordens de Serviço
        </h2>
        <div className={styles.actionsHeader}>

          {onNovoClick && (
            <button
              type="button"
              onClick={onNovoClick}
              style={{
                backgroundColor: 'var(--cor-destaque)',
                color: 'var(--cor-texto-inverso, #fff)',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 16px',
                fontWeight: '600',
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(255, 107, 0, 0.25)',
                transition: 'all 0.2s ease'
              }}
            >
              <Plus size={18} />
              Criar Nova O.S.
            </button>
          )}
        </div>
      </div>

      {/* Cards KPI / Resumo Geral */}
      <div className={styles.kpiGrid}>
        <div
          className={`${styles.kpiCard} ${situacaoFiltro === '' && setorFiltro === '' ? styles.kpiCardActive : ''}`}
          onClick={() => { setSituacaoFiltro(''); setSetorFiltro(''); }}
          title="Clique para ver todas as O.S."
        >
          <div className={styles.kpiIconBox} style={{ backgroundColor: 'rgba(255, 107, 0, 0.1)', color: 'var(--cor-destaque)' }}>
            <Layers size={22} />
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiValue}>{totalOSCount}</span>
            <span className={styles.kpiLabel}>
              Total O.S.
              {setorFiltro && (
                <span style={{ display: 'block', fontSize: '0.55rem', color: 'var(--cor-destaque)', fontWeight: '600', marginTop: '1px', textTransform: 'uppercase', opacity: 0.9 }}>
                  ({setorFiltro})
                </span>
              )}
            </span>
          </div>
        </div>

        <div
          className={`${styles.kpiCard} ${situacaoFiltro === 'EM_ANDAMENTO_GERAL' ? styles.kpiCardActive : ''}`}
          onClick={() => setSituacaoFiltro(situacaoFiltro === 'EM_ANDAMENTO_GERAL' ? '' : 'EM_ANDAMENTO_GERAL')}
          title="Clique para filtrar O.S. Em Andamento"
        >
          <div className={styles.kpiIconBox} style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
            <Clock size={22} />
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiValue}>{emAndamentoCount}</span>
            <span className={styles.kpiLabel}>
              Em Andamento
              {setorFiltro && (
                <span style={{ display: 'block', fontSize: '0.55rem', color: 'var(--cor-destaque)', fontWeight: '600', marginTop: '1px', textTransform: 'uppercase', opacity: 0.9 }}>
                  ({setorFiltro})
                </span>
              )}
            </span>
          </div>
        </div>

        <div
          className={`${styles.kpiCard} ${situacaoFiltro === 'AGUARDANDO INSUMO' ? styles.kpiCardActive : ''}`}
          onClick={() => setSituacaoFiltro(situacaoFiltro === 'AGUARDANDO INSUMO' ? '' : 'AGUARDANDO INSUMO')}
          title="Clique para filtrar O.S. Aguardando Insumos"
        >
          <div className={styles.kpiIconBox} style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
            <AlertTriangle size={22} />
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiValue}>{aguardandoInsumoCount}</span>
            <span className={styles.kpiLabel}>
              Aguardando Insumo
              {setorFiltro && (
                <span style={{ display: 'block', fontSize: '0.55rem', color: 'var(--cor-destaque)', fontWeight: '600', marginTop: '1px', textTransform: 'uppercase', opacity: 0.9 }}>
                  ({setorFiltro})
                </span>
              )}
            </span>
          </div>
        </div>

        <div
          className={`${styles.kpiCard} ${situacaoFiltro === 'CONCLUÍDO' ? styles.kpiCardActive : ''}`}
          onClick={() => setSituacaoFiltro(situacaoFiltro === 'CONCLUÍDO' ? '' : 'CONCLUÍDO')}
          title="Clique para filtrar O.S. Concluídas"
        >
          <div className={styles.kpiIconBox} style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
            <CheckCircle2 size={22} />
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiValue}>{concluidoCount}</span>
            <span className={styles.kpiLabel}>
              Concluídas
              {setorFiltro && (
                <span style={{ display: 'block', fontSize: '0.55rem', color: 'var(--cor-destaque)', fontWeight: '600', marginTop: '1px', textTransform: 'uppercase', opacity: 0.9 }}>
                  ({setorFiltro})
                </span>
              )}
            </span>
          </div>
        </div>

        <div
          className={`${styles.kpiCard} ${situacaoFiltro === 'CANCELADO' ? styles.kpiCardActive : ''}`}
          onClick={() => setSituacaoFiltro(situacaoFiltro === 'CANCELADO' ? '' : 'CANCELADO')}
          title="Clique para filtrar O.S. Canceladas"
        >
          <div className={styles.kpiIconBox} style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
            <XCircle size={22} />
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiValue}>{canceladoCount}</span>
            <span className={styles.kpiLabel}>
              Canceladas
              {setorFiltro && (
                <span style={{ display: 'block', fontSize: '0.55rem', color: 'var(--cor-destaque)', fontWeight: '600', marginTop: '1px', textTransform: 'uppercase', opacity: 0.9 }}>
                  ({setorFiltro})
                </span>
              )}
            </span>
          </div>
        </div>

        {/* Card Adicional: Custo Total das Peças do Filtro (Exclusivo para Admin) */}
        {isAdmin && (
          <div
            className={styles.kpiCard}
            style={{ borderColor: 'var(--cor-destaque)', backgroundColor: 'rgba(255, 107, 0, 0.05)', cursor: 'pointer' }}
            title="Clique para ocultar/mostrar o valor do custo total"
            onClick={() => setMostrarCusto(!mostrarCusto)}
          >
            <div className={styles.kpiIconBox} style={{ backgroundColor: 'var(--cor-destaque)', color: '#fff' }}>
              <DollarSign size={22} />
            </div>
            <div className={styles.kpiInfo}>
              <span
                className={styles.kpiValue}
                style={{
                  color: 'var(--cor-destaque)',
                  fontSize: '1.25rem',
                  filter: mostrarCusto ? 'none' : 'blur(6px)',
                  transition: 'filter 0.3s ease',
                  userSelect: mostrarCusto ? 'auto' : 'none'
                }}
              >
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(custoTotalPecas)}
              </span>
              <span className={styles.kpiLabel}>
                Custo Total Peças
                {setorFiltro && (
                  <span style={{ display: 'block', fontSize: '0.55rem', color: 'var(--cor-destaque)', fontWeight: '600', marginTop: '1px', textTransform: 'uppercase', opacity: 0.9 }}>
                    ({setorFiltro})
                  </span>
                )}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Painel Gráfico Recharts / Distribuição por Setor */}
      <div className={styles.sectorSection}>
        <div className={styles.sectorHeader}>
          <h3 className={styles.sectorTitle}>
            <BarChart2 size={20} color="var(--cor-destaque)" />
            Distribuição e O.S. Abertas por Setor
            {setorFiltro && (
              <span style={{
                fontSize: '0.8rem',
                backgroundColor: 'rgba(255, 107, 0, 0.15)',
                color: 'var(--cor-destaque)',
                border: '1px solid var(--cor-destaque)',
                padding: '4px 12px',
                borderRadius: '20px',
                fontWeight: '700',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                marginLeft: '8px',
                boxShadow: '0 2px 8px rgba(255, 107, 0, 0.2)'
              }}>
                <Filter size={14} />
                Filtrado por: <span style={{ textDecoration: 'underline', textTransform: 'uppercase' }}>{setorFiltro}</span>
              </span>
            )}
          </h3>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              type="button"
              className={styles.clearFilterBtn}
              onClick={() => setMostrarGrafico(!mostrarGrafico)}
              title={mostrarGrafico ? "Ocultar Gráfico" : "Mostrar Gráfico"}
            >
              <BarChart2 size={14} style={{ display: 'inline', marginRight: '4px' }} />
              {mostrarGrafico ? "Ocultar Gráfico" : "Mostrar Gráfico"}
            </button>

            {setorFiltro && (
              <button
                type="button"
                className={styles.clearFilterBtn}
                onClick={() => setSetorFiltro('')}
              >
                <RotateCcw size={14} style={{ display: 'inline', marginRight: '4px' }} />
                Ver Todos os Setores
              </button>
            )}
          </div>
        </div>

        {!mostrarGrafico ? null : rechartsData.length === 0 ? (
          <div style={{ fontSize: '0.85rem', color: 'var(--cor-texto-secundario)', textAlign: 'center', padding: '10px' }}>
            Nenhum setor registrado nas O.S. cadastradas.
          </div>
        ) : (
          /* Gráfico Recharts Clicável e Compacto */
          <div style={{
            width: '100%',
            height: Math.max(180, rechartsData.length * 38),
            maxHeight: '380px',
            overflowY: rechartsData.length > 8 ? 'auto' : 'visible',
            paddingRight: '6px'
          }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={180} debounce={50}>
              <BarChart
                layout="vertical"
                data={rechartsData}
                barSize={16}
                margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                onClick={(state) => {
                  if (state && state.activePayload && state.activePayload.length > 0) {
                    const setorClicado = state.activePayload[0].payload.setor;
                    setSetorFiltro(prev => prev === setorClicado ? '' : setorClicado);
                  }
                }}
              >
                <XAxis type="number" stroke="var(--cor-texto-secundario)" fontSize={11} />
                <YAxis
                  dataKey="setor"
                  type="category"
                  stroke="var(--cor-texto-principal)"
                  fontSize={9}
                  width={160}
                  style={{ cursor: 'pointer', fontWeight: 'bold' }}
                  onClick={(e) => {
                    if (e && e.value) {
                      setSetorFiltro(prev => prev === e.value ? '' : e.value);
                    }
                  }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--cor-fundo-cartao)',
                    borderColor: 'var(--cor-borda-cartao)',
                    borderRadius: '8px',
                    color: 'var(--cor-texto-principal)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                  }}
                />
                <Legend wrapperStyle={{ paddingTop: '4px', fontSize: '0.75rem' }} />
                <Bar
                  dataKey="Concluído"
                  stackId="a"
                  fill="#10b981"
                  cursor="pointer"
                  onClick={(entry) => entry && entry.setor && setSetorFiltro(prev => prev === entry.setor ? '' : entry.setor)}
                />
                <Bar
                  dataKey="Em Andamento"
                  stackId="a"
                  fill="#3b82f6"
                  cursor="pointer"
                  onClick={(entry) => entry && entry.setor && setSetorFiltro(prev => prev === entry.setor ? '' : entry.setor)}
                />
                <Bar
                  dataKey="Aguardando Insumo"
                  stackId="a"
                  fill="#f59e0b"
                  cursor="pointer"
                  onClick={(entry) => entry && entry.setor && setSetorFiltro(prev => prev === entry.setor ? '' : entry.setor)}
                />
                <Bar
                  dataKey="Cancelado"
                  stackId="a"
                  fill="#ef4444"
                  radius={[0, 4, 4, 0]}
                  cursor="pointer"
                  onClick={(entry) => entry && entry.setor && setSetorFiltro(prev => prev === entry.setor ? '' : entry.setor)}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Barra de Pesquisa e Filtros Avançados */}
      <div className={styles.searchBar}>
        <div className={styles.searchGroup}>
          <label className={styles.searchLabel}>Buscar O.S</label>
          <div className={styles.relativeContainer}>
            <Search size={16} className={styles.searchIcon} />
            <input
              type="text"
              className={`${styles.searchInput} ${styles.searchInputIconPadding}`}
              placeholder="Digite código, Requisitante, Descrição, Setor"
              value={termoBusca}
              onChange={e => setTermoBusca(e.target.value)}
            />
          </div>
        </div>

        <div className={styles.searchGroup} style={{ flex: '0 1 auto', minWidth: '160px' }}>
          <label className={styles.searchLabel}>Filtrar por Setor</label>
          <select
            className={styles.searchInput}
            value={setorFiltro}
            onChange={e => setSetorFiltro(e.target.value)}
          >
            <option value="">Todos os Setores</option>
            {setoresDisponiveis.map(setor => (
              <option key={setor} value={setor}>{setor}</option>
            ))}
          </select>
        </div>

        <div className={styles.searchGroup} style={{ flex: '0 1 auto', minWidth: '160px' }}>
          <label className={styles.searchLabel}>Filtrar por Situação</label>
          <select
            className={styles.searchInput}
            value={situacaoFiltro}
            onChange={e => setSituacaoFiltro(e.target.value)}
          >
            <option value="">Todas as Situações</option>
            <option value="PENDENTE">PENDENTE</option>
            <option value="À EXECUTAR">À EXECUTAR</option>
            <option value="EM ANDAMENTO">EM ANDAMENTO</option>
            <option value="AGUARDANDO INSUMO">AGUARDANDO INSUMO</option>
            <option value="CONCLUÍDO">CONCLUÍDO</option>
            <option value="CANCELADO">CANCELADO</option>
          </select>
        </div>

        <div className={`${styles.searchGroup} ${styles.searchGroupDate}`}>
          <label className={styles.searchLabel}>Data Inicial</label>
          <div className={styles.relativeContainer}>
            <input
              type="date"
              className={styles.searchInput}
              value={dataInicioBusca}
              onChange={e => setDataInicioBusca(e.target.value)}
            />
          </div>
        </div>

        <div className={`${styles.searchGroup} ${styles.searchGroupDate}`}>
          <label className={styles.searchLabel}>Data Final</label>
          <div className={styles.relativeContainer}>
            <input
              type="date"
              className={styles.searchInput}
              value={dataFimBusca}
              onChange={e => setDataFimBusca(e.target.value)}
            />
          </div>
        </div>

        {(setorFiltro || situacaoFiltro || termoBusca || dataInicioBusca || dataFimBusca) && (
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button
              type="button"
              className={styles.clearFilterBtn}
              style={{ padding: '8px 12px' }}
              onClick={() => {
                setTermoBusca('');
                setDataInicioBusca('');
                setDataFimBusca('');
                setSetorFiltro('');
                setSituacaoFiltro('');
              }}
            >
              <RotateCcw size={14} style={{ display: 'inline', marginRight: '4px' }} />
              Limpar Filtros
            </button>
          </div>
        )}
      </div>

      {/* Tabela de Dados */}
      <div className={styles.tableContainer}>
        {osListFiltrada.length === 0 ? (
          <div className={styles.emptyState}>
            Nenhuma Ordem de Serviço encontrada com esses filtros.
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>CÓDIGO</th>
                <th>DATA</th>
                <th>HORA</th>
                <th>REQUISITANTE</th>
                <th>COMPLEXIDADE</th>
                <th>PRIORIDADE</th>
                <th>SETOR</th>
                <th>C. DE CUSTO ALVO</th>
                <th>PRAZO</th>
                <th>TIPO</th>
                <th>SITUAÇÃO</th>
                {isAdmin && <th>CUSTO PEÇAS</th>}
                <th>DESCRIÇÃO DO SERVIÇO</th>
                <th>AÇÕES</th>
              </tr>
            </thead>
            <tbody>
              {osListFiltrada.map((os, index) => {
                const dataFormatada = os.data ? os.data.split('-').reverse().join('/') : '';
                const prazoFormatado = os.prazo ? os.prazo.split('-').reverse().join('/') : '';

                return (
                  <tr
                    key={os.id || (os.codigo ? `${os.codigo}-${index}` : index)}
                    onClick={() => onRowClick && onRowClick(os)}
                    className={styles.tableRow}
                    title="Clique para gerenciar esta O.S."
                  >
                    <td className={styles.tdBold}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'nowrap' }}>
                         <span>{os.codigo}</span>
                        {(os.origemApontamento === 'COLABORADOR' || os.origemApontamento === 'TOTEM' || os.preenchidoNoTotem) && (
                          <span className={styles.badgeTotem} title="Apontamento realizado pelo Colaborador">
                            <UserCheck size={11} />
                          </span>
                        )}
                      </div>
                    </td>
                    <td>{dataFormatada}</td>
                    <td>{os.hora}</td>
                    <td className={styles.truncateRequisitante} title={os.requisitante}>{os.requisitante}</td>
                    <td>{os.complexidade}</td>
                    <td>{renderPrioridadeBadge(os.prioridade)}</td>
                    <td className={styles.truncateSetor} title={os.setor}><strong>{os.setor}</strong></td>
                    <td className={styles.truncateCentroCusto} title={os.centroCusto}>{os.centroCusto}</td>
                    <td>{prazoFormatado}</td>
                    <td>{os.tipo}</td>
                    <td>{renderSituacaoBadge(os.situacao)}</td>
                    {isAdmin && (
                      <td style={{ fontWeight: '600', color: calcularCustoOS(os) > 0 ? 'var(--cor-destaque)' : 'var(--cor-texto-secundario)' }}>
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                          calcularCustoOS(os)
                        )}
                      </td>
                    )}
                    <td className={styles.truncateDescricao} title={os.descricao}>
                      {os.descricao}
                    </td>
                    <td>
                      <div className={styles.actionsContainer}>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); onPrint && onPrint(os); }}
                          className={styles.printButton}
                          title="Imprimir Frente da O.S."
                        >
                          <Printer size={18} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); onPrint && onPrint({ ...os, somenteVerso: true }); }}
                          className={styles.printButton}
                          title="Imprimir Apenas Verso da O.S."
                        >
                          <Layers size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default TabelaOS;
