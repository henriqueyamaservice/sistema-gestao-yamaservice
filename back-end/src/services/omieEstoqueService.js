/**
 * Serviço Centralizado de Integração com a API de Estoque da Omie
 * 
 * Gerencia:
 * 1. Consulta individual de saldo em tempo real (sob demanda no Almoxarifado)
 * 2. Sincronização geral noturna / em lote com a Omie
 * 3. Histórico e auditoria de sincronizações de estoque
 * 4. Ajustes manuais e listagem de locais de estoque
 */

import getDb from '../config/database.js';

const OMIE_ESTOQUE_AJUSTE_URL = 'https://app.omie.com.br/api/v1/estoque/ajuste/';
const OMIE_ESTOQUE_LOCAL_URL = 'https://app.omie.com.br/api/v1/estoque/local/';
const OMIE_ESTOQUE_CONSULTA_URL = 'https://app.omie.com.br/api/v1/estoque/consulta/';
const OMIE_ESTOQUE_RESUMO_URL = 'https://app.omie.com.br/api/v1/estoque/resumo/';

const RATE_LIMIT_MS = 350;
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Cache em memória para locais de estoque (válido por 1 hora)
let locaisCache = null;
let locaisCacheTime = 0;

async function chamarOmie(method, params, endpoint) {
  const appKey = process.env.OMIE_APP_KEY;
  const appSecret = process.env.OMIE_APP_SECRET;

  if (!appKey || !appSecret) {
    console.error(`[OMIE ESTOQUE] ❌ APP_KEY ou APP_SECRET não configurados no .env`);
    return { erro: true, mensagem: 'Credenciais Omie não configuradas no .env' };
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
      console.warn(`[OMIE ESTOQUE] ⚠️ Aviso Omie (${method}): ${data.faultstring} (${data.faultcode || ''})`);
      return { erro: true, faultcode: data.faultcode, mensagem: data.faultstring };
    }

    return { erro: false, dados: data };
  } catch (err) {
    console.error(`[OMIE ESTOQUE] ❌ Erro de conexão em ${method}: ${err.message}`);
    return { erro: true, mensagem: err.message };
  }
}

/**
 * Obtém os locais de estoque ativos da Omie com cache
 */
async function obterLocaisEstoque() {
  const agora = Date.now();
  if (locaisCache && (agora - locaisCacheTime < 3600000)) {
    return locaisCache;
  }

  const res = await chamarOmie('ListarLocaisEstoque', {
    nPagina: 1,
    nRegPorPagina: 50
  }, OMIE_ESTOQUE_LOCAL_URL);

  if (!res.erro && res.dados && res.dados.locaisEncontrados) {
    locaisCache = res.dados.locaisEncontrados;
    locaisCacheTime = agora;
    return locaisCache;
  }

  return locaisCache || [];
}

/**
 * Retorna a data atual no formato exigido pela Omie (DD/MM/AAAA)
 */
function formatarDataHojeOmie() {
  const hoje = new Date();
  const dia = String(hoje.getDate()).padStart(2, '0');
  const mes = String(hoje.getMonth() + 1).padStart(2, '0');
  const ano = hoje.getFullYear();
  return `${dia}/${mes}/${ano}`;
}

/**
 * Extrai o saldo numérico de um item retornado pela Omie, priorizando nSaldo, fisico ou disponivel
 */
function extrairSaldoItem(item) {
  if (item === null || item === undefined) return 0;
  if (typeof item === 'number') return isNaN(item) ? 0 : item;

  // nSaldo retornado no ObterEstoqueProduto e ListarPosEstoque
  if (item.nSaldo !== undefined && item.nSaldo !== null) {
    const val = parseFloat(item.nSaldo);
    if (!isNaN(val)) return val;
  }
  // Se tiver campo fisico, subtrai reservado
  if (item.fisico !== undefined && item.fisico !== null) {
    const fis = parseFloat(item.fisico) || 0;
    const res = parseFloat(item.reservado) || 0;
    return fis - res;
  }
  if (item.nDisponivel !== undefined && item.nDisponivel !== null) {
    const val = parseFloat(item.nDisponivel);
    if (!isNaN(val)) return val;
  }
  if (item.nFisico !== undefined && item.nFisico !== null) {
    const val = parseFloat(item.nFisico);
    if (!isNaN(val)) return val;
  }
  if (item.saldo !== undefined && item.saldo !== null) {
    const val = parseFloat(item.saldo);
    if (!isNaN(val)) return val;
  }

  return 0;
}

/**
 * Mapeia lista de posições de estoque por local retornada pela Omie
 */
function mapearLocaisEstoque(lista) {
  if (!lista) return [];
  const array = Array.isArray(lista) ? lista : [lista];
  return array.map(loc => {
    const saldoDisp = extrairSaldoItem(loc);
    const fisico = parseFloat(loc.fisico ?? loc.nFisico ?? loc.nSaldo ?? 0) || 0;
    const reservado = parseFloat(loc.reservado ?? 0) || 0;
    const minimo = parseFloat(loc.nEstoqueMinimo ?? loc.estoque_minimo ?? 0) || 0;
    const previsaoEntrada = parseFloat(loc.nPrevisaoEntrada ?? 0) || 0;
    const previsaoSaida = parseFloat(loc.nPrevisaoSaida ?? 0) || 0;
    const nomeLocal = loc.cDescricaoLocal || loc.descricao_local || loc.local || 'Local de Estoque';
    const idLocal = loc.nIdlocal || loc.codigo_local_estoque || 0;

    return {
      nIdlocal: idLocal,
      local: nomeLocal,
      saldo: parseFloat(saldoDisp.toFixed(4)),
      fisico: parseFloat(fisico.toFixed(4)),
      reservado: parseFloat(reservado.toFixed(4)),
      minimo: parseFloat(minimo.toFixed(4)),
      previsaoEntrada: parseFloat(previsaoEntrada.toFixed(4)),
      previsaoSaida: parseFloat(previsaoSaida.toFixed(4))
    };
  });
}

/**
 * Consulta o saldo atual de um produto na Omie em tempo real
 * 1º Tenta a API de Resumo (ObterEstoqueProduto) em /estoque/resumo/
 * 2º Se necessário, faz fallback para PosicaoEstoque em /estoque/consulta/
 */
async function consultarSaldoOmiePorLocais(codigo, id_prod) {
  const dataHoje = formatarDataHojeOmie();

  const paramsResumo = {
    cCodigo: codigo || '',
    dDia: dataHoje
  };
  if (id_prod && parseInt(id_prod) > 0) {
    paramsResumo.nIdProduto = parseInt(id_prod);
  }

  // 1. Tenta primariamente ObterEstoqueProduto (API de Resumo Oficial)
  const resResumo = await chamarOmie('ObterEstoqueProduto', paramsResumo, OMIE_ESTOQUE_RESUMO_URL);

  if (!resResumo.erro && resResumo.dados) {
    const lista = resResumo.dados.listaEstoque;
    const locaisMapeados = mapearLocaisEstoque(lista);

    if (locaisMapeados.length > 0) {
      const saldoTotal = locaisMapeados.reduce((acc, l) => acc + (l.saldo || 0), 0);
      return {
        saldoTotal: parseFloat(saldoTotal.toFixed(4)),
        locais: locaisMapeados
      };
    }

    // Se não veio listaEstoque, checa campos diretos na raiz
    const saldoRaiz = extrairSaldoItem(resResumo.dados);
    return {
      saldoTotal: parseFloat(saldoRaiz.toFixed(4)),
      locais: []
    };
  }

  // 2. Se a API de Resumo não tiver bloqueio, mas deu outro aviso, tenta o fallback PosicaoEstoque
  if (resResumo.erro) {
    // Se for bloqueio de taxa de consumo, avisa amigavelmente
    if (resResumo.mensagem && resResumo.mensagem.includes('MISUSE_API_PROCESS')) {
      throw new Error('A API da Omie está em período de espera temporário por segurança. Tente novamente em alguns minutos.');
    }

    console.warn(`[OMIE ESTOQUE] ObterEstoqueProduto aviso: ${resResumo.mensagem}. Tentando método PosicaoEstoque...`);

    const resConsulta = await chamarOmie('PosicaoEstoque', {
      id_prod: parseInt(id_prod) || 0,
      cod_int: codigo || '',
      codigo_local_estoque: 0,
      data: dataHoje
    }, OMIE_ESTOQUE_CONSULTA_URL);

    if (resConsulta.erro) {
      if (resConsulta.mensagem && resConsulta.mensagem.includes('MISUSE_API_PROCESS')) {
        throw new Error('A API da Omie está em período de espera temporário por segurança. Tente novamente em alguns minutos.');
      }
      throw new Error(resConsulta.mensagem || resResumo.mensagem || 'Falha ao consultar estoque na Omie');
    }

    if (resConsulta.dados) {
      if (Array.isArray(resConsulta.dados.produtos) && resConsulta.dados.produtos.length > 0) {
        const locaisMapeados = mapearLocaisEstoque(resConsulta.dados.produtos);
        const saldoTotal = locaisMapeados.reduce((acc, l) => acc + (l.saldo || 0), 0);
        return {
          saldoTotal: parseFloat(saldoTotal.toFixed(4)),
          locais: locaisMapeados
        };
      }
      const saldoRaiz = extrairSaldoItem(resConsulta.dados);
      return {
        saldoTotal: parseFloat(saldoRaiz.toFixed(4)),
        locais: []
      };
    }
  }

  return {
    saldoTotal: 0,
    locais: []
  };
}

/**
 * 1. CONSULTA INDIVIDUAL: Sincroniza o saldo de um único produto e registra auditoria
 */
async function consultarSaldoIndividual(codigoProduto, usuarioNome = 'Sistema') {
  const db = await getDb();

  // 1. Busca o produto no banco local
  const row = await db.get(
    `SELECT codigo, descricao, quantidade_estoque, dados_json FROM produtos_omie WHERE codigo = ?`,
    [codigoProduto]
  );

  if (!row) {
    throw new Error(`Produto '${codigoProduto}' não encontrado no catálogo.`);
  }

  let dadosJson = {};
  try {
    dadosJson = typeof row.dados_json === 'string' ? JSON.parse(row.dados_json) : (row.dados_json || {});
  } catch {
    dadosJson = {};
  }

  const id_prod = dadosJson.codigo_produto || 0;
  const saldoAnterior = parseFloat(row.quantidade_estoque) || 0;

  // 2. Consulta o saldo real na Omie
  const resultadoConsulta = await consultarSaldoOmiePorLocais(codigoProduto, id_prod);
  const novoSaldo = typeof resultadoConsulta === 'number' ? resultadoConsulta : (resultadoConsulta.saldoTotal ?? 0);
  const posicoesLocais = resultadoConsulta.locais || [];
  const diferenca = parseFloat((novoSaldo - saldoAnterior).toFixed(4));

  // 3. Atualiza o banco local
  dadosJson.quantidade_estoque = novoSaldo;
  dadosJson.posicoes_estoque_omie = posicoesLocais;
  const dadosJsonStr = JSON.stringify(dadosJson);

  if (db.driver === 'mysql') {
    await db.run(
      `UPDATE produtos_omie SET quantidade_estoque = ?, dados_json = ?, atualizado_em = NOW() WHERE codigo = ?`,
      [novoSaldo, dadosJsonStr, codigoProduto]
    );
  } else {
    await db.run(
      `UPDATE produtos_omie SET quantidade_estoque = ?, dados_json = ?, atualizado_em = CURRENT_TIMESTAMP WHERE codigo = ?`,
      [novoSaldo, dadosJsonStr, codigoProduto]
    );
  }

  // 4. Registra no histórico de auditoria
  try {
    await db.run(
      `INSERT INTO historico_sincronizacao_estoque 
       (tipo, codigo_produto, descricao_produto, saldo_anterior, saldo_novo, diferenca, origem, usuario, status, detalhes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'INDIVIDUAL',
        codigoProduto,
        row.descricao || '',
        saldoAnterior,
        novoSaldo,
        diferenca,
        'MANUAL_USUARIO',
        usuarioNome || 'Almoxarife',
        'SUCESSO',
        `Saldo verificado e alinhado diretamente com a Omie.`
      ]
    );
  } catch (errAudit) {
    console.error(`[OMIE ESTOQUE] Erro ao gravar histórico:`, errAudit.message);
  }

  console.log(`[OMIE ESTOQUE] ✅ ${codigoProduto} sincronizado: De ${saldoAnterior} para ${novoSaldo} (Dif: ${diferenca > 0 ? '+' : ''}${diferenca}) por ${usuarioNome}`);

  return {
    sucesso: true,
    codigo: codigoProduto,
    descricao: row.descricao,
    saldoAnterior,
    novoSaldo,
    diferenca,
    locais: posicoesLocais,
    atualizadoEm: new Date().toISOString()
  };
}

/**
 * 2. ROTINA GERAL / NOTURNA: Varredura de estoque e alinhamento em lote
 */
async function sincronizarPosicaoEstoqueGeral(origem = 'AUTOMATICO_NOTURNO', usuarioNome = 'Sistema Noturno', limitePaginas = null) {
  console.log(`[OMIE ESTOQUE] 🌙 Iniciando rotina de alinhamento de estoque (${origem}) disparada por ${usuarioNome}${limitePaginas ? ` [Limite: ${limitePaginas} págs]` : ''}...`);
  const db = await getDb();
  const inicio = Date.now();

  let totalVerificados = 0;
  let totalAtualizados = 0;
  let divergencias = [];

  try {
    // 1. Carrega todos os produtos do banco local para mapas em memória
    const produtosLocais = await db.all(`SELECT codigo, descricao, quantidade_estoque, dados_json FROM produtos_omie`);
    console.log(`[OMIE ESTOQUE] 📚 Banco local possui ${produtosLocais.length} produtos carregados para alinhamento.`);

    const mapaPorIdOmie = new Map(); // nCodProd (number) -> produto
    const mapaPorCodigo = new Map(); // codigo (string) -> produto

    for (const p of produtosLocais) {
      let dj = {};
      try { dj = typeof p.dados_json === 'string' ? JSON.parse(p.dados_json) : (p.dados_json || {}); } catch { }
      if (dj.codigo_produto) {
        mapaPorIdOmie.set(Number(dj.codigo_produto), p);
      }
      if (p.codigo) {
        mapaPorCodigo.set(String(p.codigo).trim().toUpperCase(), p);
      }
      if (dj.codigo) {
        mapaPorCodigo.set(String(dj.codigo).trim().toUpperCase(), p);
      }
    }

    const dataPosicao = formatarDataHojeOmie();

    let pagina = 1;
    let totalPaginas = 1;
    let maxPaginas = 1;
    let sucessoListarPosicao = false;

    // Mapa em memória para agrupar múltiplos locais por produto local identificado
    // Chave: codigoLocal (ex: 'PRD04638') -> { prodLocal: p, saldoTotal: number, locais: [] }
    const mapaProdutosConsolidados = new Map();

    // Chamada oficial ListarPosEstoque com paginação e retry inteligente
    do {
      let res = null;
      let tentativas = 0;
      const MAX_TENTATIVAS = 3;

      while (tentativas < MAX_TENTATIVAS) {
        tentativas++;
        res = await chamarOmie('ListarPosEstoque', {
          nPagina: pagina,
          nRegPorPagina: 100,
          dDataPosicao: dataPosicao,
          cExibeTodos: "S",
          codigo_local_estoque: 0
        }, OMIE_ESTOQUE_CONSULTA_URL);

        if (!res.erro && res.dados && res.dados.produtos) {
          break; // Sucesso na página
        }

        console.warn(`[OMIE ESTOQUE] ⚠️ Aviso na página ${pagina} (Tentativa ${tentativas}/${MAX_TENTATIVAS}): ${res.mensagem || 'Resposta inválida'}. Aguardando 2s...`);
        await sleep(2000);
      }

      if (res.erro || !res.dados || !res.dados.produtos) {
        console.warn(`[OMIE ESTOQUE] ⚠️ Página ${pagina} não pôde ser obtida após ${MAX_TENTATIVAS} tentativas. Continuando...`);
        pagina++;
        continue;
      }

      sucessoListarPosicao = true;
      totalPaginas = res.dados.nTotPaginas || 1;
      const produtosOmie = res.dados.produtos || [];

      for (const itemOmie of produtosOmie) {
        const nCodProd = Number(itemOmie.nCodProd || 0);
        const codStr = String(itemOmie.cCodigo || itemOmie.codigo || itemOmie.cCodInt || '').trim().toUpperCase();

        const prodLocal = (nCodProd > 0 ? mapaPorIdOmie.get(nCodProd) : null) || mapaPorCodigo.get(codStr);
        if (!prodLocal) {
          continue; // Produto não cadastrado no banco local, pula
        }

        const codigoChave = prodLocal.codigo;
        const saldoItem = extrairSaldoItem(itemOmie);
        const localNome = itemOmie.descricao_local || itemOmie.cDescricaoLocal || `Local ${itemOmie.codigo_local_estoque || 0}`;

        if (!mapaProdutosConsolidados.has(codigoChave)) {
          mapaProdutosConsolidados.set(codigoChave, {
            prodLocal,
            saldoTotal: 0,
            locais: []
          });
        }

        const reg = mapaProdutosConsolidados.get(codigoChave);
        reg.saldoTotal = parseFloat((reg.saldoTotal + saldoItem).toFixed(4));
        reg.locais.push({
          nIdlocal: itemOmie.codigo_local_estoque || 0,
          local: localNome,
          saldo: saldoItem,
          fisico: parseFloat(itemOmie.fisico || 0),
          reservado: parseFloat(itemOmie.reservado || 0),
          minimo: parseFloat(itemOmie.estoque_minimo || 0),
          previsaoEntrada: parseFloat(itemOmie.nPendente || 0),
          previsaoSaida: 0
        });
      }

      if (pagina % 20 === 0 || pagina === totalPaginas) {
        console.log(`[OMIE ESTOQUE] ⏳ Progresso varredura: Página ${pagina}/${totalPaginas} processada (${mapaProdutosConsolidados.size} produtos locais identificados)...`);
      }

      pagina++;
      await sleep(350); // Respeita limite seguro da API Omie
      maxPaginas = limitePaginas ? Math.min(totalPaginas, Number(limitePaginas)) : totalPaginas;
    } while (pagina <= maxPaginas);

    console.log(`[OMIE ESTOQUE] 🔍 Total de produtos locais identificados na Omie: ${mapaProdutosConsolidados.size}. Alinhando saldos com o banco...`);

    // Atualiza o MariaDB para cada produto consolidado com todos os seus locais
    for (const [codigo, dadosOmie] of mapaProdutosConsolidados.entries()) {
      totalVerificados++;
      const saldoOmie = dadosOmie.saldoTotal;
      const rowLocal = dadosOmie.prodLocal;

      const saldoLocal = parseFloat(rowLocal.quantidade_estoque) || 0;
      if (Math.abs(saldoLocal - saldoOmie) > 0.0001) {
        const diff = parseFloat((saldoOmie - saldoLocal).toFixed(4));

        let dJson = {};
        try { dJson = typeof rowLocal.dados_json === 'string' ? JSON.parse(rowLocal.dados_json || '{}') : (rowLocal.dados_json || {}); } catch { }
        dJson.quantidade_estoque = saldoOmie;
        dJson.posicoes_estoque_omie = dadosOmie.locais;

        if (db.driver === 'mysql') {
          await db.run(
            `UPDATE produtos_omie SET quantidade_estoque = ?, dados_json = ?, atualizado_em = NOW() WHERE codigo = ?`,
            [saldoOmie, JSON.stringify(dJson), codigo]
          );
        } else {
          await db.run(
            `UPDATE produtos_omie SET quantidade_estoque = ?, dados_json = ?, atualizado_em = CURRENT_TIMESTAMP WHERE codigo = ?`,
            [saldoOmie, JSON.stringify(dJson), codigo]
          );
        }

        divergencias.push({
          codigo,
          descricao: rowLocal.descricao,
          saldoAnterior: saldoLocal,
          saldoNovo: saldoOmie,
          diferenca: diff
        });
        totalAtualizados++;
      }
    }

    const duracaoSegundos = ((Date.now() - inicio) / 1000).toFixed(1);
    const detalheResumo = sucessoListarPosicao
      ? `${totalVerificados} itens verificados, ${totalAtualizados} divergências corrigidas em ${duracaoSegundos}s.`
      : `Consulta consolidada executada com sucesso em ${duracaoSegundos}s.`;

    // Grava registro resumo na tabela de histórico
    await db.run(
      `INSERT INTO historico_sincronizacao_estoque 
       (tipo, codigo_produto, descricao_produto, saldo_anterior, saldo_novo, diferenca, origem, usuario, status, detalhes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'GERAL_NOTURNO',
        null,
        'Varredura Consolidada de Estoque',
        null,
        null,
        totalAtualizados,
        origem,
        usuarioNome,
        'SUCESSO',
        detalheResumo
      ]
    );

    console.log(`[OMIE ESTOQUE] 🎉 Rotina noturna concluída: ${detalheResumo}`);

    return {
      sucesso: true,
      totalVerificados,
      totalAtualizados,
      divergencias: divergencias.slice(0, 50),
      detalhes: detalheResumo
    };
  } catch (errGeral) {
    console.error(`[OMIE ESTOQUE] ❌ Erro na rotina noturna:`, errGeral.message);
    try {
      await db.run(
        `INSERT INTO historico_sincronizacao_estoque 
         (tipo, codigo_produto, descricao_produto, saldo_anterior, saldo_novo, diferenca, origem, usuario, status, detalhes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'GERAL_NOTURNO',
          null,
          'Varredura Consolidada de Estoque',
          null,
          null,
          0,
          origem,
          usuarioNome,
          'ERRO',
          `Falha: ${errGeral.message}`
        ]
      );
    } catch { }
    return { sucesso: false, erro: errGeral.message };
  }
}

/**
 * 3. HISTÓRICO: Retorna o histórico de sincronização
 */
async function obterHistorico(codigoProduto = null, limite = 50) {
  const db = await getDb();
  const limitNum = parseInt(limite) || 50;

  if (codigoProduto) {
    return await db.all(
      `SELECT * FROM historico_sincronizacao_estoque 
       WHERE codigo_produto = ? 
       ORDER BY criado_em DESC 
       LIMIT ?`,
      [codigoProduto, limitNum]
    );
  }

  return await db.all(
    `SELECT * FROM historico_sincronizacao_estoque 
     ORDER BY criado_em DESC 
     LIMIT ?`,
    [limitNum]
  );
}

/**
 * Realiza um ajuste manual de estoque (Entrada ou Saída) na Omie
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
 * Lista locais de estoque cadastrados na Omie
 */
async function listarLocais(nPagina = 1, nRegPorPagina = 100) {
  return chamarOmie('ListarLocaisEstoque', {
    nPagina,
    nRegPorPagina
  }, OMIE_ESTOQUE_LOCAL_URL);
}

export default {
  consultarSaldoIndividual,
  sincronizarPosicaoEstoqueGeral,
  obterHistorico,
  ajustarEstoque,
  listarLocais
};
