const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./back-end/data/almoxarifado.db');

db.get('SELECT * FROM requisicoes ORDER BY id DESC LIMIT 1', (err, row) => {
  if (err) console.error(err);
  else console.log(row.dados_json);
  db.close();
});
