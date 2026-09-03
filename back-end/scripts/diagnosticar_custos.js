import 'dotenv/config';
import getDb from '../src/config/database.js';

async function diagnosticarCustos() {
  const db = await getDb();
  const rows = await db.all('SELECT id, numero_os, setor, situacao, dados_json FROM ordens_servico');
  
  let somaGeral = 0;
  console.log('--- RELATÓRIO DE TODAS AS OS COM CUSTO NO BANCO LOCAL ---');
  
  const listaComCusto = [];

  rows.forEach(r => {
    let d = {};
    try { d = JSON.parse(r.dados_json || '{}'); } catch(e){}
    
    let totalOS = 0;
    if (d.consumiveis && Array.isArray(d.consumiveis)) {
      d.consumiveis.forEach(c => {
        const q = parseFloat(c.quantidade) || 0;
        const v = parseFloat(c.valor_unitario) || 0;
        totalOS += q * v;
      });
    }
    
    if (totalOS === 0 && d.servicosExecutados && Array.isArray(d.servicosExecutados)) {
      d.servicosExecutados.forEach(s => {
        (s.pecasUtilizadas || []).forEach(p => {
          const q = parseFloat(p.quantidade) || 0;
          const v = parseFloat(p.valor_unitario) || 0;
          totalOS += q * v;
        });
      });
    }

    if (totalOS > 0) {
      somaGeral += totalOS;
      listaComCusto.push({
        id: r.id,
        codigo: r.numero_os,
        setor: r.setor,
        situacao: r.situacao,
        total: totalOS,
        itensCount: (d.consumiveis || []).length
      });
      console.log(`OS: ${r.numero_os.padEnd(10)} | ID: ${r.id} | Setor: ${r.setor.padEnd(18)} | Custo: R$ ${totalOS.toFixed(2).padStart(8)} | Itens: ${(d.consumiveis || []).length}`);
    }
  });

  console.log('----------------------------------------------------');
  console.log(`TOTAL GERAL: R$ ${somaGeral.toFixed(2)} (em ${listaComCusto.length} OSs)`);
  
  process.exit(0);
}

diagnosticarCustos();
