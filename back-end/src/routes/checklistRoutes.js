import express from 'express';
import getDb from '../config/database.js';

const router = express.Router();

function dbRowToChecklist(row) {
  if (!row) return null;
  let dados = {};
  try { dados = JSON.parse(row.dados_json || '{}'); } catch (e) {}
  
  return {
    id: row.id,
    dataCriacao: row.data_criacao,
    formData: dados.formData || {},
    items: dados.items || {}
  };
}

// GET: Retorna todos os checklists cadastrados
router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    const rows = await db.all(`SELECT * FROM checklists_veiculos ORDER BY data_criacao DESC`);
    res.json(rows.map(dbRowToChecklist));
  } catch (error) {
    res.status(500).json({ message: 'Erro ao ler checklists', error: error.message });
  }
});

// POST: Cadastra novo checklist
router.post('/', async (req, res) => {
  try {
    const db = await getDb();
    const id = Date.now().toString();
    const { formData, items } = req.body;

    const dataHora = (formData && formData.data && formData.hora) 
      ? `${formData.data} ${formData.hora}` 
      : null;

    const dadosJson = JSON.stringify({ formData, items });

    await db.run(
      `INSERT INTO checklists_veiculos (id, placa, modelo, condutor_nome, data_hora, dados_json)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        id,
        formData?.placa || null,
        formData?.modelo || null,
        formData?.condutorNome || null,
        dataHora,
        dadosJson
      ]
    );

    // O Frontend espera o formato reconstruído
    const novoChecklist = {
      id,
      dataCriacao: new Date().toISOString(),
      formData,
      items
    };

    res.status(201).json({ message: 'Check-list salvo com sucesso', checklist: novoChecklist });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao salvar check-list', error: error.message });
  }
});

// DELETE: Remove um checklist por ID
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = await getDb();
    
    await db.run(`DELETE FROM checklists_veiculos WHERE id = ?`, [id]);
    res.json({ message: 'Check-list removido com sucesso' });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao deletar check-list', error: error.message });
  }
});

export default router;
