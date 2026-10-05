import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Search,
  Wrench,
  Truck,
  Car,
  Droplet,
  AlertTriangle,
  CheckCircle,
  Clock,
  Building2,
  ExternalLink,
  Info,
  Layers,
  ChevronRight,
  Camera
} from 'lucide-react';
import styles from './ModalVisualizadorRevisoesTotem.module.css';
import { calcularStatusRevisaoVeiculo } from '../../../../utils/statusRevisao';

const ModalVisualizadorRevisoesTotem = ({
  veiculos = [],
  ordensServico = [],
  onClose,
  onSelecionarOS
}) => {
  const [busca, setBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('PENDENTES'); // Inicia focado nos que precisam de atenção
  const [fotoAmpliada, setFotoAmpliada] = useState(null);

  // Fechar com ESC (se foto ampliada estiver aberta fecha apenas a foto, senão fecha o modal)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (fotoAmpliada) {
          setFotoAmpliada(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, fotoAmpliada]);

  // Análise completa de cada veículo com memorização
  const dadosAnalisados = useMemo(() => {
    return (veiculos || []).map(v => {
      const analise = calcularStatusRevisaoVeiculo(v);

      // Checar se já tem O.S. aberta para este veículo na lista de OS ativas
      const placaNorm = (v.placa || '').trim().toUpperCase();
      const osAberta = (ordensServico || []).find(os => {
        const alvo = (os.centroCusto || '').trim().toUpperCase();
        const placaVeic = (os.placaVeiculo || '').trim().toUpperCase();
        const naLista = (os.veiculos || []).some(x => (x.placa || '').trim().toUpperCase() === placaNorm);
        return alvo === placaNorm || placaVeic === placaNorm || naLista;
      });

      return {
        ...v,
        analise,
        osAberta
      };
    });
  }, [veiculos, ordensServico]);

  // Contadores globais
  const metricas = useMemo(() => {
    let criticos = 0;
    let atencao = 0;
    let emDia = 0;

    dadosAnalisados.forEach(item => {
      if (item.analise.critico) {
        criticos++;
      } else if (item.analise.temAlerta) {
        atencao++;
      } else if (item.analise.statusOleo.id === 'em_dia' || item.analise.statusRevisao.id === 'em_dia') {
        emDia++;
      }
    });

    return {
      criticos,
      atencao,
      emDia,
      total: dadosAnalisados.length,
      pendentes: criticos + atencao
    };
  }, [dadosAnalisados]);

  // Filtragem e ordenação
  const veiculosFiltrados = useMemo(() => {
    return dadosAnalisados.filter(item => {
      const isM = item.analise.isMaq;

      // Filtro de Categoria
      if (filtroTipo === 'PENDENTES' && !item.analise.temAlerta) return false;
      if (filtroTipo === 'VEICULO' && isM) return false;
      if (filtroTipo === 'MAQUINA' && !isM) return false;

      // Filtro de Texto (Busca)
      if (busca && busca.trim()) {
        const termo = busca.trim().toUpperCase();
        const p = (item.placa || '').toUpperCase();
        const m = (item.modelo || '').toUpperCase();
        const marca = (item.marca || '').toUpperCase();
        return p.includes(termo) || m.includes(termo) || marca.includes(termo);
      }

      return true;
    }).sort((a, b) => {
      // 1. Prioridade de revisão (vencidos primeiro, depois atenção, depois em dia)
      if (a.analise.prioridade !== b.analise.prioridade) {
        return a.analise.prioridade - b.analise.prioridade;
      }
      // 2. Ordem alfabética da placa
      return (a.placa || '').localeCompare(b.placa || '');
    });
  }, [dadosAnalisados, filtroTipo, busca]);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()}>

        {/* Cabeçalho do Modal */}
        <div className={styles.modalHeader}>
          <div className={styles.headerLeft}>
            <div className={styles.headerIconBubble}>
              <Wrench size={22} />
            </div>
            <div className={styles.titleArea}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 className={styles.modalTitle}>Painel de Revisões da Frota</h3>
                <span className={styles.badgeModoConsulta}>Consulta Oficina</span>
              </div>
              <p className={styles.modalSubtitle}>
                Acompanhamento em tempo real de Troca de Óleo e Revisão Geral dos veículos e máquinas
              </p>
            </div>
          </div>

          <button type="button" className={styles.btnClose} onClick={onClose} title="Fechar painel (ESC)">
            <X size={20} />
          </button>
        </div>

        {/* Banner Informativo de Fluxo de Trabalho (Orientação para o Escritório) */}
        <div className={styles.bannerRegraNegocio}>
          <Building2 size={16} style={{ flexShrink: 0 }} />
          <span>
            <strong>Aviso Operacional:</strong> A abertura oficial de Ordens de Serviço é realizada pelo <strong>Escritório</strong>. Para veículos sem O.S. ativa, solicite a abertura ao setor responsável.
          </span>
        </div>

        {/* Barra de Métricas Rápidas */}
        <div className={styles.metricsRow}>
          <div className={`${styles.metricCard} ${metricas.criticos > 0 ? styles.critico : ''}`}>
            <div className={`${styles.metricIcon} ${styles.critico}`}>
              <AlertTriangle size={18} />
            </div>
            <div className={styles.metricInfo}>
              <span className={styles.metricValue}>{metricas.criticos}</span>
              <span className={styles.metricLabel}>Manutenções Vencidas</span>
            </div>
          </div>

          <div className={`${styles.metricCard} ${metricas.atencao > 0 ? styles.atencao : ''}`}>
            <div className={`${styles.metricIcon} ${styles.atencao}`}>
              <Clock size={18} />
            </div>
            <div className={styles.metricInfo}>
              <span className={styles.metricValue}>{metricas.atencao}</span>
              <span className={styles.metricLabel}>Próximas do Vencimento</span>
            </div>
          </div>

          <div className={styles.metricCard}>
            <div className={`${styles.metricIcon} ${styles.ok}`}>
              <CheckCircle size={18} />
            </div>
            <div className={styles.metricInfo}>
              <span className={styles.metricValue}>{metricas.emDia}</span>
              <span className={styles.metricLabel}>Em Dia com as Metas</span>
            </div>
          </div>
        </div>

        {/* Toolbar de Abas de Categoria e Busca */}
        <div className={styles.filterToolbar}>
          <div className={styles.tabsGroup}>
            <button
              type="button"
              className={`${styles.tabBtn} ${filtroTipo === 'PENDENTES' ? styles.active : ''}`}
              onClick={() => setFiltroTipo('PENDENTES')}
            >
              <AlertTriangle size={14} />
              <span>Pendentes ({metricas.pendentes})</span>
            </button>
            <button
              type="button"
              className={`${styles.tabBtn} ${filtroTipo === 'TODOS' ? styles.active : ''}`}
              onClick={() => setFiltroTipo('TODOS')}
            >
              <Layers size={14} />
              <span>Todos ({metricas.total})</span>
            </button>
            <button
              type="button"
              className={`${styles.tabBtn} ${filtroTipo === 'VEICULO' ? styles.active : ''}`}
              onClick={() => setFiltroTipo('VEICULO')}
            >
              <Truck size={14} />
              <span>Veículos</span>
            </button>
            <button
              type="button"
              className={`${styles.tabBtn} ${filtroTipo === 'MAQUINA' ? styles.active : ''}`}
              onClick={() => setFiltroTipo('MAQUINA')}
            >
              <Wrench size={14} />
              <span>Máquinas / Tratores</span>
            </button>
          </div>

          <div className={styles.searchBox}>
            <Search size={15} color="var(--cor-texto-secundario)" />
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Buscar placa, modelo..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
            {busca && (
              <button
                type="button"
                onClick={() => setBusca('')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cor-texto-secundario)', padding: 0 }}
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Corpo do Modal: Lista de Veículos com Scroll */}
        <div className={styles.modalBody}>
          {veiculosFiltrados.length === 0 ? (
            <div className={styles.emptyState}>
              <CheckCircle size={36} color="var(--cor-sucesso, #10b981)" />
              <h4 className={styles.emptyStateTitle}>
                {busca ? 'Nenhum equipamento encontrado para esta busca.' : 'Tudo em dia! Nenhum equipamento pendente nesta categoria.'}
              </h4>
              <p style={{ margin: 0, fontSize: '0.8rem' }}>
                {filtroTipo === 'PENDENTES'
                  ? 'Não há veículos com revisão ou troca de óleo atrasadas no momento.'
                  : 'Selecione outra categoria ou limpe o campo de busca.'}
              </p>
            </div>
          ) : (
            veiculosFiltrados.map(v => {
              const { analise, osAberta } = v;
              const { isMaq, unidade, labelMedicao, statusOleo, statusRevisao, critico, temAlerta } = analise;

              let cardExtraClass = '';
              if (critico) cardExtraClass = styles.critico;
              else if (temAlerta) cardExtraClass = styles.atencao;

              return (
                <div key={v.placa || v.id} className={`${styles.veiculoCard} ${cardExtraClass}`}>
                  {/* Topo do Card: Identificação + Odômetro Atual */}
                  <div className={styles.cardHeader}>
                    <div className={styles.veiculoIdentificacao}>
                      {v.foto ? (
                        <div
                          className={styles.veiculoFotoBox}
                          onClick={() => setFotoAmpliada({ url: v.foto, placa: v.placa, modelo: v.modelo || v.subtipoMaquina || v.especieTipo })}
                          title="Clique para ampliar a foto do veículo"
                        >
                          <img src={v.foto} alt={`Foto ${v.placa}`} className={styles.veiculoFotoImg} />
                          <div className={styles.veiculoFotoHoverBadge}>
                            <Camera size={13} />
                          </div>
                        </div>
                      ) : (
                        <div className={styles.veiculoIconBox}>
                          {isMaq ? <Wrench size={22} /> : <Truck size={22} />}
                        </div>
                      )}
                      <div className={styles.placaInfo}>
                        <div className={styles.placaRow}>
                          <span className={styles.placaText}>{v.placa}</span>
                          <span className={styles.tagTipo}>
                            {isMaq ? 'Máquina' : 'Veículo'}
                          </span>
                        </div>
                        <span className={styles.modeloText}>
                          {v.modelo || v.subtipoMaquina || v.especieTipo || 'Sem Modelo Cadastrado'}
                        </span>
                      </div>
                    </div>

                    <div className={styles.odometroBadge}>
                      <span className={styles.odometroLabel}>{labelMedicao}</span>
                      <span className={styles.odometroValor}>
                        {v.kmAtual ? `${Number(v.kmAtual).toLocaleString('pt-BR')} ${unidade}` : 'Não informado'}
                      </span>
                    </div>
                  </div>

                  {/* Metas: Óleo e Revisão Lado a Lado */}
                  <div className={styles.metasGrid}>
                    {/* Bloco Óleo */}
                    <div className={styles.metaBox}>
                      <div className={styles.metaHeader}>
                        <div className={styles.metaTitulo}>
                          <Droplet size={14} color="#3b82f6" />
                          <span>Troca de Óleo</span>
                        </div>
                        <span
                          className={styles.metaStatusPill}
                          style={{ backgroundColor: `${statusOleo.cor}22`, color: statusOleo.cor }}
                        >
                          {statusOleo.texto}
                        </span>
                      </div>
                      <div className={styles.progressBarContainer}>
                        <div
                          className={styles.progressBarFill}
                          style={{ width: `${statusOleo.pct || 0}%`, backgroundColor: statusOleo.cor }}
                        />
                      </div>
                      <div className={styles.metaValores}>
                        <span>Última: {v.kmTrocaOleo ? `${Number(v.kmTrocaOleo).toLocaleString('pt-BR')} ${unidade}` : '--'}</span>
                        <span style={{ fontWeight: '700', color: 'var(--cor-texto-principal)' }}>
                          Meta: {statusOleo.proxima ? `${statusOleo.proxima.toLocaleString('pt-BR')} ${unidade}` : '--'}
                        </span>
                      </div>
                      {statusOleo.id === 'atrasado' && (
                        <div style={{ fontSize: '0.73rem', fontWeight: '800', color: 'var(--cor-erro, #ef4444)' }}>
                          🚨 Atraso: {statusOleo.atrasoAbsoluto.toLocaleString('pt-BR')} {unidade} vencidos
                        </div>
                      )}
                      {statusOleo.id === 'atencao' && (
                        <div style={{ fontSize: '0.73rem', fontWeight: '700', color: '#f59e0b' }}>
                          ⚠️ Faltam {statusOleo.falta.toLocaleString('pt-BR')} {unidade} para a meta
                        </div>
                      )}
                    </div>

                    {/* Bloco Revisão Geral */}
                    <div className={styles.metaBox}>
                      <div className={styles.metaHeader}>
                        <div className={styles.metaTitulo}>
                          <Wrench size={14} color="#f59e0b" />
                          <span>Revisão Geral</span>
                        </div>
                        <span
                          className={styles.metaStatusPill}
                          style={{ backgroundColor: `${statusRevisao.cor}22`, color: statusRevisao.cor }}
                        >
                          {statusRevisao.texto}
                        </span>
                      </div>
                      <div className={styles.progressBarContainer}>
                        <div
                          className={styles.progressBarFill}
                          style={{ width: `${statusRevisao.pct || 0}%`, backgroundColor: statusRevisao.cor }}
                        />
                      </div>
                      <div className={styles.metaValores}>
                        <span>Última: {v.kmRevisao ? `${Number(v.kmRevisao).toLocaleString('pt-BR')} ${unidade}` : '--'}</span>
                        <span style={{ fontWeight: '700', color: 'var(--cor-texto-principal)' }}>
                          Meta: {statusRevisao.proxima ? `${statusRevisao.proxima.toLocaleString('pt-BR')} ${unidade}` : '--'}
                        </span>
                      </div>
                      {statusRevisao.id === 'atrasado' && (
                        <div style={{ fontSize: '0.73rem', fontWeight: '800', color: 'var(--cor-erro, #ef4444)' }}>
                          🚨 Atraso: {statusRevisao.atrasoAbsoluto.toLocaleString('pt-BR')} {unidade} vencidos
                        </div>
                      )}
                      {statusRevisao.id === 'atencao' && (
                        <div style={{ fontSize: '0.73rem', fontWeight: '700', color: '#f59e0b' }}>
                          ⚠️ Faltam {statusRevisao.falta.toLocaleString('pt-BR')} {unidade} para a meta
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Rodapé: Estado da O.S. (Com O.S. vs Sem O.S.) */}
                  <div className={styles.cardFooterOS}>
                    {osAberta ? (
                      <div className={styles.comOSBox}>
                        <span className={styles.tagOSAberta}>
                          <CheckCircle size={14} />
                          <span>O.S. #{osAberta.codigo} em andamento</span>
                        </span>
                        {onSelecionarOS && (
                          <button
                            type="button"
                            className={styles.btnApontarOS}
                            onClick={() => {
                              onSelecionarOS(osAberta);
                              onClose();
                            }}
                          >
                            <span>Apontar O.S. #{osAberta.codigo}</span>
                            <ChevronRight size={14} />
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className={styles.semOSBox}>
                        <Building2 size={15} color="var(--cor-destaque)" />
                        <span>Sem O.S. ativa no momento — Solicitar abertura junto ao Escritório</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Rodapé do Modal */}
        <div className={styles.modalFooter}>
          <span>Exibindo {veiculosFiltrados.length} equipamentos</span>
          <button type="button" className={styles.btnFecharModal} onClick={onClose}>
            Fechar
          </button>
        </div>

      </div>

      {/* Lightbox de Ampliação da Foto do Veículo */}
      {fotoAmpliada && (
        <div className={styles.lightboxOverlay} onClick={() => setFotoAmpliada(null)}>
          <div className={styles.lightboxContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.lightboxHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Camera size={18} color="var(--cor-destaque)" />
                <span className={styles.lightboxTitle}>
                  {fotoAmpliada.placa} {fotoAmpliada.modelo ? `— ${fotoAmpliada.modelo}` : ''}
                </span>
              </div>
              <button
                type="button"
                className={styles.btnCloseLightbox}
                onClick={() => setFotoAmpliada(null)}
                title="Fechar visualização (ESC)"
              >
                <X size={18} />
              </button>
            </div>
            <div className={styles.lightboxImgWrapper}>
              <img src={fotoAmpliada.url} alt={fotoAmpliada.placa} className={styles.lightboxImg} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModalVisualizadorRevisoesTotem;
