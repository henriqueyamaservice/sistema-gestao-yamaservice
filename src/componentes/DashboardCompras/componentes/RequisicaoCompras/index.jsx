import React, { useState, useEffect } from 'react';
import { ListChecks, ChevronDown, ChevronUp, CheckCircle, Clock, RefreshCw } from 'lucide-react';
import ModalSubstituicao from '../ModalSubstituicao';
import styles from './RequisicaoCompras.module.css';

const RequisicaoCompras = ({ setView }) => {
  const [requisicoes, setRequisicoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandido, setExpandido] = useState(null);
  
  // Modal de Substituição
  const [itemParaSubstituir, setItemParaSubstituir] = useState(null);
  const [reqIdParaSubstituir, setReqIdParaSubstituir] = useState(null);

  useEffect(() => {
    fetchRequisicoes();
  }, []);

  const fetchRequisicoes = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/requisicoes');
      if (!response.ok) throw new Error('Falha ao carregar requisições');
      const data = await response.json();
      
      // Filtra apenas requisições de reposição que vieram do Almoxarifado
      // E que estejam no status inicial do pipeline (pendente_cotacao ou vazio)
      const requisicoesReposicao = data.filter(req => 
        req.tipo === 'reposicao' && (!req.status_compras || req.status_compras === 'pendente_cotacao')
      );
      // Ordena pelas mais recentes primeiro
      requisicoesReposicao.sort((a, b) => new Date(b.dataCriacao) - new Date(a.dataCriacao));
      
      setRequisicoes(requisicoesReposicao);
    } catch (error) {
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id) => {
    setExpandido(expandido === id ? null : id);
  };

  const iniciarCotacao = async (e, reqId) => {
    e.stopPropagation();
    
    try {
      const response = await fetch(`http://localhost:3000/api/requisicoes/${reqId}/avancar-etapa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ novoStatus: 'em_concorrencia' })
      });

      if (!response.ok) throw new Error('Falha ao avançar etapa');
      
      // Pula automaticamente para a tela de Concorrência
      setView('concorrencia');
    } catch (error) {
      console.error('Erro ao avançar etapa:', error);
      alert('Erro ao tentar enviar a requisição para a Concorrência.');
    }
  };

  const abrirModalSubstituicao = (e, reqId, item) => {
    e.stopPropagation();
    setReqIdParaSubstituir(reqId);
    setItemParaSubstituir(item);
  };

  const handleSubstituicao = async (produtoSubstituto, motivo) => {
    try {
      const payload = {
        codigoOriginal: itemParaSubstituir.codigo,
        produtoSubstituto,
        motivo
      };

      const response = await fetch(`http://localhost:3000/api/requisicoes/${reqIdParaSubstituir}/substituir-item`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error('Falha ao registrar substituição');
      
      // Recarrega as requisições para atualizar a tela
      await fetchRequisicoes();
    } catch (error) {
      console.error('Erro na substituição:', error);
      alert('Ocorreu um erro ao registrar a substituição.');
    }
  };

  return (
    <div className={styles['requisicoes-container']}>
      <header className={styles['header']}>
        <div className={styles['header-title']}>
          <div className={styles['icon-highlight']}>
            <ListChecks size={28} />
          </div>
          <div>
            <h2>Fila de Requisições (Almoxarifado)</h2>
            <p>Demanda de itens aguardando processo de compra</p>
          </div>
        </div>
      </header>

      {loading ? (
        <div className={styles['loading']}>Carregando requisições...</div>
      ) : requisicoes.length === 0 ? (
        <div className={styles['empty']}>
          <CheckCircle size={48} color="var(--cor-sucesso)" />
          <h3>Nenhuma requisição pendente</h3>
          <p>O Almoxarifado não solicitou nenhuma reposição de estoque.</p>
        </div>
      ) : (
        <div className={styles['lista-cards']}>
          {requisicoes.map((req) => {
            const isExpandido = expandido === req.id;
            const totalItens = req.itens?.reduce((acc, item) => acc + Number(item.quantidade), 0) || 0;
            const valorEstimado = req.itens?.reduce((acc, item) => acc + (Number(item.quantidade) * Number(item.valor_unitario || 0)), 0) || 0;
            
            return (
              <div key={req.id} className={`${styles['req-card']} ${isExpandido ? styles['expanded'] : ''}`}>
                <div className={styles['req-header']} onClick={() => toggleExpand(req.id)}>
                  <div className={styles['req-info-container']}>
                    {/* Linha 1: Informações curtas */}
                    <div className={styles['req-row']}>
                      <div className={styles['req-id-box']}>
                        <span className={styles['label']}>ID</span>
                        <span className={styles['value']}>{req.id.slice(-6)}</span>
                      </div>
                      <div className={styles['req-detalhe']}>
                        <span className={styles['label']}>Departamento</span>
                        <span className={styles['value']}>{req.localEstoque || 'Almoxarifado'}</span>
                      </div>
                      <div className={styles['req-detalhe']}>
                        <span className={styles['label']}>Projeto Destino</span>
                        <span className={styles['value']}>{req.projetoDestino || '-'}</span>
                      </div>
                      <div className={styles['req-detalhe']}>
                        <span className={styles['label']}>Sugestão Entrega</span>
                        <span className={styles['value']}>{req.sugestaoEntrega ? new Date(req.sugestaoEntrega).toLocaleDateString('pt-BR') : '-'}</span>
                      </div>
                      <div className={styles['req-detalhe']}>
                        <span className={styles['label']}>Total de Itens</span>
                        <span className={styles['value']}>{totalItens} peças</span>
                      </div>
                    </div>

                    {/* Linha 2: Informações longas */}
                    <div className={styles['req-row']} style={{ borderTop: '1px dashed var(--cor-borda-cartao)', paddingTop: '12px' }}>
                      <div className={styles['req-detalhe']}>
                        <span className={styles['label']}>Data da Solicitação</span>
                        <span className={styles['value']}>{new Date(req.dataCriacao).toLocaleString('pt-BR')}</span>
                      </div>
                      <div className={styles['req-detalhe']}>
                        <span className={styles['label']}>Categoria da Compra</span>
                        <span className={styles['value']} style={{ color: 'var(--cor-destaque)', fontWeight: 'bold' }}>{req.categoriaCompra || '-'}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className={styles['req-actions']}>
                    <div className={styles['badge-status']}>
                      <Clock size={14} /> Aguardando Cotação
                    </div>
                    {isExpandido ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                  </div>
                </div>

                {isExpandido && (
                  <div className={styles['req-body']}>
                    <div className={styles['itens-header']}>
                      <h4>Produtos Solicitados</h4>
                      <div className={styles['valor-estimado']}>
                        Custo Estimado (Base Histórica): <strong>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorEstimado)}</strong>
                      </div>
                    </div>
                    
                    <table className={styles['itens-table']}>
                      <thead>
                        <tr>
                          <th>Código Omie</th>
                          <th>Descrição do Produto</th>
                          <th className={styles['text-center']}>Qtd Solicitada</th>
                          <th className={styles['text-right']}>Preço Unit. (Histórico)</th>
                          <th className={styles['text-right']}>Subtotal Estimado</th>
                          <th className={styles['text-center']}>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {req.itens?.map((item) => (
                          <tr key={item.codigo} className={item.substituicao ? styles['item-substituido-row'] : ''}>
                            <td>
                              <div className={styles['codigo-cell']}>
                                <span className={styles['badge-codigo']} style={(item.codigo.startsWith('AVULSO') || item.codigo.startsWith('NOVO')) ? { background: '#dbeafe', color: '#1d4ed8', fontWeight: 'bold', fontFamily: 'sans-serif' } : {}}>
                                  {(item.codigo.startsWith('AVULSO') || item.codigo.startsWith('NOVO')) ? 'NOVO' : item.codigo}
                                </span>
                                {item.substituicao && <span className={styles['badge-substituto']} title={item.substituicao.motivo}>SUBSTITUTO</span>}
                              </div>
                            </td>
                            <td>
                              <div className={styles['desc-cell']}>
                                {item.descricao}
                                {item.substituicao && (
                                  <div className={styles['info-original']}>
                                    <RefreshCw size={12} /> Substituiu: {item.substituicao.codigoOriginal} - {item.substituicao.descricaoOriginal}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className={styles['text-center']}><strong>{item.quantidade}</strong></td>
                            <td className={styles['text-right']}>
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valor_unitario || 0)}
                            </td>
                            <td className={styles['text-right']}>
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((item.quantidade * item.valor_unitario) || 0)}
                            </td>
                            <td className={styles['text-center']}>
                              <button 
                                className={styles['btn-icon']} 
                                title="Substituir Peça por Similar"
                                onClick={(e) => abrirModalSubstituicao(e, req.id, item)}
                              >
                                <RefreshCw size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    <div className={styles['req-footer-actions']}>
                      <button className={styles['btn-iniciar']} onClick={(e) => iniciarCotacao(e, req.id)}>
                        Iniciar Cotação com Fornecedores
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ModalSubstituicao 
        isOpen={!!itemParaSubstituir} 
        onClose={() => setItemParaSubstituir(null)}
        itemOriginal={itemParaSubstituir}
        onConfirm={handleSubstituicao}
      />
    </div>
  );
};

export default RequisicaoCompras;
