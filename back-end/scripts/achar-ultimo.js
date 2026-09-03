import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const OMIE_APP_KEY = process.env.OMIE_APP_KEY;
const OMIE_APP_SECRET = process.env.OMIE_APP_SECRET;

async function acharUltimoPedido() {
  const payloadOmie = {
    call: "ListarPedidos",
    app_key: OMIE_APP_KEY,
    app_secret: OMIE_APP_SECRET,
    param: [{
      pagina: 1,
      registros_por_pagina: 50,
      apenas_importado_api: "N",
      filtrar_por_data_de: "13/07/2026",
      filtrar_por_data_ate: "13/07/2026"
    }]
  };
  
  const response = await fetch('https://app.omie.com.br/api/v1/produtos/pedido/', {
    method: 'POST',
    headers: { 'Content-type': 'application/json' },
    body: JSON.stringify(payloadOmie)
  });
  
  const data = await response.json();
  if (data.pedido_venda_produto) {
    const p40319 = data.pedido_venda_produto.find(p => p.cabecalho.numero_pedido === '40319' || p.cabecalho.numero_pedido === '40.319');
    if (p40319) {
      console.log("ACHOU O PEDIDO 40319:");
      console.dir(p40319.cabecalho, { depth: null });
      console.dir(p40319.informacoes_adicionais, { depth: null });
    } else {
      console.log("Nenhum achado. Os primeiros da lista:");
      for (let i = 0; i < 5; i++) {
        const p = data.pedido_venda_produto[i];
        if (p) console.log(p.cabecalho.numero_pedido, p.cabecalho.etapa);
      }
    }
  } else {
    console.dir(data, { depth: null });
  }
}

acharUltimoPedido();
