import dotenv from 'dotenv';
import { PDFParse } from 'pdf-parse';

dotenv.config();

// Modelos suportados pela API do Gemini com fallback automático
const MODELOS_GEMINI = [
  'gemini-3.5-flash',
  'gemini-flash-latest',
  'gemini-3.8-flash',
  'gemini-3.7-flash'
];

async function chamarGeminiComFallback(payload) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    throw new Error('GEMINI_API_KEY não configurada no arquivo .env! Configure a variável GEMINI_API_KEY no arquivo .env do servidor.');
  }

  let ultimoErro = null;
  for (const modelo of MODELOS_GEMINI) {
    for (let tentativa = 1; tentativa <= 2; tentativa++) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          return await response.json();
        }

        const errTxt = await response.text();
        if (response.status === 503 && tentativa < 2) {
          console.warn(`[Gemini] Modelo ${modelo} ocupado (503). Aguardando 1.5s para tentar novamente...`);
          await new Promise(r => setTimeout(r, 1500));
          continue;
        }

        ultimoErro = new Error(`Erro na API do Gemini (${modelo}) HTTP: ${response.status} - ${errTxt}`);
        console.warn(`[Gemini] Modelo ${modelo} retornou status ${response.status}. Tentando modelo alternativo...`);
        break;
      } catch (err) {
        ultimoErro = err;
        console.warn(`[Gemini] Falha de conexão no modelo ${modelo}: ${err.message}. Tentando próximo...`);
        break;
      }
    }
  }

  throw ultimoErro || new Error('Todos os modelos do Gemini falharam.');
}

// OCR: usa o Gemini para ler PDFs escaneados/imagem (sem camada de texto)
export const transcreverPdfComIA = async (buffer) => {
  const payload = {
    contents: [{
      parts: [
        { text: 'Transcreva TODO o texto deste documento (cotação de fornecedor) exatamente como aparece, preservando cabeçalho, CNPJ, e cada linha da tabela de itens (código, descrição, quantidade, valor unitário, valor total) com colunas separadas por " | ". Prazo de entrega e condições também. Retorne apenas o texto transcrito.' },
        { inlineData: { mimeType: 'application/pdf', data: buffer.toString('base64') } }
      ]
    }]
  };
  const json = await chamarGeminiComFallback(payload);
  return json.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('\n') || '';
};


export const extrairPrecosDeDocumento = async (buffer, tipo, mimetype, itensRequisicao = []) => {
  try {
    // 1. Extrair o conteúdo do buffer
    let conteudoParaGPT = "";

    if (tipo === 'pdf') {
      const parser = new PDFParse({ data: buffer });
      const result = await parser.getText();
      await parser.destroy();
      conteudoParaGPT = result.text;
    } else if (tipo === 'pdf_texto_cru') {
      conteudoParaGPT = buffer.toString('utf-8');
    } else if (tipo === 'imagem') {
      // O buffer já vem como imagem, vamos converter para base64 diretamente
      const base64Image = buffer.toString('base64');
      conteudoParaGPT = `data:${mimetype || 'image/jpeg'};base64,${base64Image}`;
    }

    // 2. Chamar a API do Gemini via Fetch (HTTP cru, sem frescuras de pacote)
    let promptTexto = `Papel: Você é um assistente especialista em extração de dados de documentos fiscais e cotações comerciais para o setor de compras da YamaService.

    Objetivo: Analise o texto do documento (cotação enviada pelo fornecedor) e extraia os itens, valores e prazos exatamente no formato JSON especificado abaixo, sem adicionar textos explicativos fora do JSON.

    Regras de Extração:
    - Identifique o Nome ou CNPJ do Fornecedor no cabeçalho do documento.
    - Para cada produto listado, capture o código ou descrição exata do item, a quantidade cotada, o valor unitário (em Reais, apenas números com ponto decimal) e o valor total do item.
    - Identifique o Prazo de Entrega (em dias) informado na cotação. Se for "IMEDIATO" ou "PRONTA ENTREGA", assuma 0 (zero) dias. Se não houver, assuma o padrão de 2 dias.
    - O texto pode estar com colunas embaralhadas (extração de tabela). Reconstrua cada linha de item cruzando código, quantidade, valor unitário e total (total = unitário x quantidade) e NUNCA retorne 'itens' vazio se houver produtos no documento.

    Formato de saída (APENAS JSON válido):
    {
      "fornecedor": string (nome ou CNPJ),
      "prazoEntregaDias": número inteiro,
      "itens": [ ...objetos abaixo... ]
    }

    Cada objeto de 'itens' deve ter:
    - "codigo": string (código do item, se houver, senão null)
    - "descricao": string (nome da peça ou produto, exatamente como no documento)
    - "valorUnitario": número float (preço unitário ofertado, sem R$ ou formatação. Se o documento mostrar apenas o Valor Total e a Quantidade, calcule: Valor Total / Quantidade)
    - "valorTotal": número float (valor total do item)
    - "marca": string (marca ou fabricante do produto). ATENÇÃO OBRIGATÓRIA: Identifique a marca com alta precisão! Mesmo que o documento não possua uma coluna própria de "Marca", EXTRAIA A MARCA OU FABRICANTE que estiver contida no nome/descrição da peça ou no contexto do item (por exemplo: MANN, BOSCH, TECFIL, MAHLE, FRAM, WEG, DONALDSON, VALEO, DELPHI, COFAP, SKF, NAKATA, FRAS-LE, LONAFLEX, SACHS, LUK, GATES, CONTINENTAL, DAYCO, URBA, VOX, MOBIL, LUBRAX, IPIRANGA, SHELL, CASTROL, WURTH, 3M, etc.). Se não houver menção de marca nem no texto nem no nome, tente inferir pelo código do fabricante (ex: W68/80 é MANN, WK940/7 é MANN) ou use a marca do item se identificável.
    - "previsaoDias": número inteiro (prazo em dias; imediato = 0; não informado = 2)
    - "quantidade": número float ou inteiro`;

    // Conciliação (De-Para) com os itens da requisição, quando fornecidos
    if (Array.isArray(itensRequisicao) && itensRequisicao.length > 0) {
      const lista = itensRequisicao.map(i => `- codigo: ${i.codigo} | descricao: ${i.descricao} | quantidade: ${i.quantidade}`).join('\n');
      promptTexto += `

    CONCILIAÇÃO COM A REQUISIÇÃO (OBRIGATÓRIO):
    Itens que a YamaService requisitou:
    ${lista}

    Para CADA item acima, procure no documento o item correspondente (use correspondência aproximada: "CORREIA A81" = "CORREIA EM V GATES A-81"; "P205 - MANCAL" = "MANCAL P205").
    Em 'itens', retorne um objeto por item requisitado, com:
    - "codigo": o codigo EXATO da requisição (copie da lista acima)
    - "descricao": a descrição EXATA da requisição (copie da lista acima)
    - "descricaoFornecedor": como aparece no documento
    - "confianca": 0 a 100 (certeza do vínculo)
    - "alerta": null, "DIVERGENCIA_QTD" (quantidade cotada diferente da requisitada), "UNIDADE_DIFERENTE" (ex: caixa x unidade) ou "NAO_ENCONTRADO" (valorUnitario 0)
    Se um item da requisição não existir no documento, retorne-o com valorUnitario 0 e alerta NAO_ENCONTRADO. Não invente preços.`;
    }

    let parts = [];
    if (tipo === 'imagem') {
       parts = [
         { text: promptTexto },
         {
           inlineData: {
             mimeType: mimetype || 'image/jpeg',
             data: buffer.toString('base64')
           }
         }
       ];
    } else {
       const conteudoFinal = `${promptTexto}\n\nTexto Extraído do PDF:\n${conteudoParaGPT}`;
       parts = [{ text: conteudoFinal }];
    }

    const payload = {
      contents: [{ parts: parts }],
      generationConfig: { responseMimeType: "application/json" }
    };

    const jsonRes = await chamarGeminiComFallback(payload);
    const respostaString = jsonRes.candidates[0].content.parts[0].text;
    const jsonConvertido = JSON.parse(respostaString);
    if (tipo === 'pdf' || tipo === 'pdf_texto_cru') {
      jsonConvertido.textoOriginalExtraido = conteudoParaGPT;
    }
    return jsonConvertido;
  } catch (erro) {
    console.error('[OpenAI Service] Erro ao extrair dados:', erro);
    throw erro;
  }
};

export const conversarComIAGlobal = async (contexto, historico) => {
  try {
    let contents = [];
    
    // O contexto SEMPRE deve ser inserido para a IA não perder as regras
    if (contexto) {
      contents.push({ role: 'user', parts: [{ text: `[INSTRUÇÕES DO SISTEMA E CONTEXTO]\n${contexto}\n\n[FIM DAS INSTRUÇÕES]` }] });
      // Adicionamos um "OK" do modelo para separar o contexto do histórico real
      contents.push({ role: 'model', parts: [{ text: 'Entendido. Estou pronto para ajudar com base nestas instruções e dados.' }] });
    }

    if (historico && historico.length > 0) {
      const historicoMapeado = historico.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }));
      contents.push(...historicoMapeado);
    } else if (!contexto) {
      // Se não tem contexto nem histórico, não faz sentido, mas previne quebrar
      contents.push({ role: 'user', parts: [{ text: 'Olá' }] });
    }

    const payload = { contents: contents };
    const jsonRes = await chamarGeminiComFallback(payload);
    return jsonRes.candidates[0].content.parts[0].text;
  } catch (erro) {
    console.error("[OpenAI Service] Erro no Chat Global:", erro);
    throw erro;
  }
};
