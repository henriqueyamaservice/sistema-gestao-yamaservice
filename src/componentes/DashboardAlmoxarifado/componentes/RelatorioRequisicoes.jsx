import React, { useState, useEffect } from 'react';
import { FileText, ChevronDown, ChevronUp, Package, Calendar, Clock, User, Printer, Download, Search, RotateCcw } from 'lucide-react';
import styles from './RelatorioRequisicoes.module.css';

const RelatorioRequisicoes = ({ onVoltar }) => {
  const [requisicoes, setRequisicoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandido, setExpandido] = useState(null);
  const [termoBusca, setTermoBusca] = useState('');
  const [processandoDevolucao, setProcessandoDevolucao] = useState(false);

  useEffect(() => {
    const fetchRequisicoes = async () => {
      try {
        const response = await fetch('http://localhost:3000/api/requisicoes');
        if (response.ok) {
          const data = await response.json();
          // Filtra para não mostrar as necessidades de compras (reposição), apenas as saídas (consumo)
          const apenasSaidas = data.filter(req => req.tipo !== 'reposicao');
          const ordenadas = apenasSaidas.sort((a, b) => new Date(b.dataCriacao) - new Date(a.dataCriacao));
          setRequisicoes(ordenadas);
        }
      } catch (error) {
        console.error("Erro ao buscar requisições:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchRequisicoes();
  }, []);

  const formatarData = (isoString) => {
    const data = new Date(isoString);
    return data.toLocaleDateString('pt-BR');
  };

  const formatarHora = (isoString) => {
    const data = new Date(isoString);
    return data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const toggleExpand = (id) => {
    if (expandido === id) setExpandido(null);
    else setExpandido(id);
  };

  const registrarDevolucao = async (reqId, codigoProduto, quantidadeEntregue) => {
    const devolucaoQtdStr = window.prompt(`Quantas unidades de ${codigoProduto} estão sendo devolvidas ao estoque?\n(Máximo: ${quantidadeEntregue})`);
    if (!devolucaoQtdStr) return;

    const qtdDevolvida = parseInt(devolucaoQtdStr, 10);
    if (isNaN(qtdDevolvida) || qtdDevolvida <= 0 || qtdDevolvida > quantidadeEntregue) {
      alert('Quantidade inválida!');
      return;
    }

    setProcessandoDevolucao(true);
    try {
      const response = await fetch(`http://localhost:3000/api/requisicoes/${reqId}/devolver`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          codigo_produto: codigoProduto, 
          quantidade_devolvida: qtdDevolvida 
        })
      });

      if (!response.ok) throw new Error('Falha ao registrar devolução no servidor');
      
      const data = await response.json();
      alert('Devolução registrada com sucesso! Estoque atualizado.');
      
      // Atualizar a lista localmente
      setRequisicoes(prev => prev.map(r => r.id === reqId ? data.requisicao : r));
    } catch (error) {
      alert('Erro: ' + error.message);
    } finally {
      setProcessandoDevolucao(false);
    }
  };

  const exportarParaExcel = (req) => {
    let csv = 'Código;Descrição do Produto;Quantidade\n';
    if (req.itens) {
      req.itens.forEach(item => {
        csv += `${item.codigo};${item.descricao};${item.quantidade}\n`;
      });
    }
    const blob = new Blob(["\ufeff" + csv], { type: 'text/csv;charset=utf-8;' }); // ufeff for BOM (UTF-8)
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Requisicao_OS_${req.numeroOS || req.id}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const imprimirNota = (req) => {
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    const totalItens = req.itens?.reduce((acc, item) => acc + (Number(item.quantidade) || 0), 0) || 0;

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
              <p class="recibo-data">${formatarData(req.dataCriacao)} ${formatarHora(req.dataCriacao)}</p>
              <div class="recibo-divider"></div>
              
              <div class="recibo-info">
                <p><strong>Depto:</strong> ${req.centroCusto || 'N/A'}</p>
                <p><strong>O.S:</strong> ${req.numeroOS || 'N/A'}</p>
                <p><strong>Funcionário:</strong> ${req.contatoCliente || 'Não informado'}</p>
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
                  ${req.itens?.map(item => `
                    <tr>
                      <td style="padding-right: 4px;">${item.quantidade}</td>
                      <td><div style="font-weight:bold;">${item.codigo}</div><div style="font-size: 8px; line-height: 1.1;">${item.descricao}</div></td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>

              <div class="recibo-divider"></div>
              <p style="text-align: right; margin: 4px 0;"><strong>Total de Itens: ${totalItens}</strong></p>
              
              <div class="recibo-divider"></div>
              <p class="recibo-via">VIA DO ALMOXARIFADO</p>
              <div class="recibo-assinatura">
                <p>Assinatura do Recebedor:</p>
                <div class="linha-assinatura"></div>
                <p>${req.contatoCliente || 'Colaborador'}</p>
              </div>
              <br/><br/>
            </div>
          </div>
          <script>
            setTimeout(() => { window.print(); window.close(); }, 500);
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const requisicoesFiltradas = requisicoes.filter((req) => {
    const termo = termoBusca.toLowerCase();
    const nomeCliente = (req.contatoCliente || '').toLowerCase();
    const numOS = (req.numeroOS || '').toLowerCase();
    const dataReq = formatarData(req.dataCriacao);
    
    return nomeCliente.includes(termo) || numOS.includes(termo) || dataReq.includes(termo);
  });

  return (
    <div className={styles['relatorio-container']}>
      <header className={styles['header']}>
        <div className={styles['header-title-container']}>
          <div className={styles['icon-highlight']}>
            <FileText size={28} />
          </div>
          <div>
            <h2>Relatório de Saídas</h2>
            <p style={{ margin: '4px 0 0 0', color: 'var(--cor-texto-secundario)', fontSize: '0.9rem' }}>
              Histórico de requisições e materiais retirados do almoxarifado
            </p>
          </div>
        </div>
        <div className={styles['header-actions']}>
          <div className={styles['search-box']}>
            <Search size={20} className={styles['search-icon']} />
            <input 
              type="text" 
              placeholder="Buscar por nome, OS ou data (ex: 15/05)..." 
              value={termoBusca}
              onChange={(e) => setTermoBusca(e.target.value)}
            />
          </div>
        </div>
      </header>

      {loading ? (
        <div className={styles['loading']}>Carregando relatórios...</div>
      ) : requisicoes.length === 0 ? (
        <div className={styles['empty']}>
          <FileText size={40} />
          <h3>Nenhuma requisição encontrada</h3>
          <p>As requisições concluídas aparecerão aqui.</p>
        </div>
      ) : (
        <div className={styles['table-container']}>
          <table className={styles['relatorio-table']}>
            <thead>
              <tr>
                <th>OS / Info</th>
                <th>Cliente</th>
                <th>Data</th>
                <th>Hora</th>
                <th>Itens</th>
                <th style={{ textAlign: 'right' }}>Valor Total</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {requisicoesFiltradas.map((req) => (
                <React.Fragment key={req.id}>
                  <tr onClick={() => toggleExpand(req.id)}>
                    <td><strong>{req.numeroOS || req.id.slice(-6)}</strong></td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <User size={14} color="#6b7280" />
                        {req.contatoCliente || 'Não informado'}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Calendar size={14} color="#6b7280" />
                        {formatarData(req.dataCriacao)}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Clock size={14} color="#6b7280" />
                        {formatarHora(req.dataCriacao)}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Package size={14} color="#6b7280" />
                        {req.itens?.length || 0}
                      </div>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 'bold', color: 'var(--cor-texto)' }}>
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                        req.itens?.reduce((acc, item) => acc + (Number(item.quantidade) * Number(item.valor_unitario || 0)), 0) || 0
                      )}
                    </td>
                    <td><span className={styles['badge']}>Concluída</span></td>
                    <td className={styles['text-right']}>
                      {expandido === req.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </td>
                  </tr>
                  
                  {expandido === req.id && (
                    <tr className={styles['row-expandida']}>
                      <td colSpan="7">
                        <div className={styles['itens-container']}>
                          <div className={styles['itens-container-header']}>
                            <h4>Itens Retirados</h4>
                            <div style={{ display: 'flex', gap: '10px' }}>
                              <button 
                                className={styles['btn-imprimir']} 
                                onClick={(e) => { e.stopPropagation(); exportarParaExcel(req); }}
                                title="Baixar lista em formato Excel (.csv)"
                              >
                                <Download size={14} />
                                Baixar Planilha
                              </button>
                              <button 
                                className={styles['btn-imprimir']} 
                                onClick={(e) => { e.stopPropagation(); imprimirNota(req); }}
                                title="Imprimir Comprovante (PDF/Papel)"
                              >
                                <Printer size={14} />
                                Imprimir Comprovante
                              </button>
                            </div>
                          </div>
                          <table className={styles['itens-table']}>
                            <thead>
                              <tr>
                                <th>Código</th>
                                <th>Descrição do Produto</th>
                                <th style={{ textAlign: 'center' }}>Quantidade Entregue</th>
                                <th style={{ textAlign: 'center' }}>Ações</th>
                              </tr>
                            </thead>
                            <tbody>
                              {req.itens?.map((item, idx) => {
                                const entregue = item.quantidade_entregue ?? item.quantidade;
                                const pedida = item.quantidade;
                                const devolvido = item.devolvido || 0;
                                const disponivelParaDevolucao = entregue - devolvido;

                                return (
                                  <tr key={idx}>
                                    <td>{item.codigo}</td>
                                    <td>
                                      {item.descricao}
                                      {entregue < pedida && (
                                        <span style={{ marginLeft: 8, fontSize: '0.75rem', color: '#f59e0b', background: '#fef3c7', padding: '2px 6px', borderRadius: 4 }}>
                                          Entrega Parcial (Pediu {pedida})
                                        </span>
                                      )}
                                    </td>
                                    <td style={{ textAlign: 'center', fontWeight: 'bold' }}>
                                      {entregue} {devolvido > 0 ? <span style={{ color: '#ef4444', fontSize: '0.85rem' }}>(-{devolvido} dev)</span> : ''}
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                      {disponivelParaDevolucao > 0 ? (
                                        <button 
                                          className={styles['btn-imprimir']}
                                          style={{ background: '#f1f5f9', color: '#0f172a', padding: '4px 12px', fontSize: '0.8rem', border: '1px solid #cbd5e1' }}
                                          onClick={(e) => { e.stopPropagation(); registrarDevolucao(req.id, item.codigo, disponivelParaDevolucao); }}
                                          disabled={processandoDevolucao}
                                        >
                                          <RotateCcw size={12} />
                                          Devolver Peça
                                        </button>
                                      ) : (
                                        <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Devolvido Total</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default RelatorioRequisicoes;
