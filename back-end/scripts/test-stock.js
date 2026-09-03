import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const OMIE_APP_KEY = process.env.OMIE_APP_KEY;
const OMIE_APP_SECRET = process.env.OMIE_APP_SECRET;

async function listarLocaisEstoque() {
  const url = 'https://app.omie.com.br/api/v1/estoque/local/';
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-type': 'application/json' },
    body: JSON.stringify({
      call: "ListarLocaisEstoque",
      app_key: OMIE_APP_KEY,
      app_secret: OMIE_APP_SECRET,
      param: [{ pagina: 1, registros_por_pagina: 50 }]
    })
  });
  return await response.json();
}

async function listarPosicaoEstoqueTotal() {
  const url = 'https://app.omie.com.br/api/v1/estoque/consulta/';
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-type': 'application/json' },
    body: JSON.stringify({
      call: "ListarPosicaoEstoque",
      app_key: OMIE_APP_KEY,
      app_secret: OMIE_APP_SECRET,
      param: [{
        pagina: 1,
        registros_por_pagina: 50,
        data: "13/07/2026"
      }]
    })
  });
  return await response.json();
}

async function main() {
  console.log("Locais de Estoque:");
  const locais = await listarLocaisEstoque();
  console.dir(locais, { depth: null });

  console.log("\nPosicao Estoque (Primeira Pagina):");
  const posicao = await listarPosicaoEstoqueTotal();
  if (posicao && posicao.produtos) {
    console.dir(posicao.produtos.slice(0, 5), { depth: null });
  } else {
    console.log(posicao);
  }
}
main();
