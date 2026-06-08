import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carrega o .env da pasta back-end
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const OMIE_APP_KEY = process.env.OMIE_APP_KEY?.trim();
const OMIE_APP_SECRET = process.env.OMIE_APP_SECRET?.trim();

const OMIE_API_URL = 'https://app.omie.com.br/api/v1/geral/clientes/';

if (!OMIE_APP_KEY || !OMIE_APP_SECRET || OMIE_APP_KEY === 'sua_chave_aqui') {
  console.error("ERRO: As variáveis OMIE_APP_KEY e OMIE_APP_SECRET precisam estar definidas no arquivo .env com valores reais.");
  process.exit(1);
}

async function fetchFornecedores() {
  console.log("Iniciando sincronização de fornecedores da Omie...");
  let todosFornecedores = [];
  let pagina = 1;
  const registrosPorPagina = 500;
  let totalPaginas = 1;

  try {
    do {
      console.log(`Buscando página ${pagina}...`);
      const response = await fetch(OMIE_API_URL, {
        method: 'POST',
        headers: {
          'Content-type': 'application/json'
        },
        body: JSON.stringify({
          call: "ListarClientes",
          app_key: OMIE_APP_KEY,
          app_secret: OMIE_APP_SECRET,
          param: [{
            pagina: pagina,
            registros_por_pagina: registrosPorPagina,
            apenas_importado_api: "N"
          }]
        })
      });

      if (!response.ok) {
        console.error(`Aviso: Erro na API Omie HTTP: ${response.status} ${response.statusText}. Interrompendo paginação.`);
        break;
      }

      const data = await response.json();
      
      if (data.faultstring) {
        console.error(`Aviso: Erro na API Omie (Retorno da requisição): ${data.faultstring}. Interrompendo paginação.`);
        break;
      }
      
      if (data.clientes_cadastro) {
        // Mapeia para pegar apenas os campos mais importantes para deixar o arquivo leve
        const simplificados = data.clientes_cadastro.map(c => ({
          codigo_cliente_omie: c.codigo_cliente_omie,
          razao_social: c.razao_social,
          nome_fantasia: c.nome_fantasia,
          cnpj_cpf: c.cnpj_cpf
        }));
        
        todosFornecedores = todosFornecedores.concat(simplificados);
      }
      
      totalPaginas = data.total_de_paginas || 1;
      pagina++;

    } while (pagina <= totalPaginas);

    console.log(`\nSincronização concluída. Total de fornecedores salvos: ${todosFornecedores.length}`);

    const filePath = path.resolve(__dirname, '..', 'data', 'fornecedores.json');
    await fs.writeFile(filePath, JSON.stringify(todosFornecedores, null, 2), 'utf-8');
    
    console.log(`Banco de dados de fornecedores salvo em: ${filePath}`);

  } catch (error) {
    console.error("Ocorreu um erro ao sincronizar os fornecedores:", error.message);
  }
}

fetchFornecedores();
