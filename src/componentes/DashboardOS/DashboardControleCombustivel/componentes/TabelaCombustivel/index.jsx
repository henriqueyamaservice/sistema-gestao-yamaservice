import React, { useState } from 'react';
import { Search, Fuel, Layers, Clock, CheckCircle2, XCircle, DollarSign, Droplet, UserCheck, Camera } from 'lucide-react';
import styles from './index.module.css';
import { parseMoeda } from '../../../../../utils/parseMoeda';
import { AGUARDANDO_ABASTECIMENTO, ABASTECIDA, CANCELADA } from '../../../../../utils/combustivelStatus';

const TabelaCombustivel = ({ requisicoes, onRowClick }) => {
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
  const [tipoSaidaFilter, setTipoSaidaFilter] = useState('TODOS'); // TODOS, FROTA, GERADORES, DESCARTES
  const [situacaoFiltro, setSituacaoFiltro] = useState(''); // Estado para filtro dos KPIs clicáveis

  // Helpers de status
  const isAguardando = (status) => {
    const sLower = (status || '').toString().trim().toLowerCase().replace(/_/g, ' ');
    return sLower.includes('em andamento') || sLower.includes('aguardando abastecimento');
  };

  const isConcluido = (status) => {
    if (!status) return false;
    const s = status.toUpperCase();
    return s === 'ABASTECIDA' || s === 'CONCLUÍDO' || s === 'CONCLUIDO' || s === 'FINALIZADO';
  };

  const isCancelado = (status) => {
    if (!status) return false;
    const s = status.toUpperCase();
    return s === 'CANCELADA' || s === 'CANCELADO';
  };

  // Helper para renderizar badges de status
  const renderStatusBadge = (status) => {
    let classe = styles.badgeNeutral;
    let label = status;

    if (isAguardando(status)) {
      classe = styles.badgeInfo;
      label = 'AGUARDANDO';
    }
    else if (isConcluido(status)) {
      classe = styles.badgeSuccess;
      label = 'ABASTECIDO';
    }
    else if (isCancelado(status)) {
      classe = styles.badgeDanger;
      label = 'CANCELADO';
    }
    
    return <span className={`${styles.badge} ${classe}`}>{label}</span>;
  };

  // Identifica se o abastecimento foi concluído pelo Motorista ou Frentista (App/Chat)
  const isConcluidoPorMotoristaOuFrentista = (req) => {
    if (!req) return false;
    const statusConcluido = isConcluido(req.status);
    if (!statusConcluido) return false;

    // Se foi expressamente preenchido manual pelo escritório/almoxarifado, não exibe o boneco
    if (req.origem_abastecimento === 'MANUAL') return false;

    // 1. Pelo tipo do usuário que concluiu
    if (req.usuario_tipo === 'motorista' || req.usuario_tipo === 'frentista') {
      return true;
    }
    // 2. Pela origem gravada
    if (req.origem_abastecimento === 'MOTORISTA' || req.origem_abastecimento === 'FRENTISTA' || req.origem_abastecimento === 'CHAT') {
      return true;
    }
    // 3. Pelo campo preenchido_por contendo 'Motorista' ou 'Frentista'
    const preenchido = (req.preenchido_por || '').toUpperCase();
    if (preenchido.includes('MOTORISTA') || preenchido.includes('FRENTISTA')) {
      return true;
    }
    return false;
  };

  // Filtro Principal (Pesquisa, Tipo, Data)
  const listaFiltrada = requisicoes.filter(req => {
    let matchTermo = true;
    let matchData = true;
    let matchTipo = true;

    const isGerador = req.veiculo && (
      req.veiculo.toUpperCase().includes('GERADOR') || 
      req.veiculo.toUpperCase().includes('GRANJA') || 
      req.veiculo.toUpperCase().startsWith('G. ')
    );

    const isTransfer = req.numeroRequisicao && req.numeroRequisicao.startsWith('TRANSF-');

    if (tipoSaidaFilter === 'DESCARTES') {
      matchTipo = req.veiculo === 'DESCARTE';
    } else if (tipoSaidaFilter === 'TRANSFERENCIAS') {
      matchTipo = isTransfer;
    } else if (tipoSaidaFilter === 'FROTA') {
      matchTipo = req.veiculo !== 'DESCARTE' && !isTransfer && !isGerador;
    } else if (tipoSaidaFilter === 'GERADORES') {
      matchTipo = isGerador && !isTransfer;
    }

    if (termoBusca) {
      const termo = termoBusca.toLowerCase().trim();
      matchTermo = 
        (req.numeroRequisicao && String(req.numeroRequisicao).toLowerCase().includes(termo)) ||
        (req.requisitante && String(req.requisitante).toLowerCase().includes(termo)) ||
        (req.motorista && String(req.motorista).toLowerCase().includes(termo)) ||
        (req.veiculo && String(req.veiculo).toLowerCase().includes(termo)) ||
        (req.placa && String(req.placa).toLowerCase().includes(termo)) ||
        (req.uConsu && String(req.uConsu).toLowerCase().includes(termo)) ||
        (req.fornecedor && String(req.fornecedor).toLowerCase().includes(termo)) ||
        (req.cupom && String(req.cupom).toLowerCase().includes(termo)) ||
        (req.combustivel && String(req.combustivel).toLowerCase().includes(termo)) ||
        (req.mes && String(req.mes).toLowerCase().includes(termo));
    }

    if (dataInicioBusca || dataFimBusca) {
      const dataReq = req.data; // formato YYYY-MM-DD
      if (dataInicioBusca && dataReq < dataInicioBusca) matchData = false;
      if (dataFimBusca && dataReq > dataFimBusca) matchData = false;
    }

    return matchTermo && matchData && matchTipo;
  });

  // Helper para converter data/hora em timestamp seguro para ordenação
  const extrairTimestamp = (req) => {
    const rawData = (req.status === ABASTECIDA) && (req.data_hora || req.data_abastecimento)
      ? (req.data_hora || (req.data_abastecimento ? `${req.data_abastecimento}T${req.hora_abastecimento || '12:00'}` : ''))
      : (req.data || req.data_hora);
    if (!rawData) return 0;
    const d = new Date(rawData.includes(' ') ? rawData.replace(' ', 'T') : rawData);
    const time = d.getTime();
    if (!isNaN(time)) return time;
    return 0;
  };

  // Filtro Secundário (Baseado no clique dos KPIs) + Ordenação Cronológica (Mais recente no topo)
  const listaParaExibicao = listaFiltrada
    .filter(req => {
      if (!situacaoFiltro) return true;
      if (situacaoFiltro === AGUARDANDO_ABASTECIMENTO) return isAguardando(req.status);
      if (situacaoFiltro === ABASTECIDA) return isConcluido(req.status);
      if (situacaoFiltro === CANCELADA) return isCancelado(req.status);
      return true;
    })
    .sort((a, b) => {
      // 1º Critério: Data/Hora decrescente (mais recente primeiro)
      const timeA = extrairTimestamp(a);
      const timeB = extrairTimestamp(b);
      if (timeA !== timeB) {
        return timeB - timeA;
      }
      // 2º Critério: Número da requisição decrescente
      const numA = parseInt(a.numeroRequisicao) || 0;
      const numB = parseInt(b.numeroRequisicao) || 0;
      if (numA !== numB) {
        return numB - numA;
      }
      // 3º Critério: ID decrescente
      return String(b.id || '').localeCompare(String(a.id || ''));
    });

  // Cálculos de KPI baseados na lista filtrada
  const totalReq = listaFiltrada.length;
  const emAndamentoCount = listaFiltrada.filter(req => isAguardando(req.status)).length;
  const concluidoCount = listaFiltrada.filter(req => isConcluido(req.status)).length;
  const canceladoCount = listaFiltrada.filter(req => isCancelado(req.status)).length;
  const volumeTotal = listaFiltrada.reduce((acc, req) => acc + (parseMoeda(req.qtde) || 0), 0);
  const custoTotal = listaFiltrada.reduce((acc, req) => acc + (parseMoeda(req.valorTotal || req.valor_total) || 0), 0);

  return (
    <div className={`${styles.card} ${styles.animateFadeIn}`} style={{ animationDelay: '0.1s' }}>
      
      {/* Cabeçalho Padronizado */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
        <Fuel size={24} style={{ marginRight: '8px', color: 'var(--cor-destaque)' }} />
        <h2 style={{ margin: 0, padding: 0, fontSize: '1.125rem', fontWeight: 600, color: 'var(--cor-texto-principal)' }}>Saída de Combustível</h2>
      </div>

      {/* Cards KPI */}
      <div className={styles.kpiGrid}>
        <div 
          className={`${styles.kpiCard} ${situacaoFiltro === '' ? styles.kpiCardActive : ''}`} 
          style={{ cursor: 'pointer' }}
          onClick={() => setSituacaoFiltro('')}
          title="Clique para ver todos os lançamentos"
        >
          <div className={styles.kpiIconBox} style={{ backgroundColor: 'rgba(255, 107, 0, 0.1)', color: 'var(--cor-destaque)' }}>
            <Layers size={22} />
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiValue}>{totalReq}</span>
            <span className={styles.kpiLabel}>Total Lançamentos</span>
          </div>
        </div>

        <div 
          className={`${styles.kpiCard} ${situacaoFiltro === AGUARDANDO_ABASTECIMENTO ? styles.kpiCardActiveNeutral : ''}`}
          style={{ cursor: 'pointer' }}
          onClick={() => setSituacaoFiltro(situacaoFiltro === AGUARDANDO_ABASTECIMENTO ? '' : AGUARDANDO_ABASTECIMENTO)}
          title="Clique para filtrar apenas os Em Andamento"
        >
          <div className={styles.kpiIconBox} style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
            <Clock size={22} />
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiValue}>{emAndamentoCount}</span>
            <span className={styles.kpiLabel}>Em Andamento</span>
          </div>
        </div>

        <div 
          className={`${styles.kpiCard} ${situacaoFiltro === ABASTECIDA ? styles.kpiCardActiveSuccess : ''}`}
          style={{ cursor: 'pointer' }}
          onClick={() => setSituacaoFiltro(situacaoFiltro === ABASTECIDA ? '' : ABASTECIDA)}
          title="Clique para filtrar apenas os Concluídos"
        >
          <div className={styles.kpiIconBox} style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
            <CheckCircle2 size={22} />
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiValue}>{concluidoCount}</span>
            <span className={styles.kpiLabel}>Concluídos</span>
          </div>
        </div>

        <div 
          className={`${styles.kpiCard} ${situacaoFiltro === CANCELADA ? styles.kpiCardActiveDanger : ''}`}
          style={{ cursor: 'pointer' }}
          onClick={() => setSituacaoFiltro(situacaoFiltro === CANCELADA ? '' : CANCELADA)}
          title="Clique para filtrar apenas os Cancelados"
        >
          <div className={styles.kpiIconBox} style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
            <XCircle size={22} />
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiValue}>{canceladoCount}</span>
            <span className={styles.kpiLabel}>Cancelados</span>
          </div>
        </div>

        <div className={styles.kpiCard} style={{ borderColor: 'var(--cor-destaque)', backgroundColor: 'rgba(255, 107, 0, 0.05)', cursor: 'default' }}>
          <div className={styles.kpiIconBox} style={{ backgroundColor: 'var(--cor-destaque)', color: '#fff' }}>
            <Droplet size={22} />
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiValue} style={{ color: 'var(--cor-destaque)' }}>
              {volumeTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} L
            </span>
            <span className={styles.kpiLabel}>Volume Total (L)</span>
          </div>
        </div>

        {isAdmin && (
          <div className={styles.kpiCard} style={{ borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.05)', cursor: 'default' }}>
            <div className={styles.kpiIconBox} style={{ backgroundColor: '#10b981', color: '#fff' }}>
              <DollarSign size={22} />
            </div>
            <div className={styles.kpiInfo}>
              <span className={styles.kpiValue} style={{ color: '#10b981' }}>
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(custoTotal)}
              </span>
              <span className={styles.kpiLabel}>Custo Total</span>
            </div>
          </div>
        )}
      </div>

      {/* Barra de Pesquisa */}
      <div className={styles.searchBar}>
        <div className={styles.searchGroup}>
          <label className={styles.searchLabel}>Buscar por Nº Req, Motorista, Veículo, Fornecedor ou Mês</label>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--cor-texto-secundario)' }} />
            <input 
              type="text" 
              className={styles.searchInput} 
              style={{ width: '100%', paddingLeft: '32px' }}
              placeholder="Digite sua busca..." 
              value={termoBusca}
              onChange={e => setTermoBusca(e.target.value)}
            />
          </div>
        </div>
        <div className={`${styles.searchGroup} ${styles.searchGroupDate}`}>
          <label className={styles.searchLabel}>Data Inicial</label>
          <input 
            type="date" 
            className={styles.searchInput} 
            value={dataInicioBusca}
            onChange={e => setDataInicioBusca(e.target.value)}
          />
        </div>
        <div className={`${styles.searchGroup} ${styles.searchGroupDate}`}>
          <label className={styles.searchLabel}>Data Final</label>
          <input 
            type="date" 
            className={styles.searchInput} 
            value={dataFimBusca}
            onChange={e => setDataFimBusca(e.target.value)}
          />
        </div>
      </div>

      {/* Botões de Filtro de Tipo de Saída */}
      <div style={{ display: 'flex', gap: '10px', padding: '0 20px', marginBottom: '20px' }}>
        <button
          onClick={() => setTipoSaidaFilter('TODOS')}
          style={{
            padding: '8px 16px',
            borderRadius: '20px',
            border: 'none',
            cursor: 'pointer',
            backgroundColor: tipoSaidaFilter === 'TODOS' ? 'var(--cor-destaque)' : 'var(--cor-fundo-sutil)',
            color: tipoSaidaFilter === 'TODOS' ? '#fff' : 'var(--cor-texto-principal)',
            fontWeight: tipoSaidaFilter === 'TODOS' ? 'bold' : 'normal'
          }}
        >
          Todas as Saídas
        </button>
        <button
          onClick={() => setTipoSaidaFilter('FROTA')}
          style={{
            padding: '8px 16px',
            borderRadius: '20px',
            border: 'none',
            cursor: 'pointer',
            backgroundColor: tipoSaidaFilter === 'FROTA' ? '#10b981' : 'var(--cor-fundo-sutil)',
            color: tipoSaidaFilter === 'FROTA' ? '#fff' : 'var(--cor-texto-principal)',
            fontWeight: tipoSaidaFilter === 'FROTA' ? 'bold' : 'normal'
          }}
        >
          Veículos / Frota
        </button>
        <button
          onClick={() => setTipoSaidaFilter('GERADORES')}
          style={{
            padding: '8px 16px',
            borderRadius: '20px',
            border: 'none',
            cursor: 'pointer',
            backgroundColor: tipoSaidaFilter === 'GERADORES' ? '#eab308' : 'var(--cor-fundo-sutil)',
            color: tipoSaidaFilter === 'GERADORES' ? '#fff' : 'var(--cor-texto-principal)',
            fontWeight: tipoSaidaFilter === 'GERADORES' ? 'bold' : 'normal'
          }}
        >
          Geradores / Granjas
        </button>
        <button
          onClick={() => setTipoSaidaFilter('TRANSFERENCIAS')}
          style={{
            padding: '8px 16px',
            borderRadius: '20px',
            border: 'none',
            cursor: 'pointer',
            backgroundColor: tipoSaidaFilter === 'TRANSFERENCIAS' ? '#8b5cf6' : 'var(--cor-fundo-sutil)',
            color: tipoSaidaFilter === 'TRANSFERENCIAS' ? '#fff' : 'var(--cor-texto-principal)',
            fontWeight: tipoSaidaFilter === 'TRANSFERENCIAS' ? 'bold' : 'normal'
          }}
        >
          Transferências
        </button>
        <button
          onClick={() => setTipoSaidaFilter('DESCARTES')}
          style={{
            padding: '8px 16px',
            borderRadius: '20px',
            border: 'none',
            cursor: 'pointer',
            backgroundColor: tipoSaidaFilter === 'DESCARTES' ? 'var(--cor-erro)' : 'var(--cor-fundo-sutil)',
            color: tipoSaidaFilter === 'DESCARTES' ? '#fff' : 'var(--cor-texto-principal)',
            fontWeight: tipoSaidaFilter === 'DESCARTES' ? 'bold' : 'normal'
          }}
        >
          Relatório de Descartes (Borra)
        </button>
      </div>
      
      <div className={styles.tableContainer}>
        {listaParaExibicao.length === 0 ? (
          <div className={styles.emptyState}>
            Nenhuma requisição de combustível encontrada com esses filtros.
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Nº REQ.</th>
                <th>STATUS</th>
                <th>DATA / HORA</th>
                <th>{tipoSaidaFilter === 'TRANSFERENCIAS' || tipoSaidaFilter === 'DESCARTES' ? 'RESPONSÁVEL' : 'MOTORISTA'}</th>
                <th>
                  {tipoSaidaFilter === 'GERADORES' ? 'GRANJA / GERADOR' : 
                   tipoSaidaFilter === 'TRANSFERENCIAS' ? 'DESTINO' : 
                   tipoSaidaFilter === 'DESCARTES' ? 'ORIGEM' : 
                   tipoSaidaFilter === 'VEICULOS' ? 'VEÍCULO' :
                   'VEÍCULO / GRANJAS'}
                </th>
                <th>{tipoSaidaFilter === 'TRANSFERENCIAS' ? 'ORIGEM' : 'FORNECEDOR'}</th>
                <th>COMBUSTÍVEL</th>
                <th>{tipoSaidaFilter === 'TRANSFERENCIAS' || tipoSaidaFilter === 'DESCARTES' ? 'OBSERVAÇÃO' : 'CUPOM'}</th>
                <th>{tipoSaidaFilter === 'TRANSFERENCIAS' || tipoSaidaFilter === 'DESCARTES' ? '-' : 'KM / HOR.'}</th>
                <th>LITROS</th>
                {isAdmin && <th>VALOR TOTAL</th>}
              </tr>
            </thead>
            <tbody>
              {listaParaExibicao.map((req, index) => {
                // Identificação de status e datas de Abertura vs Abastecimento
                const isFinalizado = isConcluido(req.status);
                const isCanceladoRow = isCancelado(req.status);

                // 1. Data/Hora de Abertura da Requisição
                let dmaAbertura = '';
                let horaAbertura = req.hora ? req.hora.substring(0, 5) : '';
                let ymdAbertura = '';
                if (req.data) {
                  const [dPart, tPart] = req.data.includes('T') ? req.data.split('T') : req.data.split(' ');
                  if (dPart && dPart.includes('-')) {
                    const [ano, mes, dia] = dPart.split('-');
                    ymdAbertura = `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
                    dmaAbertura = `${dia.padStart(2, '0')}/${mes.padStart(2, '0')}/${ano}`;
                  } else {
                    dmaAbertura = dPart;
                  }
                  if (!horaAbertura && tPart) horaAbertura = tPart.substring(0, 5);
                }
                const dataHoraAberturaStr = dmaAbertura 
                  ? `${dmaAbertura}${horaAbertura ? ` ${horaAbertura}` : ''}`
                  : '-';

                // 2. Data/Hora do Abastecimento Concluído
                let dmaAbast = '';
                let horaAbast = req.hora_abastecimento ? req.hora_abastecimento.substring(0, 5) : '';
                let ymdAbast = '';
                const rawAbast = req.data_abastecimento || (isFinalizado ? (req.data_hora || req.data_hora_abastecimento) : '');
                if (rawAbast) {
                  const [dPart, tPart] = rawAbast.includes('T') ? rawAbast.split('T') : rawAbast.split(' ');
                  if (dPart && dPart.includes('-')) {
                    const [ano, mes, dia] = dPart.split('-');
                    ymdAbast = `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
                    dmaAbast = `${dia.padStart(2, '0')}/${mes.padStart(2, '0')}/${ano}`;
                  } else {
                    dmaAbast = dPart;
                  }
                  if (!horaAbast && tPart) horaAbast = tPart.substring(0, 5);
                }
                const dataHoraAbastStr = dmaAbast 
                  ? `${dmaAbast}${horaAbast ? ` ${horaAbast}` : ''}`
                  : dataHoraAberturaStr;

                // Só exibe linha secundária "Aberta em:" se o dia de abertura for estritamente diferente do dia abastecido
                const diasDiferentes = ymdAbertura && ymdAbast && ymdAbertura !== ymdAbast;
                
                return (
                  <tr 
                    key={req.id ? `req-${req.id}` : (req.numeroRequisicao ? `nr-${req.numeroRequisicao}-${index}` : `idx-${index}`)} 
                    onClick={() => onRowClick && onRowClick(req)}
                    className={styles.tableRow}
                    title={(req.status === AGUARDANDO_ABASTECIMENTO) ? "Clique para lançar o abastecimento" : "Clique para ver detalhes"}
                  >
                    <td style={{ fontWeight: 'bold' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'nowrap' }}>
                        <span>{req.numeroRequisicao}</span>
                        {isConcluidoPorMotoristaOuFrentista(req) && (
                          <span 
                            className={styles.badgeColaborador} 
                            title={req.preenchido_por ? `Apontamento realizado por: ${req.preenchido_por}` : 'Apontamento realizado pelo Motorista / Frentista'}
                          >
                            <UserCheck size={11} />
                          </span>
                        )}
                        {(req.fotoNota || req.fotoVisor || req.foto || req.fotoComprovante) && (
                          <span 
                            className={styles.badgeFoto} 
                            title="Comprovante / Foto do visor anexada"
                          >
                            <Camera size={11} />
                          </span>
                        )}
                      </div>
                      {req.numeroRequisicao && req.numeroRequisicao.startsWith('TRANSF-') && (
                        <span style={{ display: 'block', fontSize: '0.7rem', color: '#8b5cf6', marginTop: '4px' }}>TRANSFERÊNCIA</span>
                      )}
                    </td>
                    <td>{renderStatusBadge(req.status)}</td>
                    <td>
                      {isFinalizado ? (
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                            <span style={{
                              fontSize: '0.62rem',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              color: 'var(--cor-sucesso, #10b981)',
                              backgroundColor: 'rgba(16, 185, 129, 0.12)',
                              padding: '1px 5px',
                              borderRadius: '4px',
                              letterSpacing: '0.3px',
                              display: 'inline-block'
                            }}>
                              Abastecido
                            </span>
                          </div>
                          <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--cor-texto-principal)' }}>
                            {dataHoraAbastStr}
                          </div>
                          {diasDiferentes && dmaAbertura && (
                            <div 
                              style={{ fontSize: '0.68rem', color: 'var(--cor-texto-secundario)', marginTop: '2px' }}
                              title={`Requisição aberta em: ${dataHoraAberturaStr}`}
                            >
                              Aberta: {dmaAbertura}
                            </div>
                          )}
                        </div>
                      ) : isCanceladoRow ? (
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                            <span style={{
                              fontSize: '0.62rem',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              color: 'var(--cor-erro, #ef4444)',
                              backgroundColor: 'rgba(239, 68, 68, 0.12)',
                              padding: '1px 5px',
                              borderRadius: '4px',
                              letterSpacing: '0.3px',
                              display: 'inline-block'
                            }}>
                              Cancelado
                            </span>
                          </div>
                          <div style={{ fontSize: '0.82rem', color: 'var(--cor-texto-secundario)' }}>
                            {dataHoraAberturaStr}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                            <span style={{
                              fontSize: '0.62rem',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              color: '#3b82f6',
                              backgroundColor: 'rgba(59, 130, 246, 0.12)',
                              padding: '1px 5px',
                              borderRadius: '4px',
                              letterSpacing: '0.3px',
                              display: 'inline-block'
                            }}>
                              Aberto
                            </span>
                          </div>
                          <div style={{ fontWeight: 500, fontSize: '0.82rem', color: 'var(--cor-texto-principal)' }}>
                            {dataHoraAberturaStr}
                          </div>
                        </div>
                      )}
                    </td>
                    <td>{req.requisitante || req.motorista}</td>
                    <td>{req.veiculo || req.uConsu}</td>
                    <td>{req.fornecedor}</td>
                    <td>{req.combustivel}</td>
                    
                    {/* Colunas preenchidas apenas se tiver abastecimento */}
                    <td>
                      {(tipoSaidaFilter === 'TRANSFERENCIAS' || tipoSaidaFilter === 'DESCARTES') ? (
                        req.observacao || '-'
                      ) : (
                        <span>{req.cupom || '-'}</span>
                      )}
                    </td>
                    <td>{(tipoSaidaFilter === 'TRANSFERENCIAS' || tipoSaidaFilter === 'DESCARTES') ? '-' : (req.km || '-')}</td>
                    <td>{req.qtde ? `${parseFloat(req.qtde).toFixed(2)} L` : '-'}</td>
                    {isAdmin && (
                      <td style={{ fontWeight: 'bold', color: (req.valorTotal || req.valor_total) ? 'var(--cor-destaque)' : 'inherit' }}>
                        {(req.valorTotal || req.valor_total) ? `R$ ${parseFloat(req.valorTotal || req.valor_total).toFixed(2)}` : '-'}
                      </td>
                    )}
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

export default TabelaCombustivel;
