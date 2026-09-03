import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import getDb from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function getProdutosDb() {
  const db = await getDb();
  const rows = await db.all(`SELECT * FROM produtos_omie`);
  return rows.map(r => {
    let d = {};
    try { d = JSON.parse(r.dados_json || '{}'); } catch(e){}
    return {
      ...d,
      codigo: r.codigo,
      descricao: r.descricao,
      ncm: r.ncm,
      ean: r.ean,
      valor_unitario: r.valor_unitario,
      quantidade_estoque: r.quantidade_estoque
    };
  });
}

// A função salvarProdutosDb será substituída por inserção direta no loop final

const OMIE_PRODUTOS_URL = 'https://app.omie.com.br/api/v1/geral/produtos/';
const RATE_LIMIT_MS = 350;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function chamarOmie(method, params, endpoint = OMIE_PRODUTOS_URL) {
  const appKey = process.env.OMIE_APP_KEY;
  const appSecret = process.env.OMIE_APP_SECRET;

  if (!appKey || !appSecret) {
    console.error(`[OMIE PRODUTOS] ❌ APP_KEY ou APP_SECRET não configurados no .env`);
    return { erro: true, mensagem: 'Credenciais Omie não configuradas' };
  }

  const payload = {
    call: method,
    app_key: appKey,
    app_secret: appSecret,
    param: [params]
  };

  try {
    await sleep(RATE_LIMIT_MS);
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (data.faultstring) {
      console.error(`[OMIE PRODUTOS] ⚠️ Erro da Omie no método ${method}: ${data.faultstring}`);
      return { erro: true, faultcode: data.faultcode, mensagem: data.faultstring };
    }

    return { erro: false, dados: data };
  } catch (err) {
    console.error(`[OMIE PRODUTOS] ❌ Erro HTTP em ${method}: ${err.message}`);
    return { erro: true, mensagem: err.message };
  }
}

/**
 * Busca todos os produtos ativos na Omie e faz o merge com os locais
 */
async function sincronizarProdutosPrd() {
  console.log(`[OMIE PRODUTOS] 🔄 Iniciando sincronização automática de produtos...`);
  
  let pagina = 1;
  const registros_por_pagina = 100;
  let total_de_paginas = 1;
  const produtosOmiePrd = [];

  try {
    // 1. Busca todos os produtos da Omie (paginado)
    do {
      const response = await chamarOmie('ListarProdutos', {
        pagina,
        registros_por_pagina,
        apenas_importado_api: "N",
        filtrar_apenas_omiepdv: "N",
        inativo: "N",
        exibir_caracteristicas: "S", 
        exibir_tabelas_preco: "S",   
        exibir_obs: "S",             
        exibir_kit: "S",             
        exibir_info_variacoes: "S"
      });

      if (response.erro) {
        console.error('[OMIE PRODUTOS] Falha ao buscar página', pagina);
        break;
      }

      const { dados } = response;
      if (pagina === 1) console.log(`[OMIE PRODUTOS] Total de registros na Omie: ${dados.total_de_registros} | Paginas: ${dados.total_de_paginas}`);
      
      total_de_paginas = dados.total_de_paginas;

      if (dados.produto_servico_cadastro) {
        const prds = dados.produto_servico_cadastro.filter(p => 
          p.codigo && p.codigo.startsWith('PRD') && p.inativo === 'N'
        );
        produtosOmiePrd.push(...prds);
      }

      pagina++;
    } while (pagina <= total_de_paginas);

    console.log(`[OMIE PRODUTOS] ✅ Foram encontrados ${produtosOmiePrd.length} produtos 'PRD' ativos na Omie.`);

    // 2. Lê os produtos locais do banco de dados
    let produtosLocais = [];
    try {
      produtosLocais = await getProdutosDb();
    } catch (err) {
      console.error(`[OMIE PRODUTOS] Erro ao ler produtos do banco de dados:`, err);
    }

    const mapaLocal = new Map(produtosLocais.map(p => [p.codigo, p]));

    // 3. Lógica de Merge
    let novosCount = 0;
    let atualizadosCount = 0;

    for (const prodOmie of produtosOmiePrd) {
      const codigo = prodOmie.codigo;
      const existeLocal = mapaLocal.get(codigo);

      if (existeLocal) {
        // Atualiza campos cadastrais, mantendo lote, validade, e saldo que possam ser controlados localmente
        existeLocal.descricao = prodOmie.descricao;
        existeLocal.valor_unitario = prodOmie.valor_unitario;
        existeLocal.codigo_produto = prodOmie.codigo_produto; // ID da omie
        existeLocal.inativo = prodOmie.inativo;
        existeLocal.unidade = prodOmie.unidade;
        
        // Puxa o código de barras (EAN) da Omie, se existir e for válido, 
        // ou se a Omie não tiver, mantém o local. Mas como a Omie é a fonte da verdade, 
        // vamos priorizar o que vem de lá se não for vazio.
        if (prodOmie.ean) {
          existeLocal.ean = prodOmie.ean;
        }

        // Puxa as características atualizadas
        if (prodOmie.caracteristicas) {
          existeLocal.caracteristicas = prodOmie.caracteristicas;
        }
        
        atualizadosCount++;
      } else {
        // Adiciona novo
        mapaLocal.set(codigo, {
          ...prodOmie,
          quantidade_estoque: prodOmie.quantidade_estoque || 0,
          estoque_minimo: 0,
          lotes: []
        });
        novosCount++;
      }
    }

    // Opcional: E os produtos PRD locais que sumiram ou ficaram inativos na Omie?
    // Podemos marcar como inativo="S" no local se não vieram na listagem (já que filtramos por inativos="N").
    const codigosOmieSet = new Set(produtosOmiePrd.map(p => p.codigo));
    for (const [codigo, prodLocal] of mapaLocal.entries()) {
      if (codigo.startsWith('PRD') && !codigosOmieSet.has(codigo)) {
        prodLocal.inativo = "S";
      }
    }

    // 4. Salvar banco de dados SQL (INSERT / UPDATE linha por linha)
    const db = await getDb();
    const produtosFinais = Array.from(mapaLocal.values());
    const isMysql = db.driver === 'mysql';

    for (const p of produtosFinais) {
      if (!p.codigo) continue;
      const codigo = p.codigo.toString();
      const descricao = p.descricao || '';
      const ncm = p.ncm || '';
      const ean = p.ean || '';
      const valor_unitario = parseFloat(p.valor_unitario) || 0;
      const quantidade_estoque = parseFloat(p.quantidade_estoque) || 0;
      const dadosJson = JSON.stringify(p);

      if (isMysql) {
        await db.run(
          `INSERT INTO produtos_omie (codigo, descricao, ncm, ean, valor_unitario, quantidade_estoque, dados_json)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE 
             descricao = VALUES(descricao),
             ncm = VALUES(ncm),
             ean = VALUES(ean),
             valor_unitario = VALUES(valor_unitario),
             quantidade_estoque = VALUES(quantidade_estoque),
             dados_json = VALUES(dados_json),
             atualizado_em = NOW()`,
          [codigo, descricao, ncm, ean, valor_unitario, quantidade_estoque, dadosJson]
        );
      } else {
        await db.run(
          `INSERT INTO produtos_omie (codigo, descricao, ncm, ean, valor_unitario, quantidade_estoque, dados_json)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(codigo) DO UPDATE SET 
             descricao = excluded.descricao,
             ncm = excluded.ncm,
             ean = excluded.ean,
             valor_unitario = excluded.valor_unitario,
             quantidade_estoque = excluded.quantidade_estoque,
             dados_json = excluded.dados_json,
             atualizado_em = CURRENT_TIMESTAMP`,
          [codigo, descricao, ncm, ean, valor_unitario, quantidade_estoque, dadosJson]
        );
      }
    }

    console.log(`[OMIE PRODUTOS] 🎉 Sincronização concluída! Novos: ${novosCount} | Atualizados: ${atualizadosCount}`);

  } catch (err) {
    console.error(`[OMIE PRODUTOS] ❌ Erro geral na sincronização:`, err);
  }
}

/**
 * Altera dados de um produto específico na Omie (como EAN, características)
 */
async function alterarProdutoNaOmie(codigo_produto, dadosAlteracao) {
  return await chamarOmie('AlterarProduto', {
    codigo_produto,
    ...dadosAlteracao
  });
}

export default {
  sincronizarProdutosPrd,
  alterarProdutoNaOmie
};
