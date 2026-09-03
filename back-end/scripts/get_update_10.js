import 'dotenv/config';
import getDb from '../src/config/database.js';

async function getUpdate10() {
  const db = await getDb();
  const row = await db.get('SELECT id, numero_os, dados_json FROM ordens_servico WHERE numero_os = "10-0826"');
  if (row) {
    const sqlSafeJson = row.dados_json.replace(/'/g, "''");
    console.log(`UPDATE ordens_servico SET dados_json = '${sqlSafeJson}' WHERE numero_os = '10-0826';\n`);
  }
  process.exit(0);
}

getUpdate10();
