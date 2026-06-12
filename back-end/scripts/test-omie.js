import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const OMIE_APP_KEY = process.env.OMIE_APP_KEY?.trim();
const OMIE_APP_SECRET = process.env.OMIE_APP_SECRET?.trim();
const OMIE_API_URL = 'https://app.omie.com.br/api/v1/estoque/ajuste/';

async function testarAjuste() {
  try {
    const response = await fetch(OMIE_API_URL, {
      method: 'POST',
      headers: { 'Content-type': 'application/json' },
      body: JSON.stringify({
        call: "IncluirAjusteEstoque",
        app_key: OMIE_APP_KEY,
        app_secret: OMIE_APP_SECRET,
        param: [{
          id_prod: 0,
          qtde: 1,
          data: "12/06/2026",
          motivo: "teste"
        }]
      })
    });

    const text = await response.text();
    console.log("RESPOSTA HTTP:", response.status);
    console.log("RESPOSTA BODY:", text);
  } catch (e) {
    console.error("ERRO FETCH:", e.message, e);
  }
}

testarAjuste();
