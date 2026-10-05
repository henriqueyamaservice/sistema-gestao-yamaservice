import React, { useState, useEffect, useMemo } from 'react';
import {
  Fuel, Car, Calendar, Clock, CheckCircle2,
  Sparkles, Camera, Eye, X, Droplets
} from 'lucide-react';
import styles from '../DashboardMotorista/DashboardMotorista.module.css';
import logoYama from '../../assets/YAMASERVICE.jpeg';
import BotaoSair from '../BotaoSair';
import ThemeToggle from '../ThemeToggle';
import DashboardChatBoxCombustivel from '../DashboardOS/DashboardControleCombustivel/componentes/DashboardChatBoxCombustivel';

const DashboardFrentistaYamaves = () => {
  const [abastecimentos, setAbastecimentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isChatAberto, setIsChatAberto] = useState(() => {
    try {
      return !!(sessionStorage.getItem('frentista_chat_sessao') || localStorage.getItem('frentista_chat_sessao'));
    } catch {
      return false;
    }
  });
  const [filtroPeriodo, setFiltroPeriodo] = useState('semana'); // 'semana' ou 'todos'
  const [fotoZoom, setFotoZoom] = useState(null);

  // Usuário Frentista Logado
  const usuario = useMemo(() => {
    try {
      const saved = localStorage.getItem('almoxarifado_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  }, []);

  const nomeFrentista = usuario?.nome || usuario?.username || 'Frentista Yamaves';

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

  // Filtra apenas os abastecimentos internos (Posto Yamaves e Bomba Almoxarifado)
  // que foram concluídos por ESTE usuário frentista logado!
  const meusAbastecimentos = useMemo(() => {
    if (!usuario) return [];

    const usuarioId = usuario.id ? String(usuario.id).trim() : null;
    const usuarioUsername = (usuario.username || '').toLowerCase().trim();
    const usuarioNome = (usuario.nome || '').toLowerCase().trim();

    return abastecimentos.filter(r => {
      const statusOk = r.status === 'CONCLUÍDO' || r.status === 'ABASTECIDA';
      if (!statusOk) return false;

      // Frentista é responsável pelo Posto Yamaves e Bomba Almoxarifado
      const forn = (r.fornecedor || '').toUpperCase();
      const isPostoInterno = forn.includes('YAMAVES') || forn.includes('ALMOXARIFADO');
      if (!isPostoInterno) return false;

      // 1. Por ID de frentista / usuário
      if (usuarioId) {
        if (r.frentista_id && String(r.frentista_id).trim() === usuarioId) return true;
        if (r.usuario_id && String(r.usuario_id).trim() === usuarioId) return true;
      }

      // 2. Por username
      if (usuarioUsername) {
        if (r.frentista_username && String(r.frentista_username).toLowerCase().trim() === usuarioUsername) return true;
        if (r.usuario_username && String(r.usuario_username).toLowerCase().trim() === usuarioUsername) return true;
      }

      // 3. Por correspondência de nome ou username em preenchido_por / frentista_nome / abastecido_por
      const preenchido = (r.preenchido_por || '').toLowerCase().trim();
      const abastecidoPor = (r.abastecido_por || '').toLowerCase().trim();
      const frentistaNome = (r.frentista_nome || '').toLowerCase().trim();

      if (usuarioNome) {
        if (frentistaNome && (frentistaNome.includes(usuarioNome) || usuarioNome.includes(frentistaNome))) return true;
        if (abastecidoPor && (abastecidoPor.includes(usuarioNome) || usuarioNome.includes(abastecidoPor))) return true;
        if (preenchido && preenchido.includes(usuarioNome)) return true;
      }

      if (usuarioUsername) {
        if (frentistaNome && frentistaNome.includes(usuarioUsername)) return true;
        if (abastecidoPor && abastecidoPor.includes(usuarioUsername)) return true;
        if (preenchido && preenchido.includes(usuarioUsername)) return true;
      }

      // Não exibe requisições concluídas por outros usuários
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

  // Totais da Semana (Separados por Diesel e Arla Redux)
  const totalAbastecimentosSemana = abastecimentosSemana.length;
  const { litrosDieselSemana, litrosArlaSemana, totalLitrosSemana } = useMemo(() => {
    let diesel = 0;
    let arla = 0;
    let total = 0;

    abastecimentosSemana.forEach(curr => {
      const lit = parseFloat(curr.qtde || curr.litros) || 0;
      total += lit;

      const comb = ((curr.combustivel || curr.tipo_combustivel || curr.produto || '') + '').toUpperCase();
      if (comb.includes('ARLA')) {
        arla += lit;
      } else {
        diesel += lit;
      }
    });

    return {
      litrosDieselSemana: diesel,
      litrosArlaSemana: arla,
      totalLitrosSemana: total
    };
  }, [abastecimentosSemana]);

  // Filtra as requisições Pendentes (Aguardando Abastecimento) para o Posto Interno
  const requisicoesPendentes = useMemo(() => {
    return abastecimentos.filter(r => {
      const sLower = (r.status || '').toString().trim().toLowerCase().replace(/_/g, ' ');
      const isPending = sLower.includes('em andamento') || sLower.includes('aguardando abastecimento') || sLower === 'aberta';
      if (!isPending) return false;

      const forn = (r.fornecedor || '').toUpperCase();
      const isPostoInterno = forn.includes('YAMAVES') || forn.includes('ALMOXARIFADO');
      return isPostoInterno;
    }).sort((a, b) => {
      // Ordena por data (mais antigas primeiro) ou mais recentes, como preferir. Colocaremos as mais recentes primeiro.
      const dataA = new Date(a.data || a.data_hora || 0);
      const dataB = new Date(b.data || b.data_hora || 0);
      return dataB - dataA;
    });
  }, [abastecimentos]);

  // Itens exibidos no relatório de acordo com a aba selecionada (Concluídos)
  const itensExibidos = filtroPeriodo === 'semana' ? abastecimentosSemana : meusAbastecimentos;

  // Estado para passar requisição inicial para o chat
  const [reqParaChat, setReqParaChat] = useState(null);

  // Se o chat estiver aberto, exibe a interface do assistente em tempo real
  if (isChatAberto) {
    return (
      <DashboardChatBoxCombustivel
        corTema="laranja"
        isFrentistaProp={true}
        requisicaoInicial={reqParaChat}
        onClose={() => {
          try {
            sessionStorage.removeItem('frentista_chat_sessao');
            localStorage.removeItem('frentista_chat_sessao');
          } catch (e) { }
          setIsChatAberto(false);
          setReqParaChat(null);
        }}
        onSucesso={() => {
          try {
            sessionStorage.removeItem('frentista_chat_sessao');
            localStorage.removeItem('frentista_chat_sessao');
          } catch (e) { }
          setIsChatAberto(false);
          setReqParaChat(null);
          fetchAbastecimentos();
        }}
      />
    );
  }

  return (
    <div className={styles.container}>
      {/* Cabeçalho do Frentista Estilo Mobile App */}
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <div className={styles.brandArea}>
            <img src={logoYama} alt="Yamaservice Logo" className={styles.logoImg} />
            <div className={styles.brandTitles}>
              <span className={styles.brandName}>YAMASERVICE</span>
              <span className={styles.brandSub}>Posto Yamaves & Almoxarifado</span>
            </div>
          </div>

          <div className={styles.headerActions}>
            <ThemeToggle isCollapsed={true} />
            <BotaoSair isCollapsed={true} inline={true} />
          </div>
        </div>

        <div className={styles.userProfileCard}>
          <div className={styles.userAvatar} style={{ backgroundColor: 'rgba(255, 107, 0, 0.2)', color: 'var(--cor-destaque)' }}>
            {(nomeFrentista || 'F').charAt(0).toUpperCase()}
          </div>
          <div className={styles.userInfo}>
            <span className={styles.userGreeting}>Olá,</span>
            <span className={styles.userName}>{nomeFrentista}</span>
          </div>
          <span className={styles.driverBadge}>
            <Fuel size={13} color="var(--cor-destaque)" />
            Frentista Yamaves
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
              <CheckCircle2 size={22} />
            </div>
            <div className={styles.kpiInfo}>
              <span className={styles.kpiLabel}>Abastecimentos</span>
              <span className={styles.kpiValue}>{totalAbastecimentosSemana}</span>
              <span className={styles.kpiDetail}>
                {totalLitrosSemana > 0 ? `${totalLitrosSemana.toFixed(1)} L somados` : 'nesta semana'}
              </span>
            </div>
          </div>

          {/* Card 2: Diesel na Semana */}
          <div className={styles.kpiCard}>
            <div className={styles.kpiIconWrapper} style={{ backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
              <Fuel size={22} />
            </div>
            <div className={styles.kpiInfo}>
              <span className={styles.kpiLabel}>Diesel</span>
              <span className={styles.kpiValue}>{litrosDieselSemana.toFixed(1)} L</span>
              <span className={styles.kpiDetail}>distribuídos na semana</span>
            </div>
          </div>

          {/* Card 3: Arla Redux na Semana */}
          <div className={styles.kpiCard}>
            <div className={styles.kpiIconWrapper} style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
              <Droplets size={22} />
            </div>
            <div className={styles.kpiInfo}>
              <span className={styles.kpiLabel}>Arla Redux</span>
              <span className={styles.kpiValue}>{litrosArlaSemana.toFixed(1)} L</span>
              <span className={styles.kpiDetail}>distribuídos na semana</span>
            </div>
          </div>

          {/* Card 4: Período de Referência */}
          <div className={styles.kpiCard}>
            <div className={styles.kpiIconWrapper} style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', color: 'var(--cor-texto-principal)', border: '1px solid var(--cor-borda-cartao)' }}>
              <Calendar size={22} />
            </div>
            <div className={styles.kpiInfo}>
              <span className={styles.kpiLabel}>Semana Atual</span>
              <span className={styles.kpiValue} style={{ fontSize: '0.95rem', marginTop: '6px' }}>{periodoTexto}</span>
              <span className={styles.kpiDetail}>Segunda a Domingo</span>
            </div>
          </div>
        </div>

        {/* Seção: Requisições Pendentes (Aguardando Abastecimento) */}
        {requisicoesPendentes.length > 0 && (
          <div className={styles.reportSection} style={{ marginBottom: '30px', border: '1px solid rgba(255, 107, 0, 0.3)' }}>
            <div className={styles.reportHeader}>
              <div className={styles.reportTitle}>
                <h3 style={{ color: 'var(--cor-destaque)' }}>Aguardando Abastecimento</h3>
                <span className={styles.reportCountBadge} style={{ backgroundColor: 'rgba(255, 107, 0, 0.1)', color: 'var(--cor-destaque)' }}>
                  {requisicoesPendentes.length} {requisicoesPendentes.length === 1 ? 'veículo' : 'veículos'} na fila
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
                        <span className={styles.detailLabel}>Requisitante</span>
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
                        Lançar Abastecimento
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
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
                  ? 'Você ainda não concluiu nenhum abastecimento interno nesta semana.'
                  : 'Nenhum abastecimento interno concluído por você foi encontrado.'}
              </p>
              <button
                type="button"
                className={styles.btnIniciar}
                style={{ padding: '10px 20px', fontSize: '0.9rem', marginTop: '8px' }}
                onClick={() => setIsChatAberto(true)}
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
                        <span className={styles.detailLabel}>Posto / Origem</span>
                        <span className={styles.detailValue} style={{ color: 'var(--cor-destaque)' }}>
                          {item.fornecedor || 'Posto Yamaves'}
                        </span>
                      </div>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Motorista / Requisitante</span>
                        <span className={styles.detailValue}>{item.motorista || item.requisitante || 'Não informado'}</span>
                      </div>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Atendido Por</span>
                        <span className={styles.detailValue} style={{ fontWeight: 600 }}>
                          {item.frentista_nome || item.preenchido_por || nomeFrentista}
                        </span>
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
                    </div>

                    {/* Rodapé do Card: Cupom e Foto */}
                    <div className={styles.cardFooter}>
                      <span className={styles.cupomInfo}>
                        Comprovante / Cupom: <strong>{item.cupom || 'N/I'}</strong>
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

export default DashboardFrentistaYamaves;
