import express from 'express';
import omieRemessaService from '../services/omieRemessaService.js';
import omieEstoqueService from '../services/omieEstoqueService.js';
import omiePedidosService from '../services/omiePedidosService.js';
import { buscarOuCriarProjetoOmie } from '../services/omieProjetosService.js';
import { buscarVendedorValidoOmie } from '../services/omieVendedoresService.js';
import getDb from '../config/database.js';
import notificationService from '../services/notificationService.js';
import { resolverDivergenciaCompras } from '../services/divergenciasService.js';

const router = express.Router();

// ============================================================
// HELPERS: Produtos na omie_collections (INTOCADO)
// ============================================================

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

// A função salvarProdutosDb era usada para reduzir estoque localmente ao aprovar.
// Como estamos migrando para SQL, o ideal seria fazer UPDATE produtos_omie SET quantidade_estoque = ? WHERE codigo = ?
// Vou fazer isso diretamente onde salvarProdutosDb era chamado.

// ============================================================
// HELPERS: Converter linha do banco para objeto Requisição
// ============================================================

function isoToSql(isoStr) {
  if (!isoStr) return null;
  return isoStr.slice(0, 19).replace('T', ' ');
}

function deduplicarCotacoes(cotacoes) {
  if (!Array.isArray(cotacoes) || cotacoes.length === 0) return [];
  const mapa = new Map();
  for (const cot of cotacoes) {
    if (!cot) continue;
    const chave = cot.fornecedorId != null && cot.fornecedorId !== ''
      ? String(cot.fornecedorId)
      : (cot.id ? `id_${cot.id}` : Math.random().toString());

    if (mapa.has(chave)) {
      const anterior = mapa.get(chave);
      if (cot.origem === 'portal' && anterior.origem !== 'portal') {
        mapa.set(chave, cot);
      } else if (cot.valorUnitario && !anterior.valorUnitario) {
        mapa.set(chave, cot);
      } else {
        mapa.set(chave, { ...anterior, ...cot });
      }
    } else {
      mapa.set(chave, cot);
    }
  }
  return Array.from(mapa.values());
}

function dbRowToReq(row) {
  if (!row) return null;
  let dados = {};
  try { dados = JSON.parse(row.dados_json || '{}'); } catch (e) { /* ignore */ }

  if (Array.isArray(dados.itens)) {
    dados.itens = dados.itens.map(item => {
      if (Array.isArray(item.cotacoes)) {
        return {
          ...item,
          cotacoes: deduplicarCotacoes(item.cotacoes)
        };
      }
      return item;
    });
  }

  // Se a requisição estiver em concluído/recebimento mas não tiver nota_fiscal_vinculada nos pedidos,
  // popula para garantir visualização imediata na Entrada no Estoque
  if ((dados.status_compras === 'concluido' || dados.status_compras === 'entregue_parcial') && Array.isArray(dados.pedidos_omie)) {
    dados.pedidos_omie = dados.pedidos_omie.map(pedido => {
      const chaveReal = dados.chaveNfe || pedido.chaveNfe || '';
      const chaveLimpa = chaveReal && !chaveReal.startsWith('352609') ? chaveReal : '';
      if (!pedido.nota_fiscal_vinculada) {
        pedido.nota_fiscal_vinculada = {
          chaveAcesso: chaveLimpa,
          numeroNF: pedido.numeroNF || dados.nota_fiscal || '',
          emitente: {
            nome: dados.solicitante || 'FORNECEDOR',
            cnpj_cpf: 'Não informado'
          },
          dataEmissao: row.data_criacao || new Date().toISOString(),
          valorTotal: pedido.valorTotal || 0,
          itens: (pedido.itens || dados.itens || []).map(i => ({
            codigo: i.codigo || i.codigo_item || 'PRD001',
            descricao: i.descricao || 'Item do Pedido',
            quantidade: Number(i.quantidade) || 1,
            valorUnitario: Number(i.valor_unitario) || 0,
            valorTotal: (Number(i.quantidade) || 1) * (Number(i.valor_unitario) || 0)
          })),
          status: 'recebida'
        };
      } else if (pedido.nota_fiscal_vinculada.chaveAcesso && pedido.nota_fiscal_vinculada.chaveAcesso.startsWith('352609')) {
        pedido.nota_fiscal_vinculada.chaveAcesso = chaveLimpa;
      }
      return pedido;
    });
  }

  return {
    id: row.id,
    numeroOS: row.numero_os,
    status: row.status,
    status_compras: row.status_compras,
    tipo: row.tipo,
    solicitante: row.solicitante,
    departamento: row.departamento,
    entregador: row.entregador,
    localEstoque: row.local_estoque,
    dataCriacao: row.data_criacao,
    ...dados
  };
}

async function saveReq(db, id, req_obj) {
  if (Array.isArray(req_obj.itens)) {
    req_obj.itens = req_obj.itens.map(item => {
      if (Array.isArray(item.cotacoes)) {
        return {
          ...item,
          cotacoes: deduplicarCotacoes(item.cotacoes)
        };
      }
      return item;
    });
  }
  const dadosJson = JSON.stringify(req_obj);
  if (db.driver === 'mysql') {
    await db.run(
      `INSERT INTO requisicoes (id, numero_os, status, status_compras, tipo, solicitante, departamento, entregador, local_estoque, data_criacao, dados_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
         numero_os=VALUES(numero_os), status=VALUES(status), status_compras=VALUES(status_compras),
         tipo=VALUES(tipo), solicitante=VALUES(solicitante), departamento=VALUES(departamento),
         entregador=VALUES(entregador), local_estoque=VALUES(local_estoque),
         atualizado_em=NOW(), dados_json=VALUES(dados_json)`,
      [
        id,
        req_obj.numeroOS || req_obj.numero_os || null,
        req_obj.status || null,
        req_obj.status_compras || null,
        req_obj.tipo || null,
        req_obj.solicitante || null,
        req_obj.departamento || req_obj.centroCusto || null,
        req_obj.entregador || null,
        req_obj.localEstoque || null,
        isoToSql(req_obj.dataCriacao || new Date().toISOString()),
        dadosJson
      ]
    );
  } else {
    await db.run(
      `INSERT INTO requisicoes (id, numero_os, status, status_compras, tipo, solicitante, departamento, entregador, local_estoque, data_criacao, dados_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         numero_os=excluded.numero_os, status=excluded.status, status_compras=excluded.status_compras,
         tipo=excluded.tipo, solicitante=excluded.solicitante, departamento=excluded.departamento,
         entregador=excluded.entregador, local_estoque=excluded.local_estoque,
         atualizado_em=CURRENT_TIMESTAMP, dados_json=excluded.dados_json`,
      [
        id,
        req_obj.numeroOS || req_obj.numero_os || null,
        req_obj.status || null,
        req_obj.status_compras || null,
        req_obj.tipo || null,
        req_obj.solicitante || null,
        req_obj.departamento || req_obj.centroCusto || null,
        req_obj.entregador || null,
        req_obj.localEstoque || null,
        isoToSql(req_obj.dataCriacao || new Date().toISOString()),
        dadosJson
      ]
    );
  }
}

// ============================================================
// Mapa de Locais de Estoque Omie
// ============================================================
const OMIE_LOCAIS_ESTOQUE = {
  "01 - Almoxarifado": 687827873,
  "Almoxarifado": 687827873,
  "Local de Estoque Padrão": 685531866,
  "02 - Armazém de Matéria Prima": 688337027,
  "03 - Armazém de Serragem": 741105704,
  "04 - Armazém de Cama de Frango": 741105830,
  "05 - Armazém de Insumos para Construção Civil": 741105884,
  "06 - Armazém Fabrica de Ração": 741105962,
  "Posto de Combustivel": 1649011537
};

// ============================================================
// GET / — Listar Requisições
// ============================================================
router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    const rows = await db.all(`SELECT * FROM requisicoes ORDER BY data_criacao DESC`);
    const requisicoes = rows.map(dbRowToReq);

    // Auto-sanitização no banco para registros com duplicatas existentes
    setTimeout(async () => {
      try {
        for (const row of rows) {
          let dados = {};
          try { dados = JSON.parse(row.dados_json || '{}'); } catch(e){}
          let teveDuplicata = false;
          if (Array.isArray(dados.itens)) {
            dados.itens.forEach(item => {
              if (Array.isArray(item.cotacoes)) {
                const unicos = deduplicarCotacoes(item.cotacoes);
                if (unicos.length !== item.cotacoes.length) {
                  teveDuplicata = true;
                }
              }
            });
            if (teveDuplicata) {
              const reqObj = dbRowToReq(row);
              await saveReq(db, row.id, reqObj);
              console.log(`🧹 Cotações duplicadas corrigidas automaticamente no banco para a requisição #${row.id}`);
            }
          }
        }
      } catch (errClean) {
        console.error('Erro na limpeza assíncrona de cotações:', errClean.message);
      }
    }, 100);

    res.json(requisicoes);
  } catch (error) {
    res.status(500).json({ message: 'Erro interno ao ler requisições', error: error.message });
  }
});

// ============================================================
// POST / — Salvar Nova Requisição (com Trava Anti-Duplicação por O.S.)
// ============================================================
router.post('/', async (req, res) => {
  try {
    const db = await getDb();

    const isBalcaoFinalizado = req.body.status === 'finalizado' || req.body.origem === 'balcao_almoxarifado';
    const statusInicial = isBalcaoFinalizado
      ? 'finalizado'
      : (req.body.origem === 'app_funcionario' ? 'aguardando_diretoria' : 'pendente');

    const hojeStr = new Date().toISOString().split('T')[0];
    const dataCriacaoFinal = (req.body.dataLancamento && req.body.dataLancamento !== hojeStr)
      ? new Date(req.body.dataLancamento + 'T12:00:00').toISOString()
      : new Date().toISOString();

    // === TRAVA ANTI-DUPLICAÇÃO POR O.S. ===
    // Só unifica com requisição pendente se a nova requisição NÃO for uma saída imediata de balcão
    const numOS = req.body.numeroOS;
    if (numOS && !isBalcaoFinalizado) {
      // Busca no banco pela OS que ainda não foi finalizada/cancelada
      const reqExistente = await db.get(
        `SELECT * FROM requisicoes WHERE numero_os = ? AND status NOT IN ('finalizado','concluido','cancelado','entregue')`,
        [numOS]
      );

      if (reqExistente) {
        let reqObj = dbRowToReq(reqExistente);
        const novosItens = (req.body.itens || []).map(item => ({
          ...item,
          status: item.status || 'aguardando_separacao'
        }));

        const itensAtualizados = [...(reqObj.itens || [])];
        novosItens.forEach(novoItem => {
          const itemJaExiste = itensAtualizados.find(i =>
            (i.codigo && i.codigo === novoItem.codigo) ||
            (i.descricao && i.descricao.toLowerCase() === (novoItem.descricao || '').toLowerCase())
          );
          if (itemJaExiste) {
            itemJaExiste.quantidade = (parseFloat(itemJaExiste.quantidade) || 0) + (parseFloat(novoItem.quantidade) || 0);
          } else {
            itensAtualizados.push(novoItem);
          }
        });

        reqObj.itens = itensAtualizados;
        await saveReq(db, reqExistente.id, reqObj);

        try {
          const io = req.app.get('io');
          if (io) {
            io.emit('produtos_atualizados');
          }
        } catch(e) {}

        return res.status(200).json({
          message: 'Requisição unificada com sucesso',
          requisicao: reqObj
        });
      }
    }

    const id = Date.now().toString();
    const novaRequisicao = {
      id,
      dataCriacao: dataCriacaoFinal,
      status: statusInicial,
      ...req.body,
      departamento: req.body.centroCusto || req.body.departamento || '',
      solicitante: req.body.contatoCliente || req.body.solicitante || 'Não Informado',
    };

    // Validação antecipada do Vendedor Omie se fornecido
    const nomeVendedor = (novaRequisicao.vendedor || novaRequisicao.entregador || '').trim();
    if (nomeVendedor || novaRequisicao.codigoVendedorOmie) {
      try {
        const v = await buscarVendedorValidoOmie(novaRequisicao.codigoVendedorOmie || nomeVendedor, db);
        if (v?.codigo) {
          novaRequisicao.codigoVendedorOmie = Number(v.codigo);
          console.log(`[REQUISICOES] 🎯 Vendedor Omie validado antecipadamente: #${v.codigo} (${v.nome})`);
        }
      } catch (eVend) {
        console.warn('[REQUISICOES] Aviso ao validar vendedor antecipadamente:', eVend.message);
      }
    }

    // Resolução antecipada do Projeto Omie se houver OS
    if (!novaRequisicao.codigoProjetoOmie && novaRequisicao.numeroOS) {
      try {
        const proj = await buscarOuCriarProjetoOmie(novaRequisicao.numeroOS, db);
        if (proj?.codigo) {
          novaRequisicao.codigoProjetoOmie = Number(proj.codigo);
        }
      } catch (e) {
        console.warn('[REQUISICOES] Aviso ao buscar projeto antecipadamente:', e.message);
      }
    }

    if (novaRequisicao.itens && Array.isArray(novaRequisicao.itens)) {
      novaRequisicao.itens = novaRequisicao.itens.map(item => ({
        ...item,
        status: isBalcaoFinalizado
          ? 'entregue'
          : (statusInicial === 'aguardando_diretoria' ? 'aguardando_diretoria' : (item.status || 'aguardando_separacao')),
        quantidade_entregue: isBalcaoFinalizado ? Number(item.quantidade) : (item.quantidade_entregue || 0),
        devolvido: 0
      }));
    }

    await saveReq(db, id, novaRequisicao);

    // Se for saída concluída de balcão, processa baixa imediata de estoque e remessa Omie
    if (isBalcaoFinalizado) {
      console.log(`[REQUISICOES BALCÃO] ⚡ Saída direta de balcão concluída (#${id}). Baixando estoque local e gerando remessa Omie...`);

      // 1. Baixa imediata de estoque no MariaDB
      for (const i of (novaRequisicao.itens || [])) {
        const entregue = Number(i.quantidade_entregue ?? i.quantidade);
        if (entregue > 0) {
          await db.run(
            `UPDATE produtos_omie SET quantidade_estoque = quantidade_estoque - ? WHERE codigo = ?`,
            [entregue, i.codigo]
          );
        }
      }

      // 2. Se tiver OS vinculada, atualiza status das peças solicitadas para ENTREGUE
      if (novaRequisicao.numeroOS) {
        try {
          const osRow = await db.get(
            `SELECT * FROM ordens_servico WHERE UPPER(numero_os) = UPPER(?) OR id = ?`,
            [novaRequisicao.numeroOS, novaRequisicao.numeroOS]
          );
          if (osRow) {
            let osData = {};
            try { osData = JSON.parse(osRow.dados_json || '{}'); } catch(e){}

            const pecasSolicitadas = Array.isArray(osData.pecasSolicitadas) ? osData.pecasSolicitadas.map(p => {
              const entregueNoBalcao = (novaRequisicao.itens || []).find(it => it.codigo === p.codigo);
              if (entregueNoBalcao) {
                return { ...p, status: 'ENTREGUE' };
              }
              return p;
            }) : [];

            const novasPecasUtilizadas = (novaRequisicao.itens || []).map(it => ({
              codigo: it.codigo,
              descricao: it.descricao,
              quantidade: Number(it.quantidade),
              valor_unitario: Number(it.valor_unitario || 0),
              data: new Date().toISOString().split('T')[0]
            }));

            const pecasUtilizadas = [...(osData.pecasUtilizadas || []), ...novasPecasUtilizadas];
            const novaSituacao = (osRow.situacao === 'EM_ANDAMENTO' || osRow.situacao === 'EM ANDAMENTO')
              ? osRow.situacao
              : 'PECAS_ENTREGUES';

            osData.pecasSolicitadas = pecasSolicitadas;
            osData.pecasUtilizadas = pecasUtilizadas;
            osData.situacao = novaSituacao;

            const sqlUpdateOs = db.driver === 'mysql'
              ? `UPDATE ordens_servico SET situacao = ?, dados_json = ?, atualizado_em = NOW() WHERE id = ?`
              : `UPDATE ordens_servico SET situacao = ?, dados_json = ?, atualizado_em = CURRENT_TIMESTAMP WHERE id = ?`;

            await db.run(sqlUpdateOs, [novaSituacao, JSON.stringify(osData), osRow.id]);
            console.log(`[REQUISICOES BALCÃO] 🛠️ O.S. #${novaRequisicao.numeroOS} atualizada com peças entregues.`);
          }
        } catch (errOs) {
          console.warn(`[REQUISICOES BALCÃO] Aviso ao atualizar O.S. vinculada:`, errOs.message);
        }
      }

      // 3. Dispara a Remessa Omie em segundo plano
      dispararRemessaOmie(novaRequisicao, db, req.app.get('io')).catch(errRem => {
        console.error(`[OMIE REMESSA] ❌ Erro assíncrono ao gerar remessa (balcão):`, errRem.message);
      });
    }

    // Emite notificação de nova requisição
    notificationService.notificarMudancaStatus(req.app.get('io'), {
      tipo: 'requisicao',
      id: novaRequisicao.id,
      novoStatus: novaRequisicao.status,
      mensagem: isBalcaoFinalizado
        ? `Saída de balcão concluída (#${novaRequisicao.id})`
        : `Nova Requisição gerada: ${novaRequisicao.status}`
    });

    try {
      const io = req.app.get('io');
      if (io) {
        io.emit('produtos_atualizados');
      }
    } catch(e) {}

    res.status(201).json({
      message: isBalcaoFinalizado ? 'Saída concluída com sucesso' : 'Requisição salva com sucesso',
      requisicao: novaRequisicao
    });
  } catch (error) {
    res.status(500).json({ message: 'Erro interno ao salvar requisição', error: error.message });
  }
});

// ============================================================
// PUT /:id — Atualizar Requisição
// ============================================================
router.put('/:id', async (req, res) => {
  try {
    const db = await getDb();
    const { id } = req.params;

    const row = await db.get(`SELECT * FROM requisicoes WHERE id = ? OR numero_os = ?`, [id, id]);
    if (!row) return res.status(404).json({ message: 'Requisição não encontrada' });

    let reqObj = dbRowToReq(row);
    reqObj = { ...reqObj, ...req.body };
    await saveReq(db, row.id, reqObj);

    // Notificar se o status ou status_compras mudou
    if (req.body.status || req.body.status_compras) {
      notificationService.notificarMudancaStatus(req.app.get('io'), {
        tipo: 'requisicao',
        id: reqObj.id,
        novoStatus: req.body.status || req.body.status_compras,
        mensagem: `Requisição atualizada para: ${req.body.status || req.body.status_compras}`
      });
    }

    res.json({ message: 'Requisição atualizada com sucesso', requisicao: reqObj });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao atualizar requisição', error: error.message });
  }
});

// ============================================================
// POST /:id/resolver-divergencia
// ============================================================
router.post('/:id/resolver-divergencia', async (req, res) => {
  try {
    const db = await getDb();
    const io = req.app.get('io');
    const { id } = req.params;
    const { acao, notaDevolucao, valorAbatimento, observacaoResolucao } = req.body;

    const resultado = await resolverDivergenciaCompras({
      reqId: id,
      acao,
      notaDevolucao,
      valorAbatimento,
      observacaoResolucao,
      db,
      io
    });

    res.json({ message: 'Divergência tratada com sucesso!', requisicao: resultado.requisicao });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao resolver divergência', error: err.message });
  }
});

// ============================================================
// POST /:id/substituir-item
// ============================================================
router.post('/:id/substituir-item', async (req, res) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    const { codigoOriginal, produtoSubstituto, motivo } = req.body;

    const row = await db.get(`SELECT * FROM requisicoes WHERE id = ?`, [id]);
    if (!row) return res.status(404).json({ message: 'Requisição não encontrada' });

    let reqObj = dbRowToReq(row);

    const itemIndex = (reqObj.itens || []).findIndex(i => i.codigo === codigoOriginal);
    if (itemIndex === -1) return res.status(404).json({ message: 'Item original não encontrado na requisição' });

    const itemOriginal = reqObj.itens[itemIndex];
    reqObj.itens[itemIndex] = {
      ...itemOriginal,
      codigo: produtoSubstituto.codigo,
      descricao: produtoSubstituto.descricao,
      valor_unitario: produtoSubstituto.valor_unitario || itemOriginal.valor_unitario,
      substituicao: {
        codigoOriginal: itemOriginal.codigo,
        descricaoOriginal: itemOriginal.descricao,
        motivo,
        data: new Date().toISOString()
      }
    };

    await saveReq(db, id, reqObj);
    res.json({ message: 'Substituição registrada com sucesso', requisicao: reqObj });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao registrar substituição', error: error.message });
  }
});

// ============================================================
// POST /:id/adicionar-item
// ============================================================
router.post('/:id/adicionar-item', async (req, res) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    const { produto, quantidade } = req.body;

    if (!produto || !quantidade) {
      return res.status(400).json({ message: 'Produto e quantidade são obrigatórios' });
    }

    const row = await db.get(`SELECT * FROM requisicoes WHERE id = ?`, [id]);
    if (!row) return res.status(404).json({ message: 'Requisição não encontrada' });

    let reqObj = dbRowToReq(row);
    reqObj.itens = reqObj.itens || [];

    // Verifica se já existe o item, se sim, soma a quantidade
    const itemIndex = reqObj.itens.findIndex(i => i.codigo === produto.codigo);
    if (itemIndex !== -1) {
      reqObj.itens[itemIndex].quantidade = Number(reqObj.itens[itemIndex].quantidade) + Number(quantidade);
    } else {
      reqObj.itens.push({
        codigo: produto.codigo,
        descricao: produto.descricao,
        quantidade: Number(quantidade),
        valor_unitario: produto.valor_unitario || 0
      });
    }

    await saveReq(db, id, reqObj);
    res.json({ message: 'Item adicionado com sucesso', requisicao: reqObj });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao adicionar item', error: error.message });
  }
});

// ============================================================
// POST /:id/avancar-etapa
// ============================================================
router.post('/:id/avancar-etapa', async (req, res) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    const { novoStatus } = req.body;

    if (!novoStatus) return res.status(400).json({ message: 'O novo status é obrigatório' });

    const row = await db.get(`SELECT * FROM requisicoes WHERE id = ?`, [id]);
    if (!row) return res.status(404).json({ message: 'Requisição não encontrada' });

    let reqObj = dbRowToReq(row);
    // Atualiza a Omie PRIMEIRO para 'Faturamento pelo Fornecedor'
    if (novoStatus === 'concluido' && reqObj.pedidos_omie) {
      console.log(`[COMPRAS] 🚀 Iniciando avanço de etapa na Omie para 'Faturamento pelo Fornecedor' (Etapa 20)...`);
      for (const pedido of reqObj.pedidos_omie) {
        if (pedido.numeroPedido && !String(pedido.numeroPedido).startsWith('ERRO')) {
          try {
            const resultOmie = await omiePedidosService.alterarEtapaPedido(pedido.numeroPedido, '20');
            if (resultOmie.erro) {
              console.error(`[COMPRAS] 🚨 Falha na Omie para o pedido ${pedido.numeroPedido}: ${resultOmie.mensagem || resultOmie.faultcode}`);
              // Bloqueia a gravação local se a Omie falhou!
              return res.status(500).json({ message: `Falha na integração com a Omie (Pedido ${pedido.numeroPedido}): ${resultOmie.mensagem || resultOmie.faultcode}` });
            } else {
              console.log(`[COMPRAS] ✅ Mágica feita! Pedido ${pedido.numeroPedido} agora está aguardando Faturamento (Etapa 20) na Omie!`);
            }
          } catch (e) {
            console.error(`[COMPRAS] 🚨 Erro de conexão ao alterar etapa na Omie para o pedido ${pedido.numeroPedido}:`, e.message);
            // Bloqueia a gravação local se houve queda de rede!
            return res.status(500).json({ message: `Erro de rede ao comunicar com a Omie (Pedido ${pedido.numeroPedido}): ${e.message}` });
          }
        } else {
          console.log(`[COMPRAS] ⚠️ Ignorando pedido com ID inválido: ${pedido.numeroPedido}`);
        }
      }
    }

    // Só atualiza o banco local se a Omie confirmou tudo (Transação Atômica Lógica)
    reqObj.status_compras = novoStatus;
    reqObj.historico_status = reqObj.historico_status || [];
    reqObj.historico_status.push({ status: novoStatus, data: new Date().toISOString() });

    await saveReq(db, id, reqObj);

    // Emite notificação da mudança de etapa
    notificationService.notificarMudancaStatus(req.app.get('io'), {
      tipo: 'requisicao',
      id: reqObj.id,
      novoStatus: novoStatus,
      mensagem: `A Requisição mudou de etapa: ${novoStatus}`
    });

    res.json({ message: `Requisição avançada para ${novoStatus} com sucesso`, requisicao: reqObj });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao avançar etapa', error: error.message });
  }
});

// ============================================================
// POST /:id/gerar-pedidos — Gerar Pedidos de Compra na Omie
// ============================================================
router.post('/:id/gerar-pedidos', async (req, res) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    const { vencedores } = req.body;

    if (!vencedores || Object.keys(vencedores).length === 0) {
      return res.status(400).json({ message: 'Nenhum vencedor informado' });
    }

    const row = await db.get(`SELECT * FROM requisicoes WHERE id = ?`, [id]);
    if (!row) return res.status(404).json({ message: 'Requisição não encontrada' });

    let reqObj = dbRowToReq(row);
    const produtos = await getProdutosDb();

    const itensPorFornecedor = {};

    Object.entries(vencedores).forEach(([codigoItemStr, cotacaoId]) => {
      const itemReq = (reqObj.itens || []).find(i => i.codigo === codigoItemStr);
      if (!itemReq || !itemReq.cotacoes) return;

      const cotacaoVencedora = itemReq.cotacoes.find(c => c.id === cotacaoId);
      if (!cotacaoVencedora) return;

      const fornecedorId = cotacaoVencedora.fornecedorId;
      const produtoOmie = produtos.find(p => p.codigo === codigoItemStr);
      const codigoProdutoOmie = produtoOmie ? produtoOmie.codigo_produto : null;

      if (!itensPorFornecedor[fornecedorId]) itensPorFornecedor[fornecedorId] = [];

      const tipo = cotacaoVencedora.tipoUnidade || 'Unidade';
      const qtdInterna = Number(cotacaoVencedora.quantidadePacote) || 1;
      
      let qtdComprar = Number(itemReq.quantidade);
      let valorUnitarioBase = Number(cotacaoVencedora.valorUnitario);

      if (tipo === 'Pacote' || tipo === 'Caixa' || tipo === 'Galao' || tipo === 'Galão' || tipo === 'Rolo' || tipo === 'Tambor') {
        const pacotesNecessarios = Math.ceil(itemReq.quantidade / (qtdInterna > 0 ? qtdInterna : 1));
        qtdComprar = pacotesNecessarios * qtdInterna; // Converte para a quantidade base da Omie (ex: 2 rolos de 50m = 100m)
        valorUnitarioBase = valorUnitarioBase / (qtdInterna > 0 ? qtdInterna : 1); // Fatiando o preço da embalagem para 1 unidade base
      }

      const descItem = Number(cotacaoVencedora.desconto) || 0;
      const descGeral = Number(cotacaoVencedora.descontoGeral) || 0;
      let valorUnitarioComDesconto = valorUnitarioBase * (1 - descItem / 100) * (1 - descGeral / 100);

      let obs = [];
      if (cotacaoVencedora.marca) obs.push(`Marca: ${cotacaoVencedora.marca}`);
      if (tipo !== 'Unidade') obs.push(`Emb: ${tipo} c/ ${qtdInterna}`);
      if (cotacaoVencedora.previsaoDias) obs.push(`Prazo: ${cotacaoVencedora.previsaoDias} dias`);
      if (descItem > 0) obs.push(`Desc. Item: ${descItem}%`);
      if (descGeral > 0) obs.push(`Desc. Geral: ${descGeral}%`);

      itensPorFornecedor[fornecedorId].push({
        codigo_item: codigoProdutoOmie || codigoItemStr,
        descricao: itemReq.descricao,
        quantidade: qtdComprar,
        valor_unitario: Number(valorUnitarioComDesconto.toFixed(4)),
        observacao: obs.join(' | ')
      });
    });

    reqObj.pedidos_omie = reqObj.pedidos_omie || [];
    console.log(`\n[EFEITO CASCATA] 🚀 Iniciando Geração de Pedidos para a Requisição #${id}...`);

    for (const [fornecedorId, detalhes] of Object.entries(itensPorFornecedor)) {
      // Trava de Segurança: Se já gerou antes e não foi erro, pula (evita duplicação)
      const jaGerado = reqObj.pedidos_omie.find(p => p.fornecedorId === fornecedorId && !String(p.numeroPedido).startsWith('ERRO-OMIE'));
      if (jaGerado) {
        console.log(`[EFEITO CASCATA] 🛡️ Anti-Duplicidade: Pedido Omie já existe para o Fornecedor ${fornecedorId} (${jaGerado.numeroPedido}). Posição ignorada.`);
        continue;
      }

      const idCurto = String(id).slice(-6); // Pega só os 6 últimos dígitos
      
      console.log(`[EFEITO CASCATA] 🔗 Disparando Omie para criar pedido de compra (Fornecedor ID: ${fornecedorId})...`);
      
      let obsCabecalho = [];
      if (reqObj.categoriaCompra) obsCabecalho.push(`Categoria da Compra: ${reqObj.categoriaCompra}`);
      if (reqObj.projetoDestino) obsCabecalho.push(`OS / Projeto Destino: ${reqObj.projetoDestino}`);
      if (reqObj.sugestaoEntrega) {
        const [ano, mes, dia] = reqObj.sugestaoEntrega.split('-');
        const dataFormatada = `${dia}/${mes}/${ano}`;
        obsCabecalho.push(`Sugestão de Entrega: ${dataFormatada}`);
      }

      const resultadoOmie = await omiePedidosService.criarPedidoCompra({
        codigoFornecedor: Number(fornecedorId),
        etapa: "10",
        itens: detalhes,
        numeroPedido: `REQ-${idCurto}`,
        observacaoCabecalho: obsCabecalho.join(' | '),
        dataPrevisao: reqObj.sugestaoEntrega
      });

      let numeroPedidoOmie = `ERRO-OMIE-${Math.floor(Math.random() * 10000)}`;
      if (!resultadoOmie.erro && resultadoOmie.dados && (resultadoOmie.dados.nCodPed || resultadoOmie.dados.numero_pedido || resultadoOmie.dados.cNumero)) {
        numeroPedidoOmie = resultadoOmie.dados.nCodPed || resultadoOmie.dados.numero_pedido || resultadoOmie.dados.cNumero;
        console.log(`[EFEITO CASCATA] ✅ Pedido criado na Omie com Sucesso! (Código: ${numeroPedidoOmie})`);
      } else {
        console.error(`[EFEITO CASCATA] 🚨 Erro ao gerar pedido na Omie! Retorno completo:`, JSON.stringify(resultadoOmie, null, 2));
      }

      const valorTotal = detalhes.reduce((acc, i) => acc + (i.quantidade * i.valor_unitario), 0);
      
      // Limpa tentativa de erro anterior, se houver
      reqObj.pedidos_omie = reqObj.pedidos_omie.filter(p => p.fornecedorId !== fornecedorId);
      
      // Salva o novo pedido gerado
      reqObj.pedidos_omie.push({ fornecedorId, numeroPedido: numeroPedidoOmie, resultado_omie: resultadoOmie, itens: detalhes, valorTotal });
      
      // 🔥 EFEITO CASCATA - SALVAMENTO SÍNCRONO PÓS-OMIE (Anti-Duplicidade)
      console.log(`[EFEITO CASCATA] 💾 Salvando pedido ${numeroPedidoOmie} no Banco Local imediatamente para blindar contra quedas...`);
      await saveReq(db, id, reqObj);
    }

    reqObj.status_compras = 'pedido_gerado';
    reqObj.historico_status = reqObj.historico_status || [];
    reqObj.historico_status.push({ status: 'pedido_gerado', data: new Date().toISOString() });

    console.log(`[EFEITO CASCATA] 🎉 Todos os pedidos gerados e cravados no banco de dados! Fim do ciclo.`);
    await saveReq(db, id, reqObj);

    res.json({ message: 'Pedidos processados e gerados com sucesso na Omie', pedidosGerados: reqObj.pedidos_omie, requisicao: reqObj });
  } catch (error) {
    console.error("Erro ao gerar pedidos:", error);
    res.status(500).json({ message: 'Erro ao gerar pedidos na Omie', error: error.message });
  }
});

// ============================================================
// POST /:id/reenviar-omie — Retentar gerar pedido na Omie
// ============================================================
router.post('/:id/reenviar-omie', async (req, res) => {
  try {
    const db = await getDb();
    const { id } = req.params;

    const row = await db.get(`SELECT * FROM requisicoes WHERE id = ?`, [id]);
    if (!row) return res.status(404).json({ message: 'Requisição não encontrada' });

    let reqObj = JSON.parse(row.dados_json || '{}');
    if (!reqObj.pedidos_omie || reqObj.pedidos_omie.length === 0) {
      return res.status(400).json({ message: 'Nenhum pedido encontrado para reenviar' });
    }

    let alterou = false;

    for (let i = 0; i < reqObj.pedidos_omie.length; i++) {
      let ped = reqObj.pedidos_omie[i];
      if (ped.numeroPedido && String(ped.numeroPedido).startsWith('ERRO-OMIE')) {
        console.log(`[COMPRAS] 🔄 Retentando enviar pedido para fornecedor ${ped.fornecedorId}...`);
        
        const resultadoOmie = await omiePedidosService.criarPedidoCompra({
          codigoFornecedor: Number(ped.fornecedorId),
          etapa: "10",
          itens: ped.itens
        });

        if (!resultadoOmie.erro && resultadoOmie.dados && (resultadoOmie.dados.numero_pedido || resultadoOmie.dados.cNumero || resultadoOmie.dados.nCodPed)) {
          ped.numeroPedido = String(resultadoOmie.dados.cNumero || resultadoOmie.dados.numero_pedido || resultadoOmie.dados.nCodPed);
          ped.resultado_omie = resultadoOmie;
          alterou = true;
          console.log(`[COMPRAS] ✅ Pedido retentado com sucesso: ${ped.numeroPedido}`);
        } else {
          console.error(`[COMPRAS] 🚨 Erro ao retentar pedido na Omie!`, JSON.stringify(resultadoOmie, null, 2));
          ped.resultado_omie = resultadoOmie;
          alterou = true; // Salva o novo erro
        }
      }
    }

    if (alterou) {
      await saveReq(db, id, reqObj);
      res.json({ message: 'Retentativa concluída', pedidos_omie: reqObj.pedidos_omie });
    } else {
      res.json({ message: 'Nenhum pedido precisou ser reenviado ou nada mudou', pedidos_omie: reqObj.pedidos_omie });
    }

  } catch (error) {
    console.error("Erro ao reenviar para Omie:", error);
    res.status(500).json({ message: 'Erro ao reenviar', error: error.message });
  }
});

// ============================================================
// POST /:id/autorizar — Autorizar ou Rejeitar (Diretoria)
// ============================================================
router.post('/:id/autorizar', async (req, res) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    const { acao, motivo } = req.body;

    const row = await db.get(`SELECT * FROM requisicoes WHERE id = ?`, [id]);
    if (!row) return res.status(404).json({ message: 'Requisição não encontrada' });

    let reqObj = dbRowToReq(row);

    if (acao === 'aprovar') {
      reqObj.status = 'pendente';
      if (reqObj.itens) reqObj.itens = reqObj.itens.map(i => ({ ...i, status: 'aguardando_separacao' }));
    } else if (acao === 'rejeitar') {
      reqObj.status = 'rejeitado_diretoria';
      if (motivo) reqObj.motivoRejeicao = motivo;
      if (reqObj.itens) reqObj.itens = reqObj.itens.map(i => ({ ...i, status: 'rejeitado_diretoria' }));
    }

    await saveReq(db, id, reqObj);
    res.json({ message: `Requisição ${acao} com sucesso.`, requisicao: reqObj });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao processar autorização', error: error.message });
  }
});

// ============================================================
// HELPER: Disparar Remessa Omie para Requisição Finalizada
// ============================================================
async function dispararRemessaOmie(reqObj, db, appIo = null) {
  const appKey = process.env.OMIE_APP_KEY;
  const appSecret = process.env.OMIE_APP_SECRET;

  if (!appKey || !appSecret) {
    console.error('[OMIE REMESSA] ❌ Credenciais OMIE_APP_KEY / SECRET não configuradas');
    return { erro: true, mensagem: 'Credenciais Omie não configuradas no .env' };
  }

  let produtos = await getProdutosDb();
  let itensRemessaOmie = [];

  for (const i of (reqObj.itens || [])) {
    const entregue = Number(i.quantidade_entregue ?? i.quantidade);
    if (entregue > 0) {
      const prod = produtos.find(p => p.codigo === i.codigo);
      if (prod && prod.codigo_produto) {
        itensRemessaOmie.push({
          codigoItemIntegracao: `${i.codigo}-${Date.now()}`,
          codigoProduto: prod.codigo_produto,
          quantidade: entregue,
          valorUnitario: Number(i.valor_unitario) || Number(prod.valor_unitario) || 0.01
        });
      }
    }
  }

  if (itensRemessaOmie.length === 0) {
    const erroMsg = 'Nenhum item da requisição possui código de produto da Omie cadastrado';
    console.warn(`[OMIE REMESSA] ⚠️ ${erroMsg} (Req #${reqObj.id})`);
    try {
      reqObj.remessa_omie = { status: 'erro', mensagem: erroMsg, dataEnvio: new Date().toISOString() };
      await saveReq(db, reqObj.id, reqObj);
      if (appIo) appIo.emit('produtos_atualizados');
    } catch (e) {}
    return { erro: true, mensagem: erroMsg };
  }

  const destinatarioNome = (reqObj.contatoCliente || reqObj.vendedor || '').trim();
  let codigoClienteOmie = Number(reqObj.codigoClienteOmie || reqObj.codigo_cliente_omie || 0);

  if (!codigoClienteOmie) {
    try {
      const rowForn = await db.all(`SELECT * FROM fornecedores_omie`);
      if (rowForn) {
        const nomeAlvo = destinatarioNome.toUpperCase();
        const match = rowForn.find(f => {
          let dj = {};
          try { dj = JSON.parse(f.dados_json || '{}'); } catch(e){}
          return (
            (f.razao_social && f.razao_social.trim().toUpperCase() === nomeAlvo) ||
            (dj.nome_fantasia && dj.nome_fantasia.trim().toUpperCase() === nomeAlvo) ||
            String(f.codigo) === nomeAlvo ||
            String(dj.codigo_cliente_omie) === nomeAlvo
          );
        });
        if (match?.codigo) codigoClienteOmie = Number(match.codigo);
      }
    } catch (e) {
      console.error("[OMIE REMESSA] Erro ao buscar cliente/fornecedor no banco:", e.message);
    }
  }

  if (!codigoClienteOmie) {
    const erroMsg = `Funcionário/Cliente "${destinatarioNome || 'Não Informado'}" não possui ID Omie mapeado`;
    console.error(`[OMIE REMESSA] ⚠️ ${erroMsg}`);
    try {
      reqObj.remessa_omie = {
        status: 'erro',
        mensagem: erroMsg,
        dataEnvio: new Date().toISOString()
      };
      await saveReq(db, reqObj.id, reqObj);
      if (appIo) appIo.emit('produtos_atualizados');
    } catch (e) {}
    return { erro: true, mensagem: erroMsg };
  }

  let codigoVendedorOmie = 0;
  const nomeVendedor = (reqObj.entregador || reqObj.vendedor || '').trim();

  if (nomeVendedor || reqObj.codigoVendedorOmie || reqObj.vendedorCodigo) {
    try {
      const v = await buscarVendedorValidoOmie(reqObj.codigoVendedorOmie || reqObj.vendedorCodigo || nomeVendedor, db);
      if (v?.codigo) {
        codigoVendedorOmie = Number(v.codigo);
        reqObj.codigoVendedorOmie = codigoVendedorOmie;
        console.log(`[OMIE REMESSA] 🎯 Vendedor oficial Omie vinculado: #${codigoVendedorOmie} ("${v.nome}")`);
      } else {
        console.log(`[OMIE REMESSA] ℹ️ "${nomeVendedor}" é funcionário entregador interno (sem cadastro oficial em Vendedores da Omie). Campo nCodVend omitido para evitar erro 102.`);
        codigoVendedorOmie = 0;
      }
    } catch (e) {
      console.warn("[OMIE REMESSA] Aviso ao validar vendedor:", e.message);
      codigoVendedorOmie = 0;
    }
  }

  let codigoProjetoOmie = Number(reqObj.codigoProjetoOmie || 0);
  const nomeProjetoOuOS = (reqObj.numeroOS || reqObj.projeto || '').trim();
  if (!codigoProjetoOmie && nomeProjetoOuOS) {
    try {
      const proj = await buscarOuCriarProjetoOmie(nomeProjetoOuOS, db);
      if (proj?.codigo) {
        codigoProjetoOmie = Number(proj.codigo);
        reqObj.codigoProjetoOmie = codigoProjetoOmie;
        console.log(`[OMIE REMESSA] 🎯 Projeto Omie vinculado: #${codigoProjetoOmie} ("${proj.nome}")`);
      }
    } catch (e) {
      console.error("[OMIE REMESSA] Erro ao buscar/criar projeto Omie:", e.message);
    }
  }

  let codigoLocalEstoqueOmie = 0;
  if (reqObj.localEstoque) {
    // 1. Tenta buscar direto no mapa fixo oficial
    codigoLocalEstoqueOmie = OMIE_LOCAIS_ESTOQUE[reqObj.localEstoque] || 0;

    // 2. Se não encontrou no mapa, busca no banco pelo codigo_local_estoque dentro do dados_json
    if (!codigoLocalEstoqueOmie) {
      try {
        const rowLocal = await db.all(`SELECT * FROM locais_estoque_omie`);
        if (rowLocal) {
          const localCodigoStr = reqObj.localEstoque.split(" - ")[0].trim();
          const match = rowLocal.find(l => 
            l.codigo === localCodigoStr || 
            l.descricao?.trim().toUpperCase() === reqObj.localEstoque.trim().toUpperCase()
          );
          if (match) {
            let dj = {};
            try { dj = JSON.parse(match.dados_json || '{}'); } catch(e){}
            codigoLocalEstoqueOmie = Number(dj.codigo_local_estoque || dj.nCodLocal || 0);
          }
        }
      } catch (e) { console.error("Erro ao buscar local de estoque no banco:", e); }
    }
  }

  // 3. Fallback seguro: se ainda não encontrou ou for menor que 1000 (ex: "01"), usa o ID oficial do Almoxarifado
  if (!codigoLocalEstoqueOmie || codigoLocalEstoqueOmie < 1000) {
    codigoLocalEstoqueOmie = 687827873; // 01 - Almoxarifado (Omie)
  }

  const departamentoNome = reqObj.departamento || reqObj.centroCusto || 'N/A';
  const codigoIntegracao = `REQ-${reqObj.id}`;

  const produtosParaRemessa = itensRemessaOmie.map(item => ({
    codigoItemIntegracao: item.codigoItemIntegracao,
    codigoProduto: item.codigoProduto,
    codigoLocalEstoque: codigoLocalEstoqueOmie,
    quantidade: item.quantidade,
    valorUnitario: item.valorUnitario
  }));

  try {
    const resultado = await omieRemessaService.criarRemessa({
      codigoIntegracao,
      codigoCliente: codigoClienteOmie,
      codigoVendedor: codigoVendedorOmie,
      codigoCategoria: '1.01.01',
      codigoProjeto: codigoProjetoOmie,
      dataPrevisao: new Date(reqObj.dataCriacao || Date.now()).toLocaleDateString('pt-BR'),
      observacao: `Baixa Almoxarifado - Requisição ${reqObj.id} | OS: ${reqObj.numeroOS || 'N/A'} | Depto: ${departamentoNome}`,
      produtos: produtosParaRemessa
    });

    const rowAtual = await db.get(`SELECT * FROM requisicoes WHERE id = ?`, [reqObj.id]);
    let reqAtual = rowAtual ? dbRowToReq(rowAtual) : reqObj;

    if (!resultado.erro) {
      console.log(`[OMIE REMESSA] ✅ Remessa criada com sucesso! nCodRem: ${resultado.dados?.nCodRem || 'N/A'}`);
      reqAtual.remessa_omie = {
        nCodRem: resultado.dados?.nCodRem || null,
        cCodIntRem: codigoIntegracao,
        dataEnvio: new Date().toISOString(),
        status: 'enviada'
      };
    } else {
      console.error(`[OMIE REMESSA] ❌ Falha ao criar remessa na Omie: ${resultado.mensagem}`);
      reqAtual.remessa_omie = {
        status: 'erro',
        mensagem: resultado.mensagem || 'Erro ao enviar para Omie',
        faultcode: resultado.faultcode || null,
        dataEnvio: new Date().toISOString()
      };
    }

    await saveReq(db, reqObj.id, reqAtual);
    if (appIo) appIo.emit('produtos_atualizados');
    return resultado;
  } catch (err) {
    console.error(`[OMIE REMESSA] ❌ Exceção ao criar remessa:`, err.message);
    const rowAtual = await db.get(`SELECT * FROM requisicoes WHERE id = ?`, [reqObj.id]);
    let reqAtual = rowAtual ? dbRowToReq(rowAtual) : reqObj;
    reqAtual.remessa_omie = {
      status: 'erro',
      mensagem: err.message,
      dataEnvio: new Date().toISOString()
    };
    await saveReq(db, reqObj.id, reqAtual);
    if (appIo) appIo.emit('produtos_atualizados');
    return { erro: true, mensagem: err.message };
  }
}

// ============================================================
// POST /:id/finalizar — Separação Concluída (Almoxarifado)
// ============================================================
router.post('/:id/finalizar', async (req, res) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    const { entregador, vendedor, vendedorCodigo, codigoVendedorOmie, localEstoque, itensEntregues } = req.body;

    const row = await db.get(`SELECT * FROM requisicoes WHERE id = ?`, [id]);
    if (!row) return res.status(404).json({ message: 'Requisição não encontrada' });

    let reqObj = dbRowToReq(row);
    let produtos = await getProdutosDb();

    reqObj.status = 'finalizado';
    if (entregador) reqObj.entregador = entregador;
    if (vendedor) reqObj.vendedor = vendedor;
    if (codigoVendedorOmie || vendedorCodigo) {
      reqObj.codigoVendedorOmie = Number(codigoVendedorOmie || vendedorCodigo);
    }
    if (localEstoque) reqObj.localEstoque = localEstoque;

    let isParcial = false;
    let itensRemessaOmie = [];

    if (reqObj.itens) {
      reqObj.itens = reqObj.itens.map(i => {
        const pedida = Number(i.quantidade);
        const entregue = itensEntregues && itensEntregues[i.codigo] !== undefined
          ? Number(itensEntregues[i.codigo])
          : pedida;

        if (entregue < pedida) isParcial = true;

        if (entregue > 0) {
          const prodIdx = produtos.findIndex(p => p.codigo === i.codigo);
          if (prodIdx !== -1) {
            produtos[prodIdx].quantidade_estoque = (produtos[prodIdx].quantidade_estoque || 0) - entregue;
            if (produtos[prodIdx].codigo_produto) {
              itensRemessaOmie.push({
                ide: { codigo_item_integracao: i.codigo + '-' + Date.now() },
                produto: {
                  codigo_produto: produtos[prodIdx].codigo_produto,
                  quantidade: entregue,
                  valor_unitario: i.valor_unitario || produtos[prodIdx].valor_unitario || 0.01,
                  tipo_desconto: "V", valor_desconto: 0
                }
              });
            }
          }
        }
        return { ...i, status: 'entregue', quantidade_entregue: entregue, devolvido: 0 };
      });
    }

    reqObj.entrega_parcial = isParcial;

    // Salva o status finalizado localmente de imediato
    await saveReq(db, id, reqObj);
    
    // Atualiza saldo local de forma otimizada
    for (const i of (reqObj.itens || [])) {
      const entregue = itensEntregues && itensEntregues[i.codigo] !== undefined ? Number(itensEntregues[i.codigo]) : Number(i.quantidade);
      if (entregue > 0) {
        await db.run(`UPDATE produtos_omie SET quantidade_estoque = quantidade_estoque - ? WHERE codigo = ?`, [entregue, i.codigo]);
      }
    }

    // Integração Omie: Disparar Remessa em segundo plano sem travar resposta pro usuário
    dispararRemessaOmie(reqObj, db, req.app.get('io')).catch(errRem => {
      console.error(`[OMIE REMESSA] ❌ Erro assíncrono ao gerar remessa:`, errRem.message);
    });

    res.json({ message: 'Requisição finalizada com sucesso.', requisicao: reqObj });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao processar finalização', error: error.message });
  }
});

// ============================================================
// POST /:id/reenviar-remessa — Reenvia Remessa para a Omie
// ============================================================
router.post('/:id/reenviar-remessa', async (req, res) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    const row = await db.get(`SELECT * FROM requisicoes WHERE id = ?`, [id]);
    if (!row) return res.status(404).json({ message: 'Requisição não encontrada' });

    let reqObj = dbRowToReq(row);
    console.log(`[OMIE REMESSA] 🔄 Reenviando remessa manualmente para Requisição #${id}...`);

    const resultado = await dispararRemessaOmie(reqObj, db, req.app.get('io'));

    if (resultado.erro) {
      return res.status(400).json({ message: resultado.mensagem || 'Falha ao reenviar para Omie' });
    }

    const rowAtualizado = await db.get(`SELECT * FROM requisicoes WHERE id = ?`, [id]);
    res.json({
      message: 'Remessa enviada com sucesso para a Omie!',
      requisicao: dbRowToReq(rowAtualizado)
    });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao reenviar remessa', error: error.message });
  }
});

// ============================================================
// GET /status-omie — Diagnóstico de Conexão com a Omie
// ============================================================
router.get('/status-omie', async (req, res) => {
  const appKey = process.env.OMIE_APP_KEY;
  const appSecret = process.env.OMIE_APP_SECRET;

  if (!appKey || !appSecret) {
    return res.status(500).json({
      conectado: false,
      mensagem: 'Credenciais Omie (OMIE_APP_KEY / OMIE_APP_SECRET) não configuradas no .env'
    });
  }

  try {
    const resultado = await omieEstoqueService.listarLocais(1, 1);
    if (resultado.erro) {
      return res.status(502).json({
        conectado: false,
        mensagem: resultado.mensagem || 'Falha ao autenticar na API da Omie'
      });
    }
    res.json({
      conectado: true,
      mensagem: 'Conexão com a Omie ativa e validada com sucesso!',
      locais: resultado.dados?.locais_encontrados || 0
    });
  } catch (err) {
    res.status(500).json({ conectado: false, mensagem: err.message });
  }
});

// ============================================================
// POST /:id/devolver — Devolução de Peça
// ============================================================
router.post('/:id/devolver', async (req, res) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    const { codigo_produto, quantidade_devolvida } = req.body;

    const row = await db.get(`SELECT * FROM requisicoes WHERE id = ?`, [id]);
    if (!row) return res.status(404).json({ message: 'Requisição não encontrada' });

    let reqObj = dbRowToReq(row);
    let produtos = await getProdutosDb();

    let itemAchado = false;
    if (reqObj.itens) {
      reqObj.itens = reqObj.itens.map(i => {
        if (i.codigo === codigo_produto) {
          itemAchado = true;
          return { ...i, devolvido: (Number(i.devolvido || 0)) + Number(quantidade_devolvida) };
        }
        return i;
      });
    }

    if (!itemAchado) return res.status(400).json({ message: 'Produto não encontrado nesta requisição' });

    const devolvido = Number(quantidade_devolvida);
    if (devolvido > 0) {
      const prodIdx = produtos.findIndex(p => p.codigo === codigo_produto);
      if (prodIdx !== -1) {
        produtos[prodIdx].quantidade_estoque = (produtos[prodIdx].quantidade_estoque || 0) + devolvido;

        let idLocalEstoque = 687827873;
        if (reqObj.localEstoque) idLocalEstoque = OMIE_LOCAIS_ESTOQUE[reqObj.localEstoque] || 687827873;

        if (produtos[prodIdx].codigo_produto) {
          omieEstoqueService.ajustarEstoque({
            codigoLocalEstoque: idLocalEstoque,
            codigoProduto: produtos[prodIdx].codigo_produto,
            quantidade: devolvido,
            observacao: `Estorno/Devolução Almox. Req ${id}`,
            tipo: 'ENT',
            valorUnitario: produtos[prodIdx].valor_unitario || 0.01
          }).then(resultado => {
            if (!resultado.erro) {
              console.log(`[OMIE ESTOQUE] ✅ Devolução registrada na Omie para ${codigo_produto}`);
            } else {
              console.error(`[OMIE ESTOQUE] ❌ Falha na devolução Omie:`, resultado.mensagem);
            }
          });
        }
      }
    }

    await saveReq(db, id, reqObj);
    if (devolvido > 0) {
       await db.run(`UPDATE produtos_omie SET quantidade_estoque = quantidade_estoque + ? WHERE codigo = ?`, [devolvido, codigo_produto]);
    }
    res.json({ message: 'Devolução registrada com sucesso!', requisicao: reqObj });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao registrar devolução', error: error.message });
  }
});

// ============================================================
// POST /:id/salvar-cotacoes
// ============================================================
router.post('/:id/salvar-cotacoes', async (req, res) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    const { cotacoes } = req.body;

    const row = await db.get(`SELECT * FROM requisicoes WHERE id = ?`, [id]);
    if (!row) return res.status(404).json({ message: 'Requisição não encontrada' });

    let reqObj = dbRowToReq(row);
    reqObj.itens = (reqObj.itens || []).map(item => {
      if (cotacoes && cotacoes[item.codigo]) {
        return { ...item, cotacoes: deduplicarCotacoes(cotacoes[item.codigo]) };
      }
      return item;
    });

    await saveReq(db, id, reqObj);
    res.json({ message: 'Cotações salvas com sucesso', requisicao: reqObj });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao salvar cotações', error: error.message });
  }
});

// ============================================================
// POST /:id/simular-nfe — Simula leitura/recebimento de NF-e pelo Robô
// ============================================================
router.post('/:id/simular-nfe', async (req, res) => {
  try {
    const db = await getDb();
    const { id } = req.params;

    const row = await db.get(`SELECT * FROM requisicoes WHERE id = ?`, [id]);
    if (!row) return res.status(404).json({ message: 'Requisição não encontrada' });

    let reqObj = dbRowToReq(row);

    // Carregar fornecedores para obter o nome/CNPJ do emitente
    let fornecedores = [];
    try {
      const fornRows = await db.all(`SELECT * FROM fornecedores_omie`);
      fornecedores = fornRows.map(r => ({ ...r, codigo_cliente_omie: r.codigo }));
    } catch(e) {}

    // Garante que pedidos_omie existe
    if (!reqObj.pedidos_omie || reqObj.pedidos_omie.length === 0) {
      reqObj.pedidos_omie = [{
        fornecedorId: reqObj.fornecedorEscolhidoId || reqObj.itens?.[0]?.cotacoes?.[0]?.fornecedorId || '1',
        numeroPedido: 'PED-' + id.slice(-6),
        valorTotal: reqObj.itens?.reduce((acc, i) => acc + (Number(i.quantidade) * Number(i.valor_unitario || 0)), 0) || 0,
        itens: (reqObj.itens || []).map(i => ({
          codigo_item: i.codigo,
          descricao: i.descricao,
          quantidade: Number(i.quantidade) || 1,
          valor_unitario: Number(i.valor_unitario) || 0
        }))
      }];
    }

    // Para cada pedido, vincula a nota simulada
    reqObj.pedidos_omie = reqObj.pedidos_omie.map(pedido => {
      const forn = fornecedores.find(f => String(f.codigo_cliente_omie) === String(pedido.fornecedorId));
      const chaveAleatoria = '352609' + String(id).slice(-14).padStart(14, '0') + '55001' + String(Math.floor(100000000 + Math.random() * 900000000)) + '1' + String(Math.floor(10000000 + Math.random() * 90000000)) + '1';
      
      const notaSimulada = {
        chaveAcesso: chaveAleatoria,
        emitente: {
          nome: forn ? (forn.nome_fantasia || forn.razao_social) : (reqObj.solicitante || 'FORNECEDOR CERTIFICADO'),
          cnpj_cpf: forn?.cnpj_cpf || '12.345.678/0001-90'
        },
        dataEmissao: new Date().toISOString(),
        valorTotal: pedido.valorTotal || reqObj.itens?.reduce((acc, i) => acc + (Number(i.quantidade) * Number(i.valor_unitario || 0)), 0) || 0,
        itens: (pedido.itens && pedido.itens.length > 0 ? pedido.itens : reqObj.itens || []).map(i => ({
          codigo: i.codigo || i.codigo_item || 'PRD001',
          descricao: i.descricao || 'Produto Adquirido',
          quantidade: Number(i.quantidade) || 1,
          valorUnitario: Number(i.valor_unitario) || 0,
          valorTotal: (Number(i.quantidade) || 1) * (Number(i.valor_unitario) || 0)
        })),
        status: 'recebida',
        simulada: true
      };

      return {
        ...pedido,
        nota_fiscal_vinculada: notaSimulada
      };
    });

    reqObj.status_compras = 'concluido';
    reqObj.historico_status = reqObj.historico_status || [];
    reqObj.historico_status.push({ status: 'concluido', data: new Date().toISOString() });

    // Atualiza a Omie para Faturamento pelo Fornecedor
    if (reqObj.pedidos_omie) {
      console.log(`[COMPRAS] 🚀 Iniciando avanço de etapa na Omie para 'Faturamento pelo Fornecedor' (Etapa 20)...`);
      for (const pedido of reqObj.pedidos_omie) {
        if (pedido.numeroPedido && !String(pedido.numeroPedido).startsWith('ERRO')) {
          try {
            const resultOmie = await omiePedidosService.alterarEtapaPedido(pedido.numeroPedido, '20');
            if (resultOmie.erro) {
              console.error(`[COMPRAS] 🚨 Falha na Omie para o pedido ${pedido.numeroPedido}: ${resultOmie.mensagem || resultOmie.faultcode}`);
            } else {
              console.log(`[COMPRAS] ✅ Mágica feita! Pedido ${pedido.numeroPedido} agora está aguardando Faturamento (Etapa 20) na Omie!`);
            }
          } catch (e) {
            console.error(`[COMPRAS] 🚨 Erro de conexão ao alterar etapa na Omie para o pedido ${pedido.numeroPedido}:`, e.message);
          }
        } else {
          console.log(`[COMPRAS] ⚠️ Ignorando pedido com ID inválido: ${pedido.numeroPedido}`);
        }
      }
    }

    await saveReq(db, id, reqObj);

    res.json({ message: 'NF-e simulada com sucesso e vinculada à requisição!', requisicao: reqObj });
  } catch (error) {
    console.error('Erro ao simular NFe:', error);
    res.status(500).json({ message: 'Erro ao simular NFe', error: error.message });
  }
});

export default router;
