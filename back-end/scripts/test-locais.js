import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const OMIE_APP_KEY = process.env.OMIE_APP_KEY;
const OMIE_APP_SECRET = process.env.OMIE_APP_SECRET;

async function listarLocais() {
  const url = 'https://app.omie.com.br/api/v1/estoque/local/';
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-type': 'application/json' },
    body: JSON.stringify({
      call: "ListarLocaisEstoque",
      app_key: OMIE_APP_KEY,
      app_secret: OMIE_APP_SECRET,
      param: [{ nPagina: 1, nRegPorPagina: 100 }]
    })
  });
  const data = await response.json();
  const filePath = path.join(__dirname, '..', 'data', 'omie_locais_estoque.json');
  await fs.writeFile(filePath, JSON.stringify(data.locaisEncontrados, null, 2));
  console.log("Arquivo salvo com sucesso sem sujeira do dotenvx!");
}
listarLocais();
