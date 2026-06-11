import express from 'express';
import fs from 'fs/promises';
import path from 'path';

const router = express.Router();

router.get('/fornecedores', async (req, res) => {
  try {
    const filePath = path.resolve(process.cwd(), 'data', 'fornecedores.json');
    const data = await fs.readFile(filePath, 'utf-8');
    const fornecedores = JSON.parse(data);
    res.json(fornecedores);
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.status(404).json({ message: 'Banco de dados de fornecedores não encontrado. Rode o script de sincronização primeiro.' });
    } else {
      res.status(500).json({ message: 'Erro interno ao ler os fornecedores', error: error.message });
    }
  }
});

router.post('/fornecedores', async (req, res) => {
  try {
    const { razao_social, nome_fantasia, cnpj_cpf } = req.body;
    
    if (!razao_social || !cnpj_cpf) {
      return res.status(400).json({ message: 'Razão social e CNPJ/CPF são obrigatórios' });
    }

    const filePath = path.resolve(process.cwd(), 'data', 'vendedores.json');
    let vendedores = [];
    
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      vendedores = JSON.parse(data);
    } catch (e) {
      // Se não existir, cria vazio
    }

    // Gera um código interno, para garantir que não colida com a Omie que usa Int
    const novoCodigo = Number(`99${Math.floor(Date.now() / 1000)}`);
    
    const novoFornecedor = {
      codigo_cliente_omie: novoCodigo,
      razao_social: razao_social.toUpperCase(),
      nome_fantasia: (nome_fantasia || razao_social).toUpperCase(),
      cnpj_cpf: cnpj_cpf
    };

    vendedores.push(novoFornecedor);
    
    await fs.writeFile(filePath, JSON.stringify(vendedores, null, 2), 'utf-8');
    
    res.status(201).json(novoFornecedor);
    
  } catch (error) {
    res.status(500).json({ message: 'Erro ao salvar o fornecedor', error: error.message });
  }
});

router.get('/vendedores', async (req, res) => {
  try {
    const filePath = path.resolve(process.cwd(), 'data', 'vendedores.json');
    const data = await fs.readFile(filePath, 'utf-8');
    const vendedores = JSON.parse(data);
    res.json(vendedores);
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.status(404).json({ message: 'Banco de dados de vendedores não encontrado. Rode o script de sincronização primeiro.' });
    } else {
      res.status(500).json({ message: 'Erro interno ao ler os vendedores', error: error.message });
    }
  }
});

router.get('/departamentos', async (req, res) => {
  try {
    const filePath = path.resolve(process.cwd(), 'data', 'departamentos.json');
    const data = await fs.readFile(filePath, 'utf-8');
    res.json(JSON.parse(data));
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.status(404).json({ message: 'Banco de dados de departamentos não encontrado. Rode o script de sincronização.' });
    } else {
      res.status(500).json({ message: 'Erro interno', error: error.message });
    }
  }
});

router.get('/locais-estoque', async (req, res) => {
  try {
    const filePath = path.resolve(process.cwd(), 'data', 'locais_estoque.json');
    const data = await fs.readFile(filePath, 'utf-8');
    res.json(JSON.parse(data));
  } catch (error) {
    res.json([]); // Retorna vazio se arquivo não existir
  }
});

router.get('/projetos', async (req, res) => {
  try {
    const filePath = path.resolve(process.cwd(), 'data', 'projetos.json');
    const data = await fs.readFile(filePath, 'utf-8');
    res.json(JSON.parse(data));
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.status(404).json({ message: 'Banco de dados de projetos não encontrado. Rode o script de sincronização.' });
    } else {
      res.status(500).json({ message: 'Erro interno', error: error.message });
    }
  }
});

export default router;
