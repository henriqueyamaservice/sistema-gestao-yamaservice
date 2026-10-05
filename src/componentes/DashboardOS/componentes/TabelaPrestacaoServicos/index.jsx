import React, { useState, useMemo } from 'react';
import { 
  Search, Plus, Printer, FileText, Calendar, Filter, 
  DollarSign, Users, Wrench, Package, Truck, CheckCircle, Clock, RotateCcw 
} from 'lucide-react';
import styles from './index.module.css';

const LISTA_GRANJAS = [
  'G. KAWAMURA',
  'G. ITA',
  'G. MOSQUEIRO',
  'G. GENIPAUBA',
  'G. CAMPINA',
  'G. AGUA BRANCA',
  'G. CASTANHEIRA',
  'G. GUARIMÃ',
  'G. SÃO CAETANO',
  'G. AVICEMA',
  'G. KIMURA'
];

const formatarDataBR = (d) => {
  if (!d) return '-';
  if (d.includes('/')) return d;
  const parts = d.split('T')[0].split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return d;
};

// Helper para extrair todos os itens de uma OS de prestação (suporta modelo direto e turnos)
const extrairItensPrestacao = (os) => {
  if (!os) return [];
  let itens = Array.isArray(os.itensPrestacao) ? [...os.itensPrestacao] : [];
  if (Array.isArray(os.turnosPrestacao)) {
    os.turnosPrestacao.forEach(t => {
      if (Array.isArray(t.itens)) {
        itens.push(...t.itens);
      }
    });
  }
  return itens;
};

const TabelaPrestacaoServicos = ({ osList = [], onRowClick, onPrint, onNovoClick }) => {
  const currentUser = useMemo(() => {
    try {
      const saved = localStorage.getItem('almoxarifado_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  }, []);
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'administrador';

  const [busca, setBusca] = useState('');
  const [granjaFiltro, setGranjaFiltro] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [statusFiltro, setStatusFiltro] = useState('');

  // Filtra apenas ordens de serviço do tipo PRESTACAO_SERVICO ou que possuam itensPrestacao gravados
  const osPrestacaoList = useMemo(() => {
    return osList.filter(os => {
      const isTipoPrestacao = os.tipo === 'PRESTACAO_SERVICO' || os.isPrestacaoServico === true || os.modalidade === 'PRESTACAO_SERVICO';
      const temItensPrestacao = Array.isArray(os.itensPrestacao) && os.itensPrestacao.length > 0;
      return isTipoPrestacao || temItensPrestacao;
    });
  }, [osList]);

  // Aplicação dos filtros do usuário
  const osFiltradas = useMemo(() => {
    const listaFiltrada = osPrestacaoList.filter(os => {
      // 1. Busca textual
      if (busca) {
        const termo = busca.toLowerCase();
        const matchCodigo = (os.codigo || '').toLowerCase().includes(termo);
        const matchGranja = (os.centroCusto || os.unidadeDestino || '').toLowerCase().includes(termo);
        const matchReq = (os.requisitante || '').toLowerCase().includes(termo);
        const matchResp = (os.executor || os.tecnicoResponsavel || os.responsavel || '').toLowerCase().includes(termo);
        const matchMotivo = (os.motivo || os.descricao || '').toLowerCase().includes(termo);

        if (!matchCodigo && !matchGranja && !matchReq && !matchResp && !matchMotivo) {
          return false;
        }
      }

      // 2. Filtro de Granja
      if (granjaFiltro) {
        const granjaOS = (os.centroCusto || os.unidadeDestino || '').toUpperCase();
        if (granjaOS !== granjaFiltro.toUpperCase()) return false;
      }

      // 3. Filtro de Tipo de Manutenção (Corretiva, Preventiva, Implantação, Periódico)
      if (tipoFiltro) {
        const tipoOS = (os.tipoServico || os.tipoManutencao || (os.tipo !== 'PRESTACAO_SERVICO' ? os.tipo : '') || 'CORRETIVA').toUpperCase();
        if (!tipoOS.includes(tipoFiltro.toUpperCase())) return false;
      }

      // 4. Filtro por Data
      if (dataInicio) {
        const dataOS = os.data ? os.data.split('T')[0] : '';
        if (dataOS < dataInicio) return false;
      }
      if (dataFim) {
        const dataOS = os.data ? os.data.split('T')[0] : '';
        if (dataOS > dataFim) return false;
      }

      // 5. Filtro por Status / Resultado
      if (statusFiltro) {
        const resNorm = (os.resultado || os.situacao || '').toUpperCase();
        if (statusFiltro === 'EXECUTADA' && !resNorm.includes('EXECUTAD') && !resNorm.includes('CONCLU')) return false;
        if (statusFiltro === 'EM ANDAMENTO' && !resNorm.includes('ANDAMENTO')) return false;
        if (statusFiltro === 'CANCELADA' && !resNorm.includes('CANCEL')) return false;
      }

      return true;
    });

    // Ordenar lista final pelo CÓDIGO de forma cronológica decrescente: Ano -> Mês -> Número da O.S. (Igual à TabelaOS)
    listaFiltrada.sort((a, b) => {
      const parseCod = (os) => {
        const cod = (os?.codigo || '').replace(/^#/, '');
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

      if (pB.ano !== pA.ano) return pB.ano - pA.ano;
      if (pB.mes !== pA.mes) return pB.mes - pA.mes;
      if (pB.num !== pA.num) return pB.num - pA.num;
      return pB.ts - pA.ts;
    });

    return listaFiltrada;
  }, [osPrestacaoList, busca, granjaFiltro, tipoFiltro, dataInicio, dataFim, statusFiltro]);

  // Métricas / KPIs (Contabilizadas apenas quando a O.S. estiver concluída/executada)
  const kpis = useMemo(() => {
    let totalFaturamento = 0;
    let totalHorasHH = 0;
    let totalHorasTRA = 0;
    let totalVEI = 0;
    let totalAtendimentosConcluidos = 0;

    osFiltradas.forEach(os => {
      const resNorm = (os.resultado || os.situacao || '').toUpperCase();
      const isConcluida = resNorm.includes('EXECUTAD') || resNorm.includes('CONCLU') || os.situacao === 'CONCLUIDO' || os.resultado === 'EXECUTADA';

      // Somente contabiliza quando a O.S. for concluída
      if (!isConcluida) return;

      totalAtendimentosConcluidos += 1;

      const itens = extrairItensPrestacao(os);
      let somaOS = 0;

      itens.forEach(item => {
        const q = parseFloat(item.quantidade) || 0;
        const v = parseFloat(item.valorUnitario) || 0;
        const tot = parseFloat(item.total) || (q * v);
        somaOS += tot;

        if (item.tipo === 'HH') totalHorasHH += q;
        if (item.tipo === 'TRA') totalHorasTRA += q;
        if (item.tipo === 'VEI') totalVEI += (q > 0 ? q : 1);
      });

      if (somaOS === 0 && os.valorEstimado) {
        somaOS = parseFloat(os.valorEstimado) || 0;
      }

      totalFaturamento += somaOS;
    });

    return {
      faturamento: totalFaturamento,
      horasHH: totalHorasHH,
      horasTRA: totalHorasTRA,
      totalVEI: totalVEI,
      totalOS: totalAtendimentosConcluidos
    };
  }, [osFiltradas]);

  return (
    <div className={styles.card}>
      {/* Cabeçalho no estilo TabelaOS */}
      <div className={styles.cardHeader}>
        <div className={styles.cardTitle}>
          <FileText size={20} color="var(--cor-destaque)" />
          <span>Prestação de Serviços (Granjas)</span>
          <span className={styles.badgeContador}>{osFiltradas.length} O.S.</span>
        </div>

        <button 
          type="button" 
          className={styles.btnNovo} 
          onClick={onNovoClick}
          title="Abrir Nova Ordem de Serviço de Prestação de Serviços"
        >
          <Plus size={16} />
          Nova Prestação de Serviço
        </button>
      </div>

      {/* Cards de Resumo Estatístico (KPIs) */}
      <div className={styles.kpiGrid}>
        {isAdmin && (
          <div className={styles.kpiCard}>
            <div className={styles.kpiIconBox} style={{ backgroundColor: 'rgba(255, 107, 0, 0.1)', color: 'var(--cor-destaque)' }}>
              <DollarSign size={20} />
            </div>
            <div className={styles.kpiInfo}>
              <span className={styles.kpiValue}>
                R$ {kpis.faturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className={styles.kpiLabel}>Total Faturado</span>
            </div>
          </div>
        )}

        <div className={styles.kpiCard}>
          <div className={styles.kpiIconBox} style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
            <Users size={20} />
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiValue}>
              {kpis.horasHH.toFixed(1)}h
            </span>
            <span className={styles.kpiLabel}>Horas Homem (HH)</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIconBox} style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
            <Wrench size={20} />
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiValue}>
              {kpis.horasTRA.toFixed(1)}h
            </span>
            <span className={styles.kpiLabel}>Horas Trator (TRA)</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIconBox} style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}>
            <Truck size={20} />
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiValue}>
              {Number.isInteger(kpis.totalVEI) ? kpis.totalVEI : kpis.totalVEI.toFixed(1)}
            </span>
            <span className={styles.kpiLabel}>Veículos (VEI)</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIconBox} style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
            <CheckCircle size={20} />
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiValue}>
              {kpis.totalOS}
            </span>
            <span className={styles.kpiLabel}>Atendimentos</span>
          </div>
        </div>
      </div>

      {/* Barra de Pesquisa e Filtros no estilo TabelaOS */}
      <div className={styles.searchBar}>
        <div className={styles.searchGroup}>
          <label className={styles.searchLabel}>Buscar Prestação de Serviço</label>
          <div className={styles.relativeContainer}>
            <Search size={15} className={styles.searchIcon} />
            <input
              type="text"
              className={`${styles.searchInput} ${styles.searchInputIconPadding}`}
              placeholder="Digite código, granja, requisitante ou serviço..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
        </div>

        <div className={`${styles.searchGroup} ${styles.searchGroupFixed}`}>
          <label className={styles.searchLabel}>Filtrar por Granja</label>
          <select
            className={styles.searchInput}
            value={granjaFiltro}
            onChange={(e) => setGranjaFiltro(e.target.value)}
          >
            <option value="">Todas as Granjas</option>
            {LISTA_GRANJAS.map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>

        <div className={`${styles.searchGroup} ${styles.searchGroupFixed}`}>
          <label className={styles.searchLabel}>Tipo de Manutenção</label>
          <select
            className={styles.searchInput}
            value={tipoFiltro}
            onChange={(e) => setTipoFiltro(e.target.value)}
          >
            <option value="">Todos os Tipos</option>
            <option value="CORRETIVA">Corretiva</option>
            <option value="PREVENTIVA">Preventiva</option>
            <option value="IMPLANTAÇÃO">Implantação</option>
            <option value="PERIODICO">Periódico</option>
          </select>
        </div>

        <div className={`${styles.searchGroup} ${styles.searchGroupFixed}`}>
          <label className={styles.searchLabel}>Filtrar por Status</label>
          <select
            className={styles.searchInput}
            value={statusFiltro}
            onChange={(e) => setStatusFiltro(e.target.value)}
          >
            <option value="">Todos os Status</option>
            <option value="EXECUTADA">Executada</option>
            <option value="EM ANDAMENTO">Em Andamento</option>
            <option value="CANCELADA">Cancelada</option>
          </select>
        </div>

        <div className={`${styles.searchGroup} ${styles.searchGroupDate}`}>
          <label className={styles.searchLabel}>Data Inicial</label>
          <div className={styles.relativeContainer}>
            <input
              type="date"
              className={styles.searchInput}
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
            />
          </div>
        </div>

        <div className={`${styles.searchGroup} ${styles.searchGroupDate}`}>
          <label className={styles.searchLabel}>Data Final</label>
          <div className={styles.relativeContainer}>
            <input
              type="date"
              className={styles.searchInput}
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
            />
          </div>
        </div>

        {(busca || granjaFiltro || tipoFiltro || statusFiltro || dataInicio || dataFim) && (
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button
              type="button"
              className={styles.clearFilterBtn}
              onClick={() => {
                setBusca('');
                setGranjaFiltro('');
                setTipoFiltro('');
                setStatusFiltro('');
                setDataInicio('');
                setDataFim('');
              }}
              title="Limpar todos os filtros"
            >
              <RotateCcw size={14} />
              Limpar Filtros
            </button>
          </div>
        )}
      </div>

      {/* Tabela de Dados no estilo TabelaOS */}
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>CÓDIGO</th>
              <th>TIPO</th>
              <th>GRANJA / DESTINO</th>
              <th>DATA</th>
              <th>REQUISITANTE</th>
              <th>RESPONSÁVEL</th>
              <th>SERVIÇO EXECUTADO</th>
              <th>RECURSOS LANÇADOS</th>
              {isAdmin && <th style={{ textAlign: 'right' }}>TOTAL GERAL</th>}
              <th style={{ textAlign: 'center' }}>RESULTADO</th>
              <th style={{ textAlign: 'center' }}>AÇÕES</th>
            </tr>
          </thead>
          <tbody>
            {osFiltradas.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? "11" : "10"} className={styles.emptyState}>
                  Nenhuma Ordem de Prestação de Serviços encontrada com os filtros selecionados.
                </td>
              </tr>
            ) : (
              osFiltradas.map((os) => {
                const itens = extrairItensPrestacao(os);
                
                // Contabiliza tipos de itens
                const countHH = itens.filter(i => i.tipo === 'HH').length;
                const countTRA = itens.filter(i => i.tipo === 'TRA').length;
                const countMAT = itens.filter(i => i.tipo === 'MAT').length;
                const countVEI = itens.filter(i => i.tipo === 'VEI').length;

                // Totalizador
                const totalItemSoma = itens.reduce((acc, i) => {
                  const q = parseFloat(i.quantidade) || 0;
                  const v = parseFloat(i.valorUnitario) || 0;
                  return acc + (parseFloat(i.total) || (q * v));
                }, 0);

                const totalExibir = totalItemSoma > 0 ? totalItemSoma : (parseFloat(os.valorEstimado) || 0);

                const resNorm = (os.resultado || os.situacao || 'EM ANDAMENTO').toUpperCase();
                const badgeClass = 
                  resNorm.includes('EXECUTAD') || resNorm.includes('CONCLU') ? styles.badgeSuccess :
                  resNorm.includes('CANCEL') ? styles.badgeDanger : styles.badgeInfo;

                const tipoManut = (os.tipoServico || os.tipoManutencao || (os.tipo !== 'PRESTACAO_SERVICO' ? os.tipo : 'CORRETIVA')).toUpperCase();
                const getBadgeTipoClass = (tipo) => {
                  if (tipo.includes('CORRETIV')) return styles.badgeTipoCorretiva;
                  if (tipo.includes('PREVENTIV')) return styles.badgeTipoPreventiva;
                  if (tipo.includes('IMPLANTA')) return styles.badgeTipoImplantacao;
                  if (tipo.includes('PERIODIC')) return styles.badgeTipoPeriodico;
                  return styles.badgeTipoDefault;
                };

                return (
                  <tr 
                    key={os.codigo || os.id} 
                    className={styles.tableRow} 
                    onClick={() => onRowClick && onRowClick(os)}
                    title="Clique para gerenciar esta Prestação de Serviço"
                  >
                    <td className={styles.tdBold}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'nowrap' }}>
                        <span>{os.codigo}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`${styles.badgeTipo} ${getBadgeTipoClass(tipoManut)}`}>
                        {tipoManut}
                      </span>
                    </td>
                    <td className={styles.granjaCol}>{os.centroCusto || os.unidadeDestino || '-'}</td>
                    <td>
                      {(() => {
                        const qtdDias = Array.isArray(os.turnosPrestacao) && os.turnosPrestacao.length > 0 ? os.turnosPrestacao.length : 1;
                        const dIni = os.dataInicio || os.data;
                        const dFim = os.dataFim || os.data;
                        if (dIni && dFim && dIni !== dFim) {
                          return (
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span>{formatarDataBR(dIni)} a {formatarDataBR(dFim)}</span>
                              <span style={{ fontSize: '0.68rem', color: 'var(--cor-destaque)', fontWeight: 'bold' }}>({qtdDias} dias)</span>
                            </div>
                          );
                        }
                        return (
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span>{formatarDataBR(os.data)}</span>
                            {qtdDias > 1 && <span style={{ fontSize: '0.68rem', color: 'var(--cor-destaque)', fontWeight: 'bold' }}>({qtdDias} dias)</span>}
                          </div>
                        );
                      })()}
                    </td>
                    <td className={styles.truncateCell} title={os.requisitante}>{os.requisitante || '-'}</td>
                    <td className={styles.truncateCell} title={os.executor || os.tecnicoResponsavel || os.responsavel}>
                      {os.executor || os.tecnicoResponsavel || os.responsavel || '-'}
                    </td>
                    <td className={styles.truncateCell} title={os.motivo || os.descricao || os.descricaoProblema || ''}>
                      {os.motivo || os.descricao || os.descricaoProblema || '-'}
                    </td>
                    <td>
                      <div className={styles.badgesRecursos}>
                        {countHH > 0 && <span className={`${styles.miniBadge} ${styles.miniBadgeHH}`}>{countHH}x HH</span>}
                        {countTRA > 0 && <span className={`${styles.miniBadge} ${styles.miniBadgeTRA}`}>{countTRA}x TRA</span>}
                        {countMAT > 0 && <span className={`${styles.miniBadge} ${styles.miniBadgeMAT}`}>{countMAT}x MAT</span>}
                        {countVEI > 0 && <span className={`${styles.miniBadge} ${styles.miniBadgeVEI}`}>{countVEI}x VEI</span>}
                        {itens.length === 0 && <span style={{ color: 'var(--cor-texto-secundario)', fontSize: '0.7rem' }}>Sem itens</span>}
                      </div>
                    </td>
                    {isAdmin && (
                      <td className={styles.valorCol} style={{ textAlign: 'right' }}>
                        R$ {totalExibir.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    )}
                    <td style={{ textAlign: 'center' }}>
                      <span className={`${styles.badge} ${badgeClass}`}>
                        {os.resultado || (os.situacao === 'CONCLUIDO' ? 'EXECUTADA' : 'EM ANDAMENTO')}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                      <div className={styles.actionsCol}>
                        <button
                          type="button"
                          className={styles.actionBtn}
                          onClick={() => onRowClick && onRowClick(os)}
                          title="Abrir Apontamento / Faturamento"
                        >
                          <FileText size={14} />
                        </button>
                        <button
                          type="button"
                          className={styles.actionBtn}
                          onClick={() => onPrint && onPrint(os)}
                          title="Imprimir Formulário Oficial"
                        >
                          <Printer size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TabelaPrestacaoServicos;
