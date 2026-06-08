import React, { useState } from 'react';
import { X, Save, Plus, Copy, Ban, Paperclip, Clock, ListTodo, Trash2, Image as ImageIcon, Search, Edit2, Check } from 'lucide-react';
import styles from './ProdutoModal.module.css';

const ProdutoModal = ({ produto, onClose, fetchProdutosGlobal }) => {
  const [activeTab, setActiveTab] = useState('caracteristicas');
  const [showSubModal, setShowSubModal] = useState(false);
  const [eanValue, setEanValue] = useState(produto.ean || '');
  const [isSaving, setIsSaving] = useState(false);

  // Dados formatados para exibição
  const formatarMoeda = (valor) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);
  };

  const getUnidade = (un) => {
    if (un === 'UN') return 'Unidade (UN)';
    if (un === 'CX') return 'Caixa (CX)';
    if (un === 'KG') return 'Quilograma (KG)';
    if (un === 'M') return 'Metro (M)';
    if (un === 'PC') return 'Peça (PC)';
    if (un === 'PC') return 'Peça (PC)';
    return un || 'Unidade (UN)';
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`http://localhost:3000/api/produtos/${produto.codigo}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ean: eanValue })
      });
      if (res.ok) {
        alert('Produto atualizado com sucesso!');
        if (fetchProdutosGlobal) fetchProdutosGlobal();
      } else {
        throw new Error('Falha ao salvar produto');
      }
    } catch (err) {
      alert('Erro ao salvar as alterações: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        
        {/* Header do Modal */}
        <div className={styles.modalHeader}>
          <h2>Produtos</h2>
          <button className={styles.btnClose} onClick={onClose}>
            Fechar <X size={20} />
          </button>
        </div>

        <div className={styles.modalBody}>
          
          {/* Coluna Esquerda/Centro (Informações) */}
          <div className={styles.mainInfo}>
            
            {/* Bloco Superior (Dados Básicos) */}
            <div className={styles.topSection}>
              
              {/* Imagem Placeholder */}
              <div className={styles.imageBox}>
                <div className={styles.imagePlaceholder}>
                  <ImageIcon size={40} className={styles.iconImage} />
                  <span>{produto.codigo}</span>
                </div>
                <button className={styles.btnAlterarImagem}>Alterar Imagem</button>
              </div>

              {/* Campos do Produto */}
              <div className={styles.fieldsGrid}>
                
                <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                  <label>Descrição do Produto</label>
                  <input type="text" value={produto.descricao || ''} readOnly />
                </div>

                <div className={styles.formGroup}>
                  <label>Código do Produto</label>
                  <input type="text" value={produto.codigo || ''} readOnly />
                </div>

                <div className={styles.formGroup}>
                  <label>Código EAN (GTIN)</label>
                  <input type="text" value={eanValue} onChange={(e) => setEanValue(e.target.value)} placeholder="Opcional - Digite ou bipe aqui" />
                </div>

                <div className={styles.formGroup}>
                  <label>Unidade</label>
                  <input type="text" value={getUnidade(produto.unidade)} readOnly />
                </div>

                <div className={styles.formGroup}>
                  <label>Preço Unitário de Venda</label>
                  <input type="text" value={formatarMoeda(produto.valor_unitario)} readOnly className={styles.textRight} />
                </div>

                <div className={styles.formGroup}>
                  <label>Código NCM</label>
                  <input type="text" value={produto.ncm || '0000.00.00'} readOnly />
                </div>

                <div className={styles.formGroup}>
                  <label>Família de Produto</label>
                  <input type="text" value={produto.descricao_familia || 'Sem Família'} readOnly />
                </div>

              </div>

              {/* Toggles (Simples, Kit, Variacoes) */}
              <div className={styles.togglesSection}>
                <label className={styles.toggleLabel}>Definição do Produto</label>
                <div className={styles.toggleRow}>
                  <div className={`${styles.toggleSwitch} ${styles.active}`}></div>
                  <span>Simples</span>
                </div>
                <div className={styles.toggleRow}>
                  <div className={styles.toggleSwitch}></div>
                  <span>Kit</span>
                </div>
                <div className={styles.toggleRow}>
                  <div className={styles.toggleSwitch}></div>
                  <span>Com Variações</span>
                </div>
              </div>

            </div>

            {/* Seção de Abas (Tabs) */}
            <div className={styles.tabsContainer}>
              <div className={styles.tabsHeader}>
                <button className={activeTab === 'estoque' ? styles.activeTab : ''} onClick={() => setActiveTab('estoque')}>Estoque</button>
                <button className={activeTab === 'custo' ? styles.activeTab : ''} onClick={() => setActiveTab('custo')}>Custo do Estoque</button>
                <button className={activeTab === 'fornecedores' ? styles.activeTab : ''} onClick={() => setActiveTab('fornecedores')}>Fornecedores</button>
                <button className={activeTab === 'historico' ? styles.activeTab : ''} onClick={() => setActiveTab('historico')}>Histórico de Compras</button>
                <button className={activeTab === 'adicionais' ? styles.activeTab : ''} onClick={() => setActiveTab('adicionais')}>Informações Adicionais</button>
                <button className={activeTab === 'caracteristicas' ? styles.activeTab : ''} onClick={() => setActiveTab('caracteristicas')}>Características</button>
              </div>

              <div className={styles.tabContent}>
                {activeTab === 'estoque' && (
                  <div className={styles.tabEstoque}>
                    <p className={styles.tabInfo}>Abaixo um resumo das informações de estoque deste produto.</p>
                    
                    <table className={styles.tabelaGenerica}>
                      <thead>
                        <tr>
                          <th>Local de Estoque</th>
                          <th className={styles.textRight}>Estoque Disponível</th>
                          <th className={styles.textRight}>Estoque Mínimo</th>
                          <th className={styles.textRight}>Previsão de Entrada</th>
                          <th className={styles.textRight}>Previsão de Saída</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>PADRÃO - Local de Estoque Padrão</td>
                          <td className={styles.textRight}>0 {produto.unidade}</td>
                          <td className={styles.textRight}>0</td>
                          <td className={styles.textRight}>0 {produto.unidade}</td>
                          <td className={styles.textRight}>0 {produto.unidade}</td>
                        </tr>
                        <tr className={styles.rowHighlight}>
                          <td>01 - Almoxarifado</td>
                          <td className={styles.textRight}><strong>{produto.quantidade_estoque || 0} {produto.unidade}</strong></td>
                          <td className={styles.textRight}>{produto.estoque_minimo || 0}</td>
                          <td className={styles.textRight}>0 {produto.unidade}</td>
                          <td className={styles.textRight}>0 {produto.unidade}</td>
                        </tr>
                        <tr>
                          <td>02 - Armazém de Matéria Prima</td>
                          <td className={styles.textRight}>0 {produto.unidade}</td>
                          <td className={styles.textRight}>0</td>
                          <td className={styles.textRight}>0 {produto.unidade}</td>
                          <td className={styles.textRight}>0 {produto.unidade}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
                
                {activeTab === 'caracteristicas' && (
                  <div className={styles.tabCaracteristicas}>
                    <div className={styles.tabHeaderRow}>
                      <p className={styles.tabInfo}>Estas são as características deste produto<br/><small>Clique duas vezes para alterar o conteúdo de qualquer característica.</small></p>
                      <button className={styles.btnIncluirCarac} onClick={() => setShowSubModal(true)}>
                        <Plus size={16} /> Incluir uma nova característica
                      </button>
                    </div>
                    
                    <table className={styles.tabelaGenerica}>
                      <thead>
                        <tr>
                          <th>Característica</th>
                          <th>Conteúdo</th>
                          <th>Onde será Exibida</th>
                        </tr>
                      </thead>
                      <tbody>
                        {produto.marca && (
                          <tr>
                            <td><strong>MARCA</strong></td>
                            <td><strong>{produto.marca}</strong></td>
                            <td className={styles.textFaded}>&lt;não informado&gt;</td>
                          </tr>
                        )}
                        {produto.caracteristicas?.map((c, idx) => (
                          <tr key={idx} className={idx === 0 ? styles.rowHighlight : ''}>
                            <td><strong>{c.nome || c.cNomeCaracteristica}</strong></td>
                            <td><strong>{c.conteudo || c.cConteudo}</strong></td>
                            <td className={styles.textFaded}>&lt;não informado&gt;</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {activeTab !== 'estoque' && activeTab !== 'caracteristicas' && (
                  <div className={styles.tabEmpty}>
                    <p>Informações não disponíveis na visualização local.</p>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Coluna Direita (Botões de Ação Visual) */}
          <div className={styles.actionSidebar}>
            <button className={styles.actionBtn} onClick={handleSave} disabled={isSaving}>
              <Save size={18} /> {isSaving ? 'Salvando...' : 'Salvar'}
            </button>
            <button className={styles.actionBtn}><Plus size={18} /> Incluir</button>
            <button className={styles.actionBtn}><Copy size={18} /> Duplicar</button>
            <button className={styles.actionBtn}><Ban size={18} /> Inativar</button>
            <button className={styles.actionBtn}><Paperclip size={18} /> Anexos</button>
            <button className={styles.actionBtn}><Clock size={18} /> Histórico</button>
            <button className={styles.actionBtn}><ListTodo size={18} /> Tarefas</button>
            <button className={`${styles.actionBtn} ${styles.btnExcluir}`}><Trash2 size={18} /> Excluir</button>
          </div>

        </div>
      </div>

      {/* Sub-Modal de Inclusão de Característica */}
      {showSubModal && (
        <div className={styles.subModalOverlay} onClick={(e) => { e.stopPropagation(); setShowSubModal(false); }}>
          <div className={styles.subModalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.subModalHeader}>
              <h3 className={styles.textDestaque}>Característica do Produto</h3>
              <button className={styles.btnCloseSub} onClick={() => setShowSubModal(false)}>
                Fechar <X size={18} />
              </button>
            </div>
            
            <div className={styles.subModalBody}>
              <h4>Selecione uma característica da lista, ou crie uma nova aqui mesmo</h4>
              
              <div className={styles.subModalGrid}>
                <div className={styles.formGroupCustom}>
                  <label>Selecione a Característica</label>
                  <div className={styles.inputWithIcons}>
                    <Search size={16} className={styles.iconLeft} />
                    <input type="text" placeholder="Selecione aqui a Característica" />
                    <Edit2 size={16} className={styles.iconRight} />
                  </div>
                </div>

                <div className={styles.formGroupCustom}>
                  <label>Preencha aqui o conteúdo da característica</label>
                  <input type="text" placeholder="Exemplo: Azul, Médio, PP, 220V, etc..." />
                </div>
              </div>

              <div className={styles.subModalToggles}>
                <div className={styles.toggleRow}>
                  <div className={styles.toggleSwitch}></div>
                  <span>Exibir esta característica no item na NF-e emitida</span>
                </div>
                <div className={styles.toggleRow}>
                  <div className={styles.toggleSwitch}></div>
                  <span>Exibir esta característica no item do Pedido, Remessa ou Devolução</span>
                </div>
                <div className={styles.toggleRow}>
                  <div className={styles.toggleSwitch}></div>
                  <span>Exibir esta característica na Ordem de Produção e no Mapa de Custo</span>
                </div>
              </div>
            </div>

            <div className={styles.subModalFooter}>
              <button className={styles.btnConfirmar} onClick={() => setShowSubModal(false)}>
                <Check size={16} /> Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProdutoModal;
