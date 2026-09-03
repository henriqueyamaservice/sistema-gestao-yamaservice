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

const OMIE_API_URL = 'https://app.omie.com.br/api/v1/geral/produtos/';

if (!OMIE_APP_KEY || !OMIE_APP_SECRET || OMIE_APP_KEY === 'sua_chave_aqui') {
  console.error("ERRO: As variáveis OMIE_APP_KEY e OMIE_APP_SECRET precisam estar definidas no arquivo .env com valores reais.");
  process.exit(1);
}

async function fetchProdutos() {
  console.log("Iniciando sincronização de produtos da Omie...");
  let todosProdutos = [];
  let pagina = 1;
  const registrosPorPagina = 500; // Limite padrão por requisição
  let totalPaginas = 1;

  // Carregar produtos locais existentes para preservar estoque mínimo, lotes e validade
  let produtosLocais = new Map();
  try {
    const localFilePath = path.resolve(__dirname, '..', 'data', 'produtos.json');
    const localData = await fs.readFile(localFilePath, 'utf-8');
    const produtosAntigos = JSON.parse(localData);
    produtosAntigos.forEach(p => {
      produtosLocais.set(p.codigo, {
        estoque_minimo: p.estoque_minimo,
        lotes: p.lotes,
        data_validade: p.data_validade,
        quantidade_estoque: p.quantidade_estoque, // Preservar o estoque físico também, já que a Omie não envia saldo nesta rota
        ean: p.ean // Preservar ean que pode ter sido vinculado manualmente
      });
    });
  } catch (err) {
    console.log("Nenhum banco de dados local encontrado ou erro ao ler, criando um novo do zero.");
  }

  try {
    do {
      console.log(`Buscando página ${pagina}...`);
      const response = await fetch(OMIE_API_URL, {
        method: 'POST',
        headers: {
          'Content-type': 'application/json'
        },
        body: JSON.stringify({
          call: "ListarProdutos",
          app_key: OMIE_APP_KEY,
          app_secret: OMIE_APP_SECRET,
          param: [{
            pagina: pagina,
            registros_por_pagina: 50,
            apenas_importado_api: "N",
            filtrar_apenas_omiepdv: "N",
            inativo: "N", // Filtra apenas produtos ativos
            exibir_caracteristicas: "S", // OBRIGA a Omie a enviar o array de características
            exibir_tabelas_preco: "S",   // Traz as tabelas de preços associadas
            exibir_obs: "S",             // Traz as observações internas do produto
            exibir_kit: "S",             // Se for um kit, traz os componentes do kit
            exibir_info_variacoes: "S"   // Retorna informações detalhadas sobre variações
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
      
      if (data.produto_servico_cadastro) {
        // Filtra localmente os que começam com "PRD"
        let filtradosPRD = data.produto_servico_cadastro.filter(p => 
          p.codigo && p.codigo.toUpperCase().startsWith('PRD')
        );

        // Como a rota ListarProdutos da Omie não traz o saldo real de estoque,
        // vamos usar o estoque local ou simular um para podermos testar a tela do almoxarifado
        filtradosPRD = filtradosPRD.map(p => {
          const dadosLocais = produtosLocais.get(p.codigo) || {};
          return {
            ...p,
            quantidade_estoque: dadosLocais.quantidade_estoque !== undefined ? dadosLocais.quantidade_estoque : (Math.floor(Math.random() * 90) + 10),
            estoque_minimo: dadosLocais.estoque_minimo,
            lotes: dadosLocais.lotes,
            data_validade: dadosLocais.data_validade,
            ean: dadosLocais.ean || p.ean
          };
        });
        
        todosProdutos = todosProdutos.concat(filtradosPRD);
      }
      
      totalPaginas = data.total_de_paginas || 1;
      pagina++;

    } while (pagina <= totalPaginas);

    // --- MODO DE TESTE (A PEDIDO DO USUÁRIO) ---
    // Vamos forçar que os 10 primeiros produtos tenham um "estoque_minimo"
    // caso eles não tenham um definido localmente.
    for (let i = 0; i < Math.min(10, todosProdutos.length); i++) {
      if (todosProdutos[i].estoque_minimo === undefined) {
        todosProdutos[i].estoque_minimo = (todosProdutos[i].quantidade_estoque || 0) + 5; 
      }
    }
    // -------------------------------------------

    console.log(`\nSincronização concluída. Total de produtos salvos: ${todosProdutos.length}`);

    const filePath = path.resolve(__dirname, '..', 'data', 'produtos.json');
    await fs.writeFile(filePath, JSON.stringify(todosProdutos, null, 2), 'utf-8');
    
    console.log(`Banco de dados salvo em: ${filePath}`);

  } catch (error) {
    console.error("Ocorreu um erro ao sincronizar os produtos:", error.message);
  }
}

fetchProdutos();
