import 'dotenv/config';
import fs from 'fs/promises';
import getDb from '../src/config/database.js';

async function atualizarPrecosRetroativos() {
  const db = await getDb();

  const produtos = await db.all('SELECT codigo, descricao, valor_unitario FROM produtos_omie');
  const prodMap = new Map();
  produtos.forEach(p => {
    if (p.codigo) prodMap.set(p.codigo.trim().toUpperCase(), parseFloat(p.valor_unitario) || 0);
    if (p.descricao) prodMap.set(p.descricao.trim().toUpperCase(), parseFloat(p.valor_unitario) || 0);
  });

  const ordens = await db.all('SELECT id, numero_os, setor, dados_json FROM ordens_servico');
  console.log(`Total de O.S. no banco: ${ordens.length}`);

  let osAtualizadas = 0;
  let sqlUpdates = [];

  for (const o of ordens) {
    let d = {};
    try { d = JSON.parse(o.dados_json || '{}'); } catch(e){}

    let mudou = false;

    if (d.consumiveis && Array.isArray(d.consumiveis)) {
      d.consumiveis = d.consumiveis.map(c => {
        let vUnit = parseFloat(c.valor_unitario) || 0;
        if (!vUnit) {
          const cod = (c.codigo || '').trim().toUpperCase();
          const desc = (c.descricao || '').trim().toUpperCase();
          vUnit = prodMap.get(cod) || prodMap.get(desc) || 0;
          if (vUnit > 0) mudou = true;
        }
        return { ...c, valor_unitario: vUnit };
      });
    }

    if (mudou) {
      osAtualizadas++;
      const novoJson = JSON.stringify(d);
      await db.run('UPDATE ordens_servico SET dados_json = ? WHERE id = ?', [novoJson, o.id]);
      
      const sqlSafeJson = novoJson.replace(/'/g, "''");
      sqlUpdates.push(`UPDATE ordens_servico SET dados_json = '${sqlSafeJson}' WHERE id = '${o.id}';`);
    }
  }

  console.log(`✅ ${osAtualizadas} Ordens de Serviço foram atualizadas com os preços reais das peças!`);

  // Salvar arquivo SQL para a VPS
  const sqlContent = `-- ============================================================
-- SCRIPT DE ATUALIZAÇÃO RETROATIVA DE PREÇOS DE PEÇAS NAS O.S.
-- ============================================================
${sqlUpdates.join('\n')}
`;
  await fs.writeFile('vps_atualizar_precos_os.sql', sqlContent, 'utf8');
  console.log('✅ Arquivo vps_atualizar_precos_os.sql gerado com sucesso!');

  process.exit(0);
}

atualizarPrecosRetroativos();
