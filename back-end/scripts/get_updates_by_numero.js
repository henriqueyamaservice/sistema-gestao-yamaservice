import 'dotenv/config';
import getDb from '../src/config/database.js';

async function getUpdatesByNumeroOs() {
  const db = await getDb();
  const numeros = ['10-0826', '77-0826', '82-0826', '92-0826'];

  for (const num of numeros) {
    const row = await db.get('SELECT id, numero_os, dados_json FROM ordens_servico WHERE numero_os = ?', [num]);
    if (row) {
      const sqlSafeJson = row.dados_json.replace(/'/g, "''");
      console.log(`UPDATE ordens_servico SET dados_json = '${sqlSafeJson}' WHERE numero_os = '${num}';\n`);
    }
  }

  process.exit(0);
}

getUpdatesByNumeroOs();
