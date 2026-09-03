import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const OMIE_APP_KEY = process.env.OMIE_APP_KEY;
const OMIE_APP_SECRET = process.env.OMIE_APP_SECRET;
const OMIE_API_URL = 'https://app.omie.com.br/api/v1/geral/produtos/';

async function consultar(codigo) {
  try {
    const response = await fetch(OMIE_API_URL, {
      method: 'POST',
      headers: { 'Content-type': 'application/json' },
      body: JSON.stringify({
        call: "ConsultarProduto",
        app_key: OMIE_APP_KEY,
        app_secret: OMIE_APP_SECRET,
        param: [{ codigo }]
      })
    });
    const data = await response.json();
    return data;
  } catch (err) {
    console.error(err);
    return null;
  }
}

async function main() {
  const codigos = ['PRD07192'];
  const encontrados = [];

  for (const cod of codigos) {
    console.log(`Buscando ${cod}...`);
    const res = await consultar(cod);
    if (!res.faultstring) {
      console.log(`Encontrado: ${res.descricao}`);
      encontrados.push(res);
    } else {
      console.log(`Erro ao buscar ${cod}: ${res.faultstring}`);
    }
  }

  if (encontrados.length > 0) {
    const localFilePath = path.resolve(__dirname, '..', 'data', 'produtos.json');
    const localData = await fs.readFile(localFilePath, 'utf-8');
    let produtosAntigos = JSON.parse(localData);

    // Merge
    encontrados.forEach(novoProd => {
      // Mock de estoque inicial, mas a sync vai sobrescrever
      novoProd.quantidade_estoque = 50; 
      
      const idx = produtosAntigos.findIndex(p => p.codigo === novoProd.codigo);
      if (idx !== -1) {
        produtosAntigos[idx] = { ...produtosAntigos[idx], ...novoProd };
      } else {
        produtosAntigos.push(novoProd);
      }
    });

    await fs.writeFile(localFilePath, JSON.stringify(produtosAntigos, null, 2));
    console.log(`Produto adicionado com sucesso!`);
  }
}

main();
