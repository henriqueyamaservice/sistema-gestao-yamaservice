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
  const codigos = ["PRD09736", "PRD00129", "PRD11301", "PRD11302"];
  
  const filePath = path.join(__dirname, '..', 'data', 'produtos.json');
  let produtos = JSON.parse(await fs.readFile(filePath, 'utf-8'));

  for (let codigo of codigos) {
    try {
      const response = await fetch(OMIE_API_URL, {
        method: 'POST',
        headers: { 'Content-type': 'application/json' },
        body: JSON.stringify({
          call: "ConsultarProduto",
          app_key: OMIE_APP_KEY,
          app_secret: OMIE_APP_SECRET,
          param: [{ codigo: codigo }]
        })
      });

      const data = await response.json();
      if (data.codigo) {
        data.quantidade_estoque = 5;
        data.estoque_minimo = 10;
        
        produtos = produtos.filter(p => p.codigo !== data.codigo);
        produtos.unshift(data);
        console.log(`Baixado: ${data.codigo}`);
      } else {
        console.log(`Falha ao baixar ${codigo}:`, data.faultstring);
      }
    } catch (err) {
      console.error(`Erro rede ${codigo}:`, err.message);
    }
  }

  await fs.writeFile(filePath, JSON.stringify(produtos, null, 2));
  console.log("Banco atualizado!");
}

testarProduto();
