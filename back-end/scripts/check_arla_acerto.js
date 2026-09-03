import 'dotenv/config';
import getDb from '../src/config/database.js';

async function checkArla() {
  const db = await getDb();
  const entradas = await db.all('SELECT * FROM entradas_combustivel WHERE tipo_combustivel = ? ORDER BY data_entrada ASC', ['ARLA REDUX']);
  const saidas = await db.all('SELECT * FROM saidas_combustivel WHERE tipo_combustivel = ?', ['ARLA REDUX']);

  console.log('--- ENTRADAS ARLA ---');
  let totalEntradas = 0;
  entradas.forEach(e => {
    const d = JSON.parse(e.dados_json || '{}');
    const qtd = parseFloat(e.quantidade_litros || d.quantidade || 0);
    totalEntradas += qtd;
    console.log(`ID: ${e.id} | Data: ${e.data_entrada} | NF: ${e.nota_fiscal} | Forn: ${e.fornecedor} | Qtd: ${qtd} | Destino: ${e.estoque_destino}`);
  });

  console.log('--- TOTAL ENTRADAS ARLA:', totalEntradas);

  let totalSaidasConcluidas = 0;
  let totalSaidasTodas = 0;
  saidas.forEach(s => {
    const d = JSON.parse(s.dados_json || '{}');
    const litros = parseFloat(s.litros || d.qtde || 0);
    totalSaidasTodas += litros;
    if (s.tanque_origem === 'ALMOXARIFADO' && (d.status === 'CONCLUÍDO' || d.status === 'ABASTECIDA')) {
      totalSaidasConcluidas += litros;
    }
  });

  console.log('--- TOTAL SAIDAS CONCLUIDAS:', totalSaidasConcluidas);
  console.log('--- SALDO ATUAL DO SISTEMA:', totalEntradas - totalSaidasConcluidas);
  console.log('--- META (FISICO REAL): 600');
  console.log('--- DIFERENCA A ABATER:', (totalEntradas - totalSaidasConcluidas) - 600);

  process.exit(0);
}

checkArla();
