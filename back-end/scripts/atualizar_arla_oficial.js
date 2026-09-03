import 'dotenv/config';
import getDb from '../src/config/database.js';
import fs from 'fs';

async function updateArla() {
  const db = await getDb();
  
  // 1. Delete provisional entry
  await db.run('DELETE FROM entradas_combustivel WHERE id = ?', ['PROV-ARLA-1000']);
  
  // 2. Insert the 4 new entries
  const entradas = [
    {
      id: 'ARLA-' + Date.now() + '1',
      fornecedor: 'Ipe quimica do para ltda',
      tipo_combustivel: 'ARLA REDUX',
      quantidade_litros: 1000,
      valor_total: 2500.00,
      data_entrada: '2026-07-02',
      nota_fiscal: '00001054',
      valor_unitario: 2.50,
      estoque_destino: 'ALMOXARIFADO',
      situacao: 'EM ESTOQUE',
      observacao: 'Data do registro 03/07/26'
    },
    {
      id: 'ARLA-' + Date.now() + '2',
      fornecedor: 'posto oriente',
      tipo_combustivel: 'ARLA REDUX',
      quantidade_litros: 100,
      valor_total: 349.00,
      data_entrada: '2026-08-06',
      nota_fiscal: '1120272',
      valor_unitario: 3.49,
      estoque_destino: 'ALMOXARIFADO',
      situacao: 'EM ESTOQUE',
      observacao: 'Data do registro 06/08/26'
    },
    {
      id: 'ARLA-' + Date.now() + '3',
      fornecedor: 'posto oriente',
      tipo_combustivel: 'ARLA REDUX',
      quantidade_litros: 100,
      valor_total: 349.00,
      data_entrada: '2026-08-11',
      nota_fiscal: '1127060',
      valor_unitario: 3.49,
      estoque_destino: 'ALMOXARIFADO',
      situacao: 'EM ESTOQUE',
      observacao: 'Data do registro 17/08/26'
    },
    {
      id: 'ARLA-' + Date.now() + '4',
      fornecedor: 'ox indústria de produtos quimico',
      tipo_combustivel: 'ARLA REDUX',
      quantidade_litros: 1000,
      valor_total: 2400.00,
      data_entrada: '2026-08-13',
      nota_fiscal: '000009617',
      valor_unitario: 2.40,
      estoque_destino: 'ALMOXARIFADO',
      situacao: 'EM ESTOQUE',
      observacao: 'Data do registro 19/08/26'
    }
  ];

  for (const e of entradas) {
    const jsonDados = {
      id: e.id,
      fornecedor: e.fornecedor,
      produto: e.tipo_combustivel,
      quantidade: e.quantidade_litros,
      valorTotal: e.valor_total.toString(),
      data: e.data_entrada,
      notaFiscal: e.nota_fiscal,
      valorUn: e.valor_unitario.toString(),
      estoque: e.estoque_destino,
      situacao: e.situacao,
      observacao: e.observacao
    };
    
    await db.run(
      `INSERT INTO entradas_combustivel (id, fornecedor, tipo_combustivel, quantidade_litros, valor_total, data_entrada, nota_fiscal, valor_unitario, estoque_destino, situacao, observacao, dados_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [e.id, e.fornecedor, e.tipo_combustivel, e.quantidade_litros, e.valor_total, e.data_entrada, e.nota_fiscal, e.valor_unitario, e.estoque_destino, e.situacao, e.observacao, JSON.stringify(jsonDados)]
    );
  }
  
  // 3. Update saidas_combustivel Arla
  const saidas = await db.all('SELECT * FROM saidas_combustivel WHERE tipo_combustivel = ?', ['ARLA REDUX']);
  for (const s of saidas) {
    let d = {};
    try {
      d = JSON.parse(s.dados_json || '{}');
    } catch(e) {}
    
    d.fornecedor = 'ALMOXARIFADO'; // Update the JSON provider
    
    await db.run('UPDATE saidas_combustivel SET tanque_origem = ?, dados_json = ? WHERE id = ?', 
      ['ALMOXARIFADO', JSON.stringify(d), s.id]
    );
  }
  
  console.log(`Updated ${saidas.length} Arla outputs to ALMOXARIFADO.`);
  
  // 4. Generate SQL script for VPS
  let sql = 'DELETE FROM entradas_combustivel WHERE id = \\\'PROV-ARLA-1000\\\';\n';
  sql += 'DELETE FROM entradas_combustivel WHERE tipo_combustivel = \\\'ARLA REDUX\\\' AND fornecedor != \\\'VETRA\\\';\n'; // safety cleanup
  
  for (const e of entradas) {
    const jsonDados = {
      id: e.id,
      fornecedor: e.fornecedor,
      produto: e.tipo_combustivel,
      quantidade: e.quantidade_litros,
      valorTotal: e.valor_total.toString(),
      data: e.data_entrada,
      notaFiscal: e.nota_fiscal,
      valorUn: e.valor_unitario.toString(),
      estoque: e.estoque_destino,
      situacao: e.situacao,
      observacao: e.observacao
    };
    const jsonStr = JSON.stringify(jsonDados).replace(/'/g, "''");
    sql += `INSERT INTO entradas_combustivel (id, fornecedor, tipo_combustivel, quantidade_litros, valor_total, data_entrada, nota_fiscal, valor_unitario, estoque_destino, situacao, observacao, dados_json) VALUES ('${e.id}', '${e.fornecedor}', '${e.tipo_combustivel}', ${e.quantidade_litros}, ${e.valor_total}, '${e.data_entrada}', '${e.nota_fiscal}', ${e.valor_unitario}, '${e.estoque_destino}', '${e.situacao}', '${e.observacao}', '${jsonStr}');\n`;
  }
  
  sql += '\n-- Update saidas_combustivel\n';
  sql += 'UPDATE saidas_combustivel SET tanque_origem = \\\'ALMOXARIFADO\\\' WHERE tipo_combustivel = \\\'ARLA REDUX\\\';\n';
  
  // To update JSON in MariaDB safely via SQL without overwriting other fields:
  sql += 'UPDATE saidas_combustivel SET dados_json = JSON_SET(dados_json, \\\'$.fornecedor\\\', \\\'ALMOXARIFADO\\\') WHERE tipo_combustivel = \\\'ARLA REDUX\\\';\n';
  
  fs.writeFileSync('../vps_update_arla.sql', sql.replace(/\\\\'/g, "'"));
  console.log('vps_update_arla.sql generated successfully.');
  
  process.exit(0);
}

updateArla();
