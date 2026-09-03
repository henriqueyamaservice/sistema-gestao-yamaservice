import 'dotenv/config';
import getDb from '../src/config/database.js';

async function aplicarCorrecoes() {
  const db = await getDb();

  const updates = [
    {
      id: '1785521294486',
      num: '36109',
      litros: 150.00,
      valorTotal: 891.00
    },
    {
      id: '1785863546656',
      num: '36122',
      litros: 50.00,
      valorTotal: 297.00
    },
    {
      id: '1785865515780',
      num: '36128',
      litros: 465.20,
      valorTotal: 2763.29
    },
    {
      id: '1786621495311',
      num: '36172',
      litros: 150.00,
      valorTotal: 891.00
    }
  ];

  for (const u of updates) {
    const row = await db.get('SELECT dados_json FROM saidas_combustivel WHERE id = ?', [u.id]);
    let d = JSON.parse(row.dados_json || '{}');
    d.qtde = u.litros.toFixed(2);
    d.valorTotal = u.valorTotal.toFixed(2);

    await db.run(`
      UPDATE saidas_combustivel 
      SET litros = ?, valor_total = ?, dados_json = ? 
      WHERE id = ?
    `, [u.litros, u.valorTotal, JSON.stringify(d), u.id]);

    console.log(`✅ Req ${u.num} atualizada para ${u.litros} L (R$ ${u.valorTotal})`);
  }

  process.exit(0);
}

aplicarCorrecoes();
