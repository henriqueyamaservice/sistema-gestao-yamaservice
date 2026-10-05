import getDb from '../config/database.js';
import { obterCadastro } from './cadastrosSyncService.js';

const OMIE_PEDIDO_COMPRA_URL = 'https://app.omie.com.br/api/v1/produtos/pedidocompra/';
const RATE_LIMIT_MS = 350;
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function chamarOmie(method, params) {
  const appKey = process.env.OMIE_APP_KEY;
  const appSecret = process.env.OMIE_APP_SECRET;

  if (!appKey || !appSecret) {
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
    const response = await fetch(OMIE_PEDIDO_COMPRA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (data.faultstring) {
      return { erro: true, faultcode: data.faultcode, mensagem: data.faultstring };
    }
    return { erro: false, dados: data };
  } catch (err) {
    return { erro: true, mensagem: err.message };
  }
}

/**
 * Busca o histórico real de compras de um determinado produto na Omie via PesquisarPedCompra
 * Retorna uma lista de compras com fornecedor, data, valor unitário e prazo
 */
export async function buscarHistoricoComprasOmie(codigoProduto, limite = 6) {
  try {
    const db = await getDb();

    // 1. Encontrar o nCodProd (código interno Omie) do produto
    const rowProd = await db.get(`SELECT * FROM produtos_omie WHERE codigo = ?`, [codigoProduto]);
    let nCodProd = null;
    let descProd = '';

    if (rowProd) {
      descProd = rowProd.descricao || '';
      try {
        const d = JSON.parse(rowProd.dados_json || '{}');
        nCodProd = d.codigo_produto || d.nCodProd || null;
      } catch (e) {}
    }

    // 2. Chamar PesquisarPedCompra na Omie (pedidos faturados, recebidos ou parciais)
    // Busca até 30 pedidos recentes para encontrar ocorrências do item
    const resPesquisa = await chamarOmie('PesquisarPedCompra', {
      nPagina: 1,
      nRegsPorPagina: 40,
      lApenasImportadoApi: 'F',
      lExibirPedidosPendentes: 'T',
      lExibirPedidosFaturados: 'T',
      lExibirPedidosRecebidos: 'T',
      lExibirPedidosEncerrados: 'T',
      lExibirPedidosRecParciais: 'T',
      lExibirPedidosFatParciais: 'T'
    });

    if (resPesquisa.erro || !resPesquisa.dados?.pedidos_pesquisa) {
      return [];
    }

    const pedidos = resPesquisa.dados.pedidos_pesquisa || [];
    const fornecedoresCadastrados = await obterCadastro('fornecedores', 'fornecedores.json');
    const historicoAchado = [];
    const fornecedoresVistos = new Set();

    for (const ped of pedidos) {
      const cab = ped.cabecalho_consulta || ped.cabecalho || {};
      const produtosPed = ped.produtos_consulta || ped.produtos || [];
      const fornId = cab.nCodFor;

      // Procura o item dentro dos produtos do pedido de compra
      const itemMatch = produtosPed.find(p => {
        const codItem = String(p.cProduto || p.cCodIntProd || '').trim();
        const nCod = p.nCodProd ? String(p.nCodProd) : null;
        if (codItem && codItem === String(codigoProduto).trim()) return true;
        if (nCodProd && nCod && String(nCodProd) === nCod) return true;
        if (descProd && p.cDescricao && p.cDescricao.trim().toLowerCase() === descProd.trim().toLowerCase()) return true;
        return false;
      });

      if (itemMatch && fornId && !fornecedoresVistos.has(String(fornId))) {
        fornecedoresVistos.add(String(fornId));

        let fornNome = cab.cContato || 'Fornecedor Omie';
        const fornObj = (fornecedoresCadastrados || []).find(f => String(f.codigo_cliente_omie) === String(fornId));
        if (fornObj) {
          fornNome = fornObj.nome_fantasia || fornObj.razao_social;
        }

        const dataPed = cab.dIncData || cab.dDtPrevisao || new Date().toISOString();
        const valorUnit = Number(itemMatch.nValUnit || 0);

        historicoAchado.push({
          id: String(cab.nCodPed || Math.random().toString(36).substring(2, 8)),
          fornecedorId: String(fornId),
          fornecedorNome: fornNome,
          valorUnitario: valorUnit.toFixed(2),
          previsaoDias: '5',
          dataCompra: dataPed,
          numeroPedidoOmie: cab.cNumero || String(cab.nCodPed || ''),
          isUltimaCompra: true
        });

        if (historicoAchado.length >= limite) break;
      }
    }

    return historicoAchado;
  } catch (error) {
    console.error(`[OMIE COMPRAS] Erro ao buscar compras do produto ${codigoProduto}:`, error.message);
    return [];
  }
}

export default {
  buscarHistoricoComprasOmie
};
