import React, { useState } from 'react';
import { Printer, Search, Play } from 'lucide-react';
import styles from './index.module.css';

const TabelaOS = ({ osList, onRowClick, onPrint, onStart }) => {
  const [termoBusca, setTermoBusca] = useState('');
  const [dataInicioBusca, setDataInicioBusca] = useState('');
  const [dataFimBusca, setDataFimBusca] = useState('');

  // Helper para renderizar badges de prioridade
  const renderPrioridadeBadge = (prioridade) => {
    let classe = styles.badgeNeutral;
    if (prioridade.includes('1')) classe = styles.badgeSuccess;
    else if (prioridade.includes('2')) classe = styles.badgeWarning;
    else if (prioridade.includes('3')) classe = styles.badgeDanger;
    
    return <span className={`${styles.badge} ${classe}`}>{prioridade}</span>;
  };

  // Helper para renderizar badges de situação
  const renderSituacaoBadge = (situacao) => {
    let classe = styles.badgeNeutral;
    if (situacao === 'PENDENTE') classe = styles.badgeInfo;
    else if (situacao === 'À EXECUTAR') classe = styles.badgeWarning;
    else if (situacao === 'EM ANDAMENTO') classe = styles.badgeInfo;
    else if (situacao === 'AGUARDANDO INSUMO') classe = styles.badgeWarning;
    else if (situacao === 'CONCLUÍDO') classe = styles.badgeSuccess;
    else if (situacao === 'CANCELADO') classe = styles.badgeDanger;
    
    return <span className={`${styles.badge} ${classe}`}>{situacao}</span>;
  };

  // Filtro
  const osListFiltrada = osList.filter(os => {
    let matchTermo = true;
    let matchData = true;

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

    return matchTermo && matchData;
  });

  return (
    <div className={`${styles.card} ${styles.animateFadeIn}`} style={{ animationDelay: '0.1s' }}>
      <h2 className={styles.cardTitle}>Relatório de Ordens de Serviço</h2>
      
      {/* Barra de Pesquisa */}
      <div className={styles.searchBar}>
        <div className={styles.searchGroup}>
          <label className={styles.searchLabel}>Buscar por Código, Requisitante, Descrição, Setor ou C.Custo</label>
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
      
      <div className={styles.tableContainer}>
        {osListFiltrada.length === 0 ? (
          <div className={styles.emptyState}>
            Nenhuma Ordem de Serviço encontrada com esses filtros.
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Or</th>
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
                <th>DESCRIÇÃO DO SERVIÇO</th>
                <th>AÇÕES</th>
              </tr>
            </thead>
            <tbody>
              {osListFiltrada.map((os, index) => {
                // Formatar datas para exibição (assumindo YYYY-MM-DD no state)
                const dataFormatada = os.data.split('-').reverse().join('/');
                const prazoFormatado = os.prazo ? os.prazo.split('-').reverse().join('/') : '';

                return (
                  <tr 
                    key={os.codigo || index} 
                    onClick={() => onRowClick && onRowClick(os)}
                    className={styles.tableRow}
                    title="Clique para gerenciar esta O.S."
                  >
                    <td style={{ fontWeight: '500', color: 'var(--cor-texto-secundario)' }}>{index + 1}</td>
                    <td style={{ fontWeight: 'bold' }}>{os.codigo}</td>
                    <td>{dataFormatada}</td>
                    <td>{os.hora}</td>
                    <td>{os.requisitante}</td>
                    <td>{os.complexidade}</td>
                    <td>{renderPrioridadeBadge(os.prioridade)}</td>
                    <td>{os.setor}</td>
                    <td>{os.centroCusto}</td>
                    <td>{prazoFormatado}</td>
                    <td>{os.tipo}</td>
                    <td>{renderSituacaoBadge(os.situacao)}</td>
                    <td className={styles.truncateCell} title={os.descricao}>
                      {os.descricao}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button 
                          type="button" 
                          onClick={(e) => { e.stopPropagation(); onPrint && onPrint(os); }} 
                          className={styles.printButton}
                          title="Imprimir Espelho da O.S."
                        >
                          <Printer size={18} />
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
