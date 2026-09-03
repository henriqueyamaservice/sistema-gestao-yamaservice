import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const OMIE_APP_KEY = process.env.OMIE_APP_KEY;
const OMIE_APP_SECRET = process.env.OMIE_APP_SECRET;

async function testListarPedidoJonas() {
  const payloadOmie = {
    call: "ListarPedidos",
    app_key: OMIE_APP_KEY,
    app_secret: OMIE_APP_SECRET,
    param: [{
      pagina: 1,
      registros_por_pagina: 10,
      apenas_importado_api: "N",
      clientes: [ { codigo_cliente_omie: 748316329 } ] // JONAS RODRIGUES MIRANDA
    }]
  };
  
  const response = await fetch('https://app.omie.com.br/api/v1/produtos/pedido/', {
    method: 'POST',
    headers: { 'Content-type': 'application/json' },
    body: JSON.stringify(payloadOmie)
  });
  
  const data = await response.json();
  if (data.pedido_venda_produto && data.pedido_venda_produto.length > 0) {
    console.log("JONAS RECENT ORDER:");
    console.dir(data.pedido_venda_produto[0], { depth: null });
  } else {
    console.log("No orders found for Jonas.");
    console.dir(data, { depth: null });
  }
}

testListarPedidoJonas();
