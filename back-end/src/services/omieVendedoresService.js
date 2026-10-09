/**
 * Serviço de Integração com a API de Vendedores da Omie
 * Endpoint: https://app.omie.com.br/api/v1/geral/vendedores/
 * Métodos: ListarVendedores, ConsultarVendedor, IncluirVendedor, UpsertVendedor
 */

import getDb from '../config/database.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OMIE_VENDEDORES_URL = 'https://app.omie.com.br/api/v1/geral/vendedores/';
const RATE_LIMIT_MS = 350;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function chamarOmieVendedores(method, params) {
  const appKey = process.env.OMIE_APP_KEY?.trim();
  const appSecret = process.env.OMIE_APP_SECRET?.trim();

  if (!appKey || !appSecret) {
    console.error(`[OMIE VENDEDORES] ❌ APP_KEY ou APP_SECRET não configurados no .env`);
    return { erro: true, mensagem: 'Credenciais Omie não configuradas' };
  }

  const payload = {
    call: method,
    app_key: appKey,
    app_secret: appSecret,
    param: [params]
  };

  try {
    await sleep(RATE_LIMIT_MS);
    const response = await fetch(OMIE_VENDEDORES_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (data.faultstring) {
      console.warn(`[OMIE VENDEDORES] ⚠️ Retorno da Omie em ${method}: ${data.faultstring} (${data.faultcode || ''})`);
      return { erro: true, faultcode: data.faultcode, mensagem: data.faultstring };
    }

    return { erro: false, dados: data };
  } catch (err) {
    console.error(`[OMIE VENDEDORES] ❌ Erro de conexão em ${method}: ${err.message}`);
    return { erro: true, mensagem: err.message };
  }
}

/**
 * Lista vendedores oficiais cadastrados no módulo de Vendedores da Omie
 */
export async function listarVendedoresOmie(pagina = 1, registrosPorPagina = 500) {
  return chamarOmieVendedores('ListarVendedores', {
    pagina,
    registros_por_pagina: registrosPorPagina,
    apenas_importado_api: 'N'
  });
}

/**
 * Sincroniza os vendedores da Omie para a tabela vendedores_omie no MariaDB
 */
export async function sincronizarVendedoresParaBanco(dbInstance = null) {
  const db = dbInstance || await getDb();
  const isMysql = db.driver === 'mysql';

  try {
    console.log(`[OMIE VENDEDORES] 🔄 Sincronizando vendedores da Omie para MariaDB...`);
    const res = await listarVendedoresOmie(1, 500);

    let lista = [];
    if (!res.erro && res.dados && Array.isArray(res.dados.cadastro)) {
      lista = res.dados.cadastro;
    } else {
      // Fallback para arquivo de backup inicial se a API falhar
      try {
        const backupPath = path.resolve(__dirname, '..', '..', 'backup_json', 'omie_collection', 'vendedores.json');
        const raw = await fs.readFile(backupPath, 'utf-8');
        lista = JSON.parse(raw);
        console.log(`[OMIE VENDEDORES] 📂 Carregados ${lista.length} vendedores do backup para inicialização.`);
      } catch(e) {}
    }

    if (lista.length > 0) {
      for (const v of lista) {
        if (!v.codigo) continue;
        const jsonStr = JSON.stringify(v);
        const sql = isMysql
          ? `INSERT INTO vendedores_omie (codigo, nome, dados_json) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE nome=VALUES(nome), dados_json=VALUES(dados_json), atualizado_em=NOW()`
          : `INSERT INTO vendedores_omie (codigo, nome, dados_json) VALUES (?, ?, ?) ON CONFLICT(codigo) DO UPDATE SET nome=excluded.nome, dados_json=excluded.dados_json, atualizado_em=CURRENT_TIMESTAMP`;
        await db.run(sql, [v.codigo.toString(), v.nome || '', jsonStr]);
      }
      console.log(`[OMIE VENDEDORES] ✅ ${lista.length} vendedores salvos na tabela vendedores_omie.`);
    }
  } catch (err) {
    console.error(`[OMIE VENDEDORES] Erro ao sincronizar vendedores:`, err.message);
  }
}

/**
 * Helper para encontrar o vendedor oficial mais compatível com priorização de match 100% exato.
 */
function encontrarMelhorMatchVendedor(rows, alvoStr, alvoLimpo) {
  if (!rows || rows.length === 0) return null;

  // 1. Match exato por código
  let match = rows.find(v => {
    const codV = String(v.codigo || '').trim();
    return codV === alvoStr || (alvoLimpo && codV === alvoLimpo);
  });
  if (match) return match;

  // 2. Match 100% exato por nome
  match = rows.find(v => (v.nome || '').trim().toUpperCase() === alvoStr);
  if (match) return match;

  // 3. Match 100% exato por nome limpo (sem caracteres especiais)
  if (alvoLimpo) {
    match = rows.find(v => (v.nome || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '') === alvoLimpo);
    if (match) return match;
  }

  // 4. Fallback por prefixo seguro (apenas se alvoStr tiver no mínimo 4 caracteres)
  if (alvoStr.length >= 4) {
    const candidatos = rows.filter(v => {
      const nomeV = (v.nome || '').trim().toUpperCase();
      return nomeV.length >= 4 && (nomeV.startsWith(alvoStr) || alvoStr.startsWith(nomeV));
    });

    if (candidatos.length > 0) {
      // Prioriza o nome mais longo e específico para evitar casar com abreviações curtas
      candidatos.sort((a, b) => (b.nome || '').length - (a.nome || '').length);
      return candidatos[0];
    }
  }

  return null;
}

/**
 * Busca um vendedor válido na Omie pelo nome ou tenta auto-cadastrar.
 * Se o funcionário não for um vendedor oficial na Omie, retorna null para não travar a Remessa!
 * 
 * @param {string|number} nomeOuCodigo - Nome do funcionário/vendedor ou código
 * @param {object} [dbInstance] - Instância de conexão
 * @returns {Promise<{codigo: number, nome: string}|null>}
 */
export async function buscarVendedorValidoOmie(nomeOuCodigo, dbInstance = null) {
  if (!nomeOuCodigo) return null;

  const db = dbInstance || await getDb();
  const alvoStr = String(nomeOuCodigo).trim().toUpperCase();
  const alvoLimpo = alvoStr.replace(/[^A-Z0-9]/g, '');

  if (!alvoStr) return null;

  // 1. Procura na tabela vendedores_omie do MariaDB
  try {
    let rows = await db.all(`SELECT * FROM vendedores_omie`);
    if (!rows || rows.length === 0) {
      // Se a tabela ainda estiver vazia, sincroniza agora mesmo
      await sincronizarVendedoresParaBanco(db);
      rows = await db.all(`SELECT * FROM vendedores_omie`);
    }

    if (rows && rows.length > 0) {
      const match = encontrarMelhorMatchVendedor(rows, alvoStr, alvoLimpo);

      if (match?.codigo) {
        console.log(`[OMIE VENDEDORES] ✅ Vendedor oficial Omie encontrado: #${match.codigo} - ${match.nome}`);
        return { codigo: Number(match.codigo), nome: match.nome };
      }
    }
  } catch (errDb) {
    console.warn(`[OMIE VENDEDORES] Aviso ao consultar vendedores_omie:`, errDb.message);
  }

  // 2. Não achou na tabela. Sincroniza da API da Omie para verificar se foi adicionado recentemente
  try {
    await sincronizarVendedoresParaBanco(db);
    const rows = await db.all(`SELECT * FROM vendedores_omie`);
    const match = encontrarMelhorMatchVendedor(rows, alvoStr, alvoLimpo);

    if (match?.codigo) {
      console.log(`[OMIE VENDEDORES] ✅ Vendedor oficial Omie encontrado pós-sync: #${match.codigo} - ${match.nome}`);
      return { codigo: Number(match.codigo), nome: match.nome };
    }
  } catch (errSync) {}

  // 3. Tenta auto-cadastrar o funcionário como Vendedor na Omie via UpsertVendedor
  try {
    console.log(`[OMIE VENDEDORES] ➕ Tentando cadastrar "${alvoStr}" como vendedor na Omie...`);
    const codInt = `VEND-${alvoLimpo.slice(0, 15)}`;
    const resCriar = await chamarOmieVendedores('UpsertVendedor', {
      codInt,
      nome: alvoStr.slice(0, 70),
      inativo: 'N',
      comissao: 0
    });

    if (!resCriar.erro && resCriar.dados && resCriar.dados.codigo) {
      const novoCodigo = Number(resCriar.dados.codigo);
      console.log(`[OMIE VENDEDORES] 🎉 Vendedor cadastrado com sucesso na Omie: #${novoCodigo} - ${alvoStr}`);
      const isMysql = db.driver === 'mysql';
      const sql = isMysql
        ? `INSERT INTO vendedores_omie (codigo, nome, dados_json) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE nome=VALUES(nome), dados_json=VALUES(dados_json), atualizado_em=NOW()`
        : `INSERT INTO vendedores_omie (codigo, nome, dados_json) VALUES (?, ?, ?) ON CONFLICT(codigo) DO UPDATE SET nome=excluded.nome, dados_json=excluded.dados_json, atualizado_em=CURRENT_TIMESTAMP`;
      await db.run(sql, [novoCodigo.toString(), alvoStr, JSON.stringify(resCriar.dados)]);
      return { codigo: novoCodigo, nome: alvoStr };
    }
  } catch (errCriar) {
    console.warn(`[OMIE VENDEDORES] Aviso ao tentar auto-cadastrar vendedor:`, errCriar.message);
  }

  // 4. Se o funcionário não for um vendedor no ERP e a Omie não permitir criar:
  // Retorna null de forma segura para NÃO mandar código inválido de cliente e NÃO travar a Remessa!
  console.log(`[OMIE VENDEDORES] ℹ️ "${alvoStr}" é um funcionário/entregador interno (sem cadastro oficial de vendedor na Omie). A remessa será gerada sem o parâmetro nCodVend para evitar erro 102.`);
  return null;
}

export default {
  listarVendedoresOmie,
  sincronizarVendedoresParaBanco,
  buscarVendedorValidoOmie
};
