import 'dotenv/config';
import getDb from '../src/config/database.js';

async function checkPecasEPrecos() {
  const db = await getDb();
  
  const sampleProds = await db.all('SELECT codigo, descricao, valor_unitario FROM produtos_omie LIMIT 10');
  console.log('Sample Produtos Omie:', sampleProds);

  const pecasUtilizadas = await db.all('SELECT * FROM os_pecas_utilizadas LIMIT 10');
  console.log('Pecas utilizadas em Turnos:', pecasUtilizadas);

  const ordens = await db.all('SELECT id, numero_os, setor, dados_json FROM ordens_servico WHERE setor = "MECANICA" LIMIT 5');
  ordens.forEach(o => {
    const d = JSON.parse(o.dados_json || '{}');
    console.log(`OS: ${o.numero_os} | consumiveis:`, d.consumiveis, '| servicosExecutados:', (d.servicosExecutados||[]).map(s => s.pecasUtilizadas));
  });

  process.exit(0);
}

checkPecasEPrecos();
