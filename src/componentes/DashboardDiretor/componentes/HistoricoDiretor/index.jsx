import React, { useState } from 'react';
import { Search, Check, X } from 'lucide-react';
import styles from './HistoricoDiretor.module.css';
import { REJEITADO_DIRETORIA } from '../../../../utils/osStatus';

const HistoricoDiretor = ({ historico }) => {
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [termoBusca, setTermoBusca] = useState('');
  const [filtroData, setFiltroData] = useState('');
  const [historicoExpandido, setHistoricoExpandido] = useState(null);

  const historicoFiltrado = historico.filter(req => {
    const aprovado = req.status !== REJEITADO_DIRETORIA && req.situacao !== REJEITADO_DIRETORIA;
    
    // Filtro Status
    if (filtroStatus === 'aprovados' && !aprovado) return false;
    if (filtroStatus === 'rejeitados' && aprovado) return false;
    
    // Filtro Data
    if (filtroData && req.dataCriacao) {
      const dataReq = new Date(req.dataCriacao).toISOString().split('T')[0];
      if (dataReq !== filtroData) return false;
    }
    
    // Filtro Busca (Nome, Departamento, Código)
    if (termoBusca) {
      const termo = termoBusca.toLowerCase();
      const bateNome = ((req.solicitante || req.requisitante) || '').toLowerCase().includes(termo);
      const bateDep = ((req.departamento || req.setor) || '').toLowerCase().includes(termo);
      const bateId = ((req.codigo || req.id) || '').toLowerCase().includes(termo);
      const bateDesc = (req.descricao || '').toLowerCase().includes(termo);
      if (!bateNome && !bateDep && !bateId && !bateDesc) return false;
    }
    
    return true;
  });

  return (
    <div className={styles.historicoContainer}>
      
      {/* BARRA DE FILTROS DO HISTÓRICO */}
      <div className={styles.filtrosBox}>
        <div className={styles.buscaWrapper}>
          <Search size={18} className={styles.buscaIcon} />
          <input 
            type="text" 
            placeholder="Buscar solicitante, setor, O.S...." 
            value={termoBusca}
            onChange={(e) => setTermoBusca(e.target.value)}
            className={styles.buscaInput}
          />
        </div>
        
        <div className={styles.filtrosSecundarios}>
          <input 
            type="date" 
            value={filtroData}
            onChange={(e) => setFiltroData(e.target.value)}
            className={styles.filtroDate}
          />
          <select 
            value={filtroStatus} 
            onChange={(e) => setFiltroStatus(e.target.value)}
            className={styles.filtroSelect}
          >
            <option value="todos">Todos</option>
            <option value="aprovados">Aprovados</option>
            <option value="rejeitados">Rejeitados</option>
          </select>
        </div>
      </div>

      {historicoFiltrado.length === 0 ? (
        <div className={styles.emptyState}>
          <p>Nenhuma requisição encontrada com esses filtros no histórico.</p>
        </div>
      ) : (
        <div className={styles.cardsGrid}>
        {historicoFiltrado.map(req => {
          const aprovado = req.status !== REJEITADO_DIRETORIA && req.situacao !== REJEITADO_DIRETORIA;
          const itens = req.itens || req.itensCarrinho || [];
          const valorTotal = req.valorEstimado !== undefined && req.valorEstimado !== null && Number(req.valorEstimado) > 0
            ? Number(req.valorEstimado)
            : itens.reduce((acc, i) => acc + (Number(i.quantidade || 0) * Number(i.valor_unitario || 0)), 0);
          const osKey = req.codigo || req.id;
          const isExpandido = historicoExpandido === osKey;
          
          return (
            <div 
              key={osKey} 
              className={`${styles.histCard} ${aprovado ? styles.aprovado : styles.rejeitado}`}
              onClick={() => setHistoricoExpandido(isExpandido ? null : osKey)}
              style={{ cursor: 'pointer', flexDirection: 'column', alignItems: 'stretch' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <div className={styles.histInfo}>
                  <span className={styles.histNome}>{req.solicitante || req.requisitante || 'Funcionário'}</span>
                  <span className={styles.histData}>{req.dataCriacao ? new Date(req.dataCriacao).toLocaleDateString('pt-BR') : 'Hoje'} - {req.departamento || req.setor || 'GERAL'}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                  <span className={styles.histValor}>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorTotal)}
                  </span>
                  <span className={`${styles.statusPill} ${aprovado ? styles.aprovado : styles.rejeitado}`}>
                    {aprovado ? <Check size={12}/> : <X size={12}/>}
                    {aprovado ? 'Aprovado' : 'Rejeitado'}
                  </span>
                </div>
              </div>

              {/* ITENS EXPANDIDOS DO HISTÓRICO */}
              {isExpandido && (
                <div className={styles.histItensArea}>
                  <p className={styles.histItensTitle}>Detalhamento:</p>
                  {itens.length === 0 ? (
                    <p style={{ fontSize: '0.85rem', color: '#475569', marginTop: '4px' }}>
                      <strong>Descrição / Serviço:</strong> {req.descricao || 'Sem detalhamento de itens.'}
                    </p>
                  ) : (
                    <ul className={styles.itensList} style={{ marginBottom: 0, marginTop: '8px' }}>
                      {itens.map((item, index) => (
                        <li key={index} className={styles.item} style={{ padding: '8px 12px' }}>
                          <div>
                            <div className={styles.itemCodigo}>{item.codigo || '-'}</div>
                            <div className={styles.itemDescricao}>{item.descricao || item.nome || 'Item sem nome'}</div>
                          </div>
                          <div className={styles.itemQtd} style={{ fontSize: '0.9rem' }}>{item.quantidade || 1}x</div>
                        </li>
                      ))}
                    </ul>
                  )}
                  {!aprovado && (req.motivoRejeicao || req.observacaoChefe) && (
                    <div style={{ marginTop: '12px', padding: '8px', background: '#fee2e2', color: '#b91c1c', borderRadius: '8px', fontSize: '0.8rem' }}>
                      <strong>Motivo:</strong> {req.motivoRejeicao || req.observacaoChefe}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        </div>
      )}
    </div>
  );
};

export default HistoricoDiretor;
