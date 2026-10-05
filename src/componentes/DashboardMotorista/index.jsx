import React, { useState, useEffect, useMemo } from 'react';
import {
  Fuel, Car, Calendar, Clock, CheckCircle2, ChevronRight,
  Sparkles, Camera, Eye, X, PlusCircle, Award, Droplets
} from 'lucide-react';
import styles from './DashboardMotorista.module.css';
import logoYama from '../../assets/YAMASERVICE.jpeg';
import BotaoSair from '../BotaoSair';
import ThemeToggle from '../ThemeToggle';
import DashboardChatBoxCombustivel from '../DashboardOS/DashboardControleCombustivel/componentes/DashboardChatBoxCombustivel';

const DashboardMotorista = () => {
  const [abastecimentos, setAbastecimentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isChatAberto, setIsChatAberto] = useState(() => {
    try {
      return !!(sessionStorage.getItem('motorista_chat_sessao') || localStorage.getItem('motorista_chat_sessao'));
    } catch {
      return false;
    }
  });
  const [reqParaChat, setReqParaChat] = useState(null);
  const [filtroPeriodo, setFiltroPeriodo] = useState('semana'); // 'semana' ou 'todos'
  const [fotoZoom, setFotoZoom] = useState(null);

  // Usuário Motorista Logado
  const usuario = useMemo(() => {
    try {
      const saved = localStorage.getItem('almoxarifado_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  }, []);

  const nomeMotorista = usuario?.nome || usuario?.username || 'Motorista';

  // Buscar histórico de abastecimentos do backend
  const fetchAbastecimentos = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/combustivel?_t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setAbastecimentos(data);
        }
      }
    } catch (err) {
      console.error('Erro ao buscar dados de abastecimento:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAbastecimentos();
  }, []);

  // Início e fim da semana corrente (Segunda a Domingo)
  const { inicioSemana, fimSemana, periodoTexto } = useMemo(() => {
    const now = new Date();
    const day = now.getDay();
    // Segunda-feira como primeiro dia da semana
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const formataData = (d) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    const periodo = `${formataData(monday)} a ${formataData(sunday)}`;

    return { inicioSemana: monday, fimSemana: sunday, periodoTexto: periodo };
  }, []);

  // Filtra as requisições Pendentes (Aguardando Abastecimento) exclusivamente do POSTO ORIENTE
  const requisicoesPendentes = useMemo(() => {
    return abastecimentos.filter(r => {
      const sLower = (r.status || '').toString().trim().toLowerCase().replace(/_/g, ' ');
      const isPending = sLower.includes('em andamento') || sLower.includes('aguardando abastecimento') || sLower === 'aberta';
      if (!isPending) return false;

      // EXCLUSIVAMENTE Posto Oriente
      const forn = (r.fornecedor || '').toUpperCase();
      const isPostoOriente = forn.includes('ORIENTE');
      return isPostoOriente;
    }).sort((a, b) => {
      const dataA = new Date(a.data || a.data_hora || 0);
      const dataB = new Date(b.data || b.data_hora || 0);
      return dataB - dataA;
    });
  }, [abastecimentos]);

  // Filtra apenas os abastecimentos pertencentes a este motorista
  const meusAbastecimentos = useMemo(() => {
    return abastecimentos.filter(r => {
      // Considera requisições concluídas ou que foram preenchidas/requisitadas por ele
      const statusOk = r.status === 'CONCLUÍDO' || r.status === 'ABASTECIDA';
      if (!statusOk) return false;

      // 0. Motorista abastece exclusivamente no Posto Oriente
      const isPostoOriente = (r.fornecedor || '').toUpperCase().includes('ORIENTE');
      if (!isPostoOriente) return false;

      // 1. Por ID de usuário se houver
      if (usuario?.id && r.usuario_id && String(r.usuario_id) === String(usuario.id)) {
        return true;
      }
      // 2. Por username se houver
      if (usuario?.username && r.usuario_username && r.usuario_username.toLowerCase() === usuario.username.toLowerCase()) {
        return true;
      }
      // 3. Por correspondência de nome ou username em preenchido_por
      const preenchido = (r.preenchido_por || '').toLowerCase().trim();
      if (preenchido) {
        if (usuario?.nome) {
          const nomeU = usuario.nome.toLowerCase().trim();
          if (preenchido.includes(nomeU) || nomeU.includes(preenchido)) {
            return true;
          }
        }
        if (usuario?.username) {
          const userU = usuario.username.toLowerCase().trim();
          if (preenchido.includes(userU)) {
            return true;
          }
        }
      }
      // Se for admin, visualiza todos os abastecimentos concluídos do Posto Oriente
      if (usuario?.role === 'admin' || usuario?.role === 'administrador') {
        return true;
      }
      // Não exibe requisições gerais: apenas as concluídas por este motorista
      return false;
    }).sort((a, b) => {
      const dataA = new Date(a.data || a.data_hora || 0);
      const dataB = new Date(b.data || b.data_hora || 0);
      return dataB - dataA;
    });
  }, [abastecimentos, usuario]);

  // Abastecimentos da semana
  const abastecimentosSemana = useMemo(() => {
    return meusAbastecimentos.filter(r => {
      const rawDate = r.data || r.data_hora;
      if (!rawDate) return false;
      const dataItem = new Date(rawDate);
      return dataItem >= inicioSemana && dataItem <= fimSemana;
    });
  }, [meusAbastecimentos, inicioSemana, fimSemana]);

  // Totais da Semana
  const totalAbastecimentosSemana = abastecimentosSemana.length;
  const totalLitrosSemana = useMemo(() => {
    return abastecimentosSemana.reduce((acc, curr) => {
      const lit = parseFloat(curr.qtde || curr.litros) || 0;
      return acc + lit;
    }, 0);
  }, [abastecimentosSemana]);

  // Itens exibidos no relatório de acordo com a aba selecionada
  const itensExibidos = filtroPeriodo === 'semana' ? abastecimentosSemana : meusAbastecimentos;

  // Se o chat estiver aberto, exibe a interface do chat em tempo real
  if (isChatAberto) {
    return (
      <DashboardChatBoxCombustivel
        corTema="laranja"
        isMotoristaProp={true}
        requisicaoInicial={reqParaChat}
        onClose={() => {
          try {
            sessionStorage.removeItem('motorista_chat_sessao');
            localStorage.removeItem('motorista_chat_sessao');
          } catch(e) {}
          setIsChatAberto(false);
          setReqParaChat(null);
        }}
        onSucesso={() => {
          try {
            sessionStorage.removeItem('motorista_chat_sessao');
            localStorage.removeItem('motorista_chat_sessao');
          } catch(e) {}
          setIsChatAberto(false);
          setReqParaChat(null);
          fetchAbastecimentos();
        }}
      />
    );
  }

  return (
    <div className={styles.container}>
      {/* Cabeçalho do Motorista Estilo Mobile App */}
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <div className={styles.brandArea}>
            <img src={logoYama} alt="Yamaservice Logo" className={styles.logoImg} />
            <div className={styles.brandTitles}>
              <span className={styles.brandName}>YAMASERVICE</span>
              <span className={styles.brandSub}>Posto Oriente • Frota</span>
            </div>
          </div>

          <div className={styles.headerActions}>
            <ThemeToggle isCollapsed={true} />
            <BotaoSair isCollapsed={true} inline={true} />
          </div>
        </div>

        <div className={styles.userProfileCard}>
          <div className={styles.userAvatar} style={{ backgroundColor: 'rgba(255, 107, 0, 0.2)', color: 'var(--cor-destaque)' }}>
            {(nomeMotorista || 'M').charAt(0).toUpperCase()}
          </div>
          <div className={styles.userInfo}>
            <span className={styles.userGreeting}>Olá,</span>
            <span className={styles.userName}>{nomeMotorista}</span>
          </div>
          <span className={styles.driverBadge}>
            <Car size={13} color="var(--cor-destaque)" />
            Motorista
          </span>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className={styles.mainContent}>
        
        {/* KPIs da Semana */}
        <div className={styles.kpiGrid}>
          {/* Card 1: Quantidade na Semana */}
          <div className={styles.kpiCard}>
            <div className={styles.kpiIconWrapper} style={{ backgroundColor: 'rgba(255, 107, 0, 0.15)', color: 'var(--cor-destaque)' }}>
              <Fuel size={22} />
            </div>
            <div className={styles.kpiInfo}>
              <span className={styles.kpiLabel}>Abastecimentos</span>
              <span className={styles.kpiValue}>{totalAbastecimentosSemana}</span>
              <span className={styles.kpiDetail}>nesta semana (Posto Oriente)</span>
            </div>
          </div>

          {/* Card 2: Litros na Semana */}
          <div className={styles.kpiCard}>
            <div className={styles.kpiIconWrapper} style={{ backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
              <Droplets size={22} />
            </div>
            <div className={styles.kpiInfo}>
              <span className={styles.kpiLabel}>Total de Litros</span>
              <span className={styles.kpiValue}>{totalLitrosSemana.toFixed(1)} L</span>
              <span className={styles.kpiDetail}>acumulado na semana</span>
            </div>
          </div>

          {/* Card 3: Período de Referência */}
          <div className={`${styles.kpiCard} ${styles.kpiCardWide}`}>
            <div className={styles.kpiIconWrapper} style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
              <Calendar size={22} />
            </div>
            <div className={styles.kpiInfo}>
              <span className={styles.kpiLabel}>Semana Atual</span>
              <span className={styles.kpiValue} style={{ fontSize: '1rem', marginTop: '6px' }}>{periodoTexto}</span>
              <span className={styles.kpiDetail}>Segunda a Domingo</span>
            </div>
          </div>
        </div>

        {/* Seção: Requisições Pendentes (Aguardando Abastecimento no Posto Oriente) */}
        {requisicoesPendentes.length > 0 && (
          <div className={styles.reportSection} style={{ marginBottom: '24px', border: '1px solid rgba(255, 107, 0, 0.3)' }}>
            <div className={styles.reportHeader}>
              <div className={styles.reportTitle}>
                <h3 style={{ color: 'var(--cor-destaque)' }}>Aguardando Abastecimento • Posto Oriente</h3>
                <span className={styles.reportCountBadge} style={{ backgroundColor: 'rgba(255, 107, 0, 0.1)', color: 'var(--cor-destaque)' }}>
                  {requisicoesPendentes.length} {requisicoesPendentes.length === 1 ? 'veículo na fila' : 'veículos na fila'}
                </span>
              </div>
            </div>

            <div className={styles.fuelList}>
              {requisicoesPendentes.map(item => {
                const rawDate = item.data || item.data_hora;
                const dataFormatada = rawDate
                  ? new Date(rawDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
                  : '-';

                return (
                  <div key={item.id} className={styles.fuelCard} style={{ borderColor: 'rgba(255, 107, 0, 0.2)' }}>
                    <div className={styles.cardTopRow}>
                      <span className={styles.plateBadge} style={{ backgroundColor: 'rgba(255, 107, 0, 0.1)', color: 'var(--cor-destaque)', borderColor: 'rgba(255, 107, 0, 0.3)' }}>
                        <Car size={15} color="var(--cor-destaque)" />
                        {item.veiculo || item.uConsu || item.placa || 'Sem Placa'}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span className={styles.cardDate}>
                          <Clock size={13} /> {dataFormatada}
                        </span>
                        <span className={styles.statusConcluido} style={{ backgroundColor: 'rgba(255, 107, 0, 0.15)', color: 'var(--cor-destaque)', borderColor: 'rgba(255, 107, 0, 0.3)' }}>
                          <Clock size={12} /> Em andamento
                        </span>
                      </div>
                    </div>

                    <div className={styles.cardDetailsGrid}>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Nº Requisição</span>
                        <span className={styles.detailValue} style={{ fontWeight: 'bold' }}>#{item.numeroRequisicao}</span>
                      </div>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Motorista / Requisitante</span>
                        <span className={styles.detailValue}>{item.requisitante || item.motorista || 'Não informado'}</span>
                      </div>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Combustível</span>
                        <span className={styles.detailValue}>{item.combustivel || item.tipo_combustivel || 'DIESEL'}</span>
                      </div>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Litros Estimados</span>
                        <span className={styles.detailValue}>{item.qtde ? `${item.qtde} L` : 'Completar'}</span>
                      </div>
                    </div>

                    <div className={styles.cardFooter} style={{ justifyContent: 'flex-end', borderTop: '1px solid rgba(255, 107, 0, 0.1)' }}>
                      <button
                        type="button"
                        className={styles.btnIniciar}
                        style={{ padding: '8px 16px', fontSize: '0.85rem', boxShadow: '0 2px 8px rgba(255, 107, 0, 0.3)' }}
                        onClick={() => {
                          setReqParaChat(item);
                          setIsChatAberto(true);
                        }}
                      >
                        <Fuel size={16} />
                        Abastecer no Posto Oriente
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Card Hero: Botão de Iniciar Abastecimento Manual quando não houver fila */}
        {requisicoesPendentes.length === 0 && (
          <div className={styles.heroCard}>
            <div className={styles.heroIcon}>
              <Fuel size={28} />
            </div>
            <div className={styles.heroText}>
              <h3>Abastecer no Posto Oriente</h3>
              <p>
                Inicie o assistente para registrar seu abastecimento em tempo real no <strong>Posto Oriente</strong> com foto do cupom fiscal.
              </p>
            </div>
            <button
              type="button"
              className={styles.btnIniciar}
              onClick={() => {
                setReqParaChat(null);
                setIsChatAberto(true);
              }}
              title="Clique para iniciar o assistente de abastecimento"
            >
              <PlusCircle size={22} />
              Iniciar Abastecimento
            </button>
          </div>
        )}

        {/* Relatório Semanal de Abastecimentos */}
        <div className={styles.reportSection}>
          <div className={styles.reportHeader}>
            <div className={styles.reportTitle}>
              <h3>Meus Abastecimentos Concluídos</h3>
              <span className={styles.reportCountBadge}>
                {itensExibidos.length} {itensExibidos.length === 1 ? 'abastecimento' : 'abastecimentos'}
              </span>
            </div>

            {/* Toggle Semana vs Todos */}
            <div className={styles.filterBtns}>
              <button
                type="button"
                className={`${styles.filterBtn} ${filtroPeriodo === 'semana' ? styles.filterBtnActive : ''}`}
                onClick={() => setFiltroPeriodo('semana')}
              >
                Esta Semana ({totalAbastecimentosSemana})
              </button>
              <button
                type="button"
                className={`${styles.filterBtn} ${filtroPeriodo === 'todos' ? styles.filterBtnActive : ''}`}
                onClick={() => setFiltroPeriodo('todos')}
              >
                Todos ({meusAbastecimentos.length})
              </button>
            </div>
          </div>

          {/* Listagem de Abastecimentos */}
          {loading ? (
            <div className={styles.emptyState}>
              <p>Carregando histórico dos seus abastecimentos...</p>
            </div>
          ) : itensExibidos.length === 0 ? (
            <div className={styles.emptyState}>
              <Fuel size={40} color="var(--cor-texto-secundario)" />
              <p>
                {filtroPeriodo === 'semana'
                  ? 'Você ainda não concluiu nenhum abastecimento nesta semana.'
                  : 'Nenhum abastecimento concluído por você foi encontrado.'}
              </p>
              <button
                type="button"
                className={styles.btnIniciar}
                style={{ padding: '10px 20px', fontSize: '0.9rem', marginTop: '8px' }}
                onClick={() => {
                  setReqParaChat(null);
                  setIsChatAberto(true);
                }}
              >
                Iniciar Primeiro Abastecimento
              </button>
            </div>
          ) : (
            <div className={styles.fuelList}>
              {itensExibidos.map(item => {
                const rawDate = item.data || item.data_hora;
                const dataFormatada = rawDate
                  ? new Date(rawDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
                  : '-';
                const foto = item.fotoVisor || item.fotoNota || item.foto || item.fotoComprovante;

                return (
                  <div key={item.id} className={styles.fuelCard}>
                    {/* Top row: Placa, Data e Status */}
                    <div className={styles.cardTopRow}>
                      <span className={styles.plateBadge}>
                        <Car size={15} color="var(--cor-destaque)" />
                        {item.veiculo || item.uConsu || item.placa || 'Sem Placa'}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span className={styles.cardDate}>
                          <Clock size={13} /> {dataFormatada}
                        </span>
                        <span className={styles.statusConcluido}>
                          <CheckCircle2 size={12} /> Concluído
                        </span>
                      </div>
                    </div>

                    {/* Grid de detalhes */}
                    <div className={styles.cardDetailsGrid}>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Posto</span>
                        <span className={styles.detailValue}>{item.fornecedor || 'Posto Conveniado'}</span>
                      </div>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Combustível</span>
                        <span className={styles.detailValue}>{item.combustivel || item.tipo_combustivel || 'DIESEL'}</span>
                      </div>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Quantidade</span>
                        <span className={styles.detailValue} style={{ color: 'var(--cor-destaque)' }}>
                          {item.qtde || item.litros ? `${item.qtde || item.litros} L` : '-'}
                        </span>
                      </div>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>KM do Veículo</span>
                        <span className={styles.detailValue}>{item.km || item.km_abastecimento || '-'}</span>
                      </div>
                      {(item.valorUnitario || item.valor_litro) && (
                        <div className={styles.detailItem}>
                          <span className={styles.detailLabel}>Preço / Litro</span>
                          <span className={styles.detailValue}>
                            R$ {parseFloat(item.valorUnitario || item.valor_litro).toFixed(2)}
                          </span>
                        </div>
                      )}
                      {(item.valorTotal || item.valor_total) && (
                        <div className={styles.detailItem}>
                          <span className={styles.detailLabel}>Valor Total</span>
                          <span className={styles.detailValue} style={{ color: '#10b981', fontWeight: 600 }}>
                            R$ {parseFloat(item.valorTotal || item.valor_total).toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Rodapé do Card: Cupom e Foto */}
                    <div className={styles.cardFooter}>
                      <span className={styles.cupomInfo}>
                        Cupom Fiscal: <strong>{item.cupom || 'N/I'}</strong>
                        {item.numeroRequisicao && (
                          <span style={{ marginLeft: '8px', opacity: 0.7 }}>
                            (Req. #{item.numeroRequisicao})
                          </span>
                        )}
                      </span>

                      {foto ? (
                        <button
                          type="button"
                          className={styles.photoThumbnail}
                          onClick={() => setFotoZoom(foto)}
                          title="Clique para ver a foto do comprovante em tamanho real"
                        >
                          <img src={foto} alt="Comprovante" className={styles.thumbImg} />
                          <Camera size={13} />
                          <span>Ver Foto</span>
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--cor-texto-secundario)', opacity: 0.6 }}>
                          Sem foto anexada
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </main>

      {/* Modal de Zoom da Foto */}
      {fotoZoom && (
        <div className={styles.zoomOverlay} onClick={() => setFotoZoom(null)}>
          <button
            type="button"
            className={styles.zoomCloseBtn}
            onClick={() => setFotoZoom(null)}
          >
            <X size={24} />
          </button>
          <img src={fotoZoom} alt="Comprovante Ampliado" className={styles.zoomImg} />
        </div>
      )}
    </div>
  );
};

export default DashboardMotorista;
