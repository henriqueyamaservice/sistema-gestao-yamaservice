import express from 'express';
import getDb from '../config/database.js';

const router = express.Router();

// HELPER: Monta o objeto veículo a partir das colunas + json
function dbRowToVeiculo(row) {
  if (!row) return null;
  let dados = {};
  try { dados = JSON.parse(row.dados_json || '{}'); } catch (e) { /* ignore */ }
  return {
    id: row.id,
    placa: row.placa,
    modelo: row.modelo,
    tipo: row.tipo,
    marca: row.marca,
    ano: row.ano,
    status: row.status,
    ...dados
  };
}

// GET: Retorna as configurações de todos os veículos
router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    const rows = await db.all(`SELECT * FROM frota_veiculos ORDER BY placa ASC`);
    res.json(rows.map(dbRowToVeiculo));
  } catch (error) {
    res.status(500).json({ message: 'Erro ao ler veículos', error: error.message });
  }
});

// POST: Cadastra ou atualiza um veículo (usa a Placa como chave principal para update)
router.post('/', async (req, res) => {
  try {
    const { placa, ...outrosCampos } = req.body;

    if (!placa) {
      return res.status(400).json({ message: 'A placa do veículo é obrigatória' });
    }

    const db = await getDb();
    const placaUpper = placa.toUpperCase().trim();
    const row = await db.get(`SELECT * FROM frota_veiculos WHERE placa = ?`, [placaUpper]);
    
    const veiculoId = row ? row.id : Date.now().toString();
    const dadosJson = JSON.stringify({ ...outrosCampos, ultimaAtualizacao: new Date().toISOString() });
    
    const modelo = outrosCampos.modelo || null;
    const tipo = outrosCampos.tipo || null;
    const marca = outrosCampos.marca || null;
    const ano = outrosCampos.ano || null;
    const status = outrosCampos.status || 'Ativo';

    if (row) {
      await db.run(
        `UPDATE frota_veiculos 
         SET modelo = ?, tipo = ?, marca = ?, ano = ?, status = ?, dados_json = ? 
         WHERE placa = ?`,
        [modelo, tipo, marca, ano, status, dadosJson, placaUpper]
      );
    } else {
      await db.run(
        `INSERT INTO frota_veiculos (id, placa, modelo, tipo, marca, ano, status, dados_json) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [veiculoId, placaUpper, modelo, tipo, marca, ano, status, dadosJson]
      );
    }

    res.json({ message: 'Veículo salvo com sucesso', veiculo: { id: veiculoId, placa: placaUpper, ...outrosCampos } });

  } catch (error) {
    res.status(500).json({ message: 'Erro ao salvar veículo', error: error.message });
  }
});

// DELETE: Remove um veículo do controle de frota
router.delete('/:placa', async (req, res) => {
  try {
    const { placa } = req.params;
    const db = await getDb();
    const placaUpper = placa.toUpperCase().trim();
    
    await db.run(`DELETE FROM frota_veiculos WHERE placa = ?`, [placaUpper]);
    res.json({ message: 'Veículo removido com sucesso' });

  } catch (error) {
    res.status(500).json({ message: 'Erro ao remover veículo', error: error.message });
  }
});

export default router;
