import React, { useState } from 'react';
import { Search, Fuel, Layers, Clock, CheckCircle2, XCircle, DollarSign, Droplet } from 'lucide-react';
import styles from './index.module.css';
import { parseMoeda } from '../../../../../utils/parseMoeda';

const TabelaCombustivel = ({ requisicoes, onRowClick }) => {
  const [termoBusca, setTermoBusca] = useState('');
  const [dataInicioBusca, setDataInicioBusca] = useState('');
  const [dataFimBusca, setDataFimBusca] = useState('');
  const [tipoSaidaFilter, setTipoSaidaFilter] = useState('TODOS'); // TODOS, FROTA, GERADORES, DESCARTES
  const [situacaoFiltro, setSituacaoFiltro] = useState(''); // Estado para filtro dos KPIs clicáveis

  // Helper para renderizar badges de status
  const renderStatusBadge = (status) => {
    let classe = styles.badgeNeutral;
    if (status === 'EM ANDAMENTO' || status === 'ABERTA') classe = styles.badgeInfo;
    else if (status === 'CONCLUÍDO' || status === 'ABASTECIDA') classe = styles.badgeSuccess;
    else if (status === 'CANCELADO' || status === 'CANCELADA') classe = styles.badgeDanger;
    
    return <span className={`${styles.badge} ${classe}`}>{status}</span>;
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
      const termo = termoBusca.toLowerCase();
      matchTermo = 
        (req.numeroRequisicao && req.numeroRequisicao.toLowerCase().includes(termo)) ||
        (req.requisitante && req.requisitante.toLowerCase().includes(termo)) ||
        (req.veiculo && req.veiculo.toLowerCase().includes(termo)) ||
        (req.fornecedor && req.fornecedor.toLowerCase().includes(termo)) ||
        (req.mes && req.mes.toLowerCase().includes(termo));
    }

    if (dataInicioBusca || dataFimBusca) {
      const dataReq = req.data; // formato YYYY-MM-DD
      if (dataInicioBusca && dataReq < dataInicioBusca) matchData = false;
      if (dataFimBusca && dataReq > dataFimBusca) matchData = false;
    }

    return matchTermo && matchData && matchTipo;
  });

  // Filtro Secundário (Baseado no clique dos KPIs)
  const listaParaExibicao = listaFiltrada.filter(req => {
    if (!situacaoFiltro) return true;
    if (situacaoFiltro === 'EM ANDAMENTO') return req.status === 'EM ANDAMENTO' || req.status === 'ABERTA';
    if (situacaoFiltro === 'CONCLUÍDO') return req.status === 'CONCLUÍDO' || req.status === 'ABASTECIDA';
    if (situacaoFiltro === 'CANCELADO') return req.status === 'CANCELADO' || req.status === 'CANCELADA';
    return true;
  });

  // Cálculos de KPI baseados na lista filtrada
  const totalReq = listaFiltrada.length;
  const emAndamentoCount = listaFiltrada.filter(req => req.status === 'EM ANDAMENTO' || req.status === 'ABERTA').length;
  const concluidoCount = listaFiltrada.filter(req => req.status === 'CONCLUÍDO' || req.status === 'ABASTECIDA').length;
  const canceladoCount = listaFiltrada.filter(req => req.status === 'CANCELADO' || req.status === 'CANCELADA').length;
  const volumeTotal = listaFiltrada.reduce((acc, req) => acc + (parseMoeda(req.qtde) || 0), 0);
  const custoTotal = listaFiltrada.reduce((acc, req) => acc + (parseMoeda(req.valorTotal) || 0), 0);

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
          className={`${styles.kpiCard} ${situacaoFiltro === 'EM ANDAMENTO' ? styles.kpiCardActiveNeutral : ''}`}
          style={{ cursor: 'pointer' }}
          onClick={() => setSituacaoFiltro(situacaoFiltro === 'EM ANDAMENTO' ? '' : 'EM ANDAMENTO')}
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
          className={`${styles.kpiCard} ${situacaoFiltro === 'CONCLUÍDO' ? styles.kpiCardActiveSuccess : ''}`}
          style={{ cursor: 'pointer' }}
          onClick={() => setSituacaoFiltro(situacaoFiltro === 'CONCLUÍDO' ? '' : 'CONCLUÍDO')}
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
          className={`${styles.kpiCard} ${situacaoFiltro === 'CANCELADO' ? styles.kpiCardActiveDanger : ''}`}
          style={{ cursor: 'pointer' }}
          onClick={() => setSituacaoFiltro(situacaoFiltro === 'CANCELADO' ? '' : 'CANCELADO')}
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
                <th>VALOR TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {listaParaExibicao.map((req, index) => {
                // Formatar datas corretamente (tratar YYYY-MM-DD ou YYYY-MM-DDThh:mm)
                let dataFormatada = '';
                if (req.data) {
                  const [datePart, timePart] = req.data.split('T');
                  if (datePart && datePart.includes('-')) {
                    const [ano, mes, dia] = datePart.split('-');
                    dataFormatada = `${dia}/${mes}/${ano}`;
                    if (timePart) {
                      dataFormatada += ` ${timePart.substring(0, 5)}`; // Pega só hh:mm
                    }
                  } else {
                    dataFormatada = req.data;
                  }
                }
                
                return (
                  <tr 
                    key={req.id || req.numeroRequisicao || index} 
                    onClick={() => onRowClick && onRowClick(req)}
                    className={styles.tableRow}
                    title={(req.status === 'EM ANDAMENTO' || req.status === 'ABERTA') ? "Clique para lançar o abastecimento" : "Clique para ver detalhes"}
                  >
                    <td style={{ fontWeight: 'bold' }}>
                      {req.numeroRequisicao}
                      {req.numeroRequisicao && req.numeroRequisicao.startsWith('TRANSF-') && (
                        <span style={{ display: 'block', fontSize: '0.7rem', color: '#8b5cf6', marginTop: '4px' }}>TRANSFERÊNCIA</span>
                      )}
                    </td>
                    <td>{renderStatusBadge(req.status)}</td>
                    <td>{dataFormatada}</td>
                    <td>{req.requisitante || req.motorista}</td>
                    <td>{req.veiculo || req.uConsu}</td>
                    <td>{req.fornecedor}</td>
                    <td>{req.combustivel}</td>
                    
                    {/* Colunas preenchidas apenas se tiver abastecimento */}
                    <td>{(tipoSaidaFilter === 'TRANSFERENCIAS' || tipoSaidaFilter === 'DESCARTES') ? (req.observacao || '-') : (req.cupom || '-')}</td>
                    <td>{(tipoSaidaFilter === 'TRANSFERENCIAS' || tipoSaidaFilter === 'DESCARTES') ? '-' : (req.km || '-')}</td>
                    <td>{req.qtde ? `${parseFloat(req.qtde).toFixed(2)} L` : '-'}</td>
                    <td style={{ fontWeight: 'bold', color: req.valorTotal ? 'var(--cor-destaque)' : 'inherit' }}>
                      {req.valorTotal ? `R$ ${req.valorTotal}` : '-'}
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

export default TabelaCombustivel;
