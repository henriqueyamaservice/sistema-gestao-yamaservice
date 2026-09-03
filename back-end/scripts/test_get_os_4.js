import 'dotenv/config';
import getDb from '../src/config/database.js';

async function testarGetOs4() {
  const db = await getDb();
  const numeros = ['10-0826', '77-0826', '82-0826', '92-0826'];
  const prodRows = await db.all('SELECT codigo, descricao, valor_unitario FROM produtos_omie');
  const prodMap = new Map();
  prodRows.forEach(p => {
    if (p.codigo) prodMap.set(p.codigo.trim().toUpperCase(), parseFloat(p.valor_unitario) || 0);
    if (p.descricao) prodMap.set(p.descricao.trim().toUpperCase(), parseFloat(p.valor_unitario) || 0);
  });

  for (const n of numeros) {
    const row = await db.get('SELECT * FROM ordens_servico WHERE numero_os = ?', [n]);
    if (!row) {
      console.log(`OS ${n} NÃO ENCONTRADA!`);
      continue;
    }
    const d = JSON.parse(row.dados_json || '{}');
    console.log(`\nOS ${n} (ID: ${row.id}):`);
    console.log('consumiveis no JSON:', d.consumiveis);
    
    let soma = 0;
    (d.consumiveis || []).forEach(c => {
      let v = parseFloat(c.valor_unitario) || 0;
      if (!v) {
        v = prodMap.get((c.codigo || '').trim().toUpperCase()) || 0;
      }
      const q = parseFloat(c.quantidade) || 0;
      soma += q * v;
      console.log(` - Item: ${c.codigo} | ${c.descricao} | Qtd: ${q} | VUnit: ${v} | Subtotal: ${q * v}`);
    });
    console.log(`>> SOMA CALCULADA: R$ ${soma.toFixed(2)}`);
  }

  process.exit(0);
}

testarGetOs4();
