import express from 'express';
import fs from 'fs/promises';
import path from 'path';

const router = express.Router();
const filePath = path.resolve(process.cwd(), 'data', 'dashboard-os', 'calendario_empresa.json');

// Buscar feriados customizados / municipais
router.get('/calendario-empresa', async (req, res) => {
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    res.json(JSON.parse(data));
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.json([]);
    } else {
      res.status(500).json({ message: 'Erro ao ler feriados do calendário', error: error.message });
    }
  }
});

// Salvar / atualizar feriados customizados / municipais
router.post('/calendario-empresa', async (req, res) => {
  try {
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(req.body, null, 2), 'utf-8');
    res.json({ message: 'Feriados salvos com sucesso' });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao salvar feriados do calendário', error: error.message });
  }
});

export default router;
