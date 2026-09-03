/**
 * Serviço de Integração com a API de Estoque da Omie
 * Endpoint: https://app.omie.com.br/api/v1/estoque/ajuste/
 * Documentação: https://developer.omie.com.br/ → Estoque
 */

const OMIE_ESTOQUE_AJUSTE_URL = 'https://app.omie.com.br/api/v1/estoque/ajuste/';
const OMIE_ESTOQUE_LOCAL_URL = 'https://app.omie.com.br/api/v1/estoque/local/';

const RATE_LIMIT_MS = 350;
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function chamarOmie(method, params, endpoint) {
  const appKey = process.env.OMIE_APP_KEY;
  const appSecret = process.env.OMIE_APP_SECRET;

  if (!appKey || !appSecret) {
    console.error(`[OMIE ESTOQUE] ❌ APP_KEY ou APP_SECRET não configurados no .env`);
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
      console.error(`[OMIE ESTOQUE] ⚠️ Erro da Omie no método ${method}: ${data.faultstring} (${data.faultcode || 'sem código'})`);
      return { erro: true, faultcode: data.faultcode, mensagem: data.faultstring };
    }

    return { erro: false, dados: data };
  } catch (err) {
    console.error(`[OMIE ESTOQUE] ❌ Erro HTTP em ${method}: ${err.message}`);
    return { erro: true, mensagem: err.message };
  }
}

/**
 * Realiza um ajuste de estoque (Entrada ou Saída)
 * @param {Object} opcoes 
 * @param {number} opcoes.codigoLocalEstoque 
 * @param {number} opcoes.codigoProduto 
 * @param {number} opcoes.quantidade 
 * @param {string} opcoes.observacao 
 * @param {string} opcoes.tipo - 'ENT' para entrada, 'SAI' para saída
 * @param {number} opcoes.valorUnitario 
 */
async function ajustarEstoque(opcoes) {
  const {
    codigoLocalEstoque,
    codigoProduto,
    quantidade,
    observacao,
    tipo = 'ENT',
    valorUnitario = 0.01
  } = opcoes;

  console.log(`[OMIE ESTOQUE] 📦 Enviando ajuste (${tipo}) para produto ${codigoProduto} no local ${codigoLocalEstoque}`);

  return chamarOmie('IncluirAjusteEstoque', {
    codigo_local_estoque: codigoLocalEstoque,
    id_prod: codigoProduto,
    data: new Date().toLocaleDateString('pt-BR'),
    quan: quantidade,
    obs: observacao,
    origem: "AJU",
    tipo: tipo,
    motivo: "INV",
    valor: valorUnitario
  }, OMIE_ESTOQUE_AJUSTE_URL);
}

/**
 * Lista locais de estoque
 */
async function listarLocais(nPagina = 1, nRegPorPagina = 100) {
  console.log(`[OMIE ESTOQUE] 🏢 Listando locais de estoque (página ${nPagina})...`);
  return chamarOmie('ListarLocaisEstoque', {
    nPagina,
    nRegPorPagina
  }, OMIE_ESTOQUE_LOCAL_URL);
}

export default {
  ajustarEstoque,
  listarLocais
};
