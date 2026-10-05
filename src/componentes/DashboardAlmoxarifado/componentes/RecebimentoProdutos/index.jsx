import React, { useState, useEffect, useRef } from 'react';
import { 
  PackageOpen, Check, AlertCircle, ScanLine, ArrowLeft, Save, Plus, Minus, 
  Sparkles, RefreshCw, FileText, Barcode, CheckCircle2, Warehouse, Clock, 
  AlertTriangle, Calendar, X, ShieldCheck 
} from 'lucide-react';
import ModalConfigCertificadoSefaz from '../../../DashboardRecebimentoFiscal/componentes/ModalConfigCertificadoSefaz';
import { useNotification } from '../../../../contextos/NotificationContext';
import styles from './RecebimentoProdutos.module.css';

const formatarNomeLocal = (loc) => {
  if (!loc) return '01 - Almoxarifado Central';
  const cod = String(loc.codigo || loc.codigo_local_estoque || '').trim();
  const desc = String(loc.descricao || '').trim();
  if (!desc) return cod;
  if (!cod) return desc;
  if (desc.startsWith(cod)) return desc;
  return `${cod} - ${desc}`;
};

const RecebimentoProdutos = ({ produtos = [], fetchProdutosGlobal }) => {
  const [pedidos, setPedidos] = useState([]);
  const [pedidoSelecionado, setPedidoSelecionado] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Controle de Locais de Estoque Omie
  const [listaLocaisEstoque, setListaLocaisEstoque] = useState([]);
  const [localGeralPedido, setLocalGeralPedido] = useState('01');
  const [locaisSelecionados, setLocaisSelecionados] = useState({});

  // Controle da Nota Fiscal
  const [chaveNfe, setChaveNfe] = useState('');
  const [numeroNF, setNumeroNF] = useState('');

  // Controle da bipagem
  const [bipInput, setBipInput] = useState('');
  const [itensConferidos, setItensConferidos] = useState({});
  const [validadesDigitadas, setValidadesDigitadas] = useState({});
  const [eansCapturados, setEansCapturados] = useState({});  // { 'PRD05907': '7890009' } - EAN real bipado por produto
  const [mensagemBip, setMensagemBip] = useState(null); // Para mostrar "Produto não está na nota"
  const [multiplicador, setMultiplicador] = useState(1);
  const [modalVincular, setModalVincular] = useState({ isOpen: false, barcode: '' });
  const [vinculando, setVinculando] = useState(false);
  const [modalCertificadoAberto, setModalCertificadoAberto] = useState(false);
  
  const inputRef = useRef(null);

  const { socket, addToast } = useNotification() || {};

  const fetchPedidos = async (silencioso = false) => {
    try {
      if (!silencioso) setLoading(true);
      const response = await fetch('/api/pedidos');
      if (!response.ok) throw new Error('Falha ao buscar pedidos');
      const data = await response.json();
      setPedidos(Array.isArray(data) ? data : []);
      setError('');
    } catch (err) {
      if (!silencioso) {
        setError('Erro ao carregar pedidos pendentes. Verifique se o servidor está rodando.');
      }
    } finally {
      if (!silencioso) setLoading(false);
    }
  };

  useEffect(() => {
    fetchPedidos();

    // Ouvinte WebSocket em tempo real
    if (socket) {
      const handleAtualizacao = () => {
        fetchPedidos(true);
      };

      const handleNovo = (dados) => {
        fetchPedidos(true);
        if (addToast) {
          addToast(`Nova carga pronta para conferência: ${dados.fornecedor || dados.id}`, 'info');
        }
      };

      socket.on('pedidos_pendentes_atualizados', handleAtualizacao);
      socket.on('novo_pedido_recebimento', handleNovo);

      return () => {
        socket.off('pedidos_pendentes_atualizados', handleAtualizacao);
        socket.off('novo_pedido_recebimento', handleNovo);
      };
    }
  }, [socket]);

  // Polling automático a cada 4 segundos caso a tela esteja aberta
  useEffect(() => {
    const timer = setInterval(() => {
      if (!pedidoSelecionado) {
        fetchPedidos(true);
      }
    }, 4000);

    return () => clearInterval(timer);
  }, [pedidoSelecionado]);

  // Carregar locais de estoque da Omie
  useEffect(() => {
    const carregarLocais = async () => {
      try {
        const res = await fetch('/api/cadastros/locais-estoque');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setListaLocaisEstoque(data);
          }
        }
      } catch (err) {
        console.warn('Falha ao buscar locais de estoque:', err);
      }
    };
    carregarLocais();
  }, []);

  const selecionarPedido = (pedido) => {
    setPedidoSelecionado(pedido);
    // Inicializa a contagem zerada para cada item e carrega locais de estoque
    const contagemInicial = {};
    const locaisIniciais = {};
    const localPadrao = pedido.codigo_local_estoque || pedido.localEstoque || pedido.itens?.[0]?.codigo_local_estoque || pedido.itens?.[0]?.localEstoque || '01';
    setLocalGeralPedido(localPadrao);

    pedido.itens.forEach(item => {
      contagemInicial[item.codigo] = item.quantidadeRecebida || 0;
      locaisIniciais[item.codigo] = item.codigo_local_estoque || item.localEstoque || localPadrao;
    });
    setItensConferidos(contagemInicial);
    setLocaisSelecionados(locaisIniciais);
    setValidadesDigitadas({});
    setEansCapturados({});
    setMensagemBip(null);
    setChaveNfe(pedido.chaveNfe || pedido.nota_fiscal_vinculada?.chaveAcesso || '');
    setNumeroNF(pedido.numeroNF || pedido.numeroNfe || pedido.nota_fiscal || pedido.nota_fiscal_vinculada?.numero || pedido.nota_fiscal_vinculada?.numeroNF || '');
  };

  const voltarLista = () => {
    setPedidoSelecionado(null);
    setBipInput('');
    setMultiplicador(1);
    setValidadesDigitadas({});
    setLocaisSelecionados({});
    setLocalGeralPedido('01');
    setChaveNfe('');
    setNumeroNF('');
  };

  const handleChaveChange = (val) => {
    const limpo = val.replace(/\D/g, '').slice(0, 44);
    setChaveNfe(limpo);
    if (limpo.length === 44) {
      const numExtraido = String(parseInt(limpo.substring(25, 34), 10) || limpo.substring(25, 34));
      if (!numeroNF) {
        setNumeroNF(numExtraido);
      }
    }
  };

  const handleBipar = (e) => {
    e.preventDefault();
    if (!bipInput.trim()) return;

    const codigoBipado = bipInput.trim().replace(/\s+/g, '');

    // 0. Se o operador bipar o código de barras da NF-e/DANFE (chave de 44 dígitos) no leitor:
    if (codigoBipado.length === 44 && /^\d{44}$/.test(codigoBipado)) {
      setChaveNfe(codigoBipado);
      const numExtraido = String(parseInt(codigoBipado.substring(25, 34), 10) || codigoBipado.substring(25, 34));
      if (!numeroNF) {
        setNumeroNF(numExtraido);
      }
      setMensagemBip({ 
        tipo: 'sucesso', 
        texto: `Chave da DANFE (NF-e nº ${numExtraido}) detectada e vinculada!` 
      });
      setBipInput('');
      setMultiplicador(1);
      setTimeout(() => setMensagemBip(null), 3500);
      return;
    }
    
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

      setMensagemBip({ tipo: 'sucesso', texto: `${multiplicador}x ${itemEncontrado.descricao} adicionado(s)!` });
      
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
      setMensagemBip({ tipo: 'sucesso', texto: `Código Vinculado! 1x ${itemEncontrado.descricao} adicionado(s)!` });

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
          eansCapturados: eansCapturados,
          chaveNfe: chaveNfe.trim(),
          numeroNF: numeroNF.trim(),
          localEstoquePadrao: localGeralPedido,
          locaisEstoque: locaisSelecionados
        })
      });

      if (!response.ok) throw new Error('Falha ao confirmar');

      alert(isCompletos ? 'Recebimento finalizado com sucesso!' : 'Recebimento parcial registrado com sucesso!');
      setPedidoSelecionado(null);
      fetchPedidos(); // Atualiza a lista
      if (fetchProdutosGlobal) fetchProdutosGlobal();
    } catch (err) {
      alert('Erro ao finalizar: ' + err.message);
    }
  };

  const handlePreencherTudo = () => {
    if (!pedidoSelecionado || !pedidoSelecionado.itens) return;
    const totalEsperado = {};
    pedidoSelecionado.itens.forEach(item => {
      totalEsperado[item.codigo] = item.quantidadeEsperada;
    });
    setItensConferidos(totalEsperado);
    setMensagemBip({ tipo: 'sucesso', texto: 'Todos os itens foram preenchidos com 100% da quantidade esperada!' });
    setTimeout(() => setMensagemBip(null), 3000);
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
                Selecione uma ordem de entrega pendente para conferir as peças fisicamente
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button 
              type="button" 
              onClick={() => setModalCertificadoAberto(true)} 
              className={styles['btn-atualizar']}
              title="Configurar Certificado Digital A1 (.pfx) da SEFAZ para busca e download de NF-e"
            >
              <ShieldCheck size={16} color="var(--cor-destaque)" />
              <span>Certificado SEFAZ</span>
            </button>
            <button 
              type="button" 
              onClick={() => fetchPedidos(false)} 
              className={styles['btn-atualizar']}
              title="Atualizar lista em tempo real"
            >
              <RefreshCw size={16} className={loading ? styles['girando'] : ''} />
              <span>Atualizar</span>
            </button>
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
            <p>Nenhuma mercadoria aguardando conferência física no momento.</p>
            <span style={{ fontSize: '0.85rem', color: 'var(--cor-texto-secundario)', marginTop: '8px', maxWidth: '500px', lineHeight: 1.4 }}>
              As ordens de recebimento chegam a esta tela assim que o setor de Compras conclui a aprovação e o mapeamento dos itens (seja por faturamento CNPJ ou compra direta no CPF).
            </span>
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
                    <td className={styles['pedido-id']}>
                      {pedido.id}
                      {(pedido.numeroNF || pedido.numeroNfe) && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--cor-destaque)', fontWeight: '600', marginTop: '2px' }}>
                          NF-e: {pedido.numeroNF || pedido.numeroNfe}
                        </div>
                      )}
                    </td>
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
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            type="button"
            onClick={handlePreencherTudo}
            title="Preencher todos os itens com a quantidade esperada"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              border: '1px solid var(--cor-destaque)',
              background: 'transparent',
              color: 'var(--cor-destaque)',
              fontWeight: '600',
              cursor: 'pointer',
              fontSize: '0.85rem'
            }}
          >
            <Check size={16} />
            Conferir Tudo (100%)
          </button>
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
        </div>
      </header>

      {/* BLOCO DE DADOS DA NOTA FISCAL (DANFE / CHAVE DE ACESSO) */}
      <div className={styles['fiscal-card']}>
        <div className={styles['fiscal-header']}>
          <div className={styles['fiscal-icon']}>
            <FileText size={22} color="var(--cor-destaque)" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--cor-texto-principal)' }}>
                Dados da Nota Fiscal (DANFE)
              </h3>
              {chaveNfe.length === 44 ? (
                <span className={styles['badge-fiscal-valida']}>
                  <CheckCircle2 size={13} /> Chave Válida (44 dígitos)
                </span>
              ) : chaveNfe.length > 0 ? (
                <span className={styles['badge-fiscal-parcial']}>
                  <Clock size={13} /> Digitando ({chaveNfe.length}/44 dígitos)
                </span>
              ) : (
                <span className={styles['badge-fiscal-pendente']}>
                  <Clock size={13} /> Aguardando Chave da NF-e
                </span>
              )}
            </div>
            <p style={{ margin: '4px 0 0 0', color: 'var(--cor-texto-secundario)', fontSize: '0.85rem' }}>
              Bipe a chave impressa na DANFE com o leitor ou digite o número da nota fiscal
            </p>
          </div>
        </div>

        <div className={styles['fiscal-inputs-row']}>
          <div className={styles['fiscal-input-group']} style={{ flex: 2, minWidth: '300px' }}>
            <label className={styles['fiscal-label']}>
              <Barcode size={15} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px' }} />
              Chave de Acesso da NF-e (44 dígitos):
            </label>
            <input 
              type="text"
              className={styles['fiscal-input-chave']}
              placeholder="Ex: 35260911500013000146550010003271001234567890 (Bipe com o leitor)"
              value={chaveNfe}
              onChange={(e) => handleChaveChange(e.target.value)}
              maxLength={44}
            />
            <span className={styles['fiscal-hint']}>
              {chaveNfe.length === 44 
                ? 'Chave completa! O número da nota foi extraído automaticamente.' 
                : 'Pode ser bipada diretamente com o leitor de código de barras no topo do DANFE.'}
            </span>
          </div>

          <div className={styles['fiscal-input-group']} style={{ flex: 1, minWidth: '180px' }}>
            <label className={styles['fiscal-label']}>
              Nº da Nota Fiscal / Recibo:
            </label>
            <input 
              type="text"
              className={styles['fiscal-input-numero']}
              placeholder="Ex: 327100543"
              value={numeroNF}
              onChange={(e) => setNumeroNF(e.target.value)}
            />
            <span className={styles['fiscal-hint']}>
              Preenchido via chave ou digitação manual
            </span>
          </div>
        </div>
      </div>

      {/* BLOCO DO LOCAL DE ESTOQUE OMIE (DESTINO) */}
      <div className={styles['armazem-card']}>
        <div className={styles['armazem-header']}>
          <div className={styles['armazem-icon']}>
            <Warehouse size={22} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--cor-texto-principal)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              Local de Estoque Geral (Omie)
              <span style={{ fontSize: '0.75rem', fontWeight: '700', background: 'rgba(34, 197, 94, 0.15)', color: 'var(--cor-sucesso)', padding: '2px 8px', borderRadius: '6px' }}>
                Padrão da Carga
              </span>
            </h3>
            <p style={{ margin: '4px 0 0 0', color: 'var(--cor-texto-secundario)', fontSize: '0.85rem' }}>
              Aplica a todos os itens da nota. Se a carga for mista, você pode ajustar o local individual de cada item na tabela abaixo.
            </p>
          </div>
        </div>

        <div className={styles['armazem-select-wrapper']}>
          <select
            className={styles['armazem-select']}
            value={localGeralPedido}
            onChange={(e) => {
              const novoLocal = e.target.value;
              setLocalGeralPedido(novoLocal);
              // Replica para todos os itens da carga
              const novosLocais = {};
              (pedidoSelecionado.itens || []).forEach(it => {
                novosLocais[it.codigo] = novoLocal;
              });
              setLocaisSelecionados(novosLocais);
            }}
          >
            {listaLocaisEstoque && listaLocaisEstoque.length > 0 ? (
              listaLocaisEstoque.map(loc => {
                const codVal = loc.codigo || loc.codigo_local_estoque;
                const label = formatarNomeLocal(loc);
                return (
                  <option key={codVal} value={codVal}>
                    {label}
                  </option>
                );
              })
            ) : (
              <>
                <option value="01">01 - Almoxarifado Central</option>
                <option value="PADRAO">PADRAO - Local Padrão</option>
                <option value="02">02 - Armazém Matéria Prima</option>
                <option value="03">03 - Armazém Serragem</option>
                <option value="04">04 - Armazém Cama de Frango</option>
                <option value="05">05 - Insumos Construção Civil</option>
                <option value="06">06 - Fábrica de Ração</option>
                <option value="Posto de Combustivel">Posto de Combustível</option>
              </>
            )}
          </select>
        </div>
      </div>

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
              <th className={styles['th-status']}>Status</th>
              <th className={styles['th-codigo']}>Código</th>
              <th className={styles['th-desc']}>Descrição do Produto</th>
              <th className={styles['th-local']}>Local Estoque (Item)</th>
              <th className={styles['th-validade']}>Validade (Lote)</th>
              <th className={styles['th-esperado']}>Esperado</th>
              <th className={styles['th-contado']}>Contado (Bip)</th>
            </tr>
          </thead>
          <tbody>
            {pedidoSelecionado.itens.map(item => {
              const contado = itensConferidos[item.codigo] || 0;
              const esperado = item.quantidadeEsperada;
              const completo = contado === esperado && esperado > 0;
              const excedente = contado > esperado;
              const parcial = contado > 0 && contado < esperado;

              return (
                <tr key={item.codigo} className={completo ? styles['row-completa'] : excedente ? styles['row-excedente'] : ''}>
                  <td className={styles['col-status']}>
                    {completo ? (
                      <span className={styles['status-badge-conferido']} title="Item 100% conferido">
                        <CheckCircle2 size={13} /> Conferido
                      </span>
                    ) : excedente ? (
                      <span className={styles['status-badge-excedente']} title="Quantidade contada excede o esperado">
                        <AlertTriangle size={13} /> Excedente
                      </span>
                    ) : parcial ? (
                      <span className={styles['status-badge-parcial']} title="Contagem parcial">
                        <Clock size={13} /> Parcial
                      </span>
                    ) : (
                      <span className={styles['status-badge-pendente']} title="Aguardando bipagem">
                        <Clock size={13} /> Pendente
                      </span>
                    )}
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
                  <td>
                    <div className={styles['col-desc-wrapper']}>
                      <span className={styles['desc-texto']}>{item.descricao}</span>
                      {item.codigo.startsWith('NEW-') && (
                        <span className={styles['desc-subtexto']}>
                          Bipe a embalagem física para registrar o EAN oficial
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div 
                      className={`${styles['local-select-box']} ${(locaisSelecionados[item.codigo] && locaisSelecionados[item.codigo] !== localGeralPedido) ? styles['local-personalizado'] : ''}`}
                      title={(locaisSelecionados[item.codigo] && locaisSelecionados[item.codigo] !== localGeralPedido) ? "Item com local específico diferente do padrão da carga" : "Local de estoque do item"}
                    >
                      <Warehouse size={14} className={styles['local-icon']} />
                      <select
                        className={styles['tabela-select-local']}
                        value={locaisSelecionados[item.codigo] || localGeralPedido || '01'}
                        onChange={(e) => {
                          const novoLocal = e.target.value;
                          setLocaisSelecionados(prev => ({ ...prev, [item.codigo]: novoLocal }));
                        }}
                      >
                        {listaLocaisEstoque && listaLocaisEstoque.length > 0 ? (
                          listaLocaisEstoque.map(loc => {
                            const codVal = loc.codigo || loc.codigo_local_estoque;
                            const label = formatarNomeLocal(loc);
                            return (
                              <option key={codVal} value={codVal}>
                                {label}
                              </option>
                            );
                          })
                        ) : (
                          <>
                            <option value="01">01 - Almoxarifado Central</option>
                            <option value="PADRAO">PADRAO - Local Padrão</option>
                            <option value="02">02 - Armazém Matéria Prima</option>
                            <option value="03">03 - Armazém Serragem</option>
                            <option value="04">04 - Armazém Cama de Frango</option>
                            <option value="05">05 - Insumos Construção Civil</option>
                            <option value="06">06 - Fábrica de Ração</option>
                            <option value="Posto de Combustivel">Posto de Combustível</option>
                          </>
                        )}
                      </select>
                    </div>
                  </td>
                  <td className={styles['text-center']}>
                    <div className={styles['validade-input-box']}>
                      <Calendar size={13} className={styles['validade-icon']} />
                      <input 
                        type="date"
                        className={styles['input-validade']}
                        value={validadesDigitadas[item.codigo] || ''}
                        onChange={(e) => setValidadesDigitadas({...validadesDigitadas, [item.codigo]: e.target.value})}
                      />
                    </div>
                  </td>
                  <td className={styles['text-center']}>
                    <span className={styles['badge-esperado']}>{esperado}</span>
                  </td>
                  <td className={styles['text-center']}>
                    <div className={styles['contador-wrapper']}>
                      <button 
                        type="button"
                        onClick={() => handleContagemManual(item.codigo, -1)}
                        className={styles['btn-contador']}
                        title="Diminuir manualmente"
                        disabled={contado <= 0}
                      >
                        <Minus size={14} />
                      </button>
                      <span className={`${styles['numero-bipado']} ${completo ? styles['numero-completo'] : excedente ? styles['numero-excedente'] : parcial ? styles['numero-parcial'] : styles['numero-pendente']}`}>
                        {contado}
                      </span>
                      <button 
                        type="button"
                        onClick={() => handleContagemManual(item.codigo, 1)}
                        className={styles['btn-contador']}
                        title="Adicionar manualmente (sem código de barras)"
                      >
                        <Plus size={14} />
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
              <button className={styles['btn-close']} onClick={() => setModalVincular({ isOpen: false, barcode: '' })}>
                <X size={18} />
              </button>
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

      {/* Modal de Configuração e Instalação de Certificado Digital da SEFAZ */}
      <ModalConfigCertificadoSefaz
        isOpen={modalCertificadoAberto}
        onClose={() => setModalCertificadoAberto(false)}
        onCertificadoAtualizado={() => fetchPedidos(true)}
      />
    </div>
  );
};

export default RecebimentoProdutos;
