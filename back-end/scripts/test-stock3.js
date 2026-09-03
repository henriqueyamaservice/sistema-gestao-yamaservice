import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const OMIE_APP_KEY = process.env.OMIE_APP_KEY;
const OMIE_APP_SECRET = process.env.OMIE_APP_SECRET;

async function listarLocais() {
  const url = 'https://app.omie.com.br/api/v1/estoque/local/';
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-type': 'application/json' },
    body: JSON.stringify({
      call: "ListarLocaisEstoque",
      app_key: OMIE_APP_KEY,
      app_secret: OMIE_APP_SECRET,
      param: [{}] // Sem tags de paginação
    })
  });
  return await response.json();
}

async function consultarEstoque(id_prod, local_id) {
  const url = 'https://app.omie.com.br/api/v1/estoque/consulta/';
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-type': 'application/json' },
    body: JSON.stringify({
      call: "PosicaoEstoque",
      app_key: OMIE_APP_KEY,
      app_secret: OMIE_APP_SECRET,
      param: [{
        id_prod: id_prod,
        codigo_local_estoque: local_id,
        data: ""
      }]
    })
  });
  return await response.json();
}

async function main() {
  console.log("Listando locais de estoque...");
  const locaisResp = await listarLocais();
  if (!locaisResp.locaisEncontrados) {
    console.error("Erro ao listar locais:", locaisResp);
    return;
  }
  
  const locais = locaisResp.locaisEncontrados;
  console.log(`Encontrados ${locais.length} locais de estoque.`);
  
  const id_prod = 12033114029; // PRD10936
  let saldoTotal = 0;

  for (const local of locais) {
    console.log(`\nConsultando saldo no local: ${local.descricao} (ID: ${local.codigo_local_estoque})`);
    const saldoResp = await consultarEstoque(id_prod, local.codigo_local_estoque);
    if (saldoResp.saldo !== undefined) {
      console.log(`Saldo: ${saldoResp.saldo}`);
      saldoTotal += saldoResp.saldo;
    } else {
      console.log(`Erro/Aviso:`, saldoResp);
    }
  }

  console.log(`\nSALDO TOTAL CALCULADO PARA PRD10936: ${saldoTotal}`);
}
main();
