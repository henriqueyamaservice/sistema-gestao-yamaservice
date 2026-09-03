import 'dotenv/config';
import getDb from '../src/config/database.js';

async function test() {
  const db = await getDb();
  const s = await db.get('SELECT * FROM saidas_combustivel WHERE tipo_combustivel = ? AND dados_json LIKE ? LIMIT 1', ['ARLA REDUX', '%CONCLUÍDO%']);
  console.log('Raw row:', s);
  const d = JSON.parse(s.dados_json||'{}');
  console.log('JSON:', d);
  process.exit(0);
}
test();
