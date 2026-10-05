import fetch from 'node-fetch'; // Oh wait, no node-fetch
// Just use global fetch
const OMIE_CLIENTES_URL = 'https://app.omie.com.br/api/v1/geral/clientes/';

async function run() {
  try {
    const payload = {
      call: 'ListarClientes',
      app_key: 'teste',
      app_secret: 'teste',
      param: [{ pagina: 1, registros_por_pagina: 1 }]
    };
    console.log("Fetching...");
    const res = await fetch(OMIE_CLIENTES_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    console.log("Status:", res.status);
    const data = await res.text();
    console.log("Data:", data);
  } catch (err) {
    console.error("Error:", err.message, err);
  }
}
run();
