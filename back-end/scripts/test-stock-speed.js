import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const OMIE_APP_KEY = process.env.OMIE_APP_KEY;
const OMIE_APP_SECRET = process.env.OMIE_APP_SECRET;

async function getOmieStock(id_prod) {
  console.time('fetchLocais');
  const locaisUrl = 'https://app.omie.com.br/api/v1/estoque/local/';
  const locaisRes = await fetch(locaisUrl, {
    method: 'POST',
    headers: { 'Content-type': 'application/json' },
    body: JSON.stringify({
      call: "ListarLocaisEstoque",
      app_key: OMIE_APP_KEY,
      app_secret: OMIE_APP_SECRET,
      param: [{ nPagina: 1, nRegPorPagina: 50 }]
    })
  });
  const locaisData = await locaisRes.json();
  const locais = locaisData.locaisEncontrados;
  console.timeEnd('fetchLocais');
  console.log(`Locais encontrados: ${locais.length}`);

  let saldoTotal = 0;
  const consultaUrl = 'https://app.omie.com.br/api/v1/estoque/consulta/';
  
  console.time('fetchEstoque');
  const chunkSize = 4; // max 4 per second in Omie is safe
  for (let i = 0; i < locais.length; i += chunkSize) {
    const chunk = locais.slice(i, i + chunkSize);
    
    const promises = chunk.map(local => 
      fetch(consultaUrl, {
        method: 'POST',
        headers: { 'Content-type': 'application/json' },
        body: JSON.stringify({
          call: "PosicaoEstoque",
          app_key: OMIE_APP_KEY,
          app_secret: OMIE_APP_SECRET,
          param: [{
            id_prod: id_prod,
            codigo_local_estoque: local.codigo_local_estoque,
            data: ""
          }]
        })
      }).then(r => r.json()).catch(() => ({}))
    );
    
    const results = await Promise.all(promises);
    for (const res of results) {
      if (res.saldo) saldoTotal += res.saldo;
    }
    
    // sleep for 1 second to respect Omie's 4 req/s limit
    if (i + chunkSize < locais.length) {
       await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  console.timeEnd('fetchEstoque');
  return saldoTotal;
}

getOmieStock(12033114029).then(saldo => console.log('Saldo:', saldo));
