import 'dotenv/config';
import getDb from '../src/config/database.js';

async function simularPrecos() {
  const db = await getDb();
  
  const produtos = await db.all('SELECT codigo, descricao, valor_unitario FROM produtos_omie');
  const prodMap = new Map();
  produtos.forEach(p => {
    if (p.codigo) prodMap.set(p.codigo.trim().toUpperCase(), parseFloat(p.valor_unitario) || 0);
    if (p.descricao) prodMap.set(p.descricao.trim().toUpperCase(), parseFloat(p.valor_unitario) || 0);
  });

  const ordens = await db.all('SELECT id, numero_os, setor, dados_json FROM ordens_servico');
  
  let totalGeral = 0;
  let totalMecanica = 0;

  ordens.forEach(o => {
    const d = JSON.parse(o.dados_json || '{}');
    let totalOS = 0;
    
    // Testa consumiveis
    if (d.consumiveis && Array.isArray(d.consumiveis)) {
      d.consumiveis.forEach(c => {
        let preco = parseFloat(c.valor_unitario) || 0;
        if (!preco) {
          const cod = (c.codigo || '').trim().toUpperCase();
          const desc = (c.descricao || '').trim().toUpperCase();
          preco = prodMap.get(cod) || prodMap.get(desc) || 0;
        }
        const qtd = parseFloat(c.quantidade) || 0;
        totalOS += qtd * preco;
      });
    }

    if (totalOS > 0) {
      console.log(`OS: ${o.numero_os} (${o.setor}) -> Custo Peças: R$ ${totalOS.toFixed(2)}`);
      totalGeral += totalOS;
      if (o.setor === 'MECANICA') totalMecanica += totalOS;
    }
  });

  console.log('---------------------------------');
  console.log(`TOTAL MECANICA: R$ ${totalMecanica.toFixed(2)}`);
  console.log(`TOTAL GERAL: R$ ${totalGeral.toFixed(2)}`);

  process.exit(0);
}

simularPrecos();
