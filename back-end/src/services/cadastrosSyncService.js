import path from 'path';
import getDb from '../config/database.js';

// Mapeamento de coleções para suas respectivas tabelas migradas
const TABELAS_MIGRADAS = {
  'produtos': 'produtos_omie',
  'fornecedores': 'fornecedores_omie',
  'departamentos': 'departamentos_omie',
  'projetos': 'projetos_omie',
  'locais_estoque': 'locais_estoque_omie'
};

export async function sincronizarCadastrosParaBanco() {}

export async function obterCadastro(colecaoKey, fallbackFileName) {
  try {
    const db = await getDb();
    
    // Se for uma das tabelas migradas, puxa todos os registros e emula o formato json array
    if (TABELAS_MIGRADAS[colecaoKey]) {
      const tabela = TABELAS_MIGRADAS[colecaoKey];
      const rows = await db.all(`SELECT dados_json FROM ${tabela}`);
      return rows.map(r => {
        try {
          return JSON.parse(r.dados_json || '{}');
        } catch(e) { return {}; }
      });
    }

    // Fallback para coleções legadas (ex: vendedores, requisitantes) na omie_collections
    const row = await db.get(`SELECT dados FROM omie_collections WHERE colecao = ?`, [colecaoKey]);
    if (row && row.dados) {
      return JSON.parse(row.dados);
    }
  } catch (e) {
    console.error(`Erro ao obter '${colecaoKey}' do banco:`, e.message);
  }
  return [];
}

export async function salvarCadastro(colecaoKey, fallbackFileName, listaAtualizada) {
  try {
    const db = await getDb();
    const isMysql = db.driver === 'mysql';

    if (TABELAS_MIGRADAS[colecaoKey]) {
      const tabela = TABELAS_MIGRADAS[colecaoKey];
      
      for (const item of listaAtualizada) {
        let codigo = item.codigo || item.codigo_cliente_omie || item.codigo_produto;
        if (!codigo) continue;
        codigo = codigo.toString();
        
        const jsonStr = JSON.stringify(item);
        
        // Colunas genéricas assumidas para inserção rápida
        let sql = '';
        let params = [];
        
        if (tabela === 'fornecedores_omie') {
           const rz = item.razao_social || '';
           const cj = item.cnpj_cpf || '';
           sql = isMysql 
             ? `INSERT INTO fornecedores_omie (codigo, razao_social, cnpj_cpf, dados_json) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE razao_social=VALUES(razao_social), cnpj_cpf=VALUES(cnpj_cpf), dados_json=VALUES(dados_json), atualizado_em=NOW()`
             : `INSERT INTO fornecedores_omie (codigo, razao_social, cnpj_cpf, dados_json) VALUES (?, ?, ?, ?) ON CONFLICT(codigo) DO UPDATE SET razao_social=excluded.razao_social, cnpj_cpf=excluded.cnpj_cpf, dados_json=excluded.dados_json, atualizado_em=CURRENT_TIMESTAMP`;
           params = [codigo, rz, cj, jsonStr];
        } else if (tabela === 'departamentos_omie') {
           const d = item.descricao || '';
           sql = isMysql 
             ? `INSERT INTO departamentos_omie (codigo, descricao, dados_json) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE descricao=VALUES(descricao), dados_json=VALUES(dados_json), atualizado_em=NOW()`
             : `INSERT INTO departamentos_omie (codigo, descricao, dados_json) VALUES (?, ?, ?) ON CONFLICT(codigo) DO UPDATE SET descricao=excluded.descricao, dados_json=excluded.dados_json, atualizado_em=CURRENT_TIMESTAMP`;
           params = [codigo, d, jsonStr];
        } else if (tabela === 'locais_estoque_omie') {
           const d = item.descricao || '';
           sql = isMysql 
             ? `INSERT INTO locais_estoque_omie (codigo, descricao, dados_json) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE descricao=VALUES(descricao), dados_json=VALUES(dados_json), atualizado_em=NOW()`
             : `INSERT INTO locais_estoque_omie (codigo, descricao, dados_json) VALUES (?, ?, ?) ON CONFLICT(codigo) DO UPDATE SET descricao=excluded.descricao, dados_json=excluded.dados_json, atualizado_em=CURRENT_TIMESTAMP`;
           params = [codigo, d, jsonStr];
        } else if (tabela === 'projetos_omie') {
           const n = item.nome || '';
           sql = isMysql 
             ? `INSERT INTO projetos_omie (codigo, nome, dados_json) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE nome=VALUES(nome), dados_json=VALUES(dados_json), atualizado_em=NOW()`
             : `INSERT INTO projetos_omie (codigo, nome, dados_json) VALUES (?, ?, ?) ON CONFLICT(codigo) DO UPDATE SET nome=excluded.nome, dados_json=excluded.dados_json, atualizado_em=CURRENT_TIMESTAMP`;
           params = [codigo, n, jsonStr];
        } else if (tabela === 'produtos_omie') {
           const d = item.descricao || '';
           const n = item.ncm || '';
           const e = item.ean || '';
           const v = parseFloat(item.valor_unitario) || 0;
           const q = parseFloat(item.quantidade_estoque) || 0;
           sql = isMysql
             ? `INSERT INTO produtos_omie (codigo, descricao, ncm, ean, valor_unitario, quantidade_estoque, dados_json) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE descricao=VALUES(descricao), ncm=VALUES(ncm), ean=VALUES(ean), valor_unitario=VALUES(valor_unitario), quantidade_estoque=VALUES(quantidade_estoque), dados_json=VALUES(dados_json), atualizado_em=NOW()`
             : `INSERT INTO produtos_omie (codigo, descricao, ncm, ean, valor_unitario, quantidade_estoque, dados_json) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(codigo) DO UPDATE SET descricao=excluded.descricao, ncm=excluded.ncm, ean=excluded.ean, valor_unitario=excluded.valor_unitario, quantidade_estoque=excluded.quantidade_estoque, dados_json=excluded.dados_json, atualizado_em=CURRENT_TIMESTAMP`;
           params = [codigo, d, n, e, v, q, jsonStr];
        }
        
        if (sql) await db.run(sql, params);
      }
    } else {
      // Fallback para coleções genéricas na omie_collections
      const jsonText = JSON.stringify(listaAtualizada, null, 2);
      if (isMysql) {
        await db.run(
          `INSERT INTO omie_collections (colecao, dados) VALUES (?, ?) 
           ON DUPLICATE KEY UPDATE dados = VALUES(dados), atualizado_em = NOW()`,
          [colecaoKey, jsonText]
        );
      } else {
        await db.run(
          `INSERT INTO omie_collections (colecao, dados) VALUES (?, ?) 
           ON CONFLICT(colecao) DO UPDATE SET dados = excluded.dados, atualizado_em = CURRENT_TIMESTAMP`,
          [colecaoKey, jsonText]
        );
      }
    }
  } catch (e) {
    console.error(`Erro ao salvar '${colecaoKey}' no banco:`, e.message);
  }
}

export default {
  sincronizarCadastrosParaBanco,
  obterCadastro,
  salvarCadastro
};
