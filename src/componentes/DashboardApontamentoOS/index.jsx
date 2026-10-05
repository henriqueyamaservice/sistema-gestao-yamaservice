import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Search, 
  Wrench, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Layers, 
  Filter, 
  RefreshCw, 
  Sparkles, 
  User, 
  MapPin,
  Zap,
  Hammer,
  HardHat,
  Cpu,
  Shield,
  Truck,
  Compass,
  FileText,
  Calendar,
  ChevronRight,
  ChevronDown,
  Check
} from 'lucide-react';
import styles from './DashboardApontamentoOS.module.css';
import PainelApontamentoOS from './componentes/PainelApontamentoOS';
import HeaderApontamentoOS from './componentes/HeaderApontamentoOS';
import ModalVisualizadorRevisoesTotem from './componentes/ModalVisualizadorRevisoesTotem';
import ModalGerenciadorKitsServicos from './componentes/ModalGerenciadorKitsServicos';
import { calcularStatusRevisaoVeiculo } from '../../utils/statusRevisao';
import { CONCLUIDO, CANCELADO, EM_ANDAMENTO, AGUARDANDO_INSUMO } from '../../utils/osStatus';

const SETORES_CONFIG = [
  { id: 'TODOS', label: 'Todos os Setores', icone: Layers, cor: 'var(--cor-destaque)' },
  { id: 'MECANICA', label: 'Mecânica', icone: Wrench, cor: '#3b82f6' },
  { id: 'ELETRICA', label: 'Elétrica', icone: Zap, cor: '#eab308' },
  { id: 'SERRALHEIRO', label: 'Serralheiro', icone: Hammer, cor: '#f97316' },
  { id: 'CONSTRUCAO CIVIL', label: 'Construção Civil', icone: HardHat, cor: '#10b981' },
  { id: 'ELETRONICA', label: 'Eletrônica', icone: Cpu, cor: '#8b5cf6' },
  { id: 'METALURGICA', label: 'Metalúrgica', icone: Shield, cor: '#ec4899' },
  { id: 'LOGISTICA', label: 'Logística', icone: Truck, cor: '#06b6d4' },
  { id: 'SLD', label: 'SLD', icone: Compass, cor: '#64748b' }
];

export const extrairMesAnoOS = (os) => {
  if (!os) return { mesAno: 'OUTROS', mes: 0, ano: 0 };
  
  // 1. Extração prioritária via Código da OS: ex: '133-0826' -> mes: 8, ano: 2026 ('08/2026')
  const cod = (os.codigo || '').toString().trim();
  const matchCod = cod.match(/-([0-9]{2})([0-9]{2})$/);
  if (matchCod) {
    const mes = parseInt(matchCod[1], 10);
    const ano = parseInt(`20${matchCod[2]}`, 10);
    const mesStr = String(mes).padStart(2, '0');
    return { mesAno: `${mesStr}/${ano}`, mes, ano };
  }

  // 2. Extração via Data (ex: '2026-09-02')
  const dtStr = os.data || os.data_criacao || os.dataAbertura || '';
  if (dtStr) {
    const d = new Date(dtStr);
    if (!isNaN(d.getTime())) {
      const mes = d.getMonth() + 1;
      const ano = d.getFullYear();
      const mesStr = String(mes).padStart(2, '0');
      return { mesAno: `${mesStr}/${ano}`, mes, ano };
    }
  }

  return { mesAno: 'OUTROS', mes: 0, ano: 0 };
};

const NOMES_MESES = [
  '', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const DashboardApontamentoOS = () => {
  const [ordensServico, setOrdensServico] = useState([]);
  const [loading, setLoading] = useState(true);
  const [termoBusca, setTermoBusca] = useState('');
  const [setorSelecionado, setSetorSelecionado] = useState('TODOS');
  const [mesSelecionado, setMesSelecionado] = useState('TODOS');
  const [dropdownMesAberto, setDropdownMesAberto] = useState(false);
  const [osSelecionada, setOsSelecionada] = useState(null);
  const [modalRevisoesAberto, setModalRevisoesAberto] = useState(false);
  const [servicosKits, setServicosKits] = useState([]);
  const [modalKitsAberto, setModalKitsAberto] = useState(false);

  // Auxiliares
  const [produtosEstoque, setProdutosEstoque] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [veiculosConfig, setVeiculosConfig] = useState([]);
  const [loadingPhase, setLoadingPhase] = useState(0);

  const searchInputRef = useRef(null);
  const dropdownMesRef = useRef(null);

  // Fechar dropdown de mês ao clicar fora
  useEffect(() => {
    const handleClickFora = (e) => {
      if (dropdownMesRef.current && !dropdownMesRef.current.contains(e.target)) {
        setDropdownMesAberto(false);
      }
    };
    document.addEventListener('mousedown', handleClickFora);
    return () => document.removeEventListener('mousedown', handleClickFora);
  }, []);

  // Efeito para trocar os textos dinamicamente ao longo dos 8 segundos
  useEffect(() => {
    if (loading) {
      setLoadingPhase(0);
      const t1 = setTimeout(() => setLoadingPhase(1), 2000);
      const t2 = setTimeout(() => setLoadingPhase(2), 4600);
      const t3 = setTimeout(() => setLoadingPhase(3), 6800);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }
  }, [loading]);

  const carregarDados = async (isFirst = false) => {
    if (isFirst) setLoading(true);
    try {
      const now = Date.now();
      const safeFetchJson = async (url) => {
        try {
          const res = await fetch(url, { cache: 'no-store' });
          if (!res || !res.ok) return null;
          return await res.json();
        } catch {
          return null;
        }
      };

      // Delay proposital de 8 segundos para exibir a animação completa de inicialização
      const delayPromise = isFirst ? new Promise(resolve => setTimeout(resolve, 8000)) : Promise.resolve();

      const [ordens, produtos, forn, veics, kits] = await Promise.all([
        safeFetchJson(`/api/os?_t=${now}`),
        safeFetchJson(`/api/produtos?_t=${now}`),
        safeFetchJson(`/api/fornecedores?_t=${now}`),
        safeFetchJson(`/api/veiculos?_t=${now}`),
        safeFetchJson(`/api/servicos-kits?_t=${now}`),
        delayPromise
      ]);

      if (Array.isArray(ordens)) {
        // Filtrar estritamente apenas OS ativas (Em Andamento ou Aguardando Insumo)
        const ativas = ordens.filter(os => {
          if (!os) return false;
          const s = (os.situacao || '').trim().replace(/\s+/g, '_');
          return s !== CONCLUIDO && s !== CANCELADO && s !== 'REJEITADO_DIRETORIA';
        });
        setOrdensServico(ativas);
      }

      if (Array.isArray(produtos)) setProdutosEstoque(produtos);
      if (Array.isArray(forn)) setFornecedores(forn);
      if (Array.isArray(veics)) setVeiculosConfig(veics);
      if (Array.isArray(kits)) setServicosKits(kits);
    } catch (err) {
      console.error('Erro ao carregar dados do totem de apontamento:', err);
    } finally {
      if (isFirst) setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados(true);
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }

    const interval = setInterval(() => {
      carregarDados(false);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  // Filtragem Parcial (Setor e Busca) para que o menu de meses conte certo
  const ordensFiltradasSemMes = useMemo(() => {
    return ordensServico.filter(os => {
      // Filtro por setor
      if (setorSelecionado !== 'TODOS') {
        const setorOS = (os.setor || '').toUpperCase();
        if (!setorOS.includes(setorSelecionado)) return false;
      }

      // Filtro por termo de busca
      if (!termoBusca || !termoBusca.trim()) return true;
      const term = termoBusca.toLowerCase().trim();

      const matchCodigo = (os.codigo || '').toString().toLowerCase().includes(term);
      const matchAlvo = (os.centroCusto || '').toLowerCase().includes(term);
      const matchDesc = (os.descricao || '').toLowerCase().includes(term);
      const matchSolicitante = (os.requisitante || '').toLowerCase().includes(term);
      const matchSetor = (os.setor || '').toLowerCase().includes(term);

      return matchCodigo || matchAlvo || matchDesc || matchSolicitante || matchSetor;
    });
  }, [ordensServico, setorSelecionado, termoBusca]);

  // Agrupamento dos meses disponíveis (Baseado nas ordens já filtradas por Setor/Busca)
  const mesesDisponiveis = useMemo(() => {
    const mapMeses = new Map();

    ordensFiltradasSemMes.forEach(os => {
      const { mesAno, mes, ano } = extrairMesAnoOS(os);
      if (mesAno && mesAno !== 'OUTROS' && mes > 0 && ano > 0) {
        if (!mapMeses.has(mesAno)) {
          const nomeMes = NOMES_MESES[mes] || `Mês ${mes}`;
          mapMeses.set(mesAno, {
            id: mesAno,
            rotulo: `${nomeMes} / ${ano}`,
            mes,
            ano,
            total: 1
          });
        } else {
          mapMeses.get(mesAno).total += 1;
        }
      }
    });

    return Array.from(mapMeses.values()).sort((a, b) => {
      if (b.ano !== a.ano) return b.ano - a.ano;
      return b.mes - a.mes;
    });
  }, [ordensFiltradasSemMes]);

  // Filtragem Final (Incluindo o Mês)
  const ordensFiltradas = useMemo(() => {
    return ordensFiltradasSemMes.filter(os => {
      if (mesSelecionado !== 'TODOS') {
        const { mesAno } = extrairMesAnoOS(os);
        if (mesAno !== mesSelecionado) return false;
      }
      return true;
    });
  }, [ordensFiltradasSemMes, mesSelecionado]);

  const getSetorColor = (setor = '') => {
    const s = setor.toUpperCase();
    const config = SETORES_CONFIG.find(c => c.id !== 'TODOS' && s.includes(c.id));
    return config ? config.cor : '#6b7280';
  };

  const rotuloMesAtivo = useMemo(() => {
    if (mesSelecionado === 'TODOS') return 'Todos os Meses';
    const encontrado = mesesDisponiveis.find(m => m.id === mesSelecionado);
    return encontrado ? encontrado.rotulo : mesSelecionado;
  }, [mesSelecionado, mesesDisponiveis]);

  // Mapa de alertas de revisão por placa de veículo para consulta ultrarrápida
  const mapaAlertasRevisao = useMemo(() => {
    const mapa = new Map();
    (veiculosConfig || []).forEach(v => {
      if (v && v.placa) {
        const analise = calcularStatusRevisaoVeiculo(v);
        mapa.set((v.placa || '').trim().toUpperCase(), analise);
      }
    });
    return mapa;
  }, [veiculosConfig]);

  // Contadores globais de revisões para o botão do Header
  const { totalRevisoesCriticas, totalRevisoesAtencao } = useMemo(() => {
    let criticas = 0;
    let atencao = 0;
    mapaAlertasRevisao.forEach(analise => {
      if (analise.critico) criticas++;
      else if (analise.temAlerta) atencao++;
    });
    return { totalRevisoesCriticas: criticas, totalRevisoesAtencao: atencao };
  }, [mapaAlertasRevisao]);

  return (
    <div className={styles.container}>
      {/* Header Estilo Organizador com Logo Yamaservice, Identidade, UserInfo, Busca e Ações */}
      <HeaderApontamentoOS
        onAtualizar={() => carregarDados(false)}
        termoBusca={termoBusca}
        setTermoBusca={setTermoBusca}
        totalPendentes={ordensFiltradas.length}
        loading={loading}
        searchInputRef={searchInputRef}
        totalRevisoesCriticas={totalRevisoesCriticas}
        totalRevisoesAtencao={totalRevisoesAtencao}
        onAbrirVisualizadorRevisoes={() => setModalRevisoesAberto(true)}
        onAbrirGerenciadorKits={() => setModalKitsAberto(true)}
        totalKits={servicosKits.length}
      />

      {/* Conteúdo Central */}
      <div className={styles.contentArea}>

        {/* Barra Superior Unificada: Setores + Seletor Compacto de Mês */}
        <div className={styles.filtrosBar}>
          <div className={styles.setoresRow}>
            {SETORES_CONFIG.map(item => {
              const Icone = item.icone;
              const isActive = setorSelecionado === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`${styles.setorBtn} ${isActive ? styles.active : ''}`}
                  onClick={() => setSetorSelecionado(item.id)}
                >
                  <Icone size={15} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Menu Dropdown Compacto e Moderno de Mês */}
          {mesesDisponiveis.length > 0 && (
            <div className={styles.dropdownMesContainer} ref={dropdownMesRef}>
              <button
                type="button"
                className={`${styles.dropdownMesBtn} ${mesSelecionado !== 'TODOS' ? styles.active : ''}`}
                onClick={() => setDropdownMesAberto(prev => !prev)}
                title="Filtrar Ordens de Serviço por Mês"
              >
                <Calendar size={15} color="var(--cor-destaque)" />
                <span className={styles.dropdownMesText}>{rotuloMesAtivo}</span>
                <span className={styles.dropdownMesBadge}>
                  {ordensFiltradas.length}
                </span>
                <ChevronDown size={14} className={`${styles.chevronIcon} ${dropdownMesAberto ? styles.rotate : ''}`} />
              </button>

              {dropdownMesAberto && (
                <div className={styles.dropdownMesMenu}>
                  <div className={styles.dropdownMesHeader}>
                    <Calendar size={13} color="var(--cor-destaque)" />
                    <span>Filtrar por Mês (MMAA)</span>
                  </div>

                  <button
                    type="button"
                    className={`${styles.dropdownMesItem} ${mesSelecionado === 'TODOS' ? styles.itemActive : ''}`}
                    onClick={() => {
                      setMesSelecionado('TODOS');
                      setDropdownMesAberto(false);
                    }}
                  >
                    <div className={styles.dropdownMesItemLeft}>
                      {mesSelecionado === 'TODOS' ? <Check size={14} color="var(--cor-destaque)" /> : <div style={{ width: 14 }} />}
                      <span>Todos os Meses</span>
                    </div>
                    <span className={styles.dropdownMesItemBadge}>{ordensFiltradasSemMes.length}</span>
                  </button>

                  <div className={styles.dropdownDivider} />

                  {mesesDisponiveis.map(m => {
                    const isActive = mesSelecionado === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        className={`${styles.dropdownMesItem} ${isActive ? styles.itemActive : ''}`}
                        onClick={() => {
                          setMesSelecionado(m.id);
                          setDropdownMesAberto(false);
                        }}
                      >
                        <div className={styles.dropdownMesItemLeft}>
                          {isActive ? <Check size={14} color="var(--cor-destaque)" /> : <div style={{ width: 14 }} />}
                          <span>{m.rotulo}</span>
                        </div>
                        <span className={styles.dropdownMesItemBadge}>{m.total}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Contador e Status da Lista */}
        <div className={styles.statusListRow}>
          <span>Exibindo <strong>{ordensFiltradas.length}</strong> O.S. aguardando execução/apontamento</span>
          {loading && <span style={{ color: 'var(--cor-destaque)', fontWeight: '600' }}>Sincronizando dados...</span>}
        </div>

        {/* Grade de Cards de O.S. ou Estados Animados */}
        {loading && ordensServico.length === 0 ? (
          <div className={styles.loadingContainer}>
            <div className={styles.loadingScene}>
              <div className={styles.orbitRing1} />
              <div className={styles.orbitRing2} />
              <div className={styles.glowingCore}>
                <RefreshCw size={32} className="fa-spin" />
              </div>
              <div className={styles.satelliteItem1}>
                <Zap size={18} />
              </div>
              <div className={styles.satelliteItem2}>
                <Sparkles size={20} />
              </div>
            </div>

            <div className={styles.badgeStatusLive}>
              <span className={styles.liveDot} />
              <span>
                {loadingPhase === 0 && 'Conectando ao Banco de Dados...'}
                {loadingPhase === 1 && 'Sincronizando Ordens de Serviço...'}
                {loadingPhase === 2 && 'Mapeando Veículos & Diário de Bordo...'}
                {loadingPhase === 3 && 'Abrindo Terminal do Colaborador...'}
              </span>
            </div>

            <h3 className={styles.emptyTitle}>
              {loadingPhase === 0 && 'Inicializando Sistema...'}
              {loadingPhase === 1 && 'Sincronizando Ordens de Serviço...'}
              {loadingPhase === 2 && 'Organizando Insumos e Frotas...'}
              {loadingPhase === 3 && 'Tudo Pronto! Carregando Painel...'}
            </h3>
            <p className={styles.emptySubtitle}>
              {loadingPhase === 0 && 'Estabelecendo conexão segura com a rede interna e base de dados.'}
              {loadingPhase === 1 && 'Consultando chamados, demandas pendentes e prioridades da oficina.'}
              {loadingPhase === 2 && 'Mapeando catálogo de peças da Omie, veículos e turnos de trabalho.'}
              {loadingPhase === 3 && 'Apresentando as Ordens de Serviço disponíveis para execução.'}
            </p>

            <div className={styles.loadingProgressTrack}>
              <div className={styles.loadingProgressBar} />
            </div>
          </div>
        ) : ordensFiltradas.length === 0 ? (
          <div className={styles.emptyStateContainer}>
            <div className={styles.animeScene}>
              <div className={styles.pulseRing1} />
              <div className={styles.pulseRing2} />
              <div className={styles.centralIconBubble}>
                <CheckCircle size={38} />
              </div>
              <div className={styles.floatingSatellite1}>
                <Sparkles size={22} />
              </div>
              <div className={styles.floatingSatellite2}>
                <Wrench size={18} />
              </div>
            </div>

            <div className={styles.badgeStatusLive}>
              <span className={styles.liveDot} />
              <span>Terminal Sincronizado & Operacional</span>
            </div>

            <h3 className={styles.emptyTitle}>
              {termoBusca || setorSelecionado !== 'TODOS' 
                ? 'Nenhuma O.S. encontrada para este filtro' 
                : 'Tudo em Dia! Nenhuma O.S. Pendente'}
            </h3>

            <p className={styles.emptySubtitle}>
              {termoBusca || setorSelecionado !== 'TODOS'
                ? 'Não há ordens de serviço pendentes com os termos selecionados. Tente limpar os filtros para ver tudo.'
                : 'Excelente trabalho da equipe! Todas as ordens de serviço foram concluídas. O sistema está pronto para novos chamados.'}
            </p>

            {termoBusca || setorSelecionado !== 'TODOS' ? (
              <button
                type="button"
                className={styles.btnEmptyAction}
                onClick={() => {
                  setTermoBusca('');
                  setSetorSelecionado('TODOS');
                }}
              >
                <Layers size={16} />
                <span>Limpar Filtros & Ver Todos os Setores</span>
              </button>
            ) : (
              <button
                type="button"
                className={styles.btnEmptyAction}
                onClick={carregarDados}
              >
                <RefreshCw size={16} className={loading ? 'fa-spin' : ''} />
                <span>Verificar Novas O.S.</span>
              </button>
            )}
          </div>
        ) : (
          <div className={styles.gridCards}>
            {ordensFiltradas.map(os => {
              const corSetor = getSetorColor(os.setor);

              // Checar se a OS ultrapassou o prazo
              const hoje = new Date().toISOString().split('T')[0];
              const isAtrasada = Boolean(os.prazo && hoje > os.prazo);
              const formatarDataCard = (d) => d ? d.split('-').reverse().join('/') : '';

              // Checar alerta de revisão preventiva do veículo associado
              const placaOS = (os.centroCusto || os.placaVeiculo || '').trim().toUpperCase();
              let alertaRevisao = mapaAlertasRevisao.get(placaOS);
              if (!alertaRevisao && os.veiculos && os.veiculos.length > 0) {
                for (const v of os.veiculos) {
                  const p = (v.placa || '').trim().toUpperCase();
                  if (mapaAlertasRevisao.has(p)) {
                    alertaRevisao = mapaAlertasRevisao.get(p);
                    break;
                  }
                }
              }

              return (
                <div
                  key={os.id || os.codigo}
                  className={styles.cardOS}
                  style={{
                    borderColor: `${corSetor}55`,
                    borderTop: `4px solid ${corSetor}`,
                    '--card-setor-cor': corSetor
                  }}
                  onClick={() => setOsSelecionada(os)}
                >
                  <div className={styles.cardTop}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className={styles.cardCodigo}>#{os.codigo}</span>
                      {isAtrasada && (
                        <span className={styles.badgeAtrasadaMini}>
                          <AlertTriangle size={11} />
                          <span>Atrasada</span>
                        </span>
                      )}
                    </div>
                    <span className={styles.cardSetorBadge} style={{ backgroundColor: `${corSetor}20`, color: corSetor, border: `1px solid ${corSetor}60` }}>
                      {os.setor || 'GERAL'}
                    </span>
                  </div>

                  <div className={styles.cardAlvo}>
                    <MapPin size={16} />
                    <span>{os.centroCusto || 'SEM LOCAL / ALVO'}</span>
                  </div>

                  {alertaRevisao && alertaRevisao.temAlerta && (
                    <div style={{ marginTop: '-2px', marginBottom: '2px' }}>
                      <span 
                        className={`${styles.badgeRevisaoAlertaCard} ${alertaRevisao.critico ? styles.badgeRevisaoVencida : styles.badgeRevisaoAtencao}`}
                        title={alertaRevisao.alertaPrincipal?.detalhe || ''}
                      >
                        {alertaRevisao.critico ? <AlertTriangle size={12} /> : <Clock size={12} />}
                        <span>{alertaRevisao.alertaPrincipal?.texto}</span>
                      </span>
                    </div>
                  )}

                  <div className={styles.cardDescricao}>
                    {os.descricao || 'Sem descrição cadastrada.'}
                  </div>

                  <div className={styles.cardFooter}>
                    <div className={styles.solicitanteInfo}>
                      <User size={13} />
                      <span>{os.requisitante || 'N/A'}</span>
                    </div>
                    {os.prazo ? (
                      <div className={styles.prazoInfoCard}>
                        <Calendar size={12} />
                        <span>Prazo: {formatarDataCard(os.prazo)}</span>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '2px', color: 'var(--cor-destaque)', fontSize: '0.75rem', fontWeight: '700' }}>
                        <span>Apontar</span>
                        <ChevronRight size={14} />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* Modal / Painel de Apontamento */}
      {osSelecionada && (
        <PainelApontamentoOS
          os={osSelecionada}
          onClose={() => setOsSelecionada(null)}
          onSucesso={(concluiu) => {
            carregarDados(false);
            if (concluiu) {
              setTermoBusca('');
            }
          }}
          produtosEstoque={produtosEstoque}
          fornecedores={fornecedores}
          veiculosConfig={veiculosConfig}
          servicosKits={servicosKits}
        />
      )}

      {/* Modal Visualizador de Revisões da Frota */}
      {modalRevisoesAberto && (
        <ModalVisualizadorRevisoesTotem
          veiculos={veiculosConfig}
          ordensServico={ordensServico}
          onClose={() => setModalRevisoesAberto(false)}
          onSelecionarOS={(os) => setOsSelecionada(os)}
        />
      )}

      {/* Modal Gerenciador de Kits de Serviços da Oficina */}
      {modalKitsAberto && (
        <ModalGerenciadorKitsServicos
          kits={servicosKits}
          onSalvarKit={async (kitSalvo) => {
            try {
              const res = await fetch(`/api/servicos-kits`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(kitSalvo)
              });
              if (res.ok) {
                const data = await res.json();
                if (data && data.kits) {
                  setServicosKits(data.kits);
                } else {
                  setServicosKits(prev => {
                    const idx = prev.findIndex(k => k.id === kitSalvo.id);
                    if (idx >= 0) {
                      const copy = [...prev];
                      copy[idx] = data.kit || kitSalvo;
                      return copy;
                    }
                    return [data.kit || kitSalvo, ...prev];
                  });
                }
              }
            } catch (err) {
              console.error('Erro ao salvar kit de serviço:', err);
              throw err;
            }
          }}
          onExcluirKit={async (kitId) => {
            try {
              const res = await fetch(`/api/servicos-kits/${encodeURIComponent(kitId)}`, {
                method: 'DELETE'
              });
              if (res.ok) {
                setServicosKits(prev => prev.filter(k => k.id !== kitId));
              }
            } catch (err) {
              console.error('Erro ao excluir kit de serviço:', err);
              throw err;
            }
          }}
          onClose={() => setModalKitsAberto(false)}
          produtosEstoque={produtosEstoque}
          veiculosConfig={veiculosConfig}
        />
      )}
    </div>
  );
};

export default DashboardApontamentoOS;
