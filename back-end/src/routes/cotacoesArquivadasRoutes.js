import express from 'express';
import { getDb } from '../config/database.js';

const router = express.Router();

// POST /api/cotacoes-arquivadas - Salva uma cotação no arquivo
router.post('/', async (req, res) => {
  try {
    const {
      requisicao_id,
      fornecedor_id,
      fornecedor_nome,
      tipo_arquivamento,
      dados_json,
      texto_original_pdf,
      usuario_salvamento
    } = req.body;

    if (!requisicao_id || !fornecedor_id || !dados_json) {
      return res.status(400).json({ error: 'Campos obrigatórios ausentes: requisicao_id, fornecedor_id ou dados_json' });
    }

    const db = await getDb();
    
    // Para simplificar a compatibilidade (MariaDB suporta insert via ? com JSON)
    const insertQuery = `
      INSERT INTO cotacoes_arquivadas 
      (requisicao_id, fornecedor_id, fornecedor_nome, tipo_arquivamento, dados_json, texto_original_pdf, usuario_salvamento)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    await db.run(insertQuery, [
      String(requisicao_id),
      String(fornecedor_id),
      fornecedor_nome || '',
      tipo_arquivamento || 'SALVO_USUARIO',
      JSON.stringify(dados_json),
      texto_original_pdf || '',
      usuario_salvamento || 'sistema'
    ]);

    res.status(201).json({ message: 'Cotação arquivada com sucesso!' });
  } catch (error) {
    console.error('Erro ao arquivar cotação:', error);
    res.status(500).json({ error: 'Erro ao arquivar cotação.' });
  }
});

// GET /api/cotacoes-arquivadas - Lista todas as cotações arquivadas
router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    
    // Traz ordenado das mais recentes para as mais antigas
    const rows = await db.all(`SELECT * FROM cotacoes_arquivadas ORDER BY criado_em DESC`);
    
    // Faz o parse do JSON antes de mandar para o frontend
    const cotacoes = rows.map(r => ({
      ...r,
      dados_json: r.dados_json ? JSON.parse(r.dados_json) : null
    }));

    res.status(200).json(cotacoes);
  } catch (error) {
    console.error('Erro ao buscar cotações arquivadas:', error);
    res.status(500).json({ error: 'Erro ao buscar cotações arquivadas.' });
  }
});

// DELETE /api/cotacoes-arquivadas/:id - Remove uma cotação arquivada
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = await getDb();
    
    await db.run(`DELETE FROM cotacoes_arquivadas WHERE id = ?`, [id]);
    
    res.status(200).json({ message: 'Cotação removida com sucesso!' });
  } catch (error) {
    console.error('Erro ao remover cotação arquivada:', error);
    res.status(500).json({ error: 'Erro ao remover cotação arquivada.' });
  }
});

export default router;
