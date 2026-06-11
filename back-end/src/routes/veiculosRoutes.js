import express from 'express';
import fs from 'fs/promises';
import path from 'path';

const router = express.Router();
const veiculosPath = path.resolve(process.cwd(), 'data', 'veiculos.json');

// Helper para ler o arquivo com segurança
const lerVeiculos = async () => {
  try {
    const data = await fs.readFile(veiculosPath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
};

// GET: Retorna as configurações de todos os veículos
router.get('/', async (req, res) => {
  try {
    const veiculos = await lerVeiculos();
    res.json(veiculos);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao ler veículos', error: error.message });
  }
});

// POST: Cadastra ou atualiza um veículo (usa a Placa como chave primária)
router.post('/', async (req, res) => {
  try {
    const { placa, ...outrosCampos } = req.body;

    if (!placa) {
      return res.status(400).json({ message: 'A placa do veículo é obrigatória' });
    }

    const placaUpper = placa.toUpperCase().trim();
    let veiculos = await lerVeiculos();
    
    const index = veiculos.findIndex(v => v.placa === placaUpper);
    
    const veiculoData = {
      id: index !== -1 ? veiculos[index].id : Date.now().toString(),
      placa: placaUpper,
      ...outrosCampos,
      ultimaAtualizacao: new Date().toISOString()
    };

    if (index !== -1) {
      veiculos[index] = { ...veiculos[index], ...veiculoData };
    } else {
      veiculos.push(veiculoData);
    }

    await fs.writeFile(veiculosPath, JSON.stringify(veiculos, null, 2), 'utf-8');
    res.json({ message: 'Veículo salvo com sucesso', veiculo: veiculoData });

  } catch (error) {
    res.status(500).json({ message: 'Erro ao salvar veículo', error: error.message });
  }
});

// DELETE: Remove um veículo do controle de frota
router.delete('/:placa', async (req, res) => {
  try {
    const { placa } = req.params;
    const placaUpper = placa.toUpperCase().trim();
    let veiculos = await lerVeiculos();
    
    const novaLista = veiculos.filter(v => v.placa !== placaUpper);
    
    if (novaLista.length === veiculos.length) {
      return res.status(404).json({ message: 'Veículo não encontrado' });
    }

    await fs.writeFile(veiculosPath, JSON.stringify(novaLista, null, 2), 'utf-8');
    res.json({ message: 'Veículo removido com sucesso' });

  } catch (error) {
    res.status(500).json({ message: 'Erro ao remover veículo', error: error.message });
  }
});

export default router;
