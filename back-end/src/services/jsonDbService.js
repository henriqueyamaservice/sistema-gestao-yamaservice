/**
 * jsonDbService.js
 * 
 * Serviço centralizado para leitura e escrita de coleções de dados no banco.
 * Substitui o padrão antigo de fs.readFile/fs.writeFile em JSON.
 * Usa a tabela `json_collections` no MariaDB (VPS) ou SQLite (local).
 */
import getDb from '../config/database.js';

/**
 * Lê uma coleção do banco de dados.
 * @param {string} colecao - Nome da coleção (ex: 'requisicoes', 'veiculos')
 * @returns {Promise<any>} - Os dados parseados (array ou objeto)
 */
export async function getJsonData(colecao) {
  const db = await getDb();
  const row = await db.get(
    `SELECT dados FROM json_collections WHERE colecao = ?`,
    [colecao]
  );
  if (row && row.dados) {
    return JSON.parse(row.dados);
  }
  return null;
}

/**
 * Salva uma coleção no banco de dados (INSERT ou UPDATE automático).
 * @param {string} colecao - Nome da coleção
 * @param {any} dados - Os dados a salvar (serão convertidos para JSON)
 */
export async function saveJsonData(colecao, dados) {
  const db = await getDb();
  const jsonText = JSON.stringify(dados);
  if (db.driver === 'mysql') {
    await db.run(
      `INSERT INTO json_collections (colecao, dados) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE dados = VALUES(dados), atualizado_em = NOW()`,
      [colecao, jsonText]
    );
  } else {
    await db.run(
      `INSERT INTO json_collections (colecao, dados) VALUES (?, ?)
       ON CONFLICT(colecao) DO UPDATE SET dados = excluded.dados, atualizado_em = CURRENT_TIMESTAMP`,
      [colecao, jsonText]
    );
  }
}

export default { getJsonData, saveJsonData };
