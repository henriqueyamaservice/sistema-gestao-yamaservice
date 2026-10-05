import express from 'express';
import multer from 'multer';
import { extrairPrecosDeDocumento } from '../services/openaiService.js';

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

// Nova Rota para Texto Cru (Copiado pelo usuário)
router.post('/texto', async (req, res) => {
  try {
    const { texto, fornId, reqId } = req.body;
    
    if (!texto || texto.trim() === '') {
      return res.status(400).json({ erro: "Nenhum texto fornecido." });
    }

    console.log(`[IA Orçamento] Processando texto cru colado pelo usuário (Forn ID: ${fornId})...`);
    
    // Podemos reaproveitar a função existente, passando o texto simulando ser um "pdf"
    // Mas vamos precisar ajustar o extrairPrecosDeDocumento para aceitar texto direto.
    // Vamos fazer o seguinte: o texto cru pode ir como buffer:
    const bufferFake = Buffer.from(texto, 'utf-8');
    const jsonExtraido = await extrairPrecosDeDocumento(bufferFake, 'pdf_texto_cru');

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
