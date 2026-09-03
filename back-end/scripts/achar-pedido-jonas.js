import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const OMIE_APP_KEY = process.env.OMIE_APP_KEY;
const OMIE_APP_SECRET = process.env.OMIE_APP_SECRET;

async function acharPedidoJonas() {
  const payloadOmie = {
    call: "ListarPedidos",
    app_key: OMIE_APP_KEY,
    app_secret: OMIE_APP_SECRET,
    param: [{
      pagina: 1,
      registros_por_pagina: 100,
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
    const p40305 = data.pedido_venda_produto.find(p => p.cabecalho.numero_pedido === '40305' || p.cabecalho.numero_pedido === '40.305');
    if (p40305) {
      console.log("ACHOU O PEDIDO 40305:");
      console.dir(p40305.cabecalho, { depth: null });
      console.dir(p40305.informacoes_adicionais, { depth: null });
    } else {
      console.log("Nenhum 40305 achado. Analisando os primeiros retornos:");
      for (let i = 0; i < Math.min(10, data.pedido_venda_produto.length); i++) {
        const p = data.pedido_venda_produto[i];
        console.log("Pedido:", p.cabecalho.numero_pedido, "Cliente:", p.cabecalho.codigo_cliente, "Valor:", p.total_pedido?.valor_total_pedido, "Família?", p.informacoes_adicionais?.codigo_familia);
      }
    }
  } else {
    console.dir(data, { depth: null });
  }
}

acharPedidoJonas();
