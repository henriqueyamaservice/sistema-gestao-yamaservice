import express from 'express';
import fs from 'fs/promises';
import path from 'path';

const router = express.Router();
const geradoresPath = path.resolve(process.cwd(), 'data', 'geradores.json');

// Helper para ler o arquivo com segurança
const lerGeradores = async () => {
  try {
    const data = await fs.readFile(geradoresPath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
};

// GET: Retorna todos os geradores cadastrados
router.get('/', async (req, res) => {
  try {
    const geradores = await lerGeradores();
    res.json(geradores);
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

    let geradores = await lerGeradores();
    
    // Se não tiver ID passado, procura se a granja já tem gerador
    // Assumimos 1 gerador principal por granja para simplificar
    const index = geradores.findIndex(g => g.id === id || g.granja === granja);
    
    const geradorData = {
      id: index !== -1 ? geradores[index].id : Date.now().toString(),
      granja,
      marca,
      horimetroAtual: parseFloat(horimetroAtual) || 0,
      horimetroInicial: index !== -1 ? geradores[index].horimetroInicial : (parseFloat(horimetroAtual) || 0),
      ...outrosCampos,
      ultimaAtualizacao: new Date().toISOString()
    };

    if (index !== -1) {
      geradores[index] = { ...geradores[index], ...geradorData };
    } else {
      geradores.push(geradorData);
    }

    await fs.writeFile(geradoresPath, JSON.stringify(geradores, null, 2), 'utf-8');
    res.json({ message: 'Gerador salvo com sucesso', gerador: geradorData });

  } catch (error) {
    res.status(500).json({ message: 'Erro ao salvar gerador', error: error.message });
  }
});

// DELETE: Remove um gerador
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let geradores = await lerGeradores();
    
    const novaLista = geradores.filter(g => g.id !== id);
    
    if (novaLista.length === geradores.length) {
      return res.status(404).json({ message: 'Gerador não encontrado' });
    }

    await fs.writeFile(geradoresPath, JSON.stringify(novaLista, null, 2), 'utf-8');
    res.json({ message: 'Gerador removido com sucesso' });

  } catch (error) {
    res.status(500).json({ message: 'Erro ao remover gerador', error: error.message });
  }
});

export default router;
