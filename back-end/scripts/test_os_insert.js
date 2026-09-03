import 'dotenv/config';
import getDb from '../src/config/database.js';

async function testarCriacaoOs() {
  const db = await getDb();

  // Testar inserção direta
  const dataReq = new Date().toISOString().split('T')[0];
  const [ano, mes] = dataReq.split('-');
  const sufixo = `${mes}${ano.slice(-2)}`;
  const rows = await db.all(`SELECT numero_os FROM ordens_servico WHERE numero_os LIKE ?`, [`%-${sufixo}`]);
  let proximoNumero = 1;
  if (rows.length > 0) {
    const numeros = rows.map(r => parseInt((r.numero_os || '').split('-')[0], 10) || 0);
    proximoNumero = Math.max(...numeros) + 1;
  }
  const codigo = `${proximoNumero.toString().padStart(2, '0')}-${sufixo}`;
  const id = Date.now().toString() + Math.floor(Math.random() * 10000).toString();
  const dataCriacao = new Date().toISOString();

  console.log(`Tentando inserir OS teste: ${codigo} (ID: ${id})`);

  const queryInsert = `INSERT INTO ordens_servico 
    (id, numero_os, situacao, tipo, setor, centro_custo, requisitante, tecnico, prioridade, complexidade, valor_estimado, data_criacao, dados_json, descricao, motivo, observacao, resultado, prazo, is_emergencia)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  const params = [
    id, codigo, 'AGUARDANDO_CHEFE_SETOR', 'CORRETIVA', 'ELETRICA', 'TESTE_CC',
    'TESTE_USER', null, '1-NORMAL', 'NORMAL',
    0, dataCriacao.slice(0, 19).replace('T', ' '), JSON.stringify({ id, codigo, descricao: 'Teste de Inserção' }),
    'Teste de Inserção', null, null, null, null, 0
  ];

  await db.run(queryInsert, params);
  console.log(`✅ OS ${codigo} inserida com sucesso!`);

  // Remover a OS de teste para não poluir
  await db.run('DELETE FROM ordens_servico WHERE id = ?', [id]);
  console.log(`✅ OS de teste limpa.`);

  process.exit(0);
}

testarCriacaoOs();
