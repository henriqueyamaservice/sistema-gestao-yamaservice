/**
 * Serviço de Integração com a API de Projetos da Omie
 * Endpoint: https://app.omie.com.br/api/v1/geral/projetos/
 * Métodos: ListarProjetos, ConsultarProjeto, IncluirProjeto, UpsertProjeto
 */

import getDb from '../config/database.js';

const OMIE_PROJETOS_URL = 'https://app.omie.com.br/api/v1/geral/projetos/';
const RATE_LIMIT_MS = 350;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function chamarOmieProjetos(method, params) {
  const appKey = process.env.OMIE_APP_KEY?.trim();
  const appSecret = process.env.OMIE_APP_SECRET?.trim();

  if (!appKey || !appSecret) {
    console.error(`[OMIE PROJETOS] ❌ APP_KEY ou APP_SECRET não configurados no .env`);
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
    const response = await fetch(OMIE_PROJETOS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (data.faultstring) {
      console.warn(`[OMIE PROJETOS] ⚠️ Retorno da Omie em ${method}: ${data.faultstring} (${data.faultcode || ''})`);
      return { erro: true, faultcode: data.faultcode, mensagem: data.faultstring };
    }

    return { erro: false, dados: data };
  } catch (err) {
    console.error(`[OMIE PROJETOS] ❌ Erro de conexão em ${method}: ${err.message}`);
    return { erro: true, mensagem: err.message };
  }
}

/**
 * Lista projetos da Omie
 */
export async function listarProjetosOmie(pagina = 1, registrosPorPagina = 500) {
  return chamarOmieProjetos('ListarProjetos', {
    pagina,
    registros_por_pagina: registrosPorPagina,
    apenas_importado_api: 'N'
  });
}

/**
 * Cria ou atualiza um projeto na Omie via UpsertProjeto
 */
export async function incluirProjetoOmie(nome, codInt) {
  const nomeSanitizado = String(nome).trim().slice(0, 70);
  const codIntSanitizado = (codInt || `OS-${nomeSanitizado.replace(/[^A-Za-z0-9]/g, '')}`).slice(0, 20);

  console.log(`[OMIE PROJETOS] ➕ Cadastrando novo projeto na Omie: "${nomeSanitizado}" (codInt: ${codIntSanitizado})...`);

  return chamarOmieProjetos('UpsertProjeto', {
    codint: codIntSanitizado,
    nome: nomeSanitizado,
    inativo: 'N'
  });
}

/**
 * Busca de forma resiliente um projeto no MariaDB e na Omie.
 * Se não existir, auto-cadastra na Omie e salva no MariaDB!
 * 
 * @param {string|number} nomeOuOS - Nome do projeto ou código da OS (ex: "102-0826" ou "1930926" ou "102-0826 (PLACA...)")
 * @param {object} [dbInstance] - Instância de conexão com o banco
 * @returns {Promise<{codigo: number, nome: string}|null>}
 */
export async function buscarOuCriarProjetoOmie(nomeOuOS, dbInstance = null) {
  if (!nomeOuOS) return null;

  const db = dbInstance || await getDb();
  const isMysql = db.driver === 'mysql';

  const rawStr = String(nomeOuOS).trim();
  // Se tiver placa entre parênteses (ex: "102-0826 (PLACA: MEQ-0008)"), extrai a OS
  const alvoOS = rawStr.split('(')[0].trim().toUpperCase();
  const alvoLimpo = alvoOS.replace(/[^A-Z0-9]/g, '');

  if (!alvoOS && !alvoLimpo) return null;

  console.log(`[OMIE PROJETOS] 🔍 Buscando projeto para: "${alvoOS}" (limpo: "${alvoLimpo}")...`);

  // --- PASSO 1: Busca no banco MariaDB local na tabela projetos_omie ---
  try {
    const rows = await db.all(`SELECT * FROM projetos_omie`);
    if (rows && rows.length > 0) {
      const match = rows.find(p => {
        const nomeProj = (p.nome || '').trim().toUpperCase();
        const nomeProjLimpo = nomeProj.replace(/[^A-Z0-9]/g, '');
        const codProjStr = String(p.codigo || '');

        return (
          codProjStr === alvoOS ||
          codProjStr === alvoLimpo ||
          nomeProj === alvoOS ||
          (alvoLimpo && nomeProjLimpo === alvoLimpo) ||
          nomeProj.startsWith(alvoOS) ||
          alvoOS.startsWith(nomeProj)
        );
      });

      if (match?.codigo) {
        console.log(`[OMIE PROJETOS] ✅ Projeto encontrado no banco local: #${match.codigo} - ${match.nome}`);
        return { codigo: Number(match.codigo), nome: match.nome };
      }
    }
  } catch (errDb) {
    console.warn(`[OMIE PROJETOS] Aviso ao consultar projetos_omie no banco local:`, errDb.message);
  }

  // --- PASSO 2: Não achou no banco local. Sincroniza da Omie para ver se foi cadastrado lá recentemente ---
  try {
    console.log(`[OMIE PROJETOS] 🌐 Consultando projetos mais recentes na API da Omie...`);
    const resOmie = await listarProjetosOmie(1, 500);

    if (!resOmie.erro && resOmie.dados && Array.isArray(resOmie.dados.cadastro)) {
      const listaOmie = resOmie.dados.cadastro;
      
      // Salva os projetos no MariaDB em segundo plano
      for (const p of listaOmie) {
        if (!p.codigo) continue;
        const jsonStr = JSON.stringify(p);
        const sql = isMysql
          ? `INSERT INTO projetos_omie (codigo, nome, dados_json) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE nome=VALUES(nome), dados_json=VALUES(dados_json), atualizado_em=NOW()`
          : `INSERT INTO projetos_omie (codigo, nome, dados_json) VALUES (?, ?, ?) ON CONFLICT(codigo) DO UPDATE SET nome=excluded.nome, dados_json=excluded.dados_json, atualizado_em=CURRENT_TIMESTAMP`;
        await db.run(sql, [p.codigo, p.nome || '', jsonStr]);
      }

      // Procura na lista recém-baixada
      const matchOnline = listaOmie.find(p => {
        const nomeProj = (p.nome || '').trim().toUpperCase();
        const nomeProjLimpo = nomeProj.replace(/[^A-Z0-9]/g, '');
        const codProjStr = String(p.codigo || '');

        return (
          codProjStr === alvoOS ||
          codProjStr === alvoLimpo ||
          nomeProj === alvoOS ||
          (alvoLimpo && nomeProjLimpo === alvoLimpo) ||
          nomeProj.startsWith(alvoOS) ||
          alvoOS.startsWith(nomeProj)
        );
      });

      if (matchOnline?.codigo) {
        console.log(`[OMIE PROJETOS] ✅ Projeto encontrado na Omie após sincronização: #${matchOnline.codigo} - ${matchOnline.nome}`);
        return { codigo: Number(matchOnline.codigo), nome: matchOnline.nome };
      }
    }
  } catch (errSync) {
    console.warn(`[OMIE PROJETOS] Aviso na sincronização online de projetos:`, errSync.message);
  }

  // --- PASSO 3: O projeto realmente NÃO existe ainda na Omie. Auto-cadastra! ---
  try {
    console.log(`[OMIE PROJETOS] 🚀 Projeto "${alvoOS}" não encontrado. Criando automaticamente na Omie...`);
    const codInt = `OS-${alvoLimpo.slice(0, 16)}`;
    const resCriar = await incluirProjetoOmie(alvoOS, codInt);

    if (!resCriar.erro && resCriar.dados && resCriar.dados.codigo) {
      const novoCodigo = Number(resCriar.dados.codigo);
      console.log(`[OMIE PROJETOS] 🎉 Projeto criado com sucesso na Omie: #${novoCodigo} - "${alvoOS}"`);

      // Salva no MariaDB
      const sqlNovo = isMysql
        ? `INSERT INTO projetos_omie (codigo, nome, dados_json) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE nome=VALUES(nome), dados_json=VALUES(dados_json), atualizado_em=NOW()`
        : `INSERT INTO projetos_omie (codigo, nome, dados_json) VALUES (?, ?, ?) ON CONFLICT(codigo) DO UPDATE SET nome=excluded.nome, dados_json=excluded.dados_json, atualizado_em=CURRENT_TIMESTAMP`;
      await db.run(sqlNovo, [novoCodigo, alvoOS, JSON.stringify(resCriar.dados)]);

      return { codigo: novoCodigo, nome: alvoOS };
    } else {
      console.warn(`[OMIE PROJETOS] Não foi possível auto-cadastrar projeto na Omie: ${resCriar.mensagem || 'erro desconhecido'}`);
    }
  } catch (errCriar) {
    console.error(`[OMIE PROJETOS] Erro ao criar projeto na Omie:`, errCriar.message);
  }

  return null;
}

export default {
  listarProjetosOmie,
  incluirProjetoOmie,
  buscarOuCriarProjetoOmie
};
