import 'dotenv/config';
import getDb from '../src/config/database.js';

async function checkReqs() {
  const db = await getDb();
  const reqNums = ['36109', '36122', '36128', '36172', '36183'];
  
  for (const num of reqNums) {
    const row = await db.get(`
      SELECT id, placa, litros, valor_litro, valor_total, dados_json 
      FROM saidas_combustivel 
      WHERE dados_json LIKE ?
    `, [`%"numeroRequisicao":"${num}"%`]);

    if (row) {
      const d = JSON.parse(row.dados_json || '{}');
      console.log(`Req: ${num} | ID: ${row.id} | Litros Col: ${row.litros} | JSON qtde: ${d.qtde} | Veic: ${d.veiculo} | ValorTotal: ${row.valor_total} | Unit: ${d.valorUnitario}`);
    } else {
      console.log(`Req: ${num} NÃO ENCONTRADA!`);
    }
  }

  process.exit(0);
}

checkReqs();
