import getDb from '../config/database.js';

const OMIE_NOTA_ENTRADA_URL = 'https://app.omie.com.br/api/v1/produtos/notaentrada/';
const OMIE_NOTA_FATURAMENTO_URL = 'https://app.omie.com.br/api/v1/produtos/notaentradafat/';
const RATE_LIMIT_MS = 350;
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function chamarApiOmie(url, method, params) {
  const appKey = process.env.OMIE_APP_KEY;
  const appSecret = process.env.OMIE_APP_SECRET;

  if (!appKey || !appSecret) {
    return { erro: true, mensagem: 'Credenciais Omie não configuradas (.env)' };
  }

  const payload = {
    call: method,
    app_key: appKey,
    app_secret: appSecret,
    param: [params]
  };

  try {
    await sleep(RATE_LIMIT_MS);
    const response = await fetch(url, {
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
 * Cadastra uma nova Nota de Entrada no Omie
 * API: /api/v1/produtos/notaentrada/ -> IncluirNotaEnt
 */
export async function incluirNotaEntradaOmie(dadosNota) {
  /*
    dadosNota esperado:
    {
      cNumeroNota: '12345',
      cSerie: '1',
      dDtEmissao: 'DD/MM/AAAA',
      dDtEntrada: 'DD/MM/AAAA',
      nCodFor: 123456, // ID do fornecedor na Omie
      cChaveNfe: '44 dígitos',
      nValorTotal: 1500.00,
      itens: [
        {
          cCodProd: 'PRD001',
          nCodProd: 1234, // se tiver
          nQtde: 10,
          nValUnit: 150.00,
          cCFOP: '1.556',
          cNCM: '...',
          codigo_local_estoque: 1 // Almoxarifado
        }
      ],
      parcelas: [
        {
          nParcela: 1,
          dDtVenc: 'DD/MM/AAAA',
          nValor: 1500.00,
          nDias: 30
        }
      ],
      observacoes: 'Recebimento Fiscal via Sistema Almoxarifado'
    }
  */

  const cabec = {
    cNumeroNota: String(dadosNota.cNumeroNota || '').padStart(6, '0'),
    cSerie: String(dadosNota.cSerie || '1'),
    dDtEmissao: dadosNota.dDtEmissao || new Date().toLocaleDateString('pt-BR'),
    dDtEntrada: dadosNota.dDtEntrada || new Date().toLocaleDateString('pt-BR'),
    nCodFor: Number(dadosNota.nCodFor || 0),
    cChaveNfe: String(dadosNota.cChaveNfe || '').replace(/\D/g, '')
  };

  const produtos = (dadosNota.itens || []).map((item, index) => {
    const itemPayload = {
      nQtde: Number(item.nQtde || item.quantidade || 1),
      nValUnit: Number(item.nValUnit || item.valorUnitario || 0),
      cCFOP: String(item.cCFOP || item.cfop || '1556').replace(/\D/g, ''),
      cAcaoItem: 'I'
    };

    if (item.nCodProd) {
      itemPayload.nCodProd = Number(item.nCodProd);
    } else if (item.cCodProd || item.codigo) {
      itemPayload.cCodProdInt = String(item.cCodProd || item.codigo);
    }

    if (item.cNCM || item.ncm) {
      itemPayload.cNCM = String(item.cNCM || item.ncm).replace(/\D/g, '');
    }

    if (item.codigo_local_estoque) {
      itemPayload.codigo_local_estoque = Number(item.codigo_local_estoque);
    }

    return itemPayload;
  });

  const param = {
    cabec,
    produtos,
    obs: {
      cObs: dadosNota.observacoes || 'Recebimento registrado via Sistema Almoxarifado'
    }
  };

  // Se tiver rateio de departamentos
  if (dadosNota.nCodDep) {
    param.departamentos = [
      {
        cCodDep: String(dadosNota.nCodDep),
        nValDep: Number(dadosNota.nValorTotal || 0),
        nPercDep: 100
      }
    ];
  }

  // Se tiver parcelas informadas para o Contas a Pagar
  if (dadosNota.parcelas && dadosNota.parcelas.length > 0) {
    param.titulos = dadosNota.parcelas.map((p, idx) => ({
      nNumTitulo: `${cabec.cNumeroNota}/${idx + 1}`,
      dDtVenc: p.dDtVenc || p.dataVencimento,
      nValor: Number(p.nValor || p.valor || 0)
    }));
  }

  console.log('📦 [Omie] Enviando IncluirNotaEnt:', JSON.stringify(param, null, 2));
  return await chamarApiOmie(OMIE_NOTA_ENTRADA_URL, 'IncluirNotaEnt', param);
}

/**
 * Move a nota para o status "Conferido" no Omie
 * API: /api/v1/produtos/notaentradafat/ -> ConferirNotaEnt
 */
export async function conferirNotaEntradaOmie(nCodNotaEnt, cCodIntNotaEnt = '') {
  return await chamarApiOmie(OMIE_NOTA_FATURAMENTO_URL, 'ConferirNotaEnt', {
    nCodNotaEnt: Number(nCodNotaEnt || 0),
    cCodIntNotaEnt: String(cCodIntNotaEnt || '')
  });
}

/**
 * Conclui a nota no Omie (efetiva estoque e gera Contas a Pagar no Financeiro)
 * API: /api/v1/produtos/notaentradafat/ -> ConcluirNotaEnt
 */
export async function concluirNotaEntradaOmie(nCodNotaEnt, cCodIntNotaEnt = '') {
  return await chamarApiOmie(OMIE_NOTA_FATURAMENTO_URL, 'ConcluirNotaEnt', {
    nCodNotaEnt: Number(nCodNotaEnt || 0),
    cCodIntNotaEnt: String(cCodIntNotaEnt || '')
  });
}

/**
 * Consulta uma nota de entrada existente no Omie
 * API: /api/v1/produtos/notaentrada/ -> ConsultarNotaEnt
 */
export async function consultarNotaEntradaOmie({ nCodNotaEnt, cCodIntNotaEnt, cChaveNfe }) {
  const param = {};
  if (nCodNotaEnt) param.nCodNotaEnt = Number(nCodNotaEnt);
  if (cCodIntNotaEnt) param.cCodIntNotaEnt = String(cCodIntNotaEnt);
  if (cChaveNfe) param.cChaveNfe = String(cChaveNfe).replace(/\D/g, '');

  return await chamarApiOmie(OMIE_NOTA_ENTRADA_URL, 'ConsultarNotaEnt', param);
}

/**
 * Lista as notas de entrada cadastradas no Omie
 * API: /api/v1/produtos/notaentrada/ -> ListarNotaEnt
 */
export async function listarNotasEntradaOmie(pagina = 1, registrosPorPagina = 50) {
  return await chamarApiOmie(OMIE_NOTA_ENTRADA_URL, 'ListarNotaEnt', {
    nPagina: pagina,
    nRegistrosPorPagina: registrosPorPagina
  });
}

export default {
  incluirNotaEntradaOmie,
  conferirNotaEntradaOmie,
  concluirNotaEntradaOmie,
  consultarNotaEntradaOmie,
  listarNotasEntradaOmie
};
