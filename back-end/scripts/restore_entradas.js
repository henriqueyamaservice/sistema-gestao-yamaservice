import 'dotenv/config';
import getDb from '../src/config/database.js';

async function restoreEntradas() {
  const db = await getDb();
  
  await db.run('DELETE FROM entradas_combustivel');
  
  const lote1 = {
    id: '1785347162488',
    fornecedor: 'VETRA',
    tipo_combustivel: 'DIESEL',
    quantidade_litros: 15000,
    valor_total: 89100,
    data_entrada: '2026-07-29',
    nota_fiscal: '950',
    valor_unitario: 5.94,
    estoque_destino: 'P YAMAVES',
    situacao: 'EM CONSUMO',
    observacao: '',
    dados_json: JSON.stringify({id:"1785347162488",data:"2026-07-29",fornecedor:"VETRA",produto:"DIESEL",quantidade:15000,notaFiscal:"950",valorUn:5.94,estoque:"P YAMAVES",situacao:"EM CONSUMO",observacao:"",valorTotal:"89100.00",situacaoForcada:"ESGOTADO"})
  };
  
  const lote2 = {
    id: '1787075598055',
    fornecedor: 'VETRA COMERCIO (GM)',
    tipo_combustivel: 'DIESEL',
    quantidade_litros: 15000,
    valor_total: 88500,
    data_entrada: '2026-08-13',
    nota_fiscal: '1019',
    valor_unitario: 5.9,
    estoque_destino: 'P YAMAVES',
    situacao: 'INTEGRO',
    observacao: '',
    dados_json: JSON.stringify({id:"1787075598055",data:"2026-08-13",fornecedor:"VETRA COMERCIO (GM)",produto:"DIESEL",quantidade:15000,notaFiscal:"1019",valorUn:5.9,estoque:"P YAMAVES",situacao:"INTEGRO",observacao:"",valorTotal:"88500.00",situacaoForcada:""})
  };
  
  const lote3 = {
    id: 'PROV-ARLA-1000',
    fornecedor: 'VETRA',
    tipo_combustivel: 'ARLA REDUX',
    quantidade_litros: 1000,
    valor_total: 0,
    data_entrada: '2026-07-28',
    nota_fiscal: 'PROV-ARLA',
    valor_unitario: 0,
    estoque_destino: 'P YAMAVES',
    situacao: 'EM ESTOQUE',
    observacao: 'Lote Provisório',
    dados_json: JSON.stringify({id:"PROV-ARLA-1000",fornecedor:"VETRA",produto:"ARLA REDUX",quantidade:1000,valorTotal:0,data:"2026-07-28",notaFiscal:"PROV-ARLA",valorUn:0,estoque:"P YAMAVES",situacao:"EM ESTOQUE",observacao:"Lote Provisório"})
  };
  
  for (const l of [lote1, lote2, lote3]) {
    await db.run(
      `INSERT INTO entradas_combustivel (id, fornecedor, tipo_combustivel, quantidade_litros, valor_total, data_entrada, nota_fiscal, valor_unitario, estoque_destino, situacao, observacao, dados_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [l.id, l.fornecedor, l.tipo_combustivel, l.quantidade_litros, l.valor_total, l.data_entrada, l.nota_fiscal, l.valor_unitario, l.estoque_destino, l.situacao, l.observacao, l.dados_json]
    );
  }
  
  console.log('Restored entradas!');
  process.exit(0);
}
restoreEntradas();
