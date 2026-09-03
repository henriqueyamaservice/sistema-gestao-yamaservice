import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const OMIE_APP_KEY = process.env.OMIE_APP_KEY;
const OMIE_APP_SECRET = process.env.OMIE_APP_SECRET;

async function consultarEstoqueIdProd(id_prod) {
  const url = 'https://app.omie.com.br/api/v1/estoque/consulta/';
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-type': 'application/json' },
    body: JSON.stringify({
      call: "PosicaoEstoque",
      app_key: OMIE_APP_KEY,
      app_secret: OMIE_APP_SECRET,
      param: [{
        id_prod: id_prod,
        codigo_local_estoque: 0, // se 0 busca geral
        data: ""
      }]
    })
  });
  return await response.json();
}

async function main() {
  console.log("Posicao Estoque por id_prod=12033114029:");
  const res = await consultarEstoqueIdProd(12033114029); // PRD10936
  console.dir(res, { depth: null });
}
main();
