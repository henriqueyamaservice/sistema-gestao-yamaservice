import 'dotenv/config';
import getDb from '../src/config/database.js';

async function testFifo() {
  const db = await getDb();
  const entradas = await db.all('SELECT * FROM entradas_combustivel WHERE tipo_combustivel = ?', ['ARLA REDUX']);
  const saidas = await db.all('SELECT * FROM saidas_combustivel WHERE tipo_combustivel = ?', ['ARLA REDUX']);

  const eData = entradas.map(e => JSON.parse(e.dados_json||'{}'));
  const sData = saidas.map(s => JSON.parse(s.dados_json||'{}')).filter(s => s.status === 'CONCLUÍDO');

  eData.sort((a,b) => new Date(a.data) - new Date(b.data));
  sData.sort((a,b) => new Date(a.data) - new Date(b.data));

  eData.forEach(e => e.saldo = parseFloat(e.quantidade));

  sData.forEach(s => {
    let qtde = parseFloat(s.qtde);
    for (const e of eData) {
      if (qtde <= 0) break;
      if (e.estoque.toUpperCase() === s.fornecedor.toUpperCase()) {
        const consumido = Math.min(e.saldo, qtde);
        e.saldo -= consumido;
        qtde -= consumido;
        if (!e.extrato) e.extrato = [];
        e.extrato.push({req: s.numeroRequisicao, qtde: consumido});
      }
    }
  });

  console.log('Lotes de Arla:');
  eData.forEach(e => {
    console.log(`- ${e.fornecedor} (NF ${e.notaFiscal}) | Original: ${e.quantidade} | Saldo Atual: ${e.saldo.toFixed(2)}`);
    console.log(`  Extrato (${(e.extrato||[]).length} itens)`);
  });
  
  process.exit(0);
}
testFifo();
