import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const OMIE_APP_KEY = process.env.OMIE_APP_KEY;
const OMIE_APP_SECRET = process.env.OMIE_APP_SECRET;
const OMIE_API_URL = 'https://app.omie.com.br/api/v1/estoque/consulta/';

async function consultarEstoque(codigo) {
  try {
    const response = await fetch(OMIE_API_URL, {
      method: 'POST',
      headers: { 'Content-type': 'application/json' },
      body: JSON.stringify({
        call: "PosicaoEstoque",
        app_key: OMIE_APP_KEY,
        app_secret: OMIE_APP_SECRET,
        param: [{
          id_prod: 0,
          codigo_local_estoque: 0,
          data: "", 
          codigo: codigo
        }]
      })
    });
    const data = await response.json();
    return data;
  } catch (err) {
    console.error(err);
    return null;
  }
}

async function main() {
  const codigos = ['PRD07198', 'PRD10936', 'PRD05246', 'PRD03036'];
  for (const cod of codigos) {
    const res = await consultarEstoque(cod);
    let saldo = 0;
    if (res && res.produtos && res.produtos.length > 0) {
       saldo = res.produtos[0].saldo;
    }
    console.log(`Estoque de ${cod}: ${saldo}`);
  }
}

main();
