import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, ArrowRight, AlertTriangle, CheckCircle2, X, ExternalLink, ShieldAlert, FileText } from 'lucide-react';
import styles from './index.module.css';

const LISTA_GRANJAS = [
  'G. KAWAMURA',
  'G. ITA',
  'G. MOSQUEIRO',
  'G. GENIPAUBA',
  'G. CAMPINA',
  'G. AGUA BRANCA',
  'G. CASTANHEIRA',
  'G. GUARIMÃ',
  'G. SÃO CAETANO',
  'G. AVICEMA',
  'G. KIMURA'
];

const normalizarTexto = (txt) => (txt || '').toString().trim().toUpperCase();
const normalizarPlaca = (txt) => (txt || '').toString().toUpperCase().replace(/[^A-Z0-9]/g, '');

const STATUS_FINALIZADOS = ['CONCLUIDO', 'CANCELADO', 'REJEITADO_DIRETORIA'];

const extrairDescricaoServico = (os) => {
  if (os.descricao && os.descricao.trim()) return os.descricao.trim();
  if (os.motivo && os.motivo.trim()) return os.motivo.trim();
  if (os.problema && os.problema.trim()) return os.problema.trim();
  if (Array.isArray(os.itensPrestacao) && os.itensPrestacao.length > 0) {
    const itens = os.itensPrestacao.map(i => i.descricao || i.servico).filter(Boolean);
    if (itens.length > 0) return itens.join(' | ');
  }
  return 'Sem descrição detalhada cadastrada';
};

const ModalVerificacaoCentroCustoOS = ({
  isOpen = true,
  onClose,
  onContinuar,
  onVerOS,
  osList = [],
  isPrestacao = false
}) => {
  const [centroCusto, setCentroCusto] = useState('');
  const [termoPesquisado, setTermoPesquisado] = useState('');
  const [pesquisou, setPesquisou] = useState(false);
  const [veiculos, setVeiculos] = useState([]);
  const [departamentos, setDepartamentos] = useState([]);
  const inputRef = useRef(null);

  // Foco automático no input ao abrir o modal
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        if (inputRef.current) inputRef.current.focus();
      }, 100);
    }
  }, [isOpen]);

  // Carregar veículos para sugestões
  useEffect(() => {
    fetch('/api/veiculos')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setVeiculos(data);
      })
      .catch(err => console.error('Erro ao buscar veículos na triagem:', err));
  }, []);

  // Carregar departamentos para sugestões
  useEffect(() => {
    fetch('/api/departamentos')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setDepartamentos(data);
      })
      .catch(err => console.error('Erro ao buscar departamentos na triagem:', err));
  }, []);

  // Disparar busca ao clicar em "Ir" ou dar Enter
  const handleBuscar = (e) => {
    if (e) e.preventDefault();
    const termoLimpo = normalizarTexto(centroCusto);
    if (!termoLimpo) {
      alert('Por favor, informe a Placa, Veículo, Granja ou Centro de Custo.');
      return;
    }
    setTermoPesquisado(termoLimpo);
    setPesquisou(true);
  };

  // Filtrar O.S. ativas que correspondem ao termo pesquisado
  const osAtivasEncontradas = useMemo(() => {
    if (!pesquisou || !termoPesquisado) return [];

    const queryLimpa = normalizarTexto(termoPesquisado);
    const queryPlaca = normalizarPlaca(termoPesquisado);

    return (osList || []).filter(os => {
      // Ignora O.S. já finalizadas/canceladas
      if (STATUS_FINALIZADOS.includes(os.situacao)) return false;

      const centroOS = normalizarTexto(os.centroCusto || os.unidadeDestino || '');
      const placaOS = normalizarPlaca(os.centroCusto || os.unidadeDestino || os.placa || '');

      // Comparação por placa (se tiver 3 ou mais dígitos/letras alfanuméricos)
      if (queryPlaca && queryPlaca.length >= 3 && placaOS) {
        if (placaOS.includes(queryPlaca) || queryPlaca.includes(placaOS)) {
          return true;
        }
      }

      // Comparação por texto de centro de custo / granja / setor
      if (queryLimpa && centroOS) {
        if (centroOS.includes(queryLimpa) || queryLimpa.includes(centroOS)) {
          return true;
        }
      }

      return false;
    });
  }, [pesquisou, termoPesquisado, osList]);

  const handleAvancar = () => {
    const finalCentro = centroCusto.trim().toUpperCase();
    if (!finalCentro) {
      alert('Por favor, digite o Centro de Custo Alvo.');
      return;
    }
    if (onContinuar) {
      onContinuar(finalCentro);
    }
  };

  const getStatusBadgeClass = (situacao) => {
    if (situacao === 'EM_ANDAMENTO') return styles.badgeAndamento;
    if (situacao === 'AGUARDANDO_INSUMO' || situacao === 'AGUARDANDO_ALMOXARIFADO') return styles.badgeAguardandoInsumo;
    if (situacao && situacao.includes('CHEFE')) return styles.badgeAguardandoChefe;
    return styles.badgeOutro;
  };

  const formatarStatus = (situacao = '') => {
    const map = {
      EM_ANDAMENTO: 'Em Andamento',
      AGUARDANDO_INSUMO: 'Aguard. Insumo / Peça',
      AGUARDANDO_ALMOXARIFADO: 'Aguard. Almoxarifado',
      ATRIBUIDO_TECNICO: 'Atribuído ao Técnico',
      PECAS_ENTREGUES: 'Peças Entregues',
      AGUARDANDO_CHEFE_SETOR: 'Aguard. Aprovação Chefe',
      EMERGENCIA_CHEFE_SETOR: '🚨 Emergência Chefe',
      AGUARDANDO_GERENTE_SERVICOS: 'Aguard. Gerente',
      AGUARDANDO_DIRETORIA: 'Aguard. Diretoria'
    };
    return map[situacao] || situacao.replace(/_/g, ' ');
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget && onClose) onClose(); }}>
      <div className={styles.modalCard}>
        {onClose && (
          <button type="button" onClick={onClose} className={styles.closeButton} title="Fechar">
            <X size={24} />
          </button>
        )}

        <div className={styles.header}>
          <div className={styles.titleWrapper}>
            <ShieldAlert size={22} className={styles.titleIcon} />
            <h2 className={styles.title}>Consulta Prévia de Ordem de Serviço</h2>
          </div>
          <p className={styles.subtitle}>
            Informe o <strong>Centro de Custo Alvo</strong> (veículo, trator, máquina, granja ou setor) para verificar se já existem serviços em andamento e evitar duplicidade de chamados.
          </p>
        </div>

        {/* Campo de Busca / Pergunta */}
        <form onSubmit={handleBuscar} className={styles.searchForm}>
          <label className={styles.searchLabel}>
            {isPrestacao ? 'Granja / Unidade Alvo' : 'Qual é o Centro de Custo Alvo? (Veículo / Placa / Granja / Setor)'}
          </label>
          <div className={styles.searchRow}>
            <input
              ref={inputRef}
              type="text"
              className={styles.inputSearch}
              placeholder={isPrestacao ? 'Ex: G. KAWAMURA' : 'Ex: ABC-1234, STRADA, TRATOR, MÁQUINA ou OFICINA'}
              value={centroCusto}
              onChange={(e) => {
                setCentroCusto(e.target.value.toUpperCase());
                if (pesquisou && e.target.value.toUpperCase() !== termoPesquisado) {
                  setPesquisou(false);
                }
              }}
              list="triagem-centrocusto-list"
              autoComplete="off"
            />
            <button type="submit" className={styles.btnBuscar}>
              <Search size={16} />
              Ir / Buscar
            </button>
          </div>

          {/* Datalist com sugestões */}
          <datalist id="triagem-centrocusto-list">
            {isPrestacao ? (
              LISTA_GRANJAS.map(g => (
                <option key={`granja-${g}`} value={g}>{g}</option>
              ))
            ) : (
              <>
                {departamentos.map(dep => (
                  <option key={`dep-${dep.codigo || dep.descricao}`} value={dep.descricao}>{dep.descricao}</option>
                ))}
                {veiculos.map(v => (
                  <option key={`veic-${v.placa}`} value={v.placa}>
                    {v.modelo ? `${v.placa} - ${v.modelo}` : v.placa}
                  </option>
                ))}
              </>
            )}
          </datalist>
        </form>

        {/* Conteúdo Dinâmico dos Resultados */}
        <div className={styles.resultsContainer}>
          {!pesquisou && (
            <div className={styles.emptyPrompt}>
              <Search size={28} color="var(--cor-destaque)" style={{ opacity: 0.7 }} />
              <div>
                Digite a placa do veículo ou o centro de custo acima e clique no botão <strong>"Ir / Buscar"</strong> (ou pressione <strong>Enter</strong>).
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--cor-texto-secundario)' }}>
                O sistema irá verificar se já foi aberto algum serviço para este veículo/centro de custo.
              </div>
            </div>
          )}

          {/* CASO 1: NÃO ENCONTROU NENHUM SERVIÇO EM ANDAMENTO */}
          {pesquisou && osAtivasEncontradas.length === 0 && (
            <div className={styles.alertSuccessCard}>
              <div className={styles.alertSuccessIconWrapper}>
                <CheckCircle2 size={30} />
              </div>
              <div>
                <h3 className={styles.alertSuccessTitle}>
                  Nenhum serviço em andamento encontrado para "{termoPesquisado}"!
                </h3>
                <p className={styles.alertSuccessDesc}>
                  Este veículo/centro de custo está totalmente liberado, sem Ordens de Serviço abertas no momento.
                </p>
              </div>

              <div className={styles.alertSuccessAction}>
                <button
                  type="button"
                  className={styles.btnContinuarSucesso}
                  onClick={handleAvancar}
                >
                  Continuar para Cadastrar O.S.
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* CASO 2: ENCONTROU SERVIÇOS EM ANDAMENTO */}
          {pesquisou && osAtivasEncontradas.length > 0 && (
            <>
              {/* Alerta de O.S. existentes */}
              <div className={styles.alertWarning}>
                <AlertTriangle size={22} className={styles.alertWarningIcon} />
                <div className={styles.alertWarningText}>
                  <h4 className={styles.alertWarningTitle}>
                    Atenção: Já existe(m) {osAtivasEncontradas.length} Ordem(ns) de Serviço em andamento para "{termoPesquisado}"!
                  </h4>
                  <p className={styles.alertWarningDesc}>
                    Analise a <strong>Descrição do Serviço</strong> abaixo para conferir se o serviço que você vai abrir já está em andamento (evitando duplicação):
                  </p>
                </div>
              </div>

              {/* Lista das O.S. em andamento */}
              <div className={styles.osList}>
                {osAtivasEncontradas.map((os) => (
                  <div key={os.codigo || os.id} className={styles.osCard}>
                    <div className={styles.osCardHeader}>
                      <div className={styles.osCardHeaderLeft}>
                        <span className={styles.osCodigo}>#{os.codigo}</span>
                        <span className={styles.osSetorTag}>{os.setor || 'GERAL'}</span>
                      </div>
                      <span className={`${styles.badgeStatus} ${getStatusBadgeClass(os.situacao)}`}>
                        {formatarStatus(os.situacao)}
                      </span>
                    </div>

                    {/* Descrição do serviço com destaque total */}
                    <div className={styles.osDescricaoBox}>
                      <div className={styles.osDescricaoLabel}>
                        <FileText size={14} />
                        Descrição do Serviço / Problema Cadastrado:
                      </div>
                      <div className={styles.osDescricaoTexto}>
                        {extrairDescricaoServico(os)}
                      </div>
                    </div>

                    <div className={styles.osCardFooter}>
                      <span className={styles.osMetaInfo}>
                        Aberta em: <strong>{os.data || '-'} {os.hora || ''}</strong> {os.requisitante ? `| Requisitante: ${os.requisitante}` : ''} {os.abertoPor ? `| Por: ${os.abertoPor}` : ''}
                      </span>
                      {onVerOS && (
                        <button
                          type="button"
                          className={styles.btnVerOS}
                          onClick={() => onVerOS(os)}
                          title="Abrir detalhes desta O.S."
                        >
                          <ExternalLink size={14} />
                          Visualizar O.S. #{os.codigo}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Opção de abrir serviço diferente */}
              <div className={styles.avisoServicoDiferente}>
                <span className={styles.avisoServicoDiferenteTexto}>
                  O serviço que você precisa abrir é <strong>diferente</strong> dos listados acima?
                </span>
                <button
                  type="button"
                  className={styles.btnContinuarDiferente}
                  onClick={handleAvancar}
                >
                  Continuar para Nova O.S
                  <ArrowRight size={18} />
                </button>
              </div>
            </>
          )}
        </div>

        {/* Rodapé */}
        <div className={styles.footerActions}>
          {onClose && (
            <button type="button" className={styles.btnCancelar} onClick={onClose}>
              Cancelar / Fechar
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModalVerificacaoCentroCustoOS;
