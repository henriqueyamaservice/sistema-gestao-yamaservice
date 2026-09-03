import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const OMIE_APP_KEY = process.env.OMIE_APP_KEY;
const OMIE_APP_SECRET = process.env.OMIE_APP_SECRET;

async function listarPosicaoEstoque() {
  const url = 'https://app.omie.com.br/api/v1/estoque/resumo/';
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-type': 'application/json' },
    body: JSON.stringify({
      call: "ListarPosicaoEstoque",
      app_key: OMIE_APP_KEY,
      app_secret: OMIE_APP_SECRET,
      param: [{
        pagina: 1,
        registros_por_pagina: 100,
        data_posicao: "13/07/2026"
      }]
    })
  });
  return await response.json();
}

listarPosicaoEstoque().then(res => {
  if (res.produtos) {
    console.log(`Encontrados ${res.produtos.length} produtos na primeira pagina.`);
    console.dir(res.produtos.slice(0,2), {depth: null});
  } else {
    console.log(res);
  }
});
