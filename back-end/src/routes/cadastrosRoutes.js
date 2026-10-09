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
    const { razao_social, nome_fantasia, cnpj_cpf, email, cep, endereco, bairro, cidade, estado } = req.body;
    
    if (!razao_social || !cnpj_cpf) {
      return res.status(400).json({ message: 'Razão social e CNPJ/CPF são obrigatórios' });
    }

    // 1. Tentar sincronizar com a Omie primeiro
    const omieFornecedoresService = await import('../services/omieFornecedoresService.js');
    const syncOmie = await omieFornecedoresService.upsertFornecedorOmie({
      cnpj_cpf, razao_social, nome_fantasia, email, cep, endereco, bairro, cidade, estado
    });

    let codigoFornecedor;

    if (!syncOmie.erro && syncOmie.dados && syncOmie.dados.codigo_cliente_omie) {
      // Sucesso na Omie: usar o código real da Omie
      codigoFornecedor = syncOmie.dados.codigo_cliente_omie;
      console.log(`[FORNECEDORES] ✅ Fornecedor ${razao_social} cadastrado com sucesso na Omie! Código Omie: ${codigoFornecedor}`);
    } else {
      // Falha na Omie: Gerar código temporário local
      console.warn(`[FORNECEDORES] 🚨 Falha ao sincronizar fornecedor ${razao_social} na Omie. Gerando código temporário 99...`, syncOmie.detalhes || syncOmie.mensagem);
      codigoFornecedor = Number(`99${Math.floor(Date.now() / 1000)}`);
    }
    
    const novoFornecedor = {
      codigo_cliente_omie: codigoFornecedor,
      razao_social: razao_social.toUpperCase(),
      nome_fantasia: (nome_fantasia || razao_social).toUpperCase(),
      cnpj_cpf: cnpj_cpf,
      email: email || '',
      cep: cep || '',
      endereco: endereco || '',
      bairro: bairro || '',
      cidade: cidade || '',
      estado: estado || ''
    };

    const db = await getDb();
    const jsonStr = JSON.stringify(novoFornecedor);

    if (db.driver === 'mysql') {
      await db.run(
        `INSERT INTO fornecedores_omie (codigo, razao_social, cnpj_cpf, dados_json) VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE razao_social = VALUES(razao_social), cnpj_cpf = VALUES(cnpj_cpf), dados_json = VALUES(dados_json), atualizado_em = NOW()`,
        [codigoFornecedor.toString(), novoFornecedor.razao_social, novoFornecedor.cnpj_cpf, jsonStr]
      );
    } else {
      await db.run(
        `INSERT INTO fornecedores_omie (codigo, razao_social, cnpj_cpf, dados_json) VALUES (?, ?, ?, ?)
         ON CONFLICT(codigo) DO UPDATE SET razao_social = excluded.razao_social, cnpj_cpf = excluded.cnpj_cpf, dados_json = excluded.dados_json, atualizado_em = CURRENT_TIMESTAMP`,
        [codigoFornecedor.toString(), novoFornecedor.razao_social, novoFornecedor.cnpj_cpf, jsonStr]
      );
    }
    
    res.status(201).json(novoFornecedor);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao salvar o fornecedor', error: error.message });
  }
});

router.get('/vendedores', async (req, res) => {
  try {
    const db = await getDb();
    const rowsForn = await db.all(`SELECT * FROM fornecedores_omie ORDER BY razao_social ASC`);
    
    // Tenta ler vendedores oficiais
    let rowsVend = [];
    try {
      rowsVend = await db.all(`SELECT * FROM vendedores_omie`);
    } catch(e) {}

    const vendedores = rowsForn.map(r => {
      let d = {};
      try { d = JSON.parse(r.dados_json || '{}'); } catch(e){}
      const nomeUpper = (r.razao_social || '').trim().toUpperCase();

      // Procura se tem match na tabela de vendedores oficiais da Omie (Prioridade 1: Exato; Prioridade 2: Código; Prioridade 3: Prefixo seguro >= 4 letras)
      let vendOficial = rowsVend.find(v => {
        const vNome = (v.nome || '').trim().toUpperCase();
        return vNome === nomeUpper;
      });

      if (!vendOficial) {
        vendOficial = rowsVend.find(v => String(v.codigo) === String(r.codigo));
      }

      if (!vendOficial && nomeUpper.length >= 4) {
        const candidatos = rowsVend.filter(v => {
          const vNome = (v.nome || '').trim().toUpperCase();
          return vNome.length >= 4 && (vNome.startsWith(nomeUpper) || nomeUpper.startsWith(vNome));
        });
        if (candidatos.length > 0) {
          candidatos.sort((a, b) => (b.nome || '').length - (a.nome || '').length);
          vendOficial = candidatos[0];
        }
      }

      return {
        ...d,
        codigo: r.codigo,
        nome: r.razao_social,
        nome_fantasia: d.nome_fantasia || r.razao_social,
        codigoVendedorOmie: vendOficial ? vendOficial.codigo : null
      };
    });

    // Adiciona vendedores oficiais da Omie que não estejam em fornecedores_omie
    const nomesFornSet = new Set(vendedores.map(v => (v.nome || '').trim().toUpperCase()));
    for (const v of rowsVend) {
      const vNome = (v.nome || '').trim().toUpperCase();
      if (vNome && !nomesFornSet.has(vNome) && v.inativo !== 'S') {
        let dj = {};
        try { dj = JSON.parse(v.dados_json || '{}'); } catch(e){}
        vendedores.push({
          ...dj,
          codigo: v.codigo,
          nome: v.nome,
          nome_fantasia: dj.nome_fantasia || v.nome,
          codigoVendedorOmie: Number(v.codigo)
        });
        nomesFornSet.add(vNome);
      }
    }

    res.json(vendedores);
  } catch (error) {
    res.status(500).json({ message: 'Erro interno ao ler os vendedores do banco', error: error.message });
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
    let rows = await db.all(`SELECT * FROM locais_estoque_omie ORDER BY descricao ASC`);

    // Auto-recuperação caso a tabela esteja vazia
    if (!rows || rows.length === 0) {
      try {
        const colRow = await db.get(`SELECT dados FROM omie_collections WHERE colecao = 'locais_estoque'`);
        let list = null;
        if (colRow && colRow.dados) {
          list = JSON.parse(colRow.dados);
        } else {
          const fs = await import('fs/promises');
          const path = await import('path');
          const backupPath = path.resolve(process.cwd(), 'backup_json', 'omie_locais_estoque.json');
          const raw = await fs.readFile(backupPath, 'utf-8').catch(() => null);
          if (raw) list = JSON.parse(raw);
        }

        if (Array.isArray(list) && list.length > 0) {
          for (const item of list) {
            const cod = (item.codigo || item.codigo_local_estoque || '').toString();
            const desc = item.descricao || '';
            if (cod) {
              const isMysql = db.driver === 'mysql';
              const sql = isMysql
                ? `INSERT INTO locais_estoque_omie (codigo, descricao, dados_json) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE descricao=VALUES(descricao), dados_json=VALUES(dados_json)`
                : `INSERT INTO locais_estoque_omie (codigo, descricao, dados_json) VALUES (?, ?, ?) ON CONFLICT(codigo) DO UPDATE SET descricao=excluded.descricao, dados_json=excluded.dados_json`;
              await db.run(sql, [cod, desc, JSON.stringify(item)]);
            }
          }
          rows = await db.all(`SELECT * FROM locais_estoque_omie ORDER BY descricao ASC`);
        }
      } catch (errFallback) {
        console.warn('Aviso: Auto-população de locais_estoque falhou:', errFallback.message);
      }
    }

    const locais = (rows || []).map(r => {
      let d = {};
      try { d = JSON.parse(r.dados_json || '{}'); } catch(e){}
      return { 
        ...d, 
        codigo: r.codigo, 
        codigo_local_estoque: d.codigo_local_estoque || r.codigo,
        descricao: r.descricao 
      };
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
