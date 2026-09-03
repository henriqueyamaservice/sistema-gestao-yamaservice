import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const OMIE_APP_KEY = process.env.OMIE_APP_KEY;
const OMIE_APP_SECRET = process.env.OMIE_APP_SECRET;

async function testListarPedidos() {
  const payloadOmie = {
    call: "ListarPedidos",
    app_key: OMIE_APP_KEY,
    app_secret: OMIE_APP_SECRET,
    param: [{
      pagina: 1,
      registros_por_pagina: 50,
      apenas_importado_api: "N"
    }]
  };
  
  const response = await fetch('https://app.omie.com.br/api/v1/produtos/pedido/', {
    method: 'POST',
    headers: { 'Content-type': 'application/json' },
    body: JSON.stringify(payloadOmie)
  });
  
  const data = await response.json();
  if (data.pedido_venda_produto) {
    // Find any order from JONAS (748316329) or just print the first one
    const jonas = data.pedido_venda_produto.find(p => p.cabecalho.codigo_cliente === 748316329);
    if (jonas) {
      console.log("JONAS ORDER:");
      console.dir(jonas.cabecalho, { depth: null });
      console.dir(jonas.informacoes_adicionais, { depth: null });
    }
    console.log("FIRST ORDER (PROBABLY RECENT):");
    console.dir(data.pedido_venda_produto[0].cabecalho, { depth: null });
    console.dir(data.pedido_venda_produto[0].informacoes_adicionais, { depth: null });
  } else {
    console.dir(data, { depth: null });
  }
}

testListarPedidos();
