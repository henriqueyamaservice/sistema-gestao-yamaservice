/**
 * Serviço de Integração com a API de Remessa de Produtos da Omie
 * Endpoint: https://app.omie.com.br/api/v1/produtos/remessa/
 * Métodos: IncluirRemessa, ConsultarRemessa, StatusRemessa
 * 
 * Documentação: https://developer.omie.com.br/ → Vendas e NF-e → Remessa de Produtos
 */

const OMIE_REMESSA_URL = 'https://app.omie.com.br/api/v1/produtos/remessa/';
const OMIE_REMESSA_FAT_URL = 'https://app.omie.com.br/api/v1/produtos/remessafat/';

// Delay entre chamadas para respeitar o rate limit da Omie (~4 req/s)
const RATE_LIMIT_MS = 350;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Faz uma chamada genérica para a API de Remessa da Omie
 */
async function chamarOmieRemessa(method, params, endpoint = OMIE_REMESSA_URL) {
  const appKey = process.env.OMIE_APP_KEY;
  const appSecret = process.env.OMIE_APP_SECRET;

  if (!appKey || !appSecret) {
    console.error('[OMIE REMESSA] ❌ APP_KEY ou APP_SECRET não configurados no .env');
    return { erro: true, mensagem: 'Credenciais Omie não configuradas' };
  }

  const payload = {
    call: method,
    app_key: appKey,
    app_secret: appSecret,
    param: [params]
  };

  console.log(`[OMIE REMESSA] 📤 Chamando ${method}...`);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (data.faultstring) {
      console.error(`[OMIE REMESSA] ⚠️ Erro da Omie: ${data.faultstring} (${data.faultcode || 'sem código'})`);
      return { erro: true, faultcode: data.faultcode, mensagem: data.faultstring };
    }

    console.log(`[OMIE REMESSA] ✅ ${method} executado com sucesso!`);
    return { erro: false, dados: data };
  } catch (err) {
    console.error(`[OMIE REMESSA] ❌ Erro HTTP: ${err.message}`);
    return { erro: true, mensagem: err.message };
  }
}

/**
 * Inclui uma nova remessa de produtos na Omie.
 * 
 * @param {Object} opcoes
 * @param {string} opcoes.codigoIntegracao  - Código de integração único (ex: "REQ-1781027320895")
 * @param {number} opcoes.codigoCliente     - nCodCli: Código do cliente/destinatário na Omie
 * @param {string} opcoes.dataPrevisao      - Data no formato DD/MM/AAAA
 * @param {string} opcoes.observacao        - Observação geral da remessa
 * @param {string} opcoes.codigoCategoria   - Categoria financeira (ex: "1.01.01")
 * @param {number} opcoes.codigoProjeto     - Código do projeto na Omie (opcional)
 * @param {Array}  opcoes.produtos          - Array de itens:
 *   @param {string} produto.codigoItemIntegracao - Código integração do item (único)
 *   @param {number} produto.codigoProduto        - nCodProd: codigo_produto da Omie
 *   @param {number} produto.quantidade           - Quantidade
 *   @param {number} produto.valorUnitario        - Valor unitário
 */
async function criarRemessa(opcoes) {
  const {
    codigoIntegracao,
    codigoCliente,
    codigoVendedor,
    dataPrevisao,
    observacao = '',
    codigoCategoria = '1.01.01',
    codigoProjeto = 0,
    produtos = []
  } = opcoes;

  if (!codigoCliente || codigoCliente <= 0) {
    console.error('[OMIE REMESSA] ❌ Código do cliente obrigatório e deve ser > 0');
    return { erro: true, mensagem: 'Código do cliente não informado' };
  }

  if (produtos.length === 0) {
    console.error('[OMIE REMESSA] ❌ Nenhum produto informado para a remessa');
    return { erro: true, mensagem: 'Nenhum produto informado' };
  }

  // Monta o array de produtos no formato da API
  const produtosOmie = produtos.map((p, index) => {
    const item = {
      cCodItInt: p.codigoItemIntegracao || `${codigoIntegracao}-ITEM-${index + 1}`,
      nCodProd: p.codigoProduto,
      nQtde: p.quantidade,
      nValUnit: p.valorUnitario || 0.01
    };
    if (p.codigoLocalEstoque > 0) {
      item.codigo_local_estoque = p.codigoLocalEstoque;
    }
    return item;
  });

  const paramRemessa = {
    cabec: {
      cCodIntRem: codigoIntegracao,
      nCodCli: codigoCliente,
      dPrevisao: dataPrevisao || new Date().toLocaleDateString('pt-BR')
    },
    infAdic: {
      cCodCateg: codigoCategoria,
      cConsFinal: 'S'
    },
    obs: {
      cObs: observacao || `Remessa gerada pelo Sistema Almoxarifado - ${codigoIntegracao}`
    },
    produtos: produtosOmie
  };

  // Adiciona vendedor se informado
  if (codigoVendedor > 0) {
    paramRemessa.cabec.nCodVend = codigoVendedor;
  }

  // Adiciona projeto se informado (pertence exclusivamente à tag infAdic na API de Remessas)
  if (codigoProjeto > 0) {
    paramRemessa.infAdic.nCodProj = codigoProjeto;
  }

  console.log(`[OMIE REMESSA] 📋 Remessa ${codigoIntegracao}: ${produtos.length} item(ns) | Cliente: ${codigoCliente} | Vendedor: ${codigoVendedor || 'N/A'} | Projeto: ${codigoProjeto || 'N/A'}`);

  const resultado = await chamarOmieRemessa('IncluirRemessa', paramRemessa);

  if (!resultado.erro && resultado.dados) {
    console.log(`[OMIE REMESSA] 🎉 Remessa criada! nCodRem: ${resultado.dados.nCodRem || 'N/A'} | cCodIntRem: ${resultado.dados.cCodIntRem || codigoIntegracao}`);
    
    // ------------------------------------------------------------------------------------------------
    // O sistema NÃO vai mais concluir a remessa automaticamente a pedido do usuário,
    // para que ela fique como "Pendente" lá na Omie e eles possam adicionar o Departamento manualmente antes de Faturar/Concluir.
    /*
    if (resultado.dados.nCodRem || resultado.dados.cCodIntRem) {
      console.log(`[OMIE REMESSA] ⏳ Iniciando conclusão da remessa...`);
      const resultadoConclusao = await concluirRemessa(resultado.dados.nCodRem, resultado.dados.cCodIntRem);
      if (!resultadoConclusao.erro) {
        console.log(`[OMIE REMESSA] ✅ Remessa Concluída com sucesso (faturada)!`);
      } else {
        console.error(`[OMIE REMESSA] ⚠️ Remessa criada, mas falhou ao concluir: ${resultadoConclusao.mensagem}`);
      }
    }
    */
    // ------------------------------------------------------------------------------------------------
  }

  return resultado;
}

/**
 * Consulta os dados de uma remessa existente.
 * @param {number} nCodRem  - Código da remessa na Omie
 * @param {string} cCodIntRem - Código de integração (alternativa)
 */
async function consultarRemessa(nCodRem = 0, cCodIntRem = '') {
  await sleep(RATE_LIMIT_MS);
  return chamarOmieRemessa('ConsultarRemessa', {
    nCodRem: nCodRem,
    cCodIntRem: cCodIntRem
  });
}

/**
 * Retorna o status de uma remessa (se foi faturada, cancelada, etc.)
 * @param {number} nCodRem  - Código da remessa na Omie
 * @param {string} cCodIntRem - Código de integração (alternativa)
 */
async function statusRemessa(nCodRem = 0, cCodIntRem = '') {
  await sleep(RATE_LIMIT_MS);
  return chamarOmieRemessa('StatusRemessa', {
    nCodRem: nCodRem,
    cCodIntRem: cCodIntRem
  });
}

/**
 * Conclui (fatura) uma remessa existente.
 * @param {number} nCodRem  - Código da remessa na Omie
 * @param {string} cCodIntRem - Código de integração (alternativa)
 */
async function concluirRemessa(nCodRem = 0, cCodIntRem = '') {
  await sleep(RATE_LIMIT_MS);
  return chamarOmieRemessa('ConcluirRemessa', {
    nCodRem: nCodRem,
    cCodIntRem: cCodIntRem
  }, OMIE_REMESSA_FAT_URL);
}

export default {
  criarRemessa,
  consultarRemessa,
  statusRemessa,
  concluirRemessa
};
