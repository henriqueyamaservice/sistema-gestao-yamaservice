import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, Bot, Send, User, Loader2, Sparkles, DollarSign, Zap, PackageOpen, ChevronRight, CheckCircle, Printer, Check, RefreshCw } from 'lucide-react';
import styles from './index.module.css';
import logoYamaguchi from '../../../../assets/kazunorio.png';

// Monta o prompt do especialista e dados completos da requisição
export const montarPromptContexto = (req, textosCotacoes, fornecedores) => {
  if (!req || !req.itens) return '';

  // 1. Textos colados dos PDFs por fornecedor
  const orcamentosTextos = [];
  Object.keys(textosCotacoes || {}).forEach(key => {
    if (key.startsWith(`${req.id}_`)) {
      const fornId = key.split('_')[1];
      const forn = fornecedores?.find(f => String(f.codigo_cliente_omie) === String(fornId));
      const fornNome = forn ? (forn.nome_fantasia || forn.razao_social) : `Fornecedor ID ${fornId}`;
      orcamentosTextos.push(`--- Proposta em Texto/PDF de: ${fornNome} ---\n${textosCotacoes[key]}`);
    }
  });

  // 2. Itens, cotações salvas (via link/planilha) e histórico anterior
  const historicoItens = req.itens.map(item => {
    let texto = `* Item: ${item.descricao} (Qtd necessária: ${item.quantidade} ${item.unidade || 'UN'})\n`;

    // Histórico de compras anteriores / Preço cadastrado na Omie
    const precoHistorico = item.ultimo_preco_pago || item.preco_medio_historico || item.valor_unitario || item.valorUnitario;
    if (precoHistorico && Number(precoHistorico) > 0) {
      texto += `  - Referência Histórica (Preço Omie): R$ ${precoHistorico}\n`;
    }

    // Cotações registradas via link
    const cotacoesValidas = item.cotacoes?.filter(c => c.valorUnitario && Number(c.valorUnitario) > 0) || [];
    if (cotacoesValidas.length > 0) {
      texto += `  - Propostas salvas no sistema:\n`;
      cotacoesValidas.forEach(cot => {
        const forn = fornecedores?.find(f => String(f.codigo_cliente_omie) === String(cot.fornecedorId));
        const fornNome = forn ? (forn.nome_fantasia || forn.razao_social) : `Forn. ${cot.fornecedorId}`;
        texto += `    * ${fornNome}: R$ ${cot.valorUnitario}/un | Prazo: ${cot.previsaoDias || 'N/I'} dias | Marca: ${cot.marca || 'Não informada'}\n`;
      });
    } else {
      texto += `  - (Nenhuma cotação salva via link para este item)\n`;
    }
    return texto;
  }).join('\n');

  // Cálculo Matemático Exato dos Cenários (garante que a IA bata 100% com o orçamento manual)
  const formatMoeda = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  let menorCustoItens = [];
  let totalMenorCusto = 0;

  let maiorRapidezItens = [];
  let totalMaiorRapidez = 0;

  const fornecedoresCompletosMap = {};

  req.itens.forEach(item => {
    const cotacoesValidas = (item.cotacoes || []).filter(c => c.valorUnitario && Number(c.valorUnitario) > 0);
    const baseQtd = Number(item.quantidade) || 1;

    const calcularSubtotalReal = (c, qtd) => {
      const tipo = c.tipoUnidade || 'Unidade';
      const qtdInterna = Number(c.quantidadePacote) || 1;
      let qtdComprar = qtd;
      if (['Pacote', 'Caixa', 'Galao', 'Galão', 'Rolo', 'Tambor'].includes(tipo)) {
        qtdComprar = Math.ceil(qtd / (qtdInterna > 0 ? qtdInterna : 1));
      }
      const descItem = Number(c.desconto) || 0;
      const descGeral = Number(c.descontoGeral) || 0;
      return (Number(c.valorUnitario) * qtdComprar) * (1 - descItem / 100) * (1 - descGeral / 100);
    };

    // Track para fornecedor completo
    cotacoesValidas.forEach(c => {
      const fKey = String(c.fornecedorId);
      if (!fornecedoresCompletosMap[fKey]) {
        fornecedoresCompletosMap[fKey] = { fornId: fKey, count: 0, total: 0, itens: [] };
      }
      fornecedoresCompletosMap[fKey].count += 1;
      const sub = calcularSubtotalReal(c, baseQtd);
      fornecedoresCompletosMap[fKey].total += sub;
      fornecedoresCompletosMap[fKey].itens.push({ item, cot: c, sub });
    });

    if (cotacoesValidas.length > 0) {
      // Menor preço (calcula pelo subtotal para ser fiel ao pacote/desconto)
      const menorCot = [...cotacoesValidas].sort((a, b) => calcularSubtotalReal(a, baseQtd) - calcularSubtotalReal(b, baseQtd))[0];
      const subMenor = calcularSubtotalReal(menorCot, baseQtd);
      totalMenorCusto += subMenor;
      menorCustoItens.push({ item, cot: menorCot, sub: subMenor });

      // Menor prazo
      const maisRapidaCot = [...cotacoesValidas].sort((a, b) => (Number(a.previsaoDias) || 99) - (Number(b.previsaoDias) || 99))[0];
      const subRapida = calcularSubtotalReal(maisRapidaCot, baseQtd);
      totalMaiorRapidez += subRapida;
      maiorRapidezItens.push({ item, cot: maisRapidaCot, sub: subRapida });
    }
  });

  const formatarLinhasCenario = (itensArray) => {
    return itensArray.map(({ item, cot, sub }) => {
      const forn = fornecedores?.find(f => String(f.codigo_cliente_omie) === String(cot.fornecedorId));
      const fornNome = forn ? (forn.nome_fantasia || forn.razao_social) : `Fornecedor ${cot.fornecedorId}`;
      const qtd = Number(item.quantidade) || 1;
      const vUnit = Number(cot.valorUnitario);
      return `${fornNome} | ${item.descricao} | ${qtd} un | ${formatMoeda(vUnit)} | ${formatMoeda(sub)} | ${cot.previsaoDias || 'N/I'} dias`;
    }).join('\n');
  };

  // Fornecedor único que tem todos os itens
  const listaCompletos = Object.values(fornecedoresCompletosMap)
    .filter(f => f.count === req.itens.length)
    .sort((a, b) => a.total - b.total);
  const melhorUnico = listaCompletos[0];

  return `
Você é um Especialista Sênior em Gestão de Compras e Suprimentos corporativos.
Você está avaliando a Requisição #${String(req.numero_requisicao || req.id).slice(-6)}.

DADOS ATUAIS DA REQUISIÇÃO E COTAÇÕES VIA LINK:
${historicoItens}

CÁLCULO MATEMÁTICO REAL DO SISTEMA (UTILIZE ESTES VALORES EXATOS NOS CENÁRIOS):
* Opção 1 - MENOR CUSTO REAL (Menores preços por item / Split ótimo):
  Total Calculado: ${formatMoeda(totalMenorCusto)}
  Composição:
${formatarLinhasCenario(menorCustoItens)}

* Opção 2 - MAIOR RAPIDEZ (Urgência - Menor prazo de entrega):
  Total Calculado: ${formatMoeda(totalMaiorRapidez)}
  Composição:
${formatarLinhasCenario(maiorRapidezItens)}

${melhorUnico ? `* Opção 3 - COMPRA ÚNICA 100% DOS ITENS (${fornecedores?.find(f => String(f.codigo_cliente_omie) === String(melhorUnico.fornId))?.nome_fantasia || 'Fornecedor Único'}):
  Total Calculado: ${formatMoeda(melhorUnico.total)}
  Composição:
${formatarLinhasCenario(melhorUnico.itens)}` : ''}

TEXTOS/PROPOSTAS EXTRAÍDAS DE ARQUIVOS PDF (APENAS PARA CONSULTA DE CONTEXTO E MARCAS):
${orcamentosTextos.length > 0 ? orcamentosTextos.join('\n\n') : '(Nenhum orçamento colado via PDF)'}

SUA MISSÃO:
1. Avaliar o TCO (Custo Total de Aquisição), prazos de entrega e marcas cotadas.
2. Apresentar os 3 cenários claros de decisão para o comprador usando EXATAMENTE os seguintes títulos:
   - "Menor Custo"
   - "Maior Rapidez (Urgência)"
   - "Mix (Split de Fornecedores)"

REGRAS MATEMÁTICAS INEGOCIÁVEIS:
1. O Cenário "Menor Custo" DEVE usar o valor exato pré-calculado ${formatMoeda(totalMenorCusto)} e a composição da Opção 1.
2. O Cenário "Maior Rapidez (Urgência)" DEVE usar o valor exato pré-calculado ${formatMoeda(totalMaiorRapidez)} e a composição da Opção 2.
3. O Cenário "Mix (Split de Fornecedores)" DEVE usar ${melhorUnico ? `a opção de pacote de fornecedor único no valor de ${formatMoeda(melhorUnico.total)} (para evitar múltiplos fretes) OU uma estratégia balanceada` : `a estratégia ótima de ${formatMoeda(totalMenorCusto)}`}.
4. É RIGOROSAMENTE PROIBIDO inventar valores, somar adicionais, pacotes extras ou linhas fictícias! Cada cenário deve ter EXATAMENTE ${req.itens.length} produtos (os mesmos produtos solicitados na Requisição).
5. O total exibido em total="..." DEVE bater centavo por centavo com a soma dos subtotais dos itens listados dentro do [CENARIO].

ESTILO DE COMUNICAÇÃO:
- Análise inicial curta e direta (máximo 1 linha por item).
- Sem parágrafos longos, direto ao ponto.

REGRA OBRIGATÓRIA DE FORMATAÇÃO:
Você DEVE OBRIGATORIAMENTE usar as tags especiais [CENARIO] ... [/CENARIO] para que o sistema consiga renderizar os botões interativos na tela.
Formato exato:
[CENARIO titulo="Menor Custo" total="${formatMoeda(totalMenorCusto)}" icone="DollarSign" estrategia="Explicação sucinta."]
Fornecedor A | Produto X | 10 un | R$ 10,00 | R$ 100,00 | 5 dias
Fornecedor B | Produto Y | 5 un | R$ 20,00 | R$ 100,00 | 2 dias
[/CENARIO]

Após gerar as tags [CENARIO], finalize com 1 pergunta estratégica para o comprador.
`;
};

const ChatConsultorGlobal = ({ 
  isOpen, 
  onClose, 
  req, 
  requisicoes = [], 
  onMudarReq, 
  textosCotacoes, 
  fornecedores, 
  onSelecionarVencedor, 
  onAprovar 
}) => {
  // Histórico de mensagens isolado por ID da requisição: { [reqId]: [ { role, content } ] }
  const [historicoPorReq, setHistoricoPorReq] = useState({});
  const [digitando, setDigitando] = useState('');
  const [isProcessando, setIsProcessando] = useState(false);
  const [cenarioDetalhe, setCenarioDetalhe] = useState(null);
  const scrollRef = useRef(null);

  const reqId = req?.id;

  const [salvandoArquivo, setSalvandoArquivo] = useState(false);

  const salvarCotacaoNoArquivo = async () => {
    if (!cenarioDetalhe || !cenarioDetalhe.detalhes) return;
    setSalvandoArquivo(true);
    
    const tabelaArray = [];
    cenarioDetalhe.detalhes.split('\n').filter(line => line.trim()).forEach(line => {
      const colunas = line.split('|').map(c => c.trim());
      if (colunas.length >= 5) {
        tabelaArray.push([colunas[0], colunas[1], colunas[2], colunas[3], colunas[4], colunas[5] || '-']);
      }
    });

    try {
      const res = await fetch('/api/cotacoes-arquivadas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requisicao_id: String(reqId),
          fornecedor_id: 'VARIOS',
          fornecedor_nome: cenarioDetalhe.titulo,
          tipo_arquivamento: 'SALVO_USUARIO',
          dados_json: { titulo: cenarioDetalhe.titulo, resumo: cenarioDetalhe.estrategia, tabela: tabelaArray },
          texto_original_pdf: '', 
          usuario_salvamento: 'Comprador (IA)' 
        })
      });
      if (res.ok) {
        alert('Cotação salva com sucesso na Biblioteca de Orçamentos!');
      } else {
        alert('Erro ao salvar cotação no arquivo.');
      }
    } catch (e) {
      console.error(e);
      alert('Erro de conexão ao salvar cotação.');
    } finally {
      setSalvandoArquivo(false);
    }
  };
  const mensagens = useMemo(() => {
    return (reqId && historicoPorReq[reqId]) || [];
  }, [reqId, historicoPorReq]);

  const promptContextoCompleto = useMemo(() => {
    return montarPromptContexto(req, textosCotacoes, fornecedores);
  }, [req, textosCotacoes, fornecedores]);

  const iniciarAnaliseParaReq = async (reqAlvo) => {
    if (!reqAlvo || !reqAlvo.id) return;
    const targetReqId = reqAlvo.id;

    setIsProcessando(true);
    setHistoricoPorReq(prev => ({
      ...prev,
      [targetReqId]: [{ role: 'system_init', content: 'Analisando itens, cotações e propostas em PDF...' }]
    }));

    try {
      const contexto = montarPromptContexto(reqAlvo, textosCotacoes, fornecedores);
      const response = await fetch('/api/ia-orcamento/chat-global', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          contexto, 
          historico: [{ role: 'user', content: 'Faça a análise padrão. Lembre-se: Você DEVE usar exatamente os 3 títulos obrigatórios para os cenários: "Menor Custo", "Maior Rapidez (Urgência)" e "Mix (Split de Fornecedores)".' }] 
        })
      });

      const data = await response.json();

      if (response.ok) {
        setHistoricoPorReq(prev => ({
          ...prev,
          [targetReqId]: [
            { role: 'assistant', content: data.resposta }
          ]
        }));
      } else {
        setHistoricoPorReq(prev => ({
          ...prev,
          [targetReqId]: [
            { role: 'assistant', content: `Erro na análise: ${data.erro || 'Não foi possível gerar a resposta.'}` }
          ]
        }));
      }
    } catch (error) {
      setHistoricoPorReq(prev => ({
        ...prev,
        [targetReqId]: [
          { role: 'assistant', content: 'Desculpe, ocorreu um erro de conexão com o Consultor IA.' }
        ]
      }));
    } finally {
      setIsProcessando(false);
    }
  };

  const reanalisarReqAtual = () => {
    if (req && !isProcessando) {
      iniciarAnaliseParaReq(req);
    }
  };

  useEffect(() => {
    if (isOpen && req && req.id) {
      const msgs = historicoPorReq[req.id];
      if (!msgs || msgs.length === 0) {
        iniciarAnaliseParaReq(req);
      }
    }
  }, [isOpen, req?.id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [mensagens]);

  const handleEnviarMensagem = async (e, textOverride = null) => {
    if (e) e.preventDefault();
    if (!req || !req.id || isProcessando) return;
    const targetReqId = req.id;
    const textoUsuario = textOverride !== null ? textOverride : digitando.trim();
    if (!textoUsuario) return;

    const msgsAtuais = historicoPorReq[targetReqId] || [];
    const novasMensagens = [...msgsAtuais, { role: 'user', content: textoUsuario }];

    setHistoricoPorReq(prev => ({
      ...prev,
      [targetReqId]: novasMensagens
    }));
    setDigitando('');
    setIsProcessando(true);

    try {
      const contexto = montarPromptContexto(req, textosCotacoes, fornecedores);
      const response = await fetch('/api/ia-orcamento/chat-global', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contexto,
          historico: novasMensagens
        })
      });

      const data = await response.json();
      if (response.ok) {
        setHistoricoPorReq(prev => ({
          ...prev,
          [targetReqId]: [...novasMensagens, { role: 'assistant', content: data.resposta }]
        }));
      } else {
        setHistoricoPorReq(prev => ({
          ...prev,
          [targetReqId]: [...novasMensagens, { role: 'assistant', content: `Erro na IA: ${data.erro}` }]
        }));
      }
    } catch (error) {
      setHistoricoPorReq(prev => ({
        ...prev,
        [targetReqId]: [...novasMensagens, { role: 'assistant', content: 'Erro de comunicação com o servidor.' }]
      }));
    } finally {
      setIsProcessando(false);
    }
  };


  const handlePrint = () => {
    const content = document.getElementById('print-area-modal').innerHTML;
    const printWindow = window.open('', '', 'height=700,width=900');
    printWindow.document.write('<html><head><title>Mapa de Cotações - IA</title>');
    printWindow.document.write(`
      <style>
        @media print {
          @page { margin: 1.5cm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .printHeaderOnly { display: flex !important; }
          .printFooterOnly { display: block !important; }
          .printOnlyTable { display: table !important; }
          .hideOnPrint { display: none !important; }
        }
        * { color: #000 !important; }
        body { font-family: 'Segoe UI', Arial, sans-serif; padding: 0; font-size: 11px; line-height: 1.3; background: #fff !important; }
        #print-area-modal { padding: 0 !important; }
        h2 { margin: 0 0 5px 0 !important; font-size: 16px !important; text-transform: uppercase; }
        h4 { margin: 10px 0 4px 0 !important; font-size: 12px !important; border-bottom: 1px solid #ccc; padding-bottom: 2px; }
        p, div { margin-bottom: 2px; }
        .total { font-size: 16px !important; font-weight: bold; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px !important; font-size: 11px !important; }
        th, td { border: 1px solid #aaa !important; padding: 4px 6px !important; text-align: left; }
        th { background-color: #eee !important; font-weight: bold; }
        .resumo { background: #fff !important; border-left: 2px solid #333 !important; padding: 6px 10px !important; font-style: italic; margin: 10px 0 !important; font-size: 11px !important; }
      </style>
    `);
    printWindow.document.write('</head><body>');
    printWindow.document.write(content);
    printWindow.document.write('</body></html>');
    printWindow.document.documentMode ? printWindow.document.execCommand('print') : printWindow.print();
    printWindow.close();
  };

  const renderMensagemConteudo = (content, isUser) => {
    const cenarioRegex = /\[CENARIO titulo="(.*?)" total="(.*?)" icone="(.*?)" estrategia="(.*?)"\]([\s\S]*?)\[\/CENARIO\]/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = cenarioRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: 'text', content: content.substring(lastIndex, match.index) });
      }
      parts.push({
        type: 'cenario',
        titulo: match[1],
        total: match[2],
        icone: match[3],
        estrategia: match[4],
        detalhes: match[5].trim()
      });
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < content.length) {
      parts.push({ type: 'text', content: content.substring(lastIndex) });
    }

    if (parts.length === 0) {
      parts.push({ type: 'text', content });
    }

    return parts.map((part, index) => {
      if (part.type === 'text') {
        return (
          <div key={index}>
            {part.content.split('\n').map((line, i) => {
              const bParts = line.split(/(\*\*.*?\*\*)/g);
              return (
                <p key={i} style={{ margin: '0 0 6px', lineHeight: '1.45' }}>
                  {bParts.map((bPart, j) => {
                    if (bPart.startsWith('**') && bPart.endsWith('**')) {
                      return <strong key={j} style={{ color: isUser ? 'var(--cor-texto-inverso)' : 'var(--cor-texto-principal)' }}>{bPart.slice(2, -2)}</strong>;
                    }
                    return <span key={j}>{bPart}</span>;
                  })}
                </p>
              );
            })}
          </div>
        );
      } else {
        const IconComponent = part.icone === 'DollarSign' ? DollarSign : (part.icone === 'Zap' ? Zap : PackageOpen);
        return (
          <div
            key={index}
            onClick={() => setCenarioDetalhe(part)}
            style={{
              background: 'var(--cor-fundo-secundario)',
              border: '1px solid var(--cor-borda-cartao)',
              borderRadius: '8px',
              padding: '12px 16px',
              marginTop: '10px',
              marginBottom: '10px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              position: 'relative',
              overflow: 'hidden'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.borderColor = 'var(--cor-destaque)';
              e.currentTarget.style.boxShadow = '0 4px 10px -2px var(--cor-fundo-sutil-forte)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = 'var(--cor-borda-cartao)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'var(--cor-destaque)' }}></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--cor-texto-principal)', fontWeight: 'bold' }}>
                <div style={{ background: 'var(--cor-fundo-sutil)', padding: '6px', borderRadius: '6px', color: 'var(--cor-destaque)' }}>
                  <IconComponent size={18} />
                </div>
                {part.titulo}
              </div>
              <div style={{ fontWeight: 'bold', color: 'var(--cor-destaque)', fontSize: '1.1rem' }}>
                {part.total}
              </div>
            </div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--cor-texto-secundario)', paddingRight: '20px' }}>{part.estrategia}</p>
            <div style={{ position: 'absolute', bottom: '15px', right: '15px', color: 'var(--cor-texto-secundario)' }}>
              <ChevronRight size={18} />
            </div>
          </div>
        );
      }
    });
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <div className={styles.titleArea}>
            <img src={logoYamaguchi} alt="Logo Yamaguchi" style={{ height: '36px', marginRight: '15px', objectFit: 'contain' }} />
            <div className={styles.iconWrapper}>
              <Sparkles size={22} color="#fff" />
            </div>
            <div>
              <h3>Agente Compras (IA)</h3>
              <p>Consultoria e Decisão Estratégica</p>
            </div>
          </div>

          <div className={styles.headerActions}>
            {requisicoes && requisicoes.length > 0 && (
              <div className={styles.selectorContainer}>
                <span className={styles.selectorLabel}>Requisição:</span>
                <select
                  value={req?.id || ''}
                  onChange={(e) => {
                    const escolhida = requisicoes.find(r => String(r.id) === String(e.target.value));
                    if (escolhida && onMudarReq) {
                      onMudarReq(escolhida);
                    }
                  }}
                  className={styles.reqDropdown}
                >
                  {requisicoes.map(r => {
                    const numReq = String(r.numero_requisicao || r.id).slice(-6);
                    const qtdItens = r.itens?.length || 0;
                    return (
                      <option key={r.id} value={r.id}>
                        #{numReq} ({qtdItens} {qtdItens === 1 ? 'item' : 'itens'})
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            {req && (
              <button
                type="button"
                className={styles.btnReanalisar}
                onClick={reanalisarReqAtual}
                disabled={isProcessando}
                title="Recalcular cenários e atualizar análise desta requisição"
              >
                <RefreshCw size={14} className={isProcessando ? 'spin' : ''} />
                <span>Reanalisar</span>
              </button>
            )}

            <button className={styles.closeBtn} onClick={onClose} title="Fechar assistente">
              <X size={24} />
            </button>
          </div>
        </div>

        <div className={styles.chatArea} ref={scrollRef}>
          {!req ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--cor-texto-secundario)', margin: 'auto' }}>
              <PackageOpen size={48} style={{ margin: '0 auto 16px', opacity: 0.6, color: '#0ea5e9' }} />
              <h3 style={{ color: 'var(--cor-texto-principal)', marginBottom: '8px' }}>Selecione uma Requisição</h3>
              <p>Escolha uma requisição no seletor acima para iniciar a consultoria com a IA.</p>
            </div>
          ) : (
            <>
              {mensagens.map((msg, index) => {
                const isUser = msg.role === 'user';
                return (
                  <div key={index} className={isUser ? styles.msgWrapperUser : styles.msgWrapperAssistant}>
                    {!isUser && <div className={styles.avatarAssistant}><Bot size={18} /></div>}
                    <div className={isUser ? styles.bubbleUser : styles.bubbleAssistant}>
                      {renderMensagemConteudo(msg.content, isUser)}
                    </div>
                    {isUser && <div className={styles.avatarUser}><User size={18} /></div>}
                  </div>
                );
              })}

              {mensagens.length === 1 && !isProcessando && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '16px', padding: '0 10px', animation: 'fadeIn 0.5s' }}>
                  <button onClick={() => handleEnviarMensagem(null, 'Por favor, foque no Menor Preço possível.')} style={{ background: 'var(--cor-fundo-sutil)', border: '1px solid var(--cor-destaque)', color: 'var(--cor-destaque)', padding: '8px 14px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }} onMouseOver={e => { e.currentTarget.style.background = 'var(--cor-destaque)'; e.currentTarget.style.color = 'var(--cor-texto-inverso)'; }} onMouseOut={e => { e.currentTarget.style.background = 'var(--cor-fundo-sutil)'; e.currentTarget.style.color = 'var(--cor-destaque)'; }}>💰 Focar no Menor Preço</button>
                  <button onClick={() => handleEnviarMensagem(null, 'Por favor, priorize marcas originais e de primeira linha.')} style={{ background: 'var(--cor-fundo-sutil)', border: '1px solid var(--cor-destaque)', color: 'var(--cor-destaque)', padding: '8px 14px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }} onMouseOver={e => { e.currentTarget.style.background = 'var(--cor-destaque)'; e.currentTarget.style.color = 'var(--cor-texto-inverso)'; }} onMouseOut={e => { e.currentTarget.style.background = 'var(--cor-fundo-sutil)'; e.currentTarget.style.color = 'var(--cor-destaque)'; }}>🏆 Priorizar Marcas Originais</button>
                  <button onClick={() => handleEnviarMensagem(null, 'Tenho urgência! Priorize o fornecedor com a entrega mais rápida.')} style={{ background: 'var(--cor-fundo-sutil)', border: '1px solid var(--cor-destaque)', color: 'var(--cor-destaque)', padding: '8px 14px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }} onMouseOver={e => { e.currentTarget.style.background = 'var(--cor-destaque)'; e.currentTarget.style.color = 'var(--cor-texto-inverso)'; }} onMouseOut={e => { e.currentTarget.style.background = 'var(--cor-fundo-sutil)'; e.currentTarget.style.color = 'var(--cor-destaque)'; }}>⚡ Urgência (Rapidez)</button>
                  <button onClick={() => handleEnviarMensagem(null, 'Faça a análise padrão mostrando cenários variados de Custo, Rapidez e Equilíbrio.')} style={{ background: 'var(--cor-fundo-sutil)', border: '1px solid var(--cor-destaque)', color: 'var(--cor-destaque)', padding: '8px 14px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }} onMouseOver={e => { e.currentTarget.style.background = 'var(--cor-destaque)'; e.currentTarget.style.color = 'var(--cor-texto-inverso)'; }} onMouseOut={e => { e.currentTarget.style.background = 'var(--cor-fundo-sutil)'; e.currentTarget.style.color = 'var(--cor-destaque)'; }}>⚖️ Análise Padrão</button>
                </div>
              )}

              {isProcessando && mensagens.length > 0 && (
                <div className={styles.msgWrapperAssistant}>
                  <div className={styles.avatarAssistant}><Bot size={18} /></div>
                  <div className={styles.bubbleAssistant}>
                    <Loader2 size={16} className="spin" /> Analisando propostas...
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <form className={styles.inputArea} onSubmit={handleEnviarMensagem}>
          <input
            type="text"
            placeholder="Ex: 'Prefiro prazo rápido' ou 'O que acha do frete?'..."
            value={digitando}
            onChange={(e) => setDigitando(e.target.value)}
            disabled={isProcessando}
          />
          <button type="submit" disabled={!digitando.trim() || isProcessando}>
            <Send size={20} />
          </button>
        </form>
      </div>

      {/* Modal de Detalhes do Cenário */}
      {cenarioDetalhe && (
        <div
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.75)', zIndex: 10001, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
          onClick={() => setCenarioDetalhe(null)}
        >
          <div
            style={{ background: 'var(--cor-fundo-cartao)', width: '1050px', maxWidth: '96vw', maxHeight: '92vh', borderRadius: '12px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', overflowY: 'auto', position: 'relative' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ height: '6px', background: 'var(--cor-destaque)' }}></div>

            <div id="print-area-modal" style={{ padding: '24px 30px' }}>

              {/* Cabeçalho no padrão Omie que aparece apenas na impressão */}
              <div className="printHeaderOnly" style={{ display: 'none', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '30px' }}>
                <div style={{ width: '100px', height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img src={logoYamaguchi} alt="Logo Yamaguchi" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                </div>
                <div style={{ textAlign: 'right', lineHeight: '1.4', fontSize: '11px', color: '#000' }}>
                  <strong style={{ fontSize: '16px' }}>KAZUNORI YAMAGUCHI</strong><br />
                  <span style={{ fontWeight: 'bold' }}>www.yamaves.com</span><br />
                  CNPJ: 042.033.722/0001-91<br />
                  Inscrição Estadual: 151832340<br />
                  RODOVIA PA-140 KM-19, 0 - FAB. DE RAÇÃO YAMAVES<br />
                  ZONA RURAL<br />
                  Santo Antônio do Taua - PA - CEP: 68786-000<br />
                  Telefone: (91) 3775-1499
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '2px solid var(--cor-borda-cartao)', paddingBottom: '16px', marginBottom: '16px', gap: '15px' }}>
                <div>
                  <h2 style={{ margin: 0, color: 'var(--cor-texto-principal)', fontSize: '1.25rem', fontWeight: '900', textTransform: 'uppercase' }}>Carta de Cotação Nº {String(req?.numero_requisicao || req?.id).slice(-6)}</h2>
                  <p style={{ margin: '8px 0 0', color: 'var(--cor-texto-secundario)', fontSize: '0.85rem' }}>Cenário Estratégico: <strong style={{ color: 'var(--cor-destaque)' }}>{cenarioDetalhe.titulo}</strong></p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--cor-texto-secundario)', fontWeight: 'bold', textTransform: 'uppercase' }}>Investimento Total</div>
                  <div className="total" style={{ fontSize: '1.6rem', fontWeight: '900', color: 'var(--cor-sucesso)' }}>{cenarioDetalhe.total}</div>
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ margin: '0 0 6px 0', color: 'var(--cor-texto-principal)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Estratégia Recomendada</h4>
                <div className="resumo" style={{ background: 'var(--cor-fundo-secundario)', borderLeft: '4px solid var(--cor-destaque)', padding: '10px 14px', color: 'var(--cor-texto-secundario)', fontSize: '0.9rem', fontStyle: 'italic', lineHeight: '1.4' }}>
                  "{cenarioDetalhe.estrategia}"
                </div>
              </div>

              <div style={{ marginBottom: '10px' }}>
                <h4 style={{ margin: '0 0 10px 0', color: 'var(--cor-texto-principal)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Composição dos Itens</h4>
                
                {/* Visualização de Tela (Tabela Organizada por Fornecedor, Peça, Qtd/Litro, Preço Unitário e Total) */}
                <div className="hideOnPrint" style={{ border: '1px solid var(--cor-borda-cartao)', borderRadius: '8px', overflow: 'hidden', background: 'var(--cor-fundo-cartao)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                    <thead>
                      <tr style={{ background: 'var(--cor-fundo-secundario)', borderBottom: '2px solid var(--cor-borda-cartao)', textAlign: 'left' }}>
                        <th style={{ padding: '10px 14px', color: 'var(--cor-texto-secundario)', fontWeight: '700', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Fornecedor</th>
                        <th style={{ padding: '10px 14px', color: 'var(--cor-texto-secundario)', fontWeight: '700', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Peça / Produto</th>
                        <th style={{ padding: '10px 14px', color: 'var(--cor-texto-secundario)', fontWeight: '700', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>Qtd / Litro</th>
                        <th style={{ padding: '10px 14px', color: 'var(--cor-texto-secundario)', fontWeight: '700', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'right' }}>Preço Unit.</th>
                        <th style={{ padding: '10px 14px', color: 'var(--cor-texto-secundario)', fontWeight: '700', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>Prazo</th>
                        <th style={{ padding: '10px 14px', color: 'var(--cor-texto-secundario)', fontWeight: '700', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'right' }}>Valor Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cenarioDetalhe.detalhes.split('\n').filter(line => line.trim()).map((line, idx) => {
                        const colunas = line.split('|').map(c => c.trim());
                        if (colunas.length < 5) {
                          return (
                            <tr key={idx} style={{ borderBottom: '1px solid var(--cor-borda-cartao)' }}>
                              <td colSpan={6} style={{ padding: '10px 14px', color: 'var(--cor-texto-principal)' }}>
                                {line.replace(/^-\s*/, '')}
                              </td>
                            </tr>
                          );
                        }

                        const fornecedor = colunas[0];
                        const produto = colunas[1];
                        const qtd = colunas[2];
                        const precoUnit = colunas[3];
                        const valorTotal = colunas[4];
                        const prazo = colunas[5] || '-';

                        return (
                          <tr 
                            key={idx} 
                            style={{ 
                              borderBottom: '1px solid var(--cor-borda-cartao)', 
                              background: idx % 2 === 0 ? 'var(--cor-fundo-cartao)' : 'var(--cor-fundo-secundario)',
                              transition: 'background 0.15s ease'
                            }}
                          >
                            <td style={{ padding: '12px 14px', fontWeight: '700', color: 'var(--cor-texto-principal)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <CheckCircle size={15} color="var(--cor-sucesso)" />
                                <span>{fornecedor}</span>
                              </div>
                            </td>
                            <td style={{ padding: '12px 14px', color: 'var(--cor-texto-principal)', fontWeight: '600' }}>
                              {produto}
                            </td>
                            <td style={{ padding: '12px 14px', textAlign: 'center', color: 'var(--cor-texto-principal)', fontWeight: '700' }}>
                              <span style={{ background: 'var(--cor-fundo-sutil-forte)', padding: '3px 10px', borderRadius: '4px', fontSize: '0.82rem', border: '1px solid var(--cor-borda-cartao)' }}>
                                {qtd}
                              </span>
                            </td>
                            <td style={{ padding: '12px 14px', textAlign: 'right', color: 'var(--cor-texto-secundario)', fontWeight: '600' }}>
                              {precoUnit}
                            </td>
                            <td style={{ padding: '12px 14px', textAlign: 'center', color: 'var(--cor-texto-secundario)', fontSize: '0.82rem', fontWeight: '500' }}>
                              {prazo}
                            </td>
                            <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: '800', color: 'var(--cor-sucesso)', fontSize: '0.98rem' }}>
                              {valorTotal}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Tabela de Impressão (Padrão Omie) */}
                <div className="printOnlyTable" style={{ display: 'none' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead style={{ background: '#eee' }}>
                      <tr>
                        <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #aaa' }}>Fornecedor</th>
                        <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #aaa' }}>Produto</th>
                        <th style={{ padding: '10px', textAlign: 'center', border: '1px solid #aaa' }}>Qtd</th>
                        <th style={{ padding: '10px', textAlign: 'right', border: '1px solid #aaa' }}>R$ Unit</th>
                        <th style={{ padding: '10px', textAlign: 'center', border: '1px solid #aaa' }}>Prazo</th>
                        <th style={{ padding: '10px', textAlign: 'right', border: '1px solid #aaa' }}>R$ Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cenarioDetalhe.detalhes.split('\n').filter(line => line.trim()).map((line, idx) => {
                        const colunas = line.split('|').map(c => c.trim());
                        if (colunas.length < 5) {
                          return (
                            <tr key={idx}>
                              <td colSpan={6} style={{ padding: '10px', border: '1px solid #aaa' }}>
                                {line.replace(/^-\s*/, '')}
                              </td>
                            </tr>
                          );
                        }
                        return (
                          <tr key={idx}>
                            <td style={{ padding: '10px', border: '1px solid #aaa', fontWeight: 'bold' }}>{colunas[0]}</td>
                            <td style={{ padding: '10px', border: '1px solid #aaa' }}>{colunas[1]}</td>
                            <td style={{ padding: '10px', border: '1px solid #aaa', textAlign: 'center' }}>{colunas[2]}</td>
                            <td style={{ padding: '10px', border: '1px solid #aaa', textAlign: 'right' }}>{colunas[3]}</td>
                            <td style={{ padding: '10px', border: '1px solid #aaa', textAlign: 'center' }}>{colunas[5] || '-'}</td>
                            <td style={{ padding: '10px', border: '1px solid #aaa', textAlign: 'right', fontWeight: 'bold' }}>{colunas[4]}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Footer que aparece apenas na impressão */}
              <div className={styles.printFooterOnly} style={{ display: 'none', marginTop: '30px' }}>
                <h2 style={{ fontSize: '14px', marginBottom: '10px', color: '#000', textTransform: 'uppercase' }}>Outras Informações</h2>
                <div style={{ lineHeight: '1.6', fontSize: '11px', color: '#000' }}>
                  <strong>Categoria:</strong> {req?.categoriaCompra || 'Compra de Material Para Uso e Consumo'}<br />
                  <strong>Carta de Cotação - incluído em:</strong> {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}<br />
                </div>
                <div style={{ textAlign: 'center', marginTop: '60px', fontSize: '10px', color: '#666' }}>
                  Gerado em {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')} pelo Sistema Almoxarifado<br />
                  Página 1 de 1
                </div>
              </div>

            </div>

            <div style={{ padding: '12px 30px', background: 'var(--cor-fundo-secundario)', borderTop: '1px solid var(--cor-borda-cartao)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>

              <button
                onClick={handlePrint}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--cor-fundo-cartao)', color: 'var(--cor-texto-principal)', border: '1px solid var(--cor-borda-cartao)', padding: '8px 18px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.9rem', transition: 'all 0.2s' }}
                onMouseOver={e => e.currentTarget.style.background = 'var(--cor-fundo-sutil)'} onMouseOut={e => e.currentTarget.style.background = 'var(--cor-fundo-cartao)'}
              >
                <Printer size={18} /> Imprimir Cotação
              </button>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => setCenarioDetalhe(null)}
                  style={{ background: 'transparent', color: 'var(--cor-texto-secundario)', border: 'none', padding: '8px 18px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.9rem' }}
                >
                  Fechar
                </button>
                <button
                  onClick={salvarCotacaoNoArquivo}
                  disabled={salvandoArquivo}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--cor-destaque)', color: 'var(--cor-texto-inverso)', border: 'none', padding: '8px 18px', borderRadius: '6px', fontWeight: 'bold', cursor: salvandoArquivo ? 'not-allowed' : 'pointer', fontSize: '0.9rem', transition: 'all 0.2s', opacity: salvandoArquivo ? 0.6 : 1 }}
                  onMouseOver={e => !salvandoArquivo && (e.currentTarget.style.filter = 'brightness(1.1)')} 
                  onMouseOut={e => !salvandoArquivo && (e.currentTarget.style.filter = 'brightness(1)')}
                >
                  <Check size={18} /> {salvandoArquivo ? 'Salvando...' : 'Salvar no Arquivo'}
                </button>
                <button
                  onClick={() => {
                    alert('As peças deste cenário foram selecionadas. Vá até a tabela e clique em "Gerar Pedido" para concluir na Omie.');
                    setCenarioDetalhe(null);
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--cor-sucesso)', color: 'var(--cor-texto-inverso)', border: 'none', padding: '8px 18px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.9rem', transition: 'all 0.2s' }}
                  onMouseOver={e => e.currentTarget.style.opacity = '0.9'} onMouseOut={e => e.currentTarget.style.opacity = '1'}
                >
                  <Check size={18} /> Salvar / Selecionar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatConsultorGlobal;
