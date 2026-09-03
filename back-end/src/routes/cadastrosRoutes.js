import express from 'express';
import { obterCadastro, salvarCadastro } from '../services/cadastrosSyncService.js';
import getDb from '../config/database.js';

const router = express.Router();

router.get('/fornecedores', async (req, res) => {
  try {
    const db = await getDb();
    const rows = await db.all(`SELECT * FROM fornecedores_omie ORDER BY razao_social ASC`);
    const fornecedores = rows.map(r => {
      let d = {};
      try { d = JSON.parse(r.dados_json || '{}'); } catch(e){}
      return { ...d, codigo_cliente_omie: r.codigo, razao_social: r.razao_social, cnpj_cpf: r.cnpj_cpf };
    });
    res.json(fornecedores);
  } catch (error) {
    res.status(500).json({ message: 'Erro interno ao ler os fornecedores', error: error.message });
  }
});

router.post('/fornecedores', async (req, res) => {
  try {
    const { razao_social, nome_fantasia, cnpj_cpf } = req.body;
    
    if (!razao_social || !cnpj_cpf) {
      return res.status(400).json({ message: 'Razão social e CNPJ/CPF são obrigatórios' });
    }

    const novoCodigo = Number(`99${Math.floor(Date.now() / 1000)}`);
    
    const novoFornecedor = {
      codigo_cliente_omie: novoCodigo,
      razao_social: razao_social.toUpperCase(),
      nome_fantasia: (nome_fantasia || razao_social).toUpperCase(),
      cnpj_cpf: cnpj_cpf
    };

    const db = await getDb();
    const jsonStr = JSON.stringify(novoFornecedor);

    if (db.driver === 'mysql') {
      await db.run(
        `INSERT INTO fornecedores_omie (codigo, razao_social, cnpj_cpf, dados_json) VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE razao_social = VALUES(razao_social), cnpj_cpf = VALUES(cnpj_cpf), dados_json = VALUES(dados_json), atualizado_em = NOW()`,
        [novoCodigo.toString(), novoFornecedor.razao_social, novoFornecedor.cnpj_cpf, jsonStr]
      );
    } else {
      await db.run(
        `INSERT INTO fornecedores_omie (codigo, razao_social, cnpj_cpf, dados_json) VALUES (?, ?, ?, ?)
         ON CONFLICT(codigo) DO UPDATE SET razao_social = excluded.razao_social, cnpj_cpf = excluded.cnpj_cpf, dados_json = excluded.dados_json, atualizado_em = CURRENT_TIMESTAMP`,
        [novoCodigo.toString(), novoFornecedor.razao_social, novoFornecedor.cnpj_cpf, jsonStr]
      );
    }
    
    res.status(201).json(novoFornecedor);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao salvar o fornecedor', error: error.message });
  }
});

router.get('/vendedores', async (req, res) => {
  try {
    const vendedores = await obterCadastro('vendedores', 'vendedores.json');
    res.json(vendedores || []);
  } catch (error) {
    res.status(500).json({ message: 'Erro interno ao ler os vendedores', error: error.message });
  }
});

router.get('/departamentos', async (req, res) => {
  try {
    const db = await getDb();
    const rows = await db.all(`SELECT * FROM departamentos_omie ORDER BY descricao ASC`);
    const departamentos = rows.map(r => {
      let d = {};
      try { d = JSON.parse(r.dados_json || '{}'); } catch(e){}
      return { ...d, codigo: r.codigo, descricao: r.descricao };
    });
    res.json(departamentos);
  } catch (error) {
    res.status(500).json({ message: 'Erro interno', error: error.message });
  }
});

router.get('/locais-estoque', async (req, res) => {
  try {
    const db = await getDb();
    const rows = await db.all(`SELECT * FROM locais_estoque_omie ORDER BY descricao ASC`);
    const locais = rows.map(r => {
      let d = {};
      try { d = JSON.parse(r.dados_json || '{}'); } catch(e){}
      return { ...d, codigo: r.codigo, descricao: r.descricao };
    });
    res.json(locais);
  } catch (error) {
    res.json([]);
  }
});

router.get('/projetos', async (req, res) => {
  try {
    const db = await getDb();
    const rows = await db.all(`SELECT * FROM projetos_omie ORDER BY nome ASC`);
    const projetos = rows.map(r => {
      let d = {};
      try { d = JSON.parse(r.dados_json || '{}'); } catch(e){}
      return { ...d, codigo: r.codigo, nome: r.nome };
    });
    res.json(projetos);
  } catch (error) {
    res.status(500).json({ message: 'Erro interno', error: error.message });
  }
});

router.get('/requisitantes', async (req, res) => {
  try {
    const requisitantes = await obterCadastro('requisitantes', 'requisitantes.json');
    // Seed default if empty
    if (!requisitantes || requisitantes.length === 0) {
      const defaultReqs = [
        "ARILSON MOURAS", "ARINALDO BORGES", "MONTEIRO", "JUCELIO PONTES",
        "GRAZIELLY BARBOSA", "JAIR CAVALCANTE", "ADEMILTON", "CLEYDSON",
        "EMERSON OLIVEIRA", "CLAUDOMIRO SILVA", "JONE", "NAZARE YAMAGUCHI", "KAZUNORI YAMAGUCHI"
      ];
      await salvarCadastro('requisitantes', 'requisitantes.json', defaultReqs);
      return res.json(defaultReqs);
    }
    res.json(requisitantes);
  } catch (error) {
    res.status(500).json({ message: 'Erro interno', error: error.message });
  }
});

router.post('/requisitantes', async (req, res) => {
  try {
    const { nome } = req.body;
    if (!nome) return res.status(400).json({ message: 'Nome é obrigatório' });

    let requisitantes = await obterCadastro('requisitantes', 'requisitantes.json');
    if (!Array.isArray(requisitantes)) requisitantes = [];

    const novoNome = nome.toUpperCase();
    if (!requisitantes.includes(novoNome)) {
      requisitantes.push(novoNome);
      await salvarCadastro('requisitantes', 'requisitantes.json', requisitantes);
    }
    
    res.status(201).json({ nome: novoNome });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao salvar o requisitante', error: error.message });
  }
});

router.delete('/requisitantes', async (req, res) => {
  try {
    const { nome } = req.body;
    if (!nome) return res.status(400).json({ message: 'Nome é obrigatório' });

    let requisitantes = await obterCadastro('requisitantes', 'requisitantes.json');
    if (!Array.isArray(requisitantes)) return res.json({ message: 'Nada a remover' });

    const nomeDel = nome.toUpperCase();
    const novosRequisitantes = requisitantes.filter(r => r !== nomeDel);
    
    await salvarCadastro('requisitantes', 'requisitantes.json', novosRequisitantes);
    
    res.json({ message: 'Requisitante removido com sucesso' });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao excluir o requisitante', error: error.message });
  }
});

export default router;
