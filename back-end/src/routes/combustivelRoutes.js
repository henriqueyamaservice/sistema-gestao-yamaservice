import express from 'express';
import fs from 'fs/promises';
import path from 'path';

const router = express.Router();

const getFilePath = () => path.resolve(process.cwd(), 'data', 'controle_combustivel.json');
const getEntradasPath = () => path.resolve(process.cwd(), 'data', 'entradas_combustivel.json');

// Listar todas as requisições de combustível
router.get('/', async (req, res) => {
  try {
    const data = await fs.readFile(getFilePath(), 'utf-8');
    res.json(JSON.parse(data));
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.json([]);
    } else {
      res.status(500).json({ message: 'Erro ao ler dados de combustível', error: error.message });
    }
  }
});

// Listar todas as entradas de combustível
router.get('/entradas', async (req, res) => {
  try {
    const data = await fs.readFile(getEntradasPath(), 'utf-8');
    res.json(JSON.parse(data));
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.json([]);
    } else {
      res.status(500).json({ message: 'Erro ao ler dados de entradas de combustível', error: error.message });
    }
  }
});

// Criar nova Entrada de Combustível
router.post('/entradas', async (req, res) => {
  try {
    let entradas = [];
    try {
      const data = await fs.readFile(getEntradasPath(), 'utf-8');
      entradas = JSON.parse(data);
    } catch (e) {}

    const novaEntrada = {
      id: Date.now().toString(),
      ...req.body
    };

    entradas.push(novaEntrada);
    await fs.writeFile(getEntradasPath(), JSON.stringify(entradas, null, 2), 'utf-8');

    res.status(201).json({ message: 'Entrada cadastrada com sucesso', entrada: novaEntrada });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao salvar entrada de combustível', error: error.message });
  }
});

// Atualizar Entrada de Estoque (ex: forçar Situação)
router.put('/entradas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let entradas = [];
    try {
      const data = await fs.readFile(getEntradasPath(), 'utf-8');
      entradas = JSON.parse(data);
    } catch (e) {
      return res.status(500).json({ message: 'Erro ao ler banco de dados' });
    }

    const index = entradas.findIndex(e => e.id === id);
    if (index === -1) {
      return res.status(404).json({ message: 'Entrada não encontrada' });
    }

    entradas[index] = {
      ...entradas[index],
      ...req.body
    };

    await fs.writeFile(getEntradasPath(), JSON.stringify(entradas, null, 2), 'utf-8');
    res.json({ message: 'Entrada atualizada com sucesso', entrada: entradas[index] });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao atualizar entrada', error: error.message });
  }
});

// Criar nova Requisição
router.post('/requisicao', async (req, res) => {
  try {
    let requisicoes = [];
    try {
      const data = await fs.readFile(getFilePath(), 'utf-8');
      requisicoes = JSON.parse(data);
    } catch (e) {}

    const novaRequisicao = {
      id: Date.now().toString(),
      status: 'EM ANDAMENTO',
      ...req.body
    };

    requisicoes.push(novaRequisicao);
    await fs.writeFile(getFilePath(), JSON.stringify(requisicoes, null, 2), 'utf-8');

    res.status(201).json({ message: 'Requisição cadastrada com sucesso', requisicao: novaRequisicao });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao salvar requisição', error: error.message });
  }
});

// Registrar Abastecimento
router.put('/abastecimento/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    let requisicoes = [];
    try {
      const data = await fs.readFile(getFilePath(), 'utf-8');
      requisicoes = JSON.parse(data);
    } catch (e) {
      return res.status(500).json({ message: 'Erro ao ler banco de dados' });
    }

    let index = requisicoes.findIndex(r => r.id === id);
    if (index === -1) {
      // Fallback retrocompatibilidade: tenta achar pelo numeroRequisicao que NÃO esteja concluído
      index = requisicoes.findIndex(r => r.numeroRequisicao === id && r.status !== 'CONCLUÍDO' && r.status !== 'ABASTECIDA');
    }

    if (index === -1) {
      // Verifica se é porque já estava concluída para dar o aviso
      const concluidaIndex = requisicoes.findIndex(r => r.numeroRequisicao === id && (r.status === 'CONCLUÍDO' || r.status === 'ABASTECIDA'));
      if (concluidaIndex !== -1) {
        return res.status(400).json({ message: 'Esta requisição já foi abastecida' });
      }
      return res.status(404).json({ message: 'Requisição não encontrada' });
    }

    if (requisicoes[index].status === 'CONCLUÍDO' || requisicoes[index].status === 'ABASTECIDA') {
      return res.status(400).json({ message: 'Esta requisição já foi abastecida' });
    }

    requisicoes[index] = {
      ...requisicoes[index],
      ...req.body,
      status: 'CONCLUÍDO'
    };

    await fs.writeFile(getFilePath(), JSON.stringify(requisicoes, null, 2), 'utf-8');

    // === Automação de Frota: Atualiza o KM Atual do Veículo ===
    try {
      if (req.body.km && requisicoes[index].veiculo) {
        const veiculosPath = path.resolve(process.cwd(), 'data', 'veiculos.json');
        let veiculos = [];
        try {
          const vData = await fs.readFile(veiculosPath, 'utf-8');
          veiculos = JSON.parse(vData);
        } catch(e) {}
        
        const placaRef = requisicoes[index].veiculo.trim();
        const vIndex = veiculos.findIndex(v => v.placa === placaRef);
        
        if (vIndex !== -1) {
          const novoKm = parseFloat(req.body.km);
          // Só atualiza se o KM for maior que o já registrado (evita erros de digitação passados)
          if (novoKm > (parseFloat(veiculos[vIndex].kmAtual) || 0)) {
            veiculos[vIndex].kmAtual = novoKm;
            await fs.writeFile(veiculosPath, JSON.stringify(veiculos, null, 2), 'utf-8');
            console.log(`KM Atual do veículo ${placaRef} atualizado para ${novoKm} via Abastecimento.`);
          }
        }
      }
    } catch (err) {
      console.error('Erro ao atualizar KM do veículo via Abastecimento:', err);
    }
    // === Fim da Automação ===

    res.json({ message: 'Abastecimento registrado com sucesso', requisicao: requisicoes[index] });

  } catch (error) {
    res.status(500).json({ message: 'Erro ao registrar abastecimento', error: error.message });
  }
});

export default router;
