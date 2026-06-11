import React, { useState } from 'react';
import { Search } from 'lucide-react';
import styles from './index.module.css';

const TabelaCombustivel = ({ requisicoes, onRowClick }) => {
  const [termoBusca, setTermoBusca] = useState('');
  const [dataInicioBusca, setDataInicioBusca] = useState('');
  const [dataFimBusca, setDataFimBusca] = useState('');

  // Helper para renderizar badges de status
  const renderStatusBadge = (status) => {
    let classe = styles.badgeNeutral;
    if (status === 'EM ANDAMENTO' || status === 'ABERTA') classe = styles.badgeInfo;
    else if (status === 'CONCLUÍDO' || status === 'ABASTECIDA') classe = styles.badgeSuccess;
    
    return <span className={`${styles.badge} ${classe}`}>{status}</span>;
  };

  // Filtro
  const listaFiltrada = requisicoes.filter(req => {
    let matchTermo = true;
    let matchData = true;

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

    return matchTermo && matchData;
  });

  return (
    <div className={`${styles.card} ${styles.animateFadeIn}`} style={{ animationDelay: '0.1s' }}>
      
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
      
      <div className={styles.tableContainer}>
        {listaFiltrada.length === 0 ? (
          <div className={styles.emptyState}>
            Nenhuma requisição de combustível encontrada com esses filtros.
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Nº REQ.</th>
                <th>STATUS</th>
                <th>DATA</th>
                <th>MOTORISTA</th>
                <th>VEÍCULO</th>
                <th>FORNECEDOR</th>
                <th>COMBUSTÍVEL</th>
                <th>CUPOM</th>
                <th>KM</th>
                <th>LITROS</th>
                <th>VALOR TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {listaFiltrada.map((req, index) => {
                // Formatar datas
                const dataFormatada = req.data ? req.data.split('-').reverse().join('/') : '';
                
                return (
                  <tr 
                    key={req.id || req.numeroRequisicao || index} 
                    onClick={() => onRowClick && onRowClick(req)}
                    className={styles.tableRow}
                    title={(req.status === 'EM ANDAMENTO' || req.status === 'ABERTA') ? "Clique para lançar o abastecimento" : "Clique para ver detalhes"}
                  >
                    <td style={{ fontWeight: 'bold' }}>{req.numeroRequisicao}</td>
                    <td>{renderStatusBadge(req.status)}</td>
                    <td>{dataFormatada}</td>
                    <td>{req.requisitante || req.motorista}</td>
                    <td>{req.veiculo || req.uConsu}</td>
                    <td>{req.fornecedor}</td>
                    <td>{req.combustivel}</td>
                    
                    {/* Colunas preenchidas apenas se tiver abastecimento */}
                    <td>{req.cupom || '-'}</td>
                    <td>{req.km || '-'}</td>
                    <td>{req.qtde ? `${req.qtde} L` : '-'}</td>
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
