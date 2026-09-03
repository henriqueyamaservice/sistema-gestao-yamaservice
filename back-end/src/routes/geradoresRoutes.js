import express from 'express';
import getDb from '../config/database.js';

const router = express.Router();

function dbRowToGerador(row) {
  if (!row) return null;
  let dados = {};
  try { dados = JSON.parse(row.dados_json || '{}'); } catch (e) {}
  return {
    id: row.id,
    codigo: row.codigo,
    granja: row.nome,
    localizacao: row.localizacao,
    status: row.status,
    ...dados
  };
}

// GET: Retorna todos os geradores cadastrados
router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    const rows = await db.all(`SELECT * FROM frota_geradores ORDER BY nome ASC`);
    res.json(rows.map(dbRowToGerador));
  } catch (error) {
    res.status(500).json({ message: 'Erro ao ler geradores', error: error.message });
  }
});

// POST: Cadastra ou atualiza um gerador
router.post('/', async (req, res) => {
  try {
    const { id, granja, marca, horimetroAtual, ...outrosCampos } = req.body;

    if (!granja) {
      return res.status(400).json({ message: 'A granja associada é obrigatória' });
    }

    const db = await getDb();
    let row = null;
    
    if (id) {
      row = await db.get(`SELECT * FROM frota_geradores WHERE id = ?`, [id]);
    }
    if (!row) {
      row = await db.get(`SELECT * FROM frota_geradores WHERE nome = ?`, [granja]);
    }
    
    const geradorId = row ? row.id : Date.now().toString();
    
    let dados = {};
    if (row) {
      try { dados = JSON.parse(row.dados_json || '{}'); } catch(e){}
    }
    
    dados = {
      ...dados,
      ...outrosCampos,
      ultimaAtualizacao: new Date().toISOString()
    };
    
    if (marca !== undefined) dados.marca = marca;
    
    if (horimetroAtual !== undefined && horimetroAtual !== null && horimetroAtual !== '') {
      dados.horimetroAtual = parseFloat(horimetroAtual) || 0;
      dados.horimetroInicial = row ? (dados.horimetroInicial || dados.horimetroAtual) : dados.horimetroAtual;
    }

    if (row) {
      await db.run(
        `UPDATE frota_geradores SET nome = ?, dados_json = ? WHERE id = ?`,
        [granja, JSON.stringify(dados), geradorId]
      );
    } else {
      await db.run(
        `INSERT INTO frota_geradores (id, codigo, nome, dados_json) VALUES (?, ?, ?, ?)`,
        [geradorId, granja, granja, JSON.stringify(dados)]
      );
    }

    res.json({ message: 'Gerador salvo com sucesso', gerador: { id: geradorId, granja, ...dados } });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao salvar gerador', error: error.message });
  }
});

// DELETE: Remove um gerador
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = await getDb();
    
    await db.run(`DELETE FROM frota_geradores WHERE id = ?`, [id]);
    res.json({ message: 'Gerador removido com sucesso' });

  } catch (error) {
    res.status(500).json({ message: 'Erro ao remover gerador', error: error.message });
  }
});

// ==========================================
// HISTÓRICO DE REVISÕES
// ==========================================

// GET: Retorna o histórico de revisões de um gerador
router.get('/:id/revisoes', async (req, res) => {
  try {
    const { id } = req.params;
    const db = await getDb();
    
    const rows = await db.all(
      `SELECT * FROM historico_revisoes_geradores WHERE gerador_id = ? ORDER BY data_revisao DESC`,
      [id]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar histórico de revisões', error: error.message });
  }
});

// POST: Registra uma nova revisão (e atualiza o gerador)
router.post('/revisoes', async (req, res) => {
  try {
    const { gerador_id, data_revisao, horimetro, litros_oleo, litros_borra, observacoes } = req.body;
    
    if (!gerador_id || !data_revisao) {
      return res.status(400).json({ message: 'O ID do gerador e a data da revisão são obrigatórios' });
    }

    const db = await getDb();
    const id = Date.now().toString();

    // 1. Salva no histórico
    await db.run(
      `INSERT INTO historico_revisoes_geradores 
       (id, gerador_id, data_revisao, horimetro, litros_oleo, litros_borra, observacoes) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, gerador_id, data_revisao, parseFloat(horimetro) || 0, parseFloat(litros_oleo) || 0, parseFloat(litros_borra) || 0, observacoes || '']
    );

    // 2. Atualiza a 'Última Revisão' no gerador
    const row = await db.get(`SELECT * FROM frota_geradores WHERE id = ?`, [gerador_id]);
    if (row) {
      let dados = {};
      try { dados = JSON.parse(row.dados_json || '{}'); } catch(e){}
      
      dados.dataUltimaRevisao = data_revisao;
      if (horimetro) {
        dados.horimetroUltimaRevisao = parseFloat(horimetro);
        // Atualiza o atual também se a revisão for mais recente
        dados.horimetroAtual = parseFloat(horimetro);
      }
      
      await db.run(`UPDATE frota_geradores SET dados_json = ? WHERE id = ?`, [JSON.stringify(dados), gerador_id]);
    }

    res.status(201).json({ message: 'Revisão registrada com sucesso', id });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao registrar revisão', error: error.message });
  }
});

export default router;
