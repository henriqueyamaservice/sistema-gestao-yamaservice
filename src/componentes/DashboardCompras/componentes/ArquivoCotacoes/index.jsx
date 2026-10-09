import React, { useState, useEffect } from 'react';
import { 
  Archive, 
  CheckCircle2, 
  Search, 
  Calendar, 
  User, 
  Loader2, 
  Eye, 
  Trash2, 
  X, 
  Building2, 
  FileText, 
  Hash, 
  Layers,
  ChevronRight
} from 'lucide-react';
import styles from './ArquivoCotacoes.module.css';

const ArquivoCotacoes = () => {
  const [cotacoes, setCotacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [abaAtiva, setAbaAtiva] = useState('SALVO_USUARIO'); // 'SALVO_USUARIO' ou 'APROVADA'
  const [busca, setBusca] = useState('');
  const [cotacaoModal, setCotacaoModal] = useState(null);
  const [removendoId, setRemovendoId] = useState(null);

  const fetchCotacoes = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/cotacoes-arquivadas');
      if (response.ok) {
        const data = await response.json();
        setCotacoes(data);
      }
    } catch (error) {
      console.error('Erro ao buscar cotações arquivadas:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCotacoes();
  }, []);

  // Fechar modal com a tecla Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setCotacaoModal(null);
      }
    };
    if (cotacaoModal) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [cotacaoModal]);

  const formatarData = (dataStr) => {
    if (!dataStr) return '-';
    try {
      return new Date(dataStr).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dataStr;
    }
  };

  const handleExcluirCotacao = async (id, e) => {
    if (e) e.stopPropagation();
    const confirma = window.confirm('Deseja realmente excluir esta cotação arquivada?');
    if (!confirma) return;

    try {
      setRemovendoId(id);
      const res = await fetch(`/api/cotacoes-arquivadas/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setCotacoes(prev => prev.filter(c => c.id !== id));
        if (cotacaoModal && cotacaoModal.id === id) {
          setCotacaoModal(null);
        }
      } else {
        alert('Erro ao excluir cotação arquivada.');
      }
    } catch (err) {
      console.error('Erro ao deletar cotação:', err);
      alert('Erro de conexão ao excluir cotação.');
    } finally {
      setRemovendoId(null);
    }
  };

  const cotacoesFiltradas = cotacoes
    .filter(c => c.tipo_arquivamento === abaAtiva)
    .filter(c => {
      const termo = busca.toLowerCase();
      const info = c.dados_json || {};
      const titulo = (info.titulo || '').toLowerCase();
      return (
        String(c.requisicao_id).toLowerCase().includes(termo) ||
        (c.fornecedor_nome && c.fornecedor_nome.toLowerCase().includes(termo)) ||
        (c.usuario_salvamento && c.usuario_salvamento.toLowerCase().includes(termo)) ||
        titulo.includes(termo)
      );
    });

  const totalSalvas = cotacoes.filter(c => c.tipo_arquivamento === 'SALVO_USUARIO').length;
  const totalAprovadas = cotacoes.filter(c => c.tipo_arquivamento === 'APROVADA').length;

  return (
    <div className={styles.container}>
      {/* Header Principal */}
      <header className={styles.header}>
        <div className={styles.headerTitle}>
          <div className={styles.iconWrapper}>
            <Archive size={26} color="var(--cor-destaque)" />
          </div>
          <div>
            <h1 className={styles.title}>Arquivo de Cotações</h1>
            <p className={styles.subtitle}>Histórico e biblioteca de orçamentos e cotações arquivadas</p>
          </div>
        </div>

        <div className={styles.searchBox}>
          <Search size={18} color="var(--cor-texto-secundario)" />
          <input
            type="text"
            placeholder="Buscar por Req ID, Fornecedor ou Responsável..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
          {busca && (
            <button 
              className={styles.clearSearchBtn}
              onClick={() => setBusca('')}
              title="Limpar busca"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </header>

      {/* Abas de Navegação */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tabBtn} ${abaAtiva === 'SALVO_USUARIO' ? styles.activeTab : ''}`}
          onClick={() => setAbaAtiva('SALVO_USUARIO')}
        >
          <Archive size={17} /> 
          <span>Salvas pelo Usuário</span>
          <span className={styles.tabBadge}>{totalSalvas}</span>
        </button>
        <button
          className={`${styles.tabBtn} ${abaAtiva === 'APROVADA' ? styles.activeTab : ''}`}
          onClick={() => setAbaAtiva('APROVADA')}
        >
          <CheckCircle2 size={17} /> 
          <span>Cotações Aprovadas</span>
          <span className={styles.tabBadge}>{totalAprovadas}</span>
        </button>
      </div>

      {/* Conteúdo Principal em Lista */}
      <div className={styles.content}>
        {loading ? (
          <div className={styles.loadingState}>
            <Loader2 size={34} className={styles.spinner} color="var(--cor-destaque)" />
            <p>Carregando histórico de cotações...</p>
          </div>
        ) : cotacoesFiltradas.length === 0 ? (
          <div className={styles.emptyState}>
            <Archive size={46} color="var(--cor-texto-secundario)" style={{ opacity: 0.4, marginBottom: '14px' }} />
            <h3>Nenhuma cotação encontrada</h3>
            <p>
              {busca 
                ? 'Nenhum resultado corresponde aos filtros de busca informados.' 
                : 'Não há cotações arquivadas nesta categoria.'}
            </p>
          </div>
        ) : (
          <div className={styles.tabelaWrapper}>
            <table className={styles.tabela}>
              <thead>
                <tr>
                  <th style={{ width: '100px' }}>Requisição</th>
                  <th>Fornecedor / Título</th>
                  <th style={{ width: '180px' }}>Data Arquivo</th>
                  <th style={{ width: '180px' }}>Salvo Por</th>
                  <th style={{ width: '120px', textAlign: 'center' }}>Qtd. Itens</th>
                  <th style={{ width: '140px', textAlign: 'center' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {cotacoesFiltradas.map((cotacao) => {
                  const info = cotacao.dados_json || {};
                  const qtdItens = Array.isArray(info.tabela) ? info.tabela.length : 0;
                  const tituloExibicao = info.titulo || cotacao.fornecedor_nome || 'Múltiplos Fornecedores';

                  return (
                    <tr 
                      key={cotacao.id} 
                      className={styles.tabelaLinha}
                      onClick={() => setCotacaoModal(cotacao)}
                      title="Clique para abrir detalhes da cotação"
                    >
                      <td>
                        <span className={styles.reqBadge}>
                          #{cotacao.requisicao_id}
                        </span>
                      </td>
                      <td>
                        <div className={styles.fornecedorInfo}>
                          <Building2 size={16} className={styles.fornecedorIcon} />
                          <div className={styles.fornecedorTextos}>
                            <strong className={styles.fornecedorNomePrincipal}>{tituloExibicao}</strong>
                            {cotacao.fornecedor_nome && info.titulo && cotacao.fornecedor_nome !== info.titulo && (
                              <span className={styles.fornecedorSub}>{cotacao.fornecedor_nome}</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className={styles.metaCell}>
                          <Calendar size={14} />
                          <span>{formatarData(cotacao.criado_em)}</span>
                        </div>
                      </td>
                      <td>
                        <div className={styles.metaCell}>
                          <User size={14} />
                          <span>{cotacao.usuario_salvamento || 'Sistema'}</span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={styles.itensBadge}>
                          <Layers size={13} />
                          {qtdItens} {qtdItens === 1 ? 'item' : 'itens'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div className={styles.acoesContainer} onClick={(e) => e.stopPropagation()}>
                          <button 
                            className={styles.btnVerDetalhes}
                            onClick={() => setCotacaoModal(cotacao)}
                            title="Visualizar Detalhes"
                          >
                            <Eye size={15} />
                            <span>Visualizar</span>
                          </button>
                          <button
                            className={styles.btnExcluir}
                            onClick={(e) => handleExcluirCotacao(cotacao.id, e)}
                            title="Excluir Cotação"
                            disabled={removendoId === cotacao.id}
                          >
                            {removendoId === cotacao.id ? (
                              <Loader2 size={14} className={styles.spinner} />
                            ) : (
                              <Trash2 size={14} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Detalhes da Cotação */}
      {cotacaoModal && (
        <div className={styles.modalOverlay} onClick={() => setCotacaoModal(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className={styles.modalHeader}>
              <div className={styles.modalHeaderTitle}>
                <div className={styles.modalIconWrap}>
                  {cotacaoModal.tipo_arquivamento === 'APROVADA' ? (
                    <CheckCircle2 size={24} color="var(--cor-sucesso)" />
                  ) : (
                    <Archive size={24} color="var(--cor-destaque)" />
                  )}
                </div>
                <div>
                  <h2>
                    {cotacaoModal.dados_json?.titulo || cotacaoModal.fornecedor_nome || 'Detalhes da Cotação'}
                  </h2>
                  <div className={styles.modalHeaderSub}>
                    <span className={styles.reqBadge}>Req. #{cotacaoModal.requisicao_id}</span>
                    <span className={styles.arquivoIdBadge}>ID Arquivo: #{cotacaoModal.id}</span>
                    <span className={cotacaoModal.tipo_arquivamento === 'APROVADA' ? styles.tagAprovada : styles.tagSalva}>
                      {cotacaoModal.tipo_arquivamento === 'APROVADA' ? 'Cotação Aprovada' : 'Salvo pelo Usuário'}
                    </span>
                  </div>
                </div>
              </div>
              <button 
                className={styles.closeBtn} 
                onClick={() => setCotacaoModal(null)}
                title="Fechar modal (ESC)"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className={styles.modalBody}>
              {/* Metadados em Faixa */}
              <div className={styles.metaCardsGrid}>
                <div className={styles.metaCard}>
                  <span className={styles.metaLabel}>Fornecedor Principal</span>
                  <div className={styles.metaValor}>
                    <Building2 size={16} />
                    <span>{cotacaoModal.fornecedor_nome || 'Múltiplos Fornecedores'}</span>
                  </div>
                </div>
                <div className={styles.metaCard}>
                  <span className={styles.metaLabel}>Data do Arquivamento</span>
                  <div className={styles.metaValor}>
                    <Calendar size={16} />
                    <span>{formatarData(cotacaoModal.criado_em)}</span>
                  </div>
                </div>
                <div className={styles.metaCard}>
                  <span className={styles.metaLabel}>Salvo por</span>
                  <div className={styles.metaValor}>
                    <User size={16} />
                    <span>{cotacaoModal.usuario_salvamento || 'Sistema'}</span>
                  </div>
                </div>
                <div className={styles.metaCard}>
                  <span className={styles.metaLabel}>Requisição de Compras</span>
                  <div className={styles.metaValor}>
                    <Hash size={16} />
                    <span>#{cotacaoModal.requisicao_id}</span>
                  </div>
                </div>
              </div>

              {/* Resumo / Parecer / Análise */}
              {cotacaoModal.dados_json?.resumo && (
                <div className={styles.resumoBox}>
                  <div className={styles.resumoHeader}>
                    <FileText size={16} color="var(--cor-destaque)" />
                    <strong>Parecer / Resumo da Cotação</strong>
                  </div>
                  <div className={styles.resumoTexto}>
                    {cotacaoModal.dados_json.resumo}
                  </div>
                </div>
              )}

              {/* Tabela de Produtos */}
              {cotacaoModal.dados_json?.tabela && Array.isArray(cotacaoModal.dados_json.tabela) && cotacaoModal.dados_json.tabela.length > 0 ? (
                <div className={styles.secaoTabelaModal}>
                  <div className={styles.secaoTabelaHeader}>
                    <h3>Itens e Preços Cotados</h3>
                    <span className={styles.itensBadge}>
                      {cotacaoModal.dados_json.tabela.length} {cotacaoModal.dados_json.tabela.length === 1 ? 'item' : 'itens'}
                    </span>
                  </div>

                  <div className={styles.tableWrapperModal}>
                    <table className={styles.tableModal}>
                      <thead>
                        <tr>
                          <th>Fornecedor</th>
                          <th>Produto / Descrição</th>
                          <th style={{ textAlign: 'center' }}>Qtd</th>
                          <th style={{ textAlign: 'right' }}>R$ Unitário</th>
                          <th style={{ textAlign: 'right' }}>Total (R$)</th>
                          {cotacaoModal.dados_json.tabela.some(r => r[5]) && (
                            <th style={{ textAlign: 'center' }}>Prazo / Obs.</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {cotacaoModal.dados_json.tabela.map((row, idx) => (
                          <tr key={idx}>
                            <td>
                              <strong className={styles.itemFornecedor}>{row[0] || '-'}</strong>
                            </td>
                            <td>{row[1] || '-'}</td>
                            <td style={{ textAlign: 'center' }}>
                              <span className={styles.qtdBadge}>{row[2] || '-'}</span>
                            </td>
                            <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                              {row[3] || '-'}
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: '700', color: 'var(--cor-destaque)', fontFamily: 'monospace' }}>
                              {row[4] || '-'}
                            </td>
                            {cotacaoModal.dados_json.tabela.some(r => r[5]) && (
                              <td style={{ textAlign: 'center' }}>{row[5] || '-'}</td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className={styles.tabelaVaziaModal}>
                  <p>Nenhum item tabulado registrado nesta cotação.</p>
                </div>
              )}

              {/* Texto Original do PDF se houver */}
              {cotacaoModal.texto_original_pdf && (
                <details className={styles.pdfOriginalDetails}>
                  <summary className={styles.pdfOriginalSummary}>
                    <FileText size={15} /> Ver Texto Bruto do Arquivo / PDF
                  </summary>
                  <pre className={styles.pdfOriginalConteudo}>
                    {cotacaoModal.texto_original_pdf}
                  </pre>
                </details>
              )}
            </div>

            {/* Modal Footer */}
            <div className={styles.modalFooter}>
              <button 
                className={styles.btnExcluirModal}
                onClick={(e) => handleExcluirCotacao(cotacaoModal.id, e)}
                disabled={removendoId === cotacaoModal.id}
              >
                <Trash2 size={16} />
                <span>Excluir Arquivo</span>
              </button>

              <button 
                className={styles.btnFecharModal}
                onClick={() => setCotacaoModal(null)}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ArquivoCotacoes;
