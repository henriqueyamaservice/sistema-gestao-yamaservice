import 'dotenv/config';
import getDb from '../src/config/database.js';
import fs from 'fs';

async function generateSQL() {
  const db = await getDb();
  
  let sql = 'DELETE FROM entradas_combustivel;\n';
  sql += 'DELETE FROM saidas_combustivel;\n\n';
  
  const entradas = await db.all('SELECT * FROM entradas_combustivel');
  for (const e of entradas) {
    const jsonStr = e.dados_json ? e.dados_json.replace(/'/g, "''") : '{}';
    sql += `INSERT INTO entradas_combustivel (id, fornecedor, tipo_combustivel, quantidade_litros, valor_total, data_entrada, nota_fiscal, valor_unitario, estoque_destino, situacao, observacao, dados_json) VALUES ('${e.id}', '${e.fornecedor || ''}', '${e.tipo_combustivel || ''}', ${e.quantidade_litros || 0}, ${e.valor_total || 0}, ${e.data_entrada ? "'" + e.data_entrada + "'" : 'NULL'}, '${e.nota_fiscal || ''}', ${e.valor_unitario || 0}, '${e.estoque_destino || ''}', '${e.situacao || ''}', '${e.observacao || ''}', '${jsonStr}');\n`;
  }
  
  sql += '\n';
  
  const saidas = await db.all('SELECT * FROM saidas_combustivel');
  for (const s of saidas) {
    const jsonStr = s.dados_json ? s.dados_json.replace(/'/g, "''") : '{}';
    sql += `INSERT INTO saidas_combustivel (id, placa, motorista, tipo_combustivel, litros, valor_total, tanque_origem, data_hora, dados_json) VALUES ('${s.id}', '${s.placa || ''}', '${s.motorista || ''}', '${s.tipo_combustivel || ''}', ${s.litros || 0}, ${s.valor_total || 0}, '${s.tanque_origem || ''}', ${s.data_hora ? "'" + s.data_hora + "'" : 'NULL'}, '${jsonStr}');\n`;
  }
  
  fs.writeFileSync('../vps_update.sql', sql);
  console.log('vps_update.sql generated.');
  process.exit(0);
}

generateSQL();
