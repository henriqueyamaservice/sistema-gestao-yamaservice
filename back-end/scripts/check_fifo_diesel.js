import 'dotenv/config';
import getDb from '../src/config/database.js';

async function checkLotesDiesel() {
  const db = await getDb();
  const entradas = await db.all('SELECT * FROM entradas_combustivel WHERE tipo_combustivel = "DIESEL" ORDER BY data_entrada ASC');
  const saidas = await db.all('SELECT * FROM saidas_combustivel WHERE tipo_combustivel = "DIESEL" AND tanque_origem = "P YAMAVES" ORDER BY data_hora ASC');

  console.log('--- ENTRADAS DIESEL ---');
  entradas.forEach(e => {
    console.log(`ID: ${e.id} | NF: ${e.nota_fiscal} | Forn: ${e.fornecedor} | Qtd: ${e.quantidade_litros}`);
  });

  const eData = entradas.map(e => ({
    id: e.id,
    nf: e.nota_fiscal,
    forn: e.fornecedor,
    qtdOriginal: parseFloat(e.quantidade_litros),
    saldo: parseFloat(e.quantidade_litros),
    consumo: []
  }));

  const sConcluidas = saidas.filter(s => {
    const d = JSON.parse(s.dados_json || '{}');
    return d.status === 'CONCLUÍDO' || d.status === 'ABASTECIDA';
  });

  sConcluidas.forEach(s => {
    const d = JSON.parse(s.dados_json || '{}');
    let qtde = parseFloat(s.litros || d.qtde || 0);
    const reqNum = d.numeroRequisicao || s.id;
    const veic = d.veiculo || s.placa;

    for (const ent of eData) {
      if (qtde <= 0) break;
      if (ent.saldo > 0) {
        const consumido = Math.min(ent.saldo, qtde);
        ent.saldo -= consumido;
        qtde -= consumido;
        ent.consumo.push({ req: reqNum, veic, consumido });
      }
    }
  });

  console.log('\n--- RESULTADO FIFO DOS LOTES DE DIESEL ---');
  eData.forEach(e => {
    console.log(`Lote NF ${e.nf} (${e.forn}) -> Original: ${e.qtdOriginal.toFixed(2)} L | Saldo Atual: ${e.saldo.toFixed(2)} L | Total Consumido: ${(e.qtdOriginal - e.saldo).toFixed(2)} L | Qtd Abastecimentos: ${e.consumo.length}`);
  });

  console.log('\n--- PRIMEIROS CONSUMOS DO SEGUNDO LOTE (NF 1019) ---');
  const lote1019 = eData.find(e => e.nf === '1019');
  if (lote1019) {
    lote1019.consumo.slice(0, 10).forEach(c => {
      console.log(`Req: ${c.req} | Veic: ${c.veic} | Qtd: ${c.consumido.toFixed(2)} L`);
    });
  }

  process.exit(0);
}

checkLotesDiesel();
