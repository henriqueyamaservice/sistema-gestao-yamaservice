import dotenv from 'dotenv';
import { PDFParse } from 'pdf-parse';

dotenv.config();

export const extrairPrecosDeDocumento = async (buffer, tipo, mimetype) => {
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
    const promptTexto = `Você é um assistente de compras especialista em extrair dados de orçamentos, cotações e notas fiscais.
    Retorne APENAS um JSON válido contendo um array de objetos chamado 'itens'.
    Cada objeto deve ter:
    - "descricao": string (nome da peça ou produto)
    - "valorUnitario": número float (preço unitário ofertado, sem R$ ou formatação)
    - "marca": string (marca ou fabricante do produto). ATENÇÃO OBRIGATÓRIA: Identifique a marca com alta precisão! Mesmo que o documento não possua uma coluna própria de "Marca", EXTRAIA A MARCA OU FABRICANTE que estiver contida no nome/descrição da peça ou no contexto do item (por exemplo: MANN, BOSCH, TECFIL, MAHLE, FRAM, WEG, DONALDSON, VALEO, DELPHI, COFAP, SKF, NAKATA, FRAS-LE, LONAFLEX, SACHS, LUK, GATES, CONTINENTAL, DAYCO, URBA, VOX, MOBIL, LUBRAX, IPIRANGA, SHELL, CASTROL, WURTH, 3M, etc.). Se não houver menção de marca nem no texto nem no nome, tente inferir pelo código do fabricante (ex: W68/80 é MANN, WK940/7 é MANN) ou use a marca do item se identificável.
    - "previsaoDias": número inteiro (prazo de entrega em dias úteis ou corridos se houver, senão nulo)
    - "quantidade": número float ou inteiro`;

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

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${process.env.GEMINI_API_KEY}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: parts }],
        generationConfig: { responseMimeType: "application/json" }
      })
    });

    if (!response.ok) {
      const errTxt = await response.text();
      throw new Error(`Erro na API do Gemini HTTP: ${response.status} - ${errTxt}`);
    }

    const jsonRes = await response.json();
    const respostaString = jsonRes.candidates[0].content.parts[0].text;
    const jsonConvertido = JSON.parse(respostaString);
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

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${process.env.GEMINI_API_KEY}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: contents })
    });

    if (!response.ok) {
      const errTxt = await response.text();
      throw new Error(`HTTP: ${response.status} - ${errTxt}`);
    }

    const jsonRes = await response.json();
    return jsonRes.candidates[0].content.parts[0].text;
  } catch (erro) {
    console.error("[OpenAI Service] Erro no Chat Global:", erro);
    throw erro;
  }
};
