import express from 'express';
import omieRemessaService from '../services/omieRemessaService.js';
import omieEstoqueService from '../services/omieEstoqueService.js';
import omiePedidosService from '../services/omiePedidosService.js';
import getDb from '../config/database.js';
import notificationService from '../services/notificationService.js';

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

function dbRowToReq(row) {
  if (!row) return null;
  let dados = {};
  try { dados = JSON.parse(row.dados_json || '{}'); } catch (e) { /* ignore */ }
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
    res.json(rows.map(dbRowToReq));
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

    const statusInicial = req.body.origem === 'app_funcionario' ? 'aguardando_diretoria' : 'pendente';

    const hojeStr = new Date().toISOString().split('T')[0];
    const dataCriacaoFinal = (req.body.dataLancamento && req.body.dataLancamento !== hojeStr)
      ? new Date(req.body.dataLancamento + 'T12:00:00').toISOString()
      : new Date().toISOString();

    // === TRAVA ANTI-DUPLICAÇÃO POR O.S. ===
    const numOS = req.body.numeroOS;
    if (numOS) {
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

    if (novaRequisicao.itens && Array.isArray(novaRequisicao.itens)) {
      novaRequisicao.itens = novaRequisicao.itens.map(item => ({
        ...item,
        status: statusInicial === 'aguardando_diretoria' ? 'aguardando_diretoria' : (item.status || 'aguardando_separacao')
      }));
    }

    await saveReq(db, id, novaRequisicao);

    // Emite notificação de nova requisição
    notificationService.notificarMudancaStatus(req.app.get('io'), {
      tipo: 'requisicao',
      id: novaRequisicao.id,
      novoStatus: novaRequisicao.status,
      mensagem: `Nova Requisição gerada: ${novaRequisicao.status}`
    });

    res.status(201).json({
      message: 'Requisição salva com sucesso',
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
    const { id } = req.params;
    const { acao, notaDevolucao, observacaoResolucao } = req.body;

    const row = await db.get(`SELECT * FROM requisicoes WHERE id = ?`, [id]);
    if (!row) return res.status(404).json({ message: 'Requisição não encontrada' });

    let reqObj = dbRowToReq(row);
    reqObj.status_compras = 'entregue';
    reqObj.resolucao_divergencia = {
      acao, notaDevolucao, observacaoResolucao,
      dataResolucao: new Date().toISOString()
    };

    await saveReq(db, id, reqObj);
    res.json({ message: 'Divergência resolvida com sucesso!', requisicao: reqObj });
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
      if (tipo === 'Pacote' || tipo === 'Caixa') {
        qtdComprar = Math.ceil(itemReq.quantidade / (qtdInterna > 0 ? qtdInterna : 1));
      }

      const descItem = Number(cotacaoVencedora.desconto) || 0;
      const descGeral = Number(cotacaoVencedora.descontoGeral) || 0;
      let valorUnitarioComDesconto = Number(cotacaoVencedora.valorUnitario);
      valorUnitarioComDesconto = valorUnitarioComDesconto * (1 - descItem / 100) * (1 - descGeral / 100);

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

    const pedidosGerados = [];

    for (const [fornecedorId, detalhes] of Object.entries(itensPorFornecedor)) {
      const resultadoOmie = await omiePedidosService.criarPedidoCompra({
        codigoFornecedor: Number(fornecedorId),
        etapa: "10",
        itens: detalhes
      });

      let numeroPedidoOmie = `ERRO-OMIE-${Math.floor(Math.random() * 10000)}`;
      if (!resultadoOmie.erro && resultadoOmie.dados && resultadoOmie.dados.numero_pedido) {
        numeroPedidoOmie = resultadoOmie.dados.numero_pedido;
      }

      const valorTotal = detalhes.reduce((acc, i) => acc + (i.quantidade * i.valor_unitario), 0);
      pedidosGerados.push({ fornecedorId, numeroPedido: numeroPedidoOmie, resultado_omie: resultadoOmie, itens: detalhes, valorTotal });
    }

    reqObj.status_compras = 'pedido_gerado';
    reqObj.pedidos_omie = pedidosGerados;
    reqObj.historico_status = reqObj.historico_status || [];
    reqObj.historico_status.push({ status: 'pedido_gerado', data: new Date().toISOString() });

    await saveReq(db, id, reqObj);

    res.json({ message: 'Pedidos gerados com sucesso na Omie', pedidosGerados, requisicao: reqObj });
  } catch (error) {
    console.error("Erro ao gerar pedidos:", error);
    res.status(500).json({ message: 'Erro ao gerar pedidos na Omie', error: error.message });
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
// POST /:id/finalizar — Separação Concluída (Almoxarifado)
// ============================================================
router.post('/:id/finalizar', async (req, res) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    const { entregador, localEstoque, itensEntregues } = req.body;

    const row = await db.get(`SELECT * FROM requisicoes WHERE id = ?`, [id]);
    if (!row) return res.status(404).json({ message: 'Requisição não encontrada' });

    let reqObj = dbRowToReq(row);
    let produtos = await getProdutosDb();

    reqObj.status = 'finalizado';
    if (entregador) reqObj.entregador = entregador;
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

    // Integração Omie: Criar Remessa
    if (itensRemessaOmie.length > 0) {
      const appKey = process.env.OMIE_APP_KEY;
      const appSecret = process.env.OMIE_APP_SECRET;

      if (appKey && appSecret) {
        const destinatarioNome = reqObj.contatoCliente || reqObj.vendedor || 'Não informado';
        let codigoClienteOmie = 0;

        try {
          const rowForn = await db.all(`SELECT * FROM fornecedores_omie`);
          if (rowForn) {
            const match = rowForn.find(f =>
              f.razao_social?.toUpperCase() === destinatarioNome.toUpperCase()
            );
            if (match?.codigo) codigoClienteOmie = Number(match.codigo);
          }
        } catch (e) { console.error("Erro ao buscar fornecedor no banco", e); }

        let codigoVendedorOmie = 0;
        if (reqObj.vendedor) {
          try {
            const rowVend = await db.get(`SELECT dados FROM omie_collections WHERE colecao = 'vendedores'`);
            if (rowVend && rowVend.dados) {
              const vendedores = JSON.parse(rowVend.dados);
              const match = vendedores.find(v => v.nome?.toUpperCase() === reqObj.vendedor.toUpperCase());
              if (match?.codigo) codigoVendedorOmie = match.codigo;
            }
          } catch (e) { console.error("Erro ao buscar vendedor", e); }
        }

        let codigoProjetoOmie = 0;
        if (reqObj.numeroOS) {
          try {
            const rowProj = await db.all(`SELECT * FROM projetos_omie`);
            if (rowProj) {
              const match = rowProj.find(p => p.nome?.toUpperCase() === reqObj.numeroOS.toUpperCase());
              if (match?.codigo) codigoProjetoOmie = Number(match.codigo);
            }
          } catch (e) { console.error("Erro ao buscar projeto", e); }
        }

        let codigoLocalEstoqueOmie = 0;
        if (reqObj.localEstoque) {
          try {
            const rowLocal = await db.all(`SELECT * FROM locais_estoque_omie`);
            if (rowLocal) {
              const localCodigoStr = reqObj.localEstoque.split(" - ")[0].trim();
              const match = rowLocal.find(l => l.codigo === localCodigoStr);
              if (match?.codigo) codigoLocalEstoqueOmie = Number(match.codigo);
            }
            if (!codigoLocalEstoqueOmie) {
              codigoLocalEstoqueOmie = OMIE_LOCAIS_ESTOQUE[reqObj.localEstoque] || 0;
            }
          } catch (e) { console.error("Erro ao buscar local de estoque", e); }
        }

        const departamentoNome = reqObj.departamento || reqObj.centroCusto || 'N/A';

        if (codigoClienteOmie > 0) {
          const produtosParaRemessa = itensRemessaOmie.map(item => ({
            codigoItemIntegracao: item.ide.codigo_item_integracao,
            codigoProduto: item.produto.codigo_produto,
            codigoLocalEstoque: codigoLocalEstoqueOmie,
            quantidade: item.produto.quantidade,
            valorUnitario: item.produto.valor_unitario
          }));

          const codigoIntegracao = `REQ-${reqObj.id}`;

          omieRemessaService.criarRemessa({
            codigoIntegracao,
            codigoCliente: codigoClienteOmie,
            codigoVendedor: codigoVendedorOmie,
            codigoCategoria: '1.01.01',
            codigoProjeto: codigoProjetoOmie,
            dataPrevisao: new Date(reqObj.dataCriacao).toLocaleDateString('pt-BR'),
            observacao: `Baixa Almoxarifado - Requisição ${reqObj.id} | OS: ${reqObj.numeroOS || 'N/A'} | Depto: ${departamentoNome}`,
            produtos: produtosParaRemessa
          }).then(async resultado => {
            if (!resultado.erro) {
              console.log(`[OMIE REMESSA] ✅ Remessa criada! nCodRem: ${resultado.dados?.nCodRem || 'N/A'}`);
              try {
                const dbInner = await getDb();
                const rowAtual = await dbInner.get(`SELECT * FROM requisicoes WHERE id = ?`, [reqObj.id]);
                if (rowAtual) {
                  let reqAtual = dbRowToReq(rowAtual);
                  reqAtual.remessa_omie = {
                    nCodRem: resultado.dados?.nCodRem || null,
                    cCodIntRem: codigoIntegracao,
                    dataEnvio: new Date().toISOString(),
                    status: 'enviada'
                  };
                  await saveReq(dbInner, reqObj.id, reqAtual);
                }
              } catch (e) { console.error('[OMIE REMESSA] Erro ao salvar rastreio:', e.message); }
            } else {
              console.error(`[OMIE REMESSA] ❌ Falha: ${resultado.mensagem}`);
            }
          }).catch(err => {
            console.error(`[OMIE REMESSA] ❌ Erro inesperado:`, err.message);
          });
        } else {
          console.error(`[OMIE REMESSA] ⚠️ Cliente "${destinatarioNome}" não possui ID Omie mapeado. Remessa não gerada.`);
        }
      }
    }

    await saveReq(db, id, reqObj);
    
    // Atualiza saldo local de forma otimizada
    for (const i of (reqObj.itens || [])) {
      const entregue = itensEntregues && itensEntregues[i.codigo] !== undefined ? Number(itensEntregues[i.codigo]) : Number(i.quantidade);
      if (entregue > 0) {
        await db.run(`UPDATE produtos_omie SET quantidade_estoque = quantidade_estoque - ? WHERE codigo = ?`, [entregue, i.codigo]);
      }
    }

    res.json({ message: 'Requisição finalizada com sucesso.', requisicao: reqObj });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao processar finalização', error: error.message });
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
      if (cotacoes[item.codigo]) return { ...item, cotacoes: cotacoes[item.codigo] };
      return item;
    });

    await saveReq(db, id, reqObj);
    res.json({ message: 'Cotações salvas com sucesso', requisicao: reqObj });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao salvar cotações', error: error.message });
  }
});

export default router;
