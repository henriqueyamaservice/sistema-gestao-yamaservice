import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const OMIE_APP_KEY = process.env.OMIE_APP_KEY;
const OMIE_APP_SECRET = process.env.OMIE_APP_SECRET;

async function testBaixa() {
  const payloadOmie = {
    call: "IncluirAjusteEstoque",
    app_key: OMIE_APP_KEY,
    app_secret: OMIE_APP_SECRET,
    param: [{
      codigo_local_estoque: 685531866, // Padrão
      id_prod: 12033114029, // PRD10936
      data: new Date().toLocaleDateString('pt-BR'),
      quan: 1,
      obs: "Teste manual via API com valor",
      origem: "AJU",
      tipo: "SAI",
      motivo: "INV",
      valor: 0.01
    }]
  };
  
  const response = await fetch('https://app.omie.com.br/api/v1/estoque/ajuste/', {
    method: 'POST',
    headers: { 'Content-type': 'application/json' },
    body: JSON.stringify(payloadOmie)
  });
  
  console.dir(await response.json(), { depth: null });
}

testBaixa();
