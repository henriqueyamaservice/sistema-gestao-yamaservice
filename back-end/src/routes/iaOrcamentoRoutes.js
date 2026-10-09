import express from 'express';
import multer from 'multer';
import { extrairPrecosDeDocumento, transcreverPdfComIA } from '../services/openaiService.js';
import { PDFParse } from 'pdf-parse';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Rota para upload e leitura de PDF/Imagem via IA
router.post('/upload', upload.single('documento'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ erro: 'Nenhum arquivo enviado.' });
    }
    const { tipoDocumento } = req.body; // 'pdf' ou 'imagem'

    console.log(`[IA Orçamento] Processando documento ${tipoDocumento} (${req.file.originalname}) via Memória...`);
    
    // Chama o serviço do Gemini repassando o buffer diretamente
    const jsonExtraido = await extrairPrecosDeDocumento(req.file.buffer, tipoDocumento, req.file.mimetype);
    
    // Devolve o JSON pro frontend
    res.json({
      sucesso: true,
      mensagem: "Dados extraídos com sucesso pela IA.",
      dados: jsonExtraido
    });
  } catch (erro) {
    console.error('[IA Orçamento] Erro ao processar documento:', erro);
    res.status(500).json({ erro: 'Erro interno ao processar documento com IA.', detalhes: erro.message });
  }
});

// Nova Rota para extrair Apenas o Texto do PDF (Sem chamar IA)
router.post('/extrair-texto-pdf', upload.single('documento'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ erro: 'Nenhum arquivo enviado.' });
    }

    console.log(`[IA Orçamento] Extraindo texto do PDF (${req.file.originalname}) localmente...`);
    
    let textoExtraido = '';
    try {
      // Usar a mesma lógica de parsing que estava no openaiService
      const parser = new PDFParse({ data: req.file.buffer });
      const result = await parser.getText();
      await parser.destroy();
      textoExtraido = result.text;
    } catch (parseError) {
      // Fallback para importação padrão do pdf-parse caso a de cima falhe em alguma versão
      const pdf = (await import('pdf-parse')).default;
      const result = await pdf(req.file.buffer);
      textoExtraido = result.text;
    }

    // PDF escaneado/imagem: sem texto útil (só marcadores "-- 1 of 1 --"). Usa OCR via Gemini.
    const textoLimpo = (textoExtraido || '').replace(/--\s*\d+\s*of\s*\d+\s*--/g, '').trim();
    if (textoLimpo.length < 30) {
      console.log('[IA Orçamento] PDF sem camada de texto. Aplicando OCR via Gemini...');
      textoExtraido = await transcreverPdfComIA(req.file.buffer);
      console.log('[IA Orçamento] Texto obtido via OCR:\n' + textoExtraido);
    }

    res.json({
      sucesso: true,
      texto: textoExtraido
    });
  } catch (erro) {
    console.error('[IA Orçamento] Erro ao extrair texto do PDF:', erro);
    res.status(500).json({ erro: 'Erro ao ler o arquivo PDF.', detalhes: erro.message });
  }
});

// Nova Rota para Texto Cru (Copiado pelo usuário)
router.post('/texto', async (req, res) => {
  try {
    const { texto, fornId, reqId, itensRequisicao } = req.body;
    
    if (!texto || texto.trim() === '') {
      return res.status(400).json({ erro: "Nenhum texto fornecido." });
    }

    console.log(`[IA Orçamento] Processando texto cru colado pelo usuário (Forn ID: ${fornId})...`);
    
    // Podemos reaproveitar a função existente, passando o texto simulando ser um "pdf"
    // Mas vamos precisar ajustar o extrairPrecosDeDocumento para aceitar texto direto.
    // Vamos fazer o seguinte: o texto cru pode ir como buffer:
    const bufferFake = Buffer.from(texto, 'utf-8');
    console.log('[IA Orçamento] Itens da requisição enviados:', JSON.stringify(itensRequisicao));
    console.log('[IA Orçamento] TEXTO DO PDF ENVIADO À IA:\n' + texto);
    const jsonExtraido = await extrairPrecosDeDocumento(bufferFake, 'pdf_texto_cru', undefined, itensRequisicao);
    const { textoOriginalExtraido, ...jsonSemTexto } = jsonExtraido || {};
    console.log('[IA Orçamento] RESPOSTA DA IA:\n' + JSON.stringify(jsonSemTexto, null, 2));

    res.json({
      sucesso: true,
      mensagem: "Dados extraídos com sucesso pela IA.",
      dados: jsonExtraido
    });
  } catch (erro) {
    console.error("[IA Orçamento] Erro ao processar texto:", erro);
    res.status(500).json({ erro: 'Erro interno ao processar texto com IA.', detalhes: erro.message });
  }
});

// Nova Rota para Chat Global do Consultor IA
router.post('/chat-global', async (req, res) => {
  try {
    const { contexto, historico } = req.body;
    
    // Chama a IA (vamos criar uma função no openaiService para isso)
    const { conversarComIAGlobal } = await import('../services/openaiService.js');
    const respostaIA = await conversarComIAGlobal(contexto, historico);

    res.json({
      sucesso: true,
      resposta: respostaIA
    });
  } catch (erro) {
    console.error("[IA Orçamento] Erro no Chat Global:", erro);
    res.status(500).json({ erro: erro.message });
  }
});

export default router;
