
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

async function test() {
  const url = 'https://app.omie.com.br/api/v1/geral/produtos/';
  const payload = {
    call: 'ListarProdutos',
    app_key: process.env.OMIE_APP_KEY,
    app_secret: process.env.OMIE_APP_SECRET,
    param: [{
      pagina: 1,
      registros_por_pagina: 50,
      apenas_importado_api: "N",
      filtrar_apenas_omiepdv: "N",
      inativo: "N",
      exibir_caracteristicas: "S", 
      exibir_tabelas_preco: "S",   
      exibir_obs: "S",             
      exibir_kit: "S",             
      exibir_info_variacoes: "S"   
    }]
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  
  const data = await response.json();
  console.log("RESPONSE KEYS:", Object.keys(data));
  console.log("PAGINAS:", data.total_de_paginas);
  console.log("TOTAL REGISTROS:", data.total_de_registros);
  if (data.produto_servico_cadastro && data.produto_servico_cadastro.length > 0) {
    console.log("FIRST PROD CODIGO:", data.produto_servico_cadastro[0].codigo);
  } else {
    console.log("FULL DATA:", data);
  }
}

test();
