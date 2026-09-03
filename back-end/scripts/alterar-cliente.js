import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const OMIE_APP_KEY = process.env.OMIE_APP_KEY;
const OMIE_APP_SECRET = process.env.OMIE_APP_SECRET;

async function alterarCliente() {
  const payloadOmie = {
    call: "AlterarCliente",
    app_key: OMIE_APP_KEY,
    app_secret: OMIE_APP_SECRET,
    param: [{
      codigo_cliente_omie: 748316329,
      estado: "PA", // Adding State
      cidade: "CAMETA",
      bairro: "ZONA RURAL",
      endereco: "N/A"
    }]
  };
  
  const response = await fetch('https://app.omie.com.br/api/v1/geral/clientes/', {
    method: 'POST',
    headers: { 'Content-type': 'application/json' },
    body: JSON.stringify(payloadOmie)
  });
  
  console.dir(await response.json(), { depth: null });
}

alterarCliente();
