import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const OMIE_APP_KEY = process.env.OMIE_APP_KEY;
const OMIE_APP_SECRET = process.env.OMIE_APP_SECRET;

async function varrerPedidos() {
  for (let pag = 1; pag <= 5; pag++) {
    const payloadOmie = {
      call: "ListarPedidos",
      app_key: OMIE_APP_KEY,
      app_secret: OMIE_APP_SECRET,
      param: [{
        pagina: pag,
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
      console.log(`Página ${pag} - Total retornados: ${data.pedido_venda_produto.length}`);
      const p = data.pedido_venda_produto.find(p => p.cabecalho.numero_pedido === '40319' || p.cabecalho.numero_pedido === '40.319');
      if (p) {
        console.log("ACHOU O 40319!");
        console.dir(p.informacoes_adicionais, { depth: null });
        console.dir(p.cabecalho, { depth: null });
        return;
      }
    } else {
      console.log("Fim ou erro", data);
      break;
    }
  }
}

varrerPedidos();
