/**
 * Serviço de Integração com a API de Pedido de Compra da Omie
 * Endpoint: https://app.omie.com.br/api/v1/produtos/pedidocompra/
 * Documentação: https://developer.omie.com.br/ → Compras → Pedido de Compra
 */

const OMIE_PEDIDO_COMPRA_URL = 'https://app.omie.com.br/api/v1/produtos/pedidocompra/';
const RATE_LIMIT_MS = 350;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function chamarOmie(method, params, endpoint = OMIE_PEDIDO_COMPRA_URL) {
  const appKey = process.env.OMIE_APP_KEY;
  const appSecret = process.env.OMIE_APP_SECRET;

  if (!appKey || !appSecret) {
    console.error(`[OMIE PEDIDO DE COMPRA] ❌ APP_KEY ou APP_SECRET não configurados no .env`);
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
      console.error(`[OMIE PEDIDO DE COMPRA] ⚠️ Erro da Omie no método ${method}: ${data.faultstring} (${data.faultcode || 'sem código'})`);
      return { erro: true, faultcode: data.faultcode, mensagem: data.faultstring };
    }

    return { erro: false, dados: data };
  } catch (err) {
    console.error(`[OMIE PEDIDO DE COMPRA] ❌ Erro HTTP em ${method}: ${err.message}`);
    return { erro: true, mensagem: err.message };
  }
}

/**
 * Cria um pedido de compra na Omie
 * @param {Object} opcoes 
 * @param {number} opcoes.codigoFornecedor 
 * @param {string} opcoes.etapa (Ex: '10' - Previsão, '20' - Efetivado)
 * @param {Array} opcoes.itens - Lista de itens do pedido
 */
async function criarPedidoCompra(opcoes) {
  const { codigoFornecedor, etapa = "10", itens = [] } = opcoes;

  console.log(`[OMIE PEDIDO DE COMPRA] 🛒 Gerando pedido para o fornecedor ${codigoFornecedor} com ${itens.length} itens...`);

  const param = {
    cabecalho_incluir: {
      nCodFor: codigoFornecedor,
      cCodIntPed: `P-${Date.now().toString().slice(-8)}`
    },
    produtos_incluir: itens.map((item, index) => ({
      cCodIntItem: `I-${Date.now().toString().slice(-8)}-${index}`,
      nCodProd: Number(item.codigo_item),
      cDescricao: item.descricao,
      nQtde: item.quantidade,
      nValUnit: item.valor_unitario,
      cObs: item.observacao || ''
    }))
  };

  return chamarOmie('IncluirPedCompra', param);
}
/**
 * Altera a etapa de um pedido de compra na Omie
 * @param {number} nCodPed - ID interno do pedido na Omie
 * @param {string} etapa - Nova etapa (Ex: '20' - Faturamento pelo Fornecedor)
 */
async function alterarEtapaPedido(nCodPed, etapa) {
  console.log(`[OMIE PEDIDO DE COMPRA] 🔄 Alterando etapa do pedido ${nCodPed} para ${etapa}...`);
  
  const param = {
    cabecalho: {
      nCodPed: Number(nCodPed),
      cEtapa: etapa
    }
  };

  return chamarOmie('AlterarPedCompra', param);
}

export default {
  criarPedidoCompra,
  alterarEtapaPedido
};
