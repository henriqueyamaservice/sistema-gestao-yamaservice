import React, { useState, useEffect } from 'react';
import { Check, X, ShieldAlert, Inbox, Clock, CalendarCheck, CalendarX, FileText, ChevronDown, ChevronUp, Search, Filter } from 'lucide-react';
import styles from './DashboardDiretor.module.css';
import LogoYama from '../../assets/YAMASERVICE.jpeg';

// Componente Interno para o Card, facilitando o controle do Acordeão de peças individuais
const CardAprovacao = ({ req, onAcao }) => {
  const [expandido, setExpandido] = useState(false);

  const valorTotal = req.itens.reduce((acc, i) => acc + (Number(i.quantidade) * Number(i.valor_unitario || 0)), 0);

  return (
    <div className={styles.listRow}>
      <div className={styles.rowMain}>
        <div className={styles.rowInfo}>
          <div className={styles.solicitante}>{req.solicitante}</div>
          <div className={styles.departamento}>
            <Clock size={12} color="#f97316" />
            {req.departamento}
            {req.prioridade === 'urgente' ? (
              <span className={styles.badgeUrgente}>
                <ShieldAlert size={12} /> URGENTE
              </span>
            ) : (
              <span className={styles.badgeNormal}>#{req.id.slice(-6)}</span>
            )}
          </div>
        </div>

        <div className={styles.rowValorBlock}>
          <span className={styles.valorLabel}>Valor do Pedido</span>
          <div className={styles.valorTotalList}>
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorTotal)}
          </div>
        </div>

        <div className={styles.rowActions}>
          <button className={styles.btnVerItensList} onClick={() => setExpandido(!expandido)}>
            <FileText size={14} />
            {req.itens.length} Itens {expandido ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          
          <div className={styles.actionButtonsList}>
            <button className={styles.btnRejeitarList} onClick={() => onAcao(req.id, 'rejeitar')} title="Rejeitar">
              <X size={20} />
            </button>
            <button className={styles.btnAprovarList} onClick={() => onAcao(req.id, 'aprovar')} title="Aprovar">
              <Check size={20} />
            </button>
          </div>
        </div>
      </div>

      {expandido && (
        <div className={styles.rowExpanded}>
          <ul className={styles.itensList} style={{ margin: 0, border: 'none' }}>
            {req.itens.map((item, index) => (
              <li key={index} className={styles.item} style={{ padding: '8px 16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <div>
                  <div className={styles.itemCodigo}>{item.codigo}</div>
                  <div className={styles.itemDescricao}>{item.descricao}</div>
                </div>
                <div className={styles.itemQtd}>{item.quantidade}x</div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

const DashboardDiretor = () => {
  const [abaAtiva, setAbaAtiva] = useState('pendentes'); // 'pendentes' | 'historico'
  const [requisicoesAguardando, setRequisicoesAguardando] = useState([]);
  const [historico, setHistorico] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtros do Histórico
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [termoBusca, setTermoBusca] = useState('');
  const [filtroData, setFiltroData] = useState('');
  const [historicoExpandido, setHistoricoExpandido] = useState(null);

  const fetchDados = async () => {
    try {
      setLoading(true);
      const res = await fetch('http://localhost:3000/api/requisicoes');
      if (res.ok) {
        const data = await res.json();
        const pedidosApp = data.filter(r => r.origem === 'app_funcionario');
        
        // Pendentes
        const aguardando = pedidosApp.filter(r => r.status === 'aguardando_diretoria');
        // Ordena para que as urgentes apareçam primeiro, depois as mais antigas
        aguardando.sort((a, b) => {
          if (a.prioridade === 'urgente' && b.prioridade !== 'urgente') return -1;
          if (b.prioridade === 'urgente' && a.prioridade !== 'urgente') return 1;
          return new Date(a.dataCriacao) - new Date(b.dataCriacao); // Mais antigas primeiro
        });
        setRequisicoesAguardando(aguardando);
        
        // Histórico
        setHistorico(pedidosApp.filter(r => r.status !== 'aguardando_diretoria').sort((a, b) => new Date(b.dataCriacao) - new Date(a.dataCriacao)));
      }
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDados();
  }, []);

  const handleAcao = async (id, acao) => {
    const motivo = acao === 'rejeitar' ? window.prompt('Informe o motivo da rejeição (opcional):') : null;
    if (acao === 'rejeitar' && motivo === null) return;

    try {
      const res = await fetch(`http://localhost:3000/api/requisicoes/${id}/autorizar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acao, motivo })
      });

      if (res.ok) {
        const reqAtualizada = requisicoesAguardando.find(r => r.id === id);
        if (reqAtualizada) {
          reqAtualizada.status = acao === 'aprovar' ? 'pendente' : 'rejeitado_diretoria';
          if (motivo) reqAtualizada.motivoRejeicao = motivo;
          
          setRequisicoesAguardando(prev => prev.filter(r => r.id !== id));
          setHistorico(prev => [reqAtualizada, ...prev]);
        }
      } else {
        alert('Erro ao processar a autorização');
      }
    } catch (err) {
      console.error('Erro:', err);
    }
  };

  const qtdAprovados = historico.filter(h => h.status !== 'rejeitado_diretoria').length;
  const qtdRejeitados = historico.filter(h => h.status === 'rejeitado_diretoria').length;

  const historicoFiltrado = historico.filter(req => {
    const aprovado = req.status !== 'rejeitado_diretoria';
    
    // Filtro Status
    if (filtroStatus === 'aprovados' && !aprovado) return false;
    if (filtroStatus === 'rejeitados' && aprovado) return false;
    
    // Filtro Data
    if (filtroData) {
      const dataReq = new Date(req.dataCriacao).toISOString().split('T')[0];
      if (dataReq !== filtroData) return false;
    }
    
    // Filtro Busca (Nome, Departamento, Código)
    if (termoBusca) {
      const termo = termoBusca.toLowerCase();
      const bateNome = (req.solicitante || '').toLowerCase().includes(termo);
      const bateDep = (req.departamento || '').toLowerCase().includes(termo);
      const bateId = (req.id || '').toLowerCase().includes(termo);
      if (!bateNome && !bateDep && !bateId) return false;
    }
    
    return true;
  });

  return (
    <div className={styles.container}>
      {/* HEADER PREMIUM */}
      <header className={styles.headerPremium}>
        <div className={styles.headerInfo}>
          <img src={LogoYama} alt="Yamaservice" className={styles.logoYama} />
          <div>
            <h1>Mesa do Diretor</h1>
            <p>Painel de Aprovações</p>
          </div>
        </div>

        <div className={styles.statsContainer}>
          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.orange}`}><Clock size={20} /></div>
            <div className={styles.statData}>
              <h4>{requisicoesAguardando.length}</h4>
              <p>Aguardando</p>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.green}`}><CalendarCheck size={20} /></div>
            <div className={styles.statData}>
              <h4>{qtdAprovados}</h4>
              <p>Aprovados</p>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.red}`}><CalendarX size={20} /></div>
            <div className={styles.statData}>
              <h4>{qtdRejeitados}</h4>
              <p>Rejeitados</p>
            </div>
          </div>
        </div>
      </header>

      {/* TABS STICKY */}
      <div className={styles.tabsWrapper}>
        <div className={styles.tabs}>
          <button 
            className={`${styles.tabBtn} ${abaAtiva === 'pendentes' ? styles.tabBtnAtivo : ''}`}
            onClick={() => setAbaAtiva('pendentes')}
          >
            <ShieldAlert size={18} />
            Pendentes
          </button>
          <button 
            className={`${styles.tabBtn} ${abaAtiva === 'historico' ? styles.tabBtnAtivo : ''}`}
            onClick={() => setAbaAtiva('historico')}
          >
            <FileText size={18} />
            Histórico
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Carregando...</div>
      ) : abaAtiva === 'pendentes' ? (
        /* ABA PENDENTES */
        requisicoesAguardando.length === 0 ? (
          <div className={styles.emptyState}>
            <Inbox size={48} color="#cbd5e1" style={{ margin: '0 auto' }} />
            <h3>Tudo Limpo!</h3>
            <p>Não há requisições aguardando a sua aprovação no momento.</p>
          </div>
        ) : (
          <div className={styles.listaPendentes}>
            {requisicoesAguardando.map(req => (
              <CardAprovacao key={req.id} req={req} onAcao={handleAcao} />
            ))}
          </div>
        )
      ) : (
        /* ABA HISTÓRICO MOBILE */
        <div className={styles.historicoContainer}>
          
          {/* BARRA DE FILTROS DO HISTÓRICO */}
          <div className={styles.filtrosBox}>
            <div className={styles.buscaWrapper}>
              <Search size={18} className={styles.buscaIcon} />
              <input 
                type="text" 
                placeholder="Buscar solicitante, setor..." 
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
              const aprovado = req.status !== 'rejeitado_diretoria';
              const valorTotal = req.itens.reduce((acc, i) => acc + (Number(i.quantidade) * Number(i.valor_unitario || 0)), 0);
              const isExpandido = historicoExpandido === req.id;
              
              return (
                <div 
                  key={req.id} 
                  className={`${styles.histCard} ${aprovado ? styles.aprovado : styles.rejeitado}`}
                  onClick={() => setHistoricoExpandido(isExpandido ? null : req.id)}
                  style={{ cursor: 'pointer', flexDirection: 'column', alignItems: 'stretch' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <div className={styles.histInfo}>
                      <span className={styles.histNome}>{req.solicitante}</span>
                      <span className={styles.histData}>{new Date(req.dataCriacao).toLocaleDateString('pt-BR')} - {req.departamento}</span>
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
                      <p className={styles.histItensTitle}>Itens Solicitados:</p>
                      <ul className={styles.itensList} style={{ marginBottom: 0, marginTop: '8px' }}>
                        {req.itens.map((item, index) => (
                          <li key={index} className={styles.item} style={{ padding: '8px 12px' }}>
                            <div>
                              <div className={styles.itemCodigo}>{item.codigo}</div>
                              <div className={styles.itemDescricao}>{item.descricao}</div>
                            </div>
                            <div className={styles.itemQtd} style={{ fontSize: '0.9rem' }}>{item.quantidade}x</div>
                          </li>
                        ))}
                      </ul>
                      {!aprovado && req.motivoRejeicao && (
                        <div style={{ marginTop: '12px', padding: '8px', background: '#fee2e2', color: '#b91c1c', borderRadius: '8px', fontSize: '0.8rem' }}>
                          <strong>Motivo da Rejeição:</strong> {req.motivoRejeicao}
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
      )}
    </div>
  );
};

export default DashboardDiretor;
