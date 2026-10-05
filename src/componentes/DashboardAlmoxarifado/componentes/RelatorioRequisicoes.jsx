import React, { useState, useEffect } from 'react';
import { FileText, ChevronDown, ChevronUp, Package, Calendar, Clock, User, Printer, Download, Search, RotateCcw, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import styles from './RelatorioRequisicoes.module.css';
import logoYama from '../../../assets/yamaservice.png';

const RelatorioRequisicoes = ({ onVoltar }) => {
  const [requisicoes, setRequisicoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandido, setExpandido] = useState(null);
  const [termoBusca, setTermoBusca] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [apenasDevolucoes, setApenasDevolucoes] = useState(false);
  const [processandoDevolucao, setProcessandoDevolucao] = useState(false);
  const [processandoReenvio, setProcessandoReenvio] = useState(null);

  useEffect(() => {
    const fetchRequisicoes = async () => {
      try {
        const response = await fetch('/api/requisicoes');
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
    if (!isoString) return '';
    const data = new Date(isoString);
    return data.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  };

  const formatarHora = (isoString) => {
    if (!isoString) return '';
    const data = new Date(isoString);
    return data.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
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
      const response = await fetch(`/api/requisicoes/${reqId}/devolver`, {
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

  const reenviarRemessa = async (reqId) => {
    setProcessandoReenvio(reqId);
    try {
      const res = await fetch(`/api/requisicoes/${reqId}/reenviar-remessa`, {
        method: 'POST'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Falha ao reenviar remessa');
      alert('✅ Remessa enviada com sucesso para a Omie!');
      if (data.requisicao) {
        setRequisicoes(prev => prev.map(r => r.id === reqId ? data.requisicao : r));
      }
    } catch (err) {
      alert('Erro ao reenviar para Omie: ' + err.message);
    } finally {
      setProcessandoReenvio(null);
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
    const totalItens = req.itens?.reduce((acc, item) => acc + (Number(item.quantidade_entregue ?? item.quantidade) || 0), 0) || 0;
    const totalDevolvidos = req.itens?.reduce((acc, item) => acc + (Number(item.devolvido) || 0), 0) || 0;

    // Use absolute URL for the logo in case the print window needs it
    const logoUrl = new URL(logoYama, window.location.origin).href;

    printWindow.document.write(`
      <html>
        <head>
          <title>Comprovante - OS ${req.numeroOS || req.id.slice(-6)}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inconsolata:wght@400;700&display=swap');
            body { margin: 0; padding: 0; background: white; color: black; font-family: 'Inconsolata', monospace; font-size: 12px; }
            .area-impressao { width: 80mm; margin: 0 auto; padding: 0; }
            .recibo-termico { width: 100%; padding: 4mm; box-sizing: border-box; }
            
            .logo-container { text-align: center; margin-bottom: 5px; }
            /* brightness(0) transforms any non-transparent color into pure black, fixing the white text issue */
            .logo-container img { max-width: 160px; height: auto; filter: brightness(0); }
            
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .text-left { text-align: left; }
            .bold { font-weight: bold; }
            
            .cabecalho-empresa { text-align: center; font-size: 11px; line-height: 1.2; margin-bottom: 8px; }
            .recibo-titulo { text-align: center; font-size: 13px; font-weight: bold; margin: 8px 0; }
            
            .recibo-divider { border-bottom: 1px dashed black; margin: 6px 0; }
            .recibo-divider-solid { border-bottom: 1px solid black; margin: 6px 0; }
            
            .info-section { font-size: 11px; line-height: 1.3; margin: 6px 0; }
            
            .tabela-itens { width: 100%; border-collapse: collapse; margin: 6px 0; font-size: 11px; }
            .tabela-itens th { border-bottom: 1px dashed black; border-top: 1px dashed black; padding: 4px 0; }
            .tabela-itens td { padding: 4px 0; vertical-align: top; }
            .item-row { margin-bottom: 4px; }
            
            .devolucao-nota { font-size: 10px; font-style: italic; color: #333; margin-top: 1px; }
            
            .totais-section { font-size: 12px; font-weight: bold; margin-top: 8px; line-height: 1.4; }
            .totais-linha { display: flex; justify-content: space-between; }
            
            .assinatura-section { margin-top: 40px; text-align: center; font-size: 11px; }
            .linha-assinatura { border-bottom: 1px solid black; width: 90%; margin: 0 auto 4px auto; }
            
            .rodape { text-align: center; font-size: 10px; margin-top: 15px; line-height: 1.2; }

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
              
              <div class="logo-container">
                <img src="${logoUrl}" alt="Yamaservice" />
              </div>
              
              <div class="cabecalho-empresa">
                <div>YAMASERVICE TECNOLOGIA LTDA</div>
                <div>CNPJ: 00.000.000/0001-00</div>
                <div>Documento Interno - Sem Valor Fiscal</div>
              </div>

              <div class="recibo-divider-solid"></div>
              
              <div class="recibo-titulo">EXTRATO DE REQUISIÇÃO N. ${req.id.slice(-6)}</div>
              
              <div class="info-section">
                <div><span class="bold">DATA:</span> ${formatarData(req.dataCriacao)} - ${formatarHora(req.dataCriacao)}</div>
                <div><span class="bold">DEPTO/CENTRO:</span> ${req.centroCusto || 'NÃO INFORMADO'}</div>
                <div><span class="bold">ORDEM DE SERVIÇO:</span> ${req.numeroOS || 'N/A'}</div>
                <div><span class="bold">SOLICITANTE:</span> ${req.contatoCliente || 'NÃO INFORMADO'}</div>
                ${req.remessa_omie?.nCodRem ? `<div><span class="bold">REMESSA OMIE:</span> #${req.remessa_omie.nCodRem} (PENDENTE)</div>` : ''}
              </div>

              <table class="tabela-itens">
                <thead>
                  <tr>
                    <th class="text-left" style="width: 45px;">CÓDIGO</th>
                    <th class="text-left">DESCRIÇÃO</th>
                    <th class="text-right" style="width: 35px;">QTD</th>
                  </tr>
                </thead>
                <tbody>
                  ${req.itens?.map(item => {
                    const entregue = item.quantidade_entregue ?? item.quantidade;
                    const devolvido = item.devolvido || 0;
                    const saldo = entregue - devolvido;
                    
                    return `
                    <tr>
                      <td class="bold">${item.codigo}</td>
                      <td>
                        <div style="line-height: 1.1;">${item.descricao}</div>
                        ${devolvido > 0 ? `<div class="devolucao-nota">** DEVOLUÇÃO: ${devolvido} UND (SALDO: ${saldo}) **</div>` : ''}
                      </td>
                      <td class="text-right bold">
                        ${entregue}
                      </td>
                    </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>

              <div class="recibo-divider-solid"></div>

              <div class="totais-section">
                <div class="totais-linha">
                  <span>QTD RETIRADA:</span>
                  <span>${totalItens}</span>
                </div>
                ${totalDevolvidos > 0 ? `
                <div class="totais-linha">
                  <span>QTD DEVOLVIDA:</span>
                  <span>${totalDevolvidos}</span>
                </div>
                <div class="totais-linha" style="margin-top: 4px; font-size: 14px;">
                  <span>SALDO FINAL:</span>
                  <span>${totalItens - totalDevolvidos}</span>
                </div>
                ` : ''}
              </div>
              
              <div class="recibo-divider-solid"></div>
              
              <div class="assinatura-section">
                <div class="linha-assinatura"></div>
                <div class="bold">${req.contatoCliente || 'Assinatura do Recebedor'}</div>
                <div style="margin-top: 4px;">Declaro ter recebido os materiais descritos acima.</div>
              </div>
              
              <div class="rodape">
                <div>Sistema de Almoxarifado Yamaservice</div>
                <div>Obrigado e bom trabalho!</div>
              </div>

            </div>
          </div>
          <script>
            setTimeout(() => { window.print(); window.close(); }, 800);
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
    
    // Add date filtering
    let matchData = true;
    if (dataInicio || dataFim) {
      const dataReq = new Date(req.dataCriacao);
      if (dataInicio) {
        const dInicio = new Date(dataInicio + 'T00:00:00-03:00');
        if (dataReq < dInicio) matchData = false;
      }
      if (dataFim) {
        const dFim = new Date(dataFim + 'T23:59:59-03:00');
        if (dataReq > dFim) matchData = false;
      }
    }

    // Add returns filtering
    let matchDevolucao = true;
    if (apenasDevolucoes) {
      const temDevolucao = req.itens?.some(i => (i.devolvido || 0) > 0);
      if (!temDevolucao) matchDevolucao = false;
    }
    
    const dataReqFormatada = formatarData(req.dataCriacao);
    const matchTermo = nomeCliente.includes(termo) || numOS.includes(termo) || dataReqFormatada.includes(termo);

    return matchData && matchDevolucao && matchTermo;
  });

  const totalRequisicoes = requisicoesFiltradas.length;
  const totalItens = requisicoesFiltradas.reduce((acc, req) => acc + (req.itens?.reduce((sum, item) => sum + (Number(item.quantidade_entregue ?? item.quantidade) || 0), 0) || 0), 0);
  const totalValor = requisicoesFiltradas.reduce((acc, req) => acc + (req.itens?.reduce((sum, item) => sum + (Number(item.quantidade_entregue ?? item.quantidade) * Number(item.valor_unitario || 0)), 0) || 0), 0);
  const totalDevolvidos = requisicoesFiltradas.reduce((acc, req) => acc + (req.itens?.reduce((sum, item) => sum + (item.devolvido || 0), 0) || 0), 0);

  const exportarRelatorioConsolidado = () => {
    let csv = 'OS;Cliente;Data;Hora;Status;Item_Codigo;Item_Descricao;Qtd_Entregue;Valor_Unitario;Valor_Total_Item;Qtd_Devolvida\n';
    requisicoesFiltradas.forEach(req => {
      req.itens?.forEach(item => {
        const entregue = item.quantidade_entregue ?? item.quantidade;
        const total = Number(entregue) * Number(item.valor_unitario || 0);
        csv += `${req.numeroOS || req.id};${req.contatoCliente || ''};${formatarData(req.dataCriacao)};${formatarHora(req.dataCriacao)};${req.status};${item.codigo};${item.descricao};${entregue};${item.valor_unitario || 0};${total};${item.devolvido || 0}\n`;
      });
    });
    const blob = new Blob(["\ufeff" + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Relatorio_Almoxarifado_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.csv`;
    link.click();
  };

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
          <button 
            className={styles['btn-primary']} 
            onClick={exportarRelatorioConsolidado}
            title="Baixar lista com todas as saídas no formato Excel (.csv)"
          >
            <Download size={16} /> Exportar Consolidado
          </button>
        </div>
      </header>

      <div className={styles['kpi-container']}>
        <div className={styles['kpi-card']}>
          <div className={styles['kpi-icon']}><FileText size={24} /></div>
          <div className={styles['kpi-info']}>
            <h4>Total de Requisições</h4>
            <p>{totalRequisicoes}</p>
          </div>
        </div>
        <div className={styles['kpi-card']}>
          <div className={styles['kpi-icon']}><Package size={24} /></div>
          <div className={styles['kpi-info']}>
            <h4>Itens Movimentados</h4>
            <p>{totalItens} unid.</p>
          </div>
        </div>
        <div className={styles['kpi-card']}>
          <div className={styles['kpi-icon']}><RotateCcw size={24} /></div>
          <div className={styles['kpi-info']}>
            <h4>Peças Devolvidas</h4>
            <p>{totalDevolvidos} unid.</p>
          </div>
        </div>
        <div className={styles['kpi-card']}>
          <div className={styles['kpi-icon']}><User size={24} /></div>
          <div className={styles['kpi-info']}>
            <h4>Valor Retirado</h4>
            <p>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValor)}</p>
          </div>
        </div>
      </div>

      <div className={styles['filters-row']}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label className={styles['filter-label']}>Data Inicial</label>
          <input 
            type="date" 
            className={styles['filter-input']} 
            value={dataInicio}
            onChange={e => setDataInicio(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label className={styles['filter-label']}>Data Final</label>
          <input 
            type="date" 
            className={styles['filter-input']} 
            value={dataFim}
            onChange={e => setDataFim(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label className={styles['filter-label']}>Apenas com devoluções</label>
          <select 
            className={styles['filter-input']} 
            value={apenasDevolucoes ? 'sim' : 'nao'}
            onChange={e => setApenasDevolucoes(e.target.value === 'sim')}
          >
            <option value="nao">Não (Todas)</option>
            <option value="sim">Sim (Com devolução)</option>
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginLeft: 'auto' }}>
          <label className={styles['filter-label']}>Buscar</label>
          <div className={styles['search-box']} style={{ width: '250px' }}>
            <Search size={18} className={styles['search-icon']} />
            <input 
              type="text" 
              placeholder="Buscar por nome ou OS..." 
              value={termoBusca}
              onChange={(e) => setTermoBusca(e.target.value)}
            />
          </div>
        </div>
      </div>

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
                <th>OS / Extrato</th>
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
                    <td>
                      <div><strong>{req.numeroOS ? `OS: ${req.numeroOS}` : 'Sem OS'}</strong></div>
                      <div style={{ fontSize: '11px', color: '#666' }}>Extrato: {req.id.slice(-6)}</div>
                    </td>
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
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                        <span className={styles['badge']}>Concluída</span>
                        {req.remessa_omie?.status === 'enviada' && (
                          <span style={{ fontSize: '0.72rem', background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                            Omie #{req.remessa_omie.nCodRem || 'Pendente'}
                          </span>
                        )}
                        {req.remessa_omie?.status === 'erro' && (
                          <span title={req.remessa_omie.mensagem} style={{ fontSize: '0.72rem', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', cursor: 'help' }}>
                            ⚠️ Falha Omie
                          </span>
                        )}
                      </div>
                    </td>
                    <td className={styles['text-right']}>
                      {expandido === req.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </td>
                  </tr>
                  
                  {expandido === req.id && (
                    <tr className={styles['row-expandida']}>
                      <td colSpan="7">
                        <div className={styles['itens-container']}>
                          <div className={styles['timeline-container']} style={{ flexWrap: 'wrap', gap: '8px' }}>
                            <div className={`${styles['timeline-step']} ${styles['active']}`}>
                              <Calendar size={14} /> Criada: {formatarData(req.dataCriacao)} às {formatarHora(req.dataCriacao)}
                            </div>
                            <div className={`${styles['timeline-connector']} ${styles['active']}`}></div>
                            <div className={`${styles['timeline-step']} ${styles['active']}`}>
                              <Package size={14} /> Separação Concluída
                            </div>
                            <div className={`${styles['timeline-connector']} ${styles['active']}`}></div>
                            <div className={`${styles['timeline-step']} ${styles['active']}`}>
                              <User size={14} /> Entregue por {req.entregador || 'Almoxarife'}
                            </div>
                            <div className={`${styles['timeline-connector']} ${styles['active']}`}></div>
                            {req.remessa_omie?.status === 'enviada' ? (
                              <div className={`${styles['timeline-step']} ${styles['active']}`} style={{ color: '#059669', fontWeight: 'bold' }}>
                                <CheckCircle2 size={14} /> Omie: Remessa #{req.remessa_omie.nCodRem} (Pendente)
                              </div>
                            ) : req.remessa_omie?.status === 'erro' ? (
                              <div className={`${styles['timeline-step']}`} style={{ color: '#dc2626', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <AlertCircle size={14} />
                                <span title={req.remessa_omie.mensagem}>Omie: {req.remessa_omie.mensagem?.substring(0, 40)}...</span>
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); reenviarRemessa(req.id); }}
                                  disabled={processandoReenvio === req.id}
                                  style={{
                                    background: 'var(--cor-destaque)',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '4px',
                                    padding: '2px 8px',
                                    fontSize: '0.72rem',
                                    cursor: 'pointer',
                                    fontWeight: 'bold'
                                  }}
                                >
                                  {processandoReenvio === req.id ? 'Reenviando...' : 'Reenviar Omie'}
                                </button>
                              </div>
                            ) : (
                              <div className={`${styles['timeline-step']}`} style={{ color: '#6b7280' }}>
                                <RefreshCw size={14} /> Omie: Aguardando Sincronização
                              </div>
                            )}
                          </div>
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
