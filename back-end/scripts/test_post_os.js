import 'dotenv/config';
import getDb from '../src/config/database.js';

async function testPostOs() {
  const db = await getDb();

  console.log('--- ESTRUTURA TABELA ordens_servico ---');
  const cols = await db.all('DESCRIBE ordens_servico');
  console.log(cols.map(c => `${c.Field} (${c.Type})`));

  // Testar a consulta da trava anti-duplicação
  const limiteTempo = new Date(Date.now() - 2 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
  const sqlDuplicidade = `
    SELECT * FROM ordens_servico 
    WHERE requisitante = ? 
      AND setor = ? 
      AND descricao = ? 
      AND data_criacao >= ?
  `;
  try {
    const dup = await db.get(sqlDuplicidade, ['TESTE', 'MECANICA', 'TESTE DESC', limiteTempo]);
    console.log('Query duplicidade OK, resultado:', dup);
  } catch (err) {
    console.error('❌ ERRO NA QUERY DUPLICIDADE:', err);
  }

  // Testar contagem de proximo codigo
  const dataReq = '2026-08-26';
  const [ano, mes] = dataReq.split('-');
  const sufixo = `${mes}${ano.slice(-2)}`;
  const rows = await db.all(`SELECT numero_os FROM ordens_servico WHERE numero_os LIKE ?`, [`%-${sufixo}`]);
  console.log(`Encontradas ${rows.length} OSs com sufixo ${sufixo}`);

  process.exit(0);
}

testPostOs();
