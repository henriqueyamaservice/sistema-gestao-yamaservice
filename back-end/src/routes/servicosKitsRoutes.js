import express from 'express';
import getDb from '../config/database.js';

const router = express.Router();

// GET: Retorna todos os kits de serviços cadastrados (agora da tabela nativa)
router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    const rows = await db.all(`SELECT * FROM servicos_kits ORDER BY criado_em DESC`);
    
    const kits = rows.map(row => {
      let dadosJson = {};
      try {
        dadosJson = JSON.parse(row.dados_json || '{}');
      } catch (e) {
        console.error('Erro ao fazer parse de dados_json do kit:', row.id);
      }
      return {
        id: row.id,
        nome: row.nome,
        areaManutencao: row.area_manutencao,
        categoria: row.categoria,
        criadoEm: row.criado_em,
        atualizadoEm: row.atualizado_em,
        ...dadosJson
      };
    });

    res.json(kits);
  } catch (error) {
    console.error('Erro ao ler kits de serviços:', error);
    res.status(500).json({ message: 'Erro ao carregar kits de serviços', error: error.message });
  }
});

// POST: Cria um novo kit ou atualiza um existente
router.post('/', async (req, res) => {
  try {
    const kitData = req.body;
    if (!kitData.nome || !kitData.nome.trim()) {
      return res.status(400).json({ message: 'O nome do serviço/kit é obrigatório' });
    }

    const db = await getDb();
    const now = new Date().toISOString().slice(0, 19).replace('T', ' '); // YYYY-MM-DD HH:MM:SS
    const id = kitData.id || ('kit_' + Date.now().toString() + '_' + Math.floor(Math.random() * 1000).toString());
    const area = kitData.areaManutencao || 'MECANICA';
    const categoria = kitData.categoria || 'GERAL';
    
    // Filtramos os campos que já são colunas nativas para não duplicar no JSON
    const { id: _, nome: __, areaManutencao: ___, categoria: ____, criadoEm: _____, atualizadoEm: ______, ...dadosRestantes } = kitData;
    const kitJson = JSON.stringify(dadosRestantes);

    if (db.driver === 'mysql') {
      await db.run(
        `INSERT INTO servicos_kits (id, nome, area_manutencao, categoria, dados_json, criado_em, atualizado_em)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE 
         nome=VALUES(nome), area_manutencao=VALUES(area_manutencao), categoria=VALUES(categoria), dados_json=VALUES(dados_json)`,
        [id, kitData.nome, area, categoria, kitJson, now, now]
      );
    } else {
      await db.run(
        `INSERT INTO servicos_kits (id, nome, area_manutencao, categoria, dados_json, criado_em, atualizado_em)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET 
         nome=excluded.nome, area_manutencao=excluded.area_manutencao, categoria=excluded.categoria, dados_json=excluded.dados_json, atualizado_em=CURRENT_TIMESTAMP`,
        [id, kitData.nome, area, categoria, kitJson, now, now]
      );
    }

    // Para retornar atualizado
    const rows = await db.all(`SELECT * FROM servicos_kits ORDER BY criado_em DESC`);
    const kits = rows.map(r => ({ id: r.id, nome: r.nome, areaManutencao: r.area_manutencao, categoria: r.categoria, ...JSON.parse(r.dados_json || '{}') }));

    res.status(201).json({ message: 'Kit de serviço salvo com sucesso', kit: kitData, kits });
  } catch (error) {
    console.error('Erro ao salvar kit de serviço:', error);
    res.status(500).json({ message: 'Erro ao salvar kit de serviço', error: error.message });
  }
});

// PUT: Atualiza um kit específico pelo ID
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const kitAtualizado = req.body;
    const db = await getDb();

    const area = kitAtualizado.areaManutencao || 'MECANICA';
    const categoria = kitAtualizado.categoria || 'GERAL';
    
    const { id: _, nome: __, areaManutencao: ___, categoria: ____, criadoEm: _____, atualizadoEm: ______, ...dadosRestantes } = kitAtualizado;
    const kitJson = JSON.stringify(dadosRestantes);

    const result = await db.run(
      `UPDATE servicos_kits SET nome = ?, area_manutencao = ?, categoria = ?, dados_json = ? WHERE id = ?`,
      [kitAtualizado.nome, area, categoria, kitJson, id]
    );

    // Retorna todos para atualizar a lista do frontend
    const rows = await db.all(`SELECT * FROM servicos_kits ORDER BY criado_em DESC`);
    const kits = rows.map(r => ({ id: r.id, nome: r.nome, areaManutencao: r.area_manutencao, categoria: r.categoria, ...JSON.parse(r.dados_json || '{}') }));

    res.json({ message: 'Kit atualizado com sucesso', kit: kitAtualizado, kits });
  } catch (error) {
    console.error('Erro ao atualizar kit de serviço:', error);
    res.status(500).json({ message: 'Erro ao atualizar kit de serviço', error: error.message });
  }
});

// DELETE: Remove um kit pelo ID
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = await getDb();
    
    await db.run(`DELETE FROM servicos_kits WHERE id = ?`, [id]);

    const rows = await db.all(`SELECT * FROM servicos_kits ORDER BY criado_em DESC`);
    const kits = rows.map(r => ({ id: r.id, nome: r.nome, areaManutencao: r.area_manutencao, categoria: r.categoria, ...JSON.parse(r.dados_json || '{}') }));

    res.json({ message: 'Kit de serviço removido com sucesso', id, kits });
  } catch (error) {
    console.error('Erro ao excluir kit de serviço:', error);
    res.status(500).json({ message: 'Erro ao excluir kit de serviço', error: error.message });
  }
});

export default router;
