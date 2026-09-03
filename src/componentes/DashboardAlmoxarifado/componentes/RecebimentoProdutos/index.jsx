import React, { useState, useEffect, useRef } from 'react';
import { PackageOpen, Check, AlertCircle, ScanLine, ArrowLeft, Save, Plus, Minus, Sparkles } from 'lucide-react';
import styles from './RecebimentoProdutos.module.css';

const RecebimentoProdutos = ({ produtos = [], fetchProdutosGlobal }) => {
  const [pedidos, setPedidos] = useState([]);
  const [pedidoSelecionado, setPedidoSelecionado] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Controle da bipagem
  const [bipInput, setBipInput] = useState('');
  const [itensConferidos, setItensConferidos] = useState({});
  const [validadesDigitadas, setValidadesDigitadas] = useState({});
  const [eansCapturados, setEansCapturados] = useState({});  // { 'PRD05907': '7890009' } - EAN real bipado por produto
  const [mensagemBip, setMensagemBip] = useState(null); // Para mostrar "Produto não está na nota"
  const [multiplicador, setMultiplicador] = useState(1);
  const [modalVincular, setModalVincular] = useState({ isOpen: false, barcode: '' });
  const [vinculando, setVinculando] = useState(false);
  
  const inputRef = useRef(null);

  useEffect(() => {
    fetchPedidos();
  }, []);

  // Focar o input automaticamente quando um pedido for selecionado
  useEffect(() => {
    if (pedidoSelecionado && inputRef.current && !modalVincular.isOpen) {
      inputRef.current.focus();
    }
  }, [pedidoSelecionado, mensagemBip, modalVincular.isOpen]); // Refoca após exibir mensagens ou fechar modal

  const fetchPedidos = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/pedidos');
      if (!response.ok) throw new Error('Falha ao buscar pedidos');
      const data = await response.json();
      setPedidos(data);
    } catch (err) {
      setError('Erro ao carregar pedidos pendentes. Verifique se o servidor está rodando.');
    } finally {
      setLoading(false);
    }
  };

  const selecionarPedido = (pedido) => {
    setPedidoSelecionado(pedido);
    // Inicializa a contagem zerada para cada item
    const contagemInicial = {};
    pedido.itens.forEach(item => {
      contagemInicial[item.codigo] = item.quantidadeRecebida || 0;
    });
    setItensConferidos(contagemInicial);
    setValidadesDigitadas({});
    setEansCapturados({});
    setMensagemBip(null);
  };

  const voltarLista = () => {
    setPedidoSelecionado(null);
    setBipInput('');
    setMultiplicador(1);
    setValidadesDigitadas({});
  };

  const handleBipar = (e) => {
    e.preventDefault();
    if (!bipInput.trim()) return;

    const codigoBipado = bipInput.trim();
    
    // 1. Verifica se o item existe na nota (pelo código interno)
    let itemEncontrado = pedidoSelecionado.itens.find(i => i.codigo === codigoBipado);

    // 2. Se não encontrou pelo código interno, procura nos EANs globais
    if (!itemEncontrado) {
      const produtoComEan = produtos.find(p => p.ean && p.ean.split(',').map(e => e.trim()).includes(codigoBipado));
      if (produtoComEan) {
        // Verifica se esse produto global pertence a este pedido!
        itemEncontrado = pedidoSelecionado.itens.find(i => i.codigo === produtoComEan.codigo);
      }
    }

    if (itemEncontrado) {
      const quantidadeAtual = itensConferidos[itemEncontrado.codigo] || 0;
      
      setItensConferidos({
        ...itensConferidos,
        [itemEncontrado.codigo]: quantidadeAtual + multiplicador
      });

      // Captura o EAN bipado para este produto (o último bipe sempre sobrescreve)
      setEansCapturados(prev => ({
        ...prev,
        [itemEncontrado.codigo]: codigoBipado
      }));

      setMensagemBip({ tipo: 'sucesso', texto: `✅ ${multiplicador}x ${itemEncontrado.descricao} adicionado(s)!` });
      
      setBipInput(''); // Limpa o input para o próximo bip
      setMultiplicador(1); // Reseta o multiplicador por segurança
      
      setTimeout(() => {
        setMensagemBip(null);
      }, 2000);
      
    } else {
      // 3. Se não encontrou de jeito nenhum, abre o modal para vincular o EAN desconhecido
      setModalVincular({ isOpen: true, barcode: codigoBipado });
      setBipInput('');
      setMultiplicador(1);
    }
  };

  const handleVincularBarcode = async (codigoItem) => {
    const itemEncontrado = pedidoSelecionado.itens.find(i => i.codigo === codigoItem);
    if (!itemEncontrado) return;

    setVinculando(true);
    try {
      const res = await fetch(`/api/produtos/${codigoItem}/barcode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barcode: modalVincular.barcode })
      });
      if (!res.ok) throw new Error('Falha ao vincular');
      
      if (fetchProdutosGlobal) fetchProdutosGlobal(); // atualiza a lista global
      
      const quantidadeAtual = itensConferidos[codigoItem] || 0;
      setItensConferidos({
        ...itensConferidos,
        [codigoItem]: quantidadeAtual + 1 // sempre vincula adicionando 1 (o bip que causou o modal)
      });
      setMensagemBip({ tipo: 'sucesso', texto: `✅ Código Vinculado! 1x ${itemEncontrado.descricao} adicionado(s)!` });

      // Captura o EAN novo para este produto (será atrelado ao Lote no backend)
      setEansCapturados(prev => ({
        ...prev,
        [codigoItem]: modalVincular.barcode
      }));

      setTimeout(() => setMensagemBip(null), 3000);
      
    } catch(err) {
      alert('Erro ao vincular: ' + err.message);
    } finally {
      setVinculando(false);
      setModalVincular({ isOpen: false, barcode: '' });
    }
  };

  const handleContagemManual = (codigoItem, delta) => {
    const quantidadeAtual = itensConferidos[codigoItem] || 0;
    const novaQuantidade = Math.max(0, quantidadeAtual + delta);
    setItensConferidos({
      ...itensConferidos,
      [codigoItem]: novaQuantidade
    });
  };

  const finalizarRecebimento = async () => {
    // Validar validades obrigatórias
    const itensComQuantidade = pedidoSelecionado.itens.filter(item => (itensConferidos[item.codigo] || 0) > 0);
    for (const item of itensComQuantidade) {
      const produto = produtos.find(p => p.codigo === item.codigo);
      if (produto && produto.produto_lote === 'S' && !validadesDigitadas[item.codigo]) {
        alert(`A data de validade é obrigatória para o produto que controla lote:\n\n${item.codigo} - ${item.descricao}`);
        return;
      }
    }

    const isCompletos = pedidoSelecionado.itens.every(item => (itensConferidos[item.codigo] || 0) === item.quantidadeEsperada);
    
    let observacao = '';
    if (!isCompletos) {
      const resp = window.prompt('Recebimento Parcial Detectado!\nPor favor, informe a justificativa/observação para o setor de Compras (ex: "Faltaram 10 unidades"):');
      if (resp === null) return; // User cancelled
      if (resp.trim() === '') {
        alert('A observação é obrigatória para recebimentos parciais!');
        return;
      }
      observacao = resp.trim();
    } else {
      if (!window.confirm('Tem certeza que deseja finalizar e salvar este recebimento completo?')) return;
    }
    
    try {
      const response = await fetch(`/api/pedidos/${pedidoSelecionado.id}/receber`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          itensRecebidos: itensConferidos,
          isParcial: !isCompletos,
          observacao: observacao,
          validades: validadesDigitadas,
          eansCapturados: eansCapturados
        })
      });

      if (!response.ok) throw new Error('Falha ao confirmar');

      alert(isCompletos ? '✅ Recebimento finalizado com sucesso!' : '⚠️ Recebimento parcial registrado com sucesso!');
      setPedidoSelecionado(null);
      fetchPedidos(); // Atualiza a lista
    } catch (err) {
      alert('Erro ao finalizar: ' + err.message);
    }
  };

  // TELA DE LISTA DE PEDIDOS
  if (!pedidoSelecionado) {
    return (
      <div className={styles['recebimento-container']}>
        <header className={styles['header']}>
          <div className={styles['header-title-container']}>
            <div className={styles['icon-highlight']}>
              <PackageOpen size={28} />
            </div>
            <div>
              <h2>Recebimento de Mercadorias</h2>
              <p style={{ margin: '4px 0 0 0', color: 'var(--cor-texto-secundario)', fontSize: '0.9rem' }}>
                Selecione um pedido pendente da Omie para conferir
              </p>
            </div>
          </div>
        </header>

        {loading ? (
          <p>Carregando pedidos pendentes...</p>
        ) : error ? (
          <div className={styles['erro-box']}>{error}</div>
        ) : pedidos.length === 0 ? (
          <div className={styles['empty-state']}>
            <Check size={48} color="var(--cor-sucesso)" />
            <h3>Tudo em dia!</h3>
            <p>Nenhum pedido aguardando recebimento na Omie.</p>
          </div>
        ) : (
          <div className={styles['table-container']}>
            <table className={styles['pedidos-table']}>
              <thead>
                <tr>
                  <th>Nº do Pedido</th>
                  <th>Fornecedor</th>
                  <th>Data de Emissão</th>
                  <th>Status</th>
                  <th>Total de Itens</th>
                  <th className={styles['text-right']}>Ação</th>
                </tr>
              </thead>
              <tbody>
                {pedidos.map(pedido => (
                  <tr key={pedido.id} onClick={() => selecionarPedido(pedido)}>
                    <td className={styles['pedido-id']}>{pedido.id}</td>
                    <td className={styles['fornecedor']}>{pedido.fornecedor}</td>
                    <td>{new Date(pedido.dataEmissao).toLocaleDateString('pt-BR')}</td>
                    <td><span className={styles['badge-status']}>{pedido.status}</span></td>
                    <td>{pedido.itens.length} itens</td>
                    <td className={styles['text-right']}>
                      <button className={styles['btn-iniciar']}>Conferir</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  // TELA DE CONFERÊNCIA (BIPAGEM)
  const itensCompletos = pedidoSelecionado.itens.every(item => (itensConferidos[item.codigo] || 0) === item.quantidadeEsperada);

  return (
    <div className={styles['recebimento-container']}>
      <header className={styles['header']}>
        <div className={styles['header-title-container']}>
          <button className={styles['btn-voltar']} onClick={voltarLista}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2>Conferência Cega - {pedidoSelecionado.id}</h2>
            <p style={{ margin: '4px 0 0 0', color: 'var(--cor-texto-secundario)', fontSize: '0.9rem' }}>
              Fornecedor: {pedidoSelecionado.fornecedor}
            </p>
          </div>
        </div>
        <button 
          className={styles['btn-finalizar']} 
          onClick={finalizarRecebimento}
          style={{ 
            backgroundColor: itensCompletos ? 'var(--cor-sucesso)' : 'var(--cor-fundo-sutil-forte)',
            color: itensCompletos ? 'var(--cor-texto-inverso)' : 'var(--cor-texto-principal)',
            border: itensCompletos ? 'none' : '1px solid var(--cor-borda-cartao)'
          }}
        >
          <Save size={18} />
          {itensCompletos ? 'Concluir Recebimento' : 'Salvar Incompleto'}
        </button>
      </header>

      {/* ÁREA DO LEITOR */}
      <div className={styles['scanner-area']}>
        <div className={styles['scanner-icon']}>
          <ScanLine size={32} color="var(--cor-destaque)" />
        </div>
        <div className={styles['scanner-input-container']}>
          <h3>Aguardando Leitor de Código de Barras...</h3>
          <p>Clique no campo abaixo e utilize o leitor (bipador)</p>
          
          <form onSubmit={handleBipar} style={{ display: 'flex', gap: '12px', width: '100%' }}>
            <div style={{ width: '120px' }}>
              <input 
                type="number" 
                min="1"
                className={styles['bip-input']}
                style={{ textAlign: 'center', borderColor: 'var(--cor-destaque)', color: 'var(--cor-destaque)' }}
                value={multiplicador}
                onChange={e => setMultiplicador(parseInt(e.target.value) || 1)}
                title="Quantidade de caixas/itens por Bip"
              />
              <span style={{ fontSize: '11px', color: 'var(--cor-texto-secundario)', marginTop: '4px', display: 'block' }}>Qtd. (Multiplicador)</span>
            </div>
            <div style={{ flex: 1 }}>
              <input 
                ref={inputRef}
                type="text" 
                className={styles['bip-input']}
                placeholder="Ex: 789123456001 (Pressione Enter)"
                value={bipInput}
                onChange={e => setBipInput(e.target.value)}
                autoFocus
              />
              <span style={{ fontSize: '11px', color: 'var(--cor-texto-secundario)', marginTop: '4px', display: 'block' }}>Código de Barras</span>
            </div>
            {/* Botão invisível necessário para o form disparar o onSubmit ao apertar Enter quando há múltiplos inputs */}
            <button type="submit" style={{ display: 'none' }}>Bipar</button>
          </form>

          {mensagemBip && (
            <div className={`${styles['mensagem-bip']} ${styles[mensagemBip.tipo]}`}>
              {mensagemBip.tipo === 'erro' && <AlertCircle size={20} />}
              {mensagemBip.texto}
            </div>
          )}
        </div>
      </div>

      {/* LISTA DE ITENS CONFERIDOS */}
      <div className={styles['itens-list']}>
        <table className={styles['conferencia-table']}>
          <thead>
            <tr>
              <th>Status</th>
              <th>Código</th>
              <th>Descrição do Produto</th>
              <th className={styles['text-center']}>Validade (Lote)</th>
              <th className={styles['text-center']}>Esperado</th>
              <th className={styles['text-center']}>Contado (Bip)</th>
            </tr>
          </thead>
          <tbody>
            {pedidoSelecionado.itens.map(item => {
              const contado = itensConferidos[item.codigo] || 0;
              const esperado = item.quantidadeEsperada;
              const completo = contado === esperado;
              const excedente = contado > esperado;

              return (
                <tr key={item.codigo} className={completo ? styles['row-completa'] : excedente ? styles['row-excedente'] : ''}>
                  <td className={styles['col-status']}>
                    {completo ? '✅' : excedente ? '⚠️' : '⏳'}
                  </td>
                  <td>
                    {item.codigo.startsWith('NEW-') ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ 
                          background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', 
                          color: '#fff', 
                          padding: '4px 8px', 
                          borderRadius: '6px', 
                          fontSize: '0.75rem', 
                          fontWeight: 'bold', 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '4px',
                          width: 'fit-content'
                        }}>
                          <Sparkles size={12} /> PRÉ-CADASTRO
                        </span>
                      </div>
                    ) : (
                      <span className={styles['badge-codigo']}>{item.codigo}</span>
                    )}
                  </td>
                  <td style={{ fontWeight: completo ? 500 : 'normal' }}>
                    {item.descricao}
                    {item.codigo.startsWith('NEW-') && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--cor-texto-secundario)', marginTop: '4px' }}>
                        Bipe a embalagem física para registrar o EAN oficial
                      </div>
                    )}
                  </td>
                  <td className={styles['text-center']}>
                    <input 
                      type="date"
                      style={{ padding: '4px', borderRadius: '4px', border: '1px solid var(--cor-borda)' }}
                      value={validadesDigitadas[item.codigo] || ''}
                      onChange={(e) => setValidadesDigitadas({...validadesDigitadas, [item.codigo]: e.target.value})}
                    />
                  </td>
                  <td className={styles['text-center']}>{esperado}</td>
                  <td className={`${styles['text-center']} ${styles['col-contado']}`}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      <button 
                        onClick={() => handleContagemManual(item.codigo, -1)}
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--cor-texto-secundario)', padding: '2px', display: 'flex', alignItems: 'center' }}
                        title="Diminuir manualmente"
                      >
                        <Minus size={16} />
                      </button>
                      <span className={styles['numero-bipado']}>{contado}</span>
                      <button 
                        onClick={() => handleContagemManual(item.codigo, 1)}
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--cor-destaque)', padding: '2px', display: 'flex', alignItems: 'center' }}
                        title="Adicionar manualmente (sem código de barras)"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* MODAL VINCULAR CÓDIGO DE BARRAS */}
      {modalVincular.isOpen && (
        <div className={styles['modal-overlay']}>
          <div className={styles['modal-content']} style={{ maxWidth: '600px' }}>
            <div className={styles['modal-header']}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ScanLine size={24} color="var(--cor-destaque)" /> Código Desconhecido
              </h2>
              <button className={styles['btn-close']} onClick={() => setModalVincular({ isOpen: false, barcode: '' })}>✖</button>
            </div>
            
            <div style={{ padding: '20px' }}>
              <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '16px', borderRadius: '8px', marginBottom: '20px', display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                <AlertCircle size={32} color="var(--cor-erro)" />
                <div>
                  <h3 style={{ margin: '0 0 8px 0', color: 'var(--cor-texto-principal)' }}>O código <strong>{modalVincular.barcode}</strong> não foi reconhecido.</h3>
                  <p style={{ margin: 0, color: 'var(--cor-texto-secundario)', fontSize: '0.95rem' }}>
                    Se este for um código de barras válido da mercadoria que acabou de chegar, clique no produto correspondente abaixo para vincular permanentemente o código a ele.
                  </p>
                </div>
              </div>

              <h4 style={{ marginBottom: '12px', color: 'var(--cor-texto-secundario)' }}>Selecione o produto (Itens da Nota):</h4>
              <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {pedidoSelecionado.itens.filter(i => (itensConferidos[i.codigo] || 0) < i.quantidadeEsperada).map(item => (
                  <button 
                    key={item.codigo} 
                    onClick={() => handleVincularBarcode(item.codigo)}
                    disabled={vinculando}
                    style={{ 
                      display: 'flex', justifyContent: 'space-between', padding: '12px', 
                      backgroundColor: 'var(--cor-fundo-geral)', border: '1px solid var(--cor-borda)', 
                      borderRadius: '8px', cursor: 'pointer', textAlign: 'left',
                      transition: 'all 0.2s', opacity: vinculando ? 0.7 : 1
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--cor-destaque)'; e.currentTarget.style.backgroundColor = 'var(--cor-fundo-sutil)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--cor-borda)'; e.currentTarget.style.backgroundColor = 'var(--cor-fundo-geral)'; }}
                  >
                    <div>
                      <strong style={{ display: 'block', color: 'var(--cor-texto-principal)' }}>{item.descricao}</strong>
                      <span style={{ fontSize: '0.85rem', color: 'var(--cor-texto-secundario)' }}>Cód: {item.codigo}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--cor-destaque)', fontWeight: '600' }}>
                        Faltam: {(item.quantidadeEsperada - (itensConferidos[item.codigo] || 0))}
                      </span>
                    </div>
                  </button>
                ))}
                {pedidoSelecionado.itens.filter(i => (itensConferidos[i.codigo] || 0) < i.quantidadeEsperada).length === 0 && (
                  <p style={{ textAlign: 'center', padding: '20px', color: 'var(--cor-sucesso)' }}>Todos os itens desta nota já foram 100% conferidos!</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecebimentoProdutos;
