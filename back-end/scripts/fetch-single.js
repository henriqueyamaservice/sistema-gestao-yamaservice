import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const OMIE_APP_KEY = process.env.OMIE_APP_KEY?.trim();
const OMIE_APP_SECRET = process.env.OMIE_APP_SECRET?.trim();
const OMIE_API_URL = 'https://app.omie.com.br/api/v1/geral/produtos/';

async function testarProduto() {
  try {
    const response = await fetch(OMIE_API_URL, {
      method: 'POST',
      headers: { 'Content-type': 'application/json' },
      body: JSON.stringify({
        call: "ConsultarProduto",
        app_key: OMIE_APP_KEY,
        app_secret: OMIE_APP_SECRET,
        param: [{
          codigo: process.argv[2] || "PRD10936"
        }]
      })
    });

    const data = await response.json();
    if (data.codigo) {
      data.quantidade_estoque = 5;
      data.estoque_minimo = 10;
      
      const filePath = path.join(__dirname, '..', 'data', 'produtos.json');
      const produtos = JSON.parse(await fs.readFile(filePath, 'utf-8'));
      
      // Remove if already exists
      const filtrados = produtos.filter(p => p.codigo !== data.codigo);
      // Add to beginning
      filtrados.unshift(data);
      
      await fs.writeFile(filePath, JSON.stringify(filtrados, null, 2));
      console.log(`Produto ${data.codigo} baixado e inserido no banco local!`);
    } else {
      console.log("Produto não retornado pela Omie.", data);
    }
  } catch (err) {
    console.error("Erro:", err);
  }
}

testarProduto();
