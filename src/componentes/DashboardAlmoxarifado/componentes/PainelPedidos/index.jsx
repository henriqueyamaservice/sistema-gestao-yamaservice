import React, { useState, useEffect, useRef } from 'react';
import { Plus, Inbox, Clock, PackageCheck, X, CheckCircle2, Printer, ScanLine, Minus } from 'lucide-react';
import styles from './PainelPedidos.module.css';
import NovaRequisicao from '../NovaRequisicao';

const PainelPedidos = ({ produtos, fetchProdutosGlobal, onVoltar, itensIniciais = [] }) => {
  const [isNovaReqOpen, setIsNovaReqOpen] = useState(itensIniciais.length > 0);
  const [pedidosPendentes, setPedidosPendentes] = useState([]);
  const [vendedores, setVendedores] = useState([]);
  const [locaisEstoque, setLocaisEstoque] = useState([]);
  const [loading, setLoading] = useState(true);

  // States do Modal de Separação
  const [pedidoSelecionado, setPedidoSelecionado] = useState(null);
  const [vendedorNome, setVendedorNome] = useState('');
  const [localEstoqueEditado, setLocalEstoqueEditado] = useState('');

  // Controle de Bipagem
  const [itensBipados, setItensBipados] = useState({});
  const [codigoBarrasScanner, setCodigoBarrasScanner] = useState('');
  const barcodeInputRef = useRef(null);

  const [isProcessando, setIsProcessando] = useState(false);

  const fetchDados = async () => {
    try {
      setLoading(true);
      const [resReq, resVend, resLocais] = await Promise.all([
        fetch('http://localhost:3000/api/requisicoes'),
        fetch('http://localhost:3000/api/vendedores'),
        fetch('http://localhost:3000/api/locais-estoque')
      ]);

      if (resReq.ok) {
        const data = await resReq.json();
        const pendentes = data.filter(r =>
          (r.status === 'pendente' || r.status === 'aguardando_separacao') &&
          r.tipo !== 'reposicao'
        ).sort((a, b) => {
          if (a.prioridade === 'urgente' && b.prioridade !== 'urgente') return -1;
          if (b.prioridade === 'urgente' && a.prioridade !== 'urgente') return 1;
          return new Date(b.dataCriacao) - new Date(a.dataCriacao); // Mais recentes primeiro (exceto urgentes)
        });
        setPedidosPendentes(pendentes);
      }

      if (resVend.ok) {
        setVendedores(await resVend.json());
      }

      if (resLocais.ok) {
        setLocaisEstoque(await resLocais.json());
      }
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isNovaReqOpen) {
      fetchDados();
    }
  }, [isNovaReqOpen]);

  const handleAbrirModal = (pedido) => {
    setPedidoSelecionado(pedido);
    setVendedorNome('');
    setLocalEstoqueEditado(pedido.localEstoque || 'PADRAO - Local de Estoque Padrão');

    // Inicializa contador de bipados zerado
    const contadoresIniciais = {};
    pedido.itens?.forEach(item => {
      contadoresIniciais[item.codigo] = 0;
    });
    setItensBipados(contadoresIniciais);
    setCodigoBarrasScanner('');
    setTimeout(() => { if (barcodeInputRef.current) barcodeInputRef.current.focus(); }, 100);
  };

  const handleFecharModal = () => {
    setPedidoSelecionado(null);
  };

  const handleBipar = (e) => {
    if (e.key === 'Enter') {
      const codigoBipado = codigoBarrasScanner.trim().toUpperCase();
      if (!codigoBipado) return;

      let itemAchado = pedidoSelecionado.itens?.find(i => i.codigo.toUpperCase() === codigoBipado);
      let loteBipado = null;
      let prodCompleto = null;

      if (!itemAchado) {
        // Tenta achar pelo código de barras de algum lote
        prodCompleto = produtos?.find(p => p.lotes?.some(l => l.ean === codigoBipado) || p.ean === codigoBipado);
        if (prodCompleto) {
          itemAchado = pedidoSelecionado.itens?.find(i => i.codigo === prodCompleto.codigo);
          loteBipado = prodCompleto.lotes?.find(l => l.ean === codigoBipado);
        }
      } else {
        prodCompleto = produtos?.find(p => p.codigo === itemAchado.codigo);
      }

      if (!itemAchado) {
        alert('Código inválido ou não pertence a este pedido!');
      } else {
        if (prodCompleto && prodCompleto.lotes && prodCompleto.lotes.length > 0) {
          const loteMaisAntigo = [...prodCompleto.lotes].sort((a, b) => new Date(a.validade) - new Date(b.validade))[0];

          if (loteBipado) {
            // Operador bipou o código de barras de um Lote específico!
            if (loteBipado.ean !== loteMaisAntigo.ean) {
              // BLOQUEIO TOTAL
              const utcDate = new Date(loteMaisAntigo.validade).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
              alert(`⛔ ERRO FEFO OBRIGATÓRIO ⛔\n\nLOTE BLOQUEADO PELO SISTEMA!\n\nVocê bipou um código de barras de um lote que vence mais tarde.\n\n👉 DEVOLVA ESSA CAIXA NA PRATELEIRA.\n👉 PROCURE O LOTE: ${loteMaisAntigo.numero} (Cód. Barras: ${loteMaisAntigo.ean})\n⏳ Ele vence antes, em: ${utcDate}`);
              setCodigoBarrasScanner('');
              return; // Bloqueia a bipagem
            }
          } else {
            // Operador bipou o código principal (ex: PRD11301) sem especificar qual caixa pegou
            const utcDate = new Date(loteMaisAntigo.validade).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
            const pegouCerto = window.confirm(`⚠️ ALERTA FEFO ⚠️\n\nEste produto tem controle de lote.\nVocê está segurando em mãos os itens do LOTE: ${loteMaisAntigo.numero} (Vence em ${utcDate})?\n\nClique OK se for o lote correto, ou Cancelar se pegou o errado.`);

            if (!pegouCerto) {
              setCodigoBarrasScanner('');
              return; // Impede a bipagem
            }
          }
        }

        const qtdBipada = itensBipados[itemAchado.codigo] || 0;
        const qtdPedida = Number(itemAchado.quantidade);

        if (qtdBipada >= qtdPedida) {
          alert('Quantidade máxima já separada para este produto!');
        } else {
          setItensBipados(prev => ({
            ...prev,
            [itemAchado.codigo]: qtdBipada + 1
          }));
        }
      }
      setCodigoBarrasScanner('');
    }
  };

  const handleMudarQuantidadeManual = (codigo, novaQtdStr) => {
    let novaQtd = parseInt(novaQtdStr, 10);
    if (isNaN(novaQtd) || novaQtd < 0) novaQtd = 0;

    const item = pedidoSelecionado.itens?.find(i => i.codigo === codigo);
    if (!item) return;

    const qtdMaxima = Number(item.quantidade);
    if (novaQtd > qtdMaxima) novaQtd = qtdMaxima;

    setItensBipados(prev => ({ ...prev, [codigo]: novaQtd }));
  };

  const isTudoBipado = pedidoSelecionado?.itens?.every(item =>
    (itensBipados[item.codigo] || 0) === Number(item.quantidade)
  );

  const handleConfirmarEntrega = async () => {
    // isTudoBipado diz se está 100% igual o pedido. Se for falso, é uma entrega parcial.
    if (vendedorNome.trim() === '') {
      alert('Por favor, informe seu nome (Vendedor/Estoquista) para registrar a entrega.');
      return;
    }

    if (!isTudoBipado) {
      const confirmacao = window.confirm(
        'ATENÇÃO: Você está confirmando uma entrega com quantidades diferentes do pedido original (Entrega Parcial).\n\nTem certeza que deseja finalizar a entrega incompleta?'
      );
      if (!confirmacao) return;
    }

    setIsProcessando(true);
    try {
      const res = await fetch(`http://localhost:3000/api/requisicoes/${pedidoSelecionado.id}/finalizar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendedor: vendedorNome,
          localEstoque: localEstoqueEditado,
          itensEntregues: itensBipados
        })
      });

      if (!res.ok) throw new Error('Falha ao finalizar pedido.');
      const data = await res.json();

      // Imprimir comprovante térmico (Mesmo padrão da NovaRequisicao)
      imprimirComprovante(data.requisicao);

      // Remove da lista
      setPedidosPendentes(prev => prev.filter(p => p.id !== pedidoSelecionado.id));
      handleFecharModal();

    } catch (err) {
      alert('Erro: ' + err.message);
    } finally {
      setIsProcessando(false);
    }
  };

  const imprimirComprovante = (req) => {
    const isParcial = req.entrega_parcial;
    const totalItens = req.itens?.reduce((acc, item) => acc + (Number(item.quantidade_entregue ?? item.quantidade) || 0), 0) || 0;
    const printWindow = window.open('', '_blank', 'width=400,height=600');

    printWindow.document.write(`
      <html>
        <head>
          <title>Comprovante - OS ${req.numeroOS || req.id.slice(-6)}</title>
          <style>
            body { margin: 0; padding: 0; background: white; color: black; font-family: 'Courier New', Courier, monospace; }
            .area-impressao { width: 80mm; margin: 0 auto; padding: 0; }
            .recibo-termico { width: 100%; font-size: 10px; padding: 3mm; box-sizing: border-box; }
            .recibo-titulo { text-align: center; font-size: 12px; font-weight: bold; margin-bottom: 4px; }
            .recibo-data { text-align: center; font-size: 9px; margin-bottom: 8px; }
            .recibo-divider { border-bottom: 1px dashed black; margin: 8px 0; }
            .recibo-info p { margin: 4px 0; }
            .recibo-itens { width: 100%; border-collapse: collapse; }
            .recibo-itens th, .recibo-itens td { padding: 4px 0; vertical-align: top; }
            .recibo-via { text-align: center; font-weight: bold; margin: 12px 0; }
            .recibo-assinatura { margin-top: 20px; text-align: center; }
            .linha-assinatura { border-bottom: 1px solid black; width: 80%; margin: 20px auto 5px auto; }
            .recibo-cortar { text-align: center; margin: 20px 0; font-size: 9px; }
            .alerta-parcial { text-align: center; padding: 4px; border: 1px solid black; margin: 8px 0; font-weight: bold; font-size: 11px; }
            @media print {
              @page { margin: 0; }
              body { margin: 0; }
              .area-impressao { width: 80mm; margin: 0; }
            }
          </style>
        </head>
        <body>
          <div class="area-impressao">
            <div class="recibo-termico">
              <h2 class="recibo-titulo">YAMASERVICE - ALMOXARIFADO</h2>
              <h2 class="recibo-titulo">COMPROVANTE DE ENTREGA</h2>
              <p class="recibo-data">${new Date(req.dataCriacao).toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
              
              ${isParcial ? '<div class="alerta-parcial">ATENÇÃO: ENTREGA PARCIAL INCOMPLETA</div>' : ''}
              <div class="recibo-divider"></div>
              
              <div class="recibo-info">
                <p><strong>Depto:</strong> ${req.departamento || req.centroCusto || 'N/A'}</p>
                <p><strong>O.S:</strong> ${req.numeroOS || 'N/A'}</p>
                <p><strong>CFOP:</strong> ${req.cfop || 'N/A'}</p>
                <p><strong>ICMS:</strong> ${req.icms ? `CST ${req.icms}` : 'N/A'}</p>
                <p><strong>Local Estoque:</strong> ${req.localEstoque || 'N/A'}</p>
              </div>
              <div class="recibo-divider"></div>
              
              <table class="recibo-itens">
                <thead>
                  <tr>
                    <th style="text-align: left; width: 30px;">Qtd</th>
                    <th style="text-align: left;">Produto</th>
                  </tr>
                </thead>
                <tbody>
                  ${req.itens?.map(item => {
      const entregue = item.quantidade_entregue ?? item.quantidade;
      const pedida = item.quantidade;
      const diffText = entregue < pedida ? `<div style="font-size: 8px; color: black; font-weight: bold;">Pediu: ${pedida}</div>` : '';
      return `
                      <tr>
                        <td style="padding-right: 4px;"><strong>${entregue}</strong></td>
                        <td><div style="font-weight:bold;">${item.codigo}</div><div style="font-size: 8px; line-height: 1.1;">${item.descricao}</div>${diffText}</td>
                      </tr>
                    `;
    }).join('')}
                </tbody>
              </table>

              <div class="recibo-divider"></div>
              <p style="text-align: right; margin: 4px 0;"><strong>Total de Itens: ${totalItens}</strong></p>
              
              <div class="recibo-via">VIA ALMOXARIFADO</div>
              <div class="recibo-assinatura">
                <div class="linha-assinatura"></div>
                <p>Assinatura do Solicitante</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); }, 500);
  };

  if (isNovaReqOpen) {
    return (
      <NovaRequisicao
        produtos={produtos}
        itensIniciais={itensIniciais}
        tipoInicial={itensIniciais.length > 0 ? 'reposicao' : 'saida'}
        onVoltar={() => {
          setIsNovaReqOpen(false);
          fetchProdutosGlobal && fetchProdutosGlobal();
        }}
      />
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.titleArea}>
          <h2>Painel de Pedidos (Separação)</h2>
          <p>Fila de requisições aprovadas prontas para entrega</p>
        </div>

        <button
          className={styles.btnNovaRequisicao}
          onClick={() => setIsNovaReqOpen(true)}
        >
          <Plus size={20} /> Nova Saída
        </button>
      </header>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Atualizando fila...</div>
      ) : pedidosPendentes.length === 0 ? (
        <div className={styles.emptyState}>
          <Inbox size={48} color="#cbd5e1" style={{ margin: '0 auto 16px auto' }} />
          <h3>Nenhum pedido na fila</h3>
          <p>Todos os pedidos autorizados já foram separados ou não há novas solicitações.</p>
        </div>
      ) : (
        <div className={styles.listaPedidos}>
          {pedidosPendentes.map(pedido => (
            <div
              key={pedido.id}
              className={styles.pedidoCard}
              style={{ cursor: 'pointer' }}
              onClick={() => handleAbrirModal(pedido)}
            >
              <div>
                <div className={styles.pedidoHeader}>
                  <div className={styles.pedidoNum}>
                    Pedido #{pedido.id.slice(-6)}
                    {pedido.prioridade === 'urgente' && (
                      <span style={{ marginLeft: '8px', background: '#fef2f2', color: '#ef4444', border: '1px solid #f87171', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold' }}>
                        🔴 URGENTE
                      </span>
                    )}
                  </div>
                  <div className={styles.pedidoTime}>
                    <Clock size={12} style={{ display: 'inline', marginRight: 4 }} />
                    {new Date(pedido.dataCriacao).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                  </div>
                </div>

                <div className={styles.solicitante}>
                  <strong>{pedido.solicitante}</strong> - {pedido.departamento}
                </div>

                <div className={styles.itensList}>
                  {pedido.itens?.map((item, idx) => (
                    <span key={idx} className={styles.itemBadge}>
                      {item.quantidade}x {item.descricao.length > 20 ? item.descricao.substring(0, 20) + '...' : item.descricao}
                    </span>
                  ))}
                </div>
              </div>

              <div className={styles.statusTag}>
                <PackageCheck size={18} /> Separar
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL DE SEPARAÇÃO E ENTREGA */}
      {pedidoSelecionado && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3><PackageCheck size={24} color="#f97316" /> Entrega de Materiais - #{pedidoSelecionado.id.slice(-6)}</h3>
              <button className={styles.btnFechar} onClick={handleFecharModal}><X size={24} /></button>
            </div>

            <div className={styles.modalBody}>
              {/* Box de Informações Fiscais Otimizadas */}
              <div className={styles.taxBox}>
                <div className={styles.taxInfo}>
                  <p>Solicitante</p>
                  <strong>{pedidoSelecionado.solicitante}</strong>
                </div>
                <div className={styles.taxInfo}>
                  <p>Departamento / OS</p>
                  <strong>{pedidoSelecionado.departamento} {pedidoSelecionado.numeroOS ? `(OS: ${pedidoSelecionado.numeroOS})` : ''}</strong>
                </div>
                <div className={styles.taxInfo}>
                  <p>CFOP / ICMS (Otimizado)</p>
                  <strong>{pedidoSelecionado.cfop || '5.949'} / CST {pedidoSelecionado.icms || '40'}</strong>
                </div>
                <div className={styles.taxInfo}>
                  <p>Local de Estoque</p>
                  <select
                    style={{ width: '100%', padding: '6px', marginTop: '4px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                    value={localEstoqueEditado}
                    onChange={(e) => setLocalEstoqueEditado(e.target.value)}
                  >
                    {locaisEstoque.length > 0 ? (
                      locaisEstoque.map(l => <option key={l.codigo} value={l.descricao}>{l.descricao}</option>)
                    ) : (
                      <option value="PADRAO - Local de Estoque Padrão">PADRAO - Local de Estoque Padrão</option>
                    )}
                  </select>
                </div>
              </div>

              {/* Lista de Conferência e Scanner */}
              <div className={styles.barcodeArea}>
                <ScanLine size={24} color="#64748b" />
                <input
                  type="text"
                  ref={barcodeInputRef}
                  placeholder="Bipe o código do produto com o leitor..."
                  value={codigoBarrasScanner}
                  onChange={(e) => setCodigoBarrasScanner(e.target.value)}
                  onKeyDown={handleBipar}
                />
              </div>

              <h4 style={{ margin: '0 0 12px 0', color: '#0f172a' }}>Progresso de Separação</h4>
              <div className={styles.listaConferencia}>
                {pedidoSelecionado.itens?.map((item, idx) => {
                  const qtdPedida = Number(item.quantidade);
                  const qtdBipada = itensBipados[item.codigo] || 0;
                  const isCompleto = qtdBipada === qtdPedida;

                  return (
                    <div key={idx} className={`${styles.itemConferencia} ${isCompleto ? styles.itemCompleto : styles.itemIncompleto}`}>
                      <div style={{ flex: 1 }}>
                        <strong style={{ color: '#0f172a', display: 'block', fontSize: '1.1rem' }}>{item.codigo}</strong>
                        <span style={{ fontSize: '0.9rem', color: '#64748b' }}>{item.descricao}</span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginRight: '16px' }}>
                        <div className={styles.qtdControle}>
                          <button onClick={() => handleMudarQuantidadeManual(item.codigo, qtdBipada - 1)}><Minus size={16} style={{ margin: '0 auto' }} /></button>
                          <input
                            type="number"
                            min="0"
                            max={qtdPedida}
                            value={qtdBipada}
                            onChange={(e) => handleMudarQuantidadeManual(item.codigo, e.target.value)}
                          />
                          <button onClick={() => handleMudarQuantidadeManual(item.codigo, qtdBipada + 1)}><Plus size={16} style={{ margin: '0 auto' }} /></button>
                        </div>
                        <span className={styles.progressoLabel}>
                          de {qtdPedida} und
                        </span>
                      </div>

                      <div style={{ width: 32, display: 'flex', justifyContent: 'center' }}>
                        {isCompleto ? (
                          <CheckCircle2 size={32} color="#84cc16" />
                        ) : (
                          <div style={{ width: 24, height: 24, borderRadius: '50%', border: '2px dashed #cbd5e1' }}></div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Input do Vendedor */}
              <div className={styles.vendedorInputArea}>
                <label>Vendedor (Estoquista Entregador)</label>
                <input
                  type="text"
                  list="vendedores-modal"
                  placeholder="Seu nome..."
                  value={vendedorNome}
                  onChange={(e) => setVendedorNome(e.target.value)}
                />
                <datalist id="vendedores-modal">
                  {vendedores.filter(v => v.inativo !== 'S').map(v => (
                    <option key={v.codigo} value={v.nome} />
                  ))}
                </datalist>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                className={styles.btnConfirmar}
                onClick={handleConfirmarEntrega}
                disabled={isProcessando || vendedorNome.trim() === ''}
                style={{
                  backgroundColor: (isProcessando || vendedorNome.trim() === '')
                    ? '#cbd5e1'
                    : (!isTudoBipado ? '#f59e0b' : '#10b981'),
                  cursor: (isProcessando || vendedorNome.trim() === '') ? 'not-allowed' : 'pointer'
                }}
              >
                <Printer size={20} />
                {isProcessando ? 'Processando...' : (!isTudoBipado ? 'Confirmar Entrega Parcial' : 'Confirmar Entrega e Imprimir')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PainelPedidos;
