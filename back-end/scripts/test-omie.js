import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const OMIE_APP_KEY = process.env.OMIE_APP_KEY?.trim();
const OMIE_APP_SECRET = process.env.OMIE_APP_SECRET?.trim();
const OMIE_API_URL = 'https://app.omie.com.br/api/v1/geral/produtos/';

async function testarProduto() {
  const response = await fetch(OMIE_API_URL, {
    method: 'POST',
    headers: { 'Content-type': 'application/json' },
    body: JSON.stringify({
      call: "ConsultarProduto",
      app_key: OMIE_APP_KEY,
      app_secret: OMIE_APP_SECRET,
      param: [{
        codigo: "PRD11302"
      }]
    })
  });

  const data = await response.json();
  console.log("PRODUTO:", data.codigo, "-", data.descricao);
  console.log("MARCA ROOT:", data.marca);
  console.log("CARACTERISTICAS:", JSON.stringify(data.caracteristicas, null, 2));
}

testarProduto();
