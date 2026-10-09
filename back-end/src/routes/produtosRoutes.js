import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import omieProdutosService from '../services/omieProdutosService.js';
import omieEstoqueService from '../services/omieEstoqueService.js';
import { buscarHistoricoComprasOmie } from '../services/omieComprasService.js';
import getDb from '../config/database.js';
import { obterCadastro } from '../services/cadastrosSyncService.js';

const router = express.Router();

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

// Obs: salvarProdutosDb não será mais usado diretamente aqui em massa, 
// pois a sincronização agora é via UPDATE/INSERT linha a linha no OmieProdutosService.
// Mas se precisarmos, implementamos direto na rota.

// Rota leve (apenas campos essenciais para os celulares e pesquisa)
router.get('/light', async (req, res) => {
  try {
    const db = await getDb();
    const rows = await db.all(`SELECT codigo, descricao, valor_unitario, quantidade_estoque FROM produtos_omie`);
    
    // Retorna APENAS o estritamente necessário para os dropdowns de Técnico e Chefe
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao ler produtos light', error: error.message });
  }
});

// Rota para pegar os produtos salvos da Omie (Completa)
router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    let produtos = await getProdutosDb();

    if (req.query.busca) {
      const termoBusca = req.query.busca.toLowerCase();
      produtos = produtos.filter(p => 
        (p.codigo && String(p.codigo).toLowerCase().includes(termoBusca)) || 
        (p.descricao && String(p.descricao).toLowerCase().includes(termoBusca)) ||
        (p.ean && String(p.ean).toLowerCase().includes(termoBusca))
      );
    }

    // Busca requisições ativas direto do MariaDB/MySQL
    let requisicoesRows = [];
    try {
      requisicoesRows = await db.all(`SELECT id, status, status_compras, tipo, solicitante, dados_json, data_criacao FROM requisicoes`);
    } catch (e) {
      console.warn('Erro ao consultar requisicoes no banco para calculo de estoque:', e.message);
    }

    // Calcula quantidade pedida por produto para requisições ativas de compras
    // e mapeia o último recebimento físico no Almoxarifado
    const pedidaPorProduto = {};
    const infoPedidosPorProduto = {};
    const infoUltimoRecebimentoPorProduto = {};

    for (const row of requisicoesRows) {
      const statusCompras = row.status_compras;
      const statusGeral = row.status;
      const tipo = row.tipo;

      const isRequisicaoCompras = tipo === 'reposicao' || tipo === 'compra' || Boolean(statusCompras);
      if (!isRequisicaoCompras) {
        continue;
      }

      let dados = {};
      try { dados = JSON.parse(row.dados_json || '{}'); } catch(e){}

      const itens = dados.itens || [];
      const dataCriacao = row.data_criacao || dados.dataRequisicao || dados.data;

      // 1. Se já foi entregue fisicamente no Almoxarifado, registra no último recebimento
      const isEntregue = statusCompras === 'entregue' || statusCompras === 'entregue_parcial' || Boolean(dados.recebimentoFisico);
      if (isEntregue) {
        const dataRec = dados.dataRecebimentoFisico || dados.recebimentoFisico?.data || row.atualizado_em || dataCriacao;
        for (const item of itens) {
          if (!item) continue;
          const cod = item.codigo ? String(item.codigo).trim() : null;
          const codProd = item.codigo_produto ? String(item.codigo_produto).trim() : null;
          const qtd = Number(item.quantidade) || 0;
          const recObj = {
            reqId: row.id,
            status_compras: statusCompras || 'entregue',
            dataRecebimento: dataRec,
            quantidadeRecebida: qtd,
            isParcial: statusCompras === 'entregue_parcial'
          };
          if (cod && !infoUltimoRecebimentoPorProduto[cod]) {
            infoUltimoRecebimentoPorProduto[cod] = recObj;
          }
          if (codProd && !infoUltimoRecebimentoPorProduto[codProd]) {
            infoUltimoRecebimentoPorProduto[codProd] = recObj;
          }
        }
        continue;
      }

      // 2. Se já foi cancelada ou rejeitada, não conta mais
      if (
        statusCompras === 'cancelado' || 
        statusGeral === 'finalizado' || 
        statusGeral === 'cancelado' || 
        statusGeral === 'rejeitado'
      ) {
        continue;
      }

      // 3. Requisições em andamento no setor de Compras
      for (const item of itens) {
        if (!item) continue;
        const cod = item.codigo ? String(item.codigo).trim() : null;
        const codProd = item.codigo_produto ? String(item.codigo_produto).trim() : null;
        const qtd = Number(item.quantidade) || 0;
        if (qtd > 0) {
          const infoObj = {
            reqId: row.id,
            status_compras: statusCompras || 'pendente_cotacao',
            data: dataCriacao,
            solicitante: dados.solicitante || row.solicitante || 'Almoxarifado'
          };
          if (cod) {
            pedidaPorProduto[cod] = (pedidaPorProduto[cod] || 0) + qtd;
            if (!infoPedidosPorProduto[cod]) infoPedidosPorProduto[cod] = infoObj;
          }
          if (codProd && codProd !== cod) {
            pedidaPorProduto[codProd] = (pedidaPorProduto[codProd] || 0) + qtd;
            if (!infoPedidosPorProduto[codProd]) infoPedidosPorProduto[codProd] = infoObj;
          }
        }
      }
    }

    const produtosComStatus = produtos.map(p => {
      const cod = p.codigo ? String(p.codigo).trim() : '';
      const codProd = p.codigo_produto ? String(p.codigo_produto).trim() : '';
      const qtdPedida = (cod && pedidaPorProduto[cod]) || (codProd && pedidaPorProduto[codProd]) || 0;
      const pedidoInfo = (cod && infoPedidosPorProduto[cod]) || (codProd && infoPedidosPorProduto[codProd]) || null;
      const ultimoRecebimento = (cod && infoUltimoRecebimentoPorProduto[cod]) || (codProd && infoUltimoRecebimentoPorProduto[codProd]) || null;
      return {
        ...p,
        quantidade_pedida: qtdPedida,
        em_compra: qtdPedida > 0,
        pedido_compras_info: pedidoInfo,
        ultimo_recebimento_info: ultimoRecebimento
      };
    });

    res.json(produtosComStatus);
  } catch (error) {
    res.status(500).json({ message: 'Erro interno ao ler os produtos', error: error.message });
  }
});

// Rota para buscar os dados reais da ÚLTIMA COMPRA de um produto (referência para Concorrência/Compras)
router.get('/:codigo/ultima-compra', async (req, res) => {
  try {
    const { codigo } = req.params;
    const db = await getDb();

    // 1. Busca todas as requisições entregues ou com recebimento físico concluído
    const rows = await db.all(`
      SELECT id, status, status_compras, atualizado_em, dados_json 
      FROM requisicoes 
      ORDER BY id DESC
    `);

    let ultimaCompra = null;

    for (const row of rows) {
      let dados = {};
      try { dados = JSON.parse(row.dados_json || '{}'); } catch(e){}

      const statusCompras = dados.status_compras || '';
      const isEntregueOuConcluido = 
        statusCompras === 'entregue' || 
        statusCompras === 'entregue_parcial' || 
        statusCompras === 'concluido' ||
        Boolean(dados.recebimentoFisico);

      if (!isEntregueOuConcluido) continue;

      // Procura o item dentro da NF-e vinculada, pedidos_omie, mapeamento fiscal ou itens
      const nota = dados.pedidos_omie?.find(p => p.nota_fiscal_vinculada)?.nota_fiscal_vinculada || dados.nota_fiscal_vinculada;
      const itensNota = nota?.itens || [];
      const itensReq = dados.itens || dados.pedidos_omie?.[0]?.itens || [];
      const maps = dados.mapeamento_nfe || {};

      let itemAchado = null;
      let valorUnit = null;
      let qtdComprada = null;

      // 1º Testa na NF-e vinculada (considerando se a chave do mapeamento aponta para este produto)
      for (const i of itensNota) {
        const codNota = String(i.codigo || i.codigo_item || '').trim();
        const codMapeado = maps[codNota] || codNota;
        if (codMapeado === String(codigo).trim() || codNota === String(codigo).trim()) {
          itemAchado = i;
          valorUnit = Number(i.valorUnitario || i.valor_unitario || 0);
          qtdComprada = Number(i.quantidade || 0);
          break;
        }
      }

      // 2º Testa nos itens da requisição direta (por codigo, codigo_produto ou id)
      if (!itemAchado) {
        for (const i of itensReq) {
          const codItem = String(i.codigo || i.codigo_item || i.codigo_produto || '').trim();
          if (codItem === String(codigo).trim()) {
            itemAchado = i;
            const cotacaoVencedora = i.cotacoes?.find(c => c.selecionada || c.vencedora) || i.cotacoes?.[0];
            valorUnit = Number(i.valor_unitario || i.valorUnitario || cotacaoVencedora?.valorUnitario || 0);
            qtdComprada = Number(i.quantidade || 0);
            break;
          }
        }
      }

      if (itemAchado && valorUnit && valorUnit > 0) {
        // Encontra o fornecedor
        const fornId = dados.pedidos_omie?.[0]?.fornecedorId || 
                       itemAchado.cotacoes?.[0]?.fornecedorId || 
                       dados.itens?.[0]?.cotacoes?.[0]?.fornecedorId;

        let fornNome = nota?.emitente?.nome || dados.fornecedor || null;
        let fornCnpj = nota?.emitente?.cnpj_cpf || null;

        if (!fornNome && fornId) {
          const fornecedores = await obterCadastro('fornecedores', 'fornecedores.json');
          const f = (fornecedores || []).find(x => String(x.codigo_cliente_omie) === String(fornId));
          if (f) {
            fornNome = f.nome_fantasia || f.razao_social;
            fornCnpj = f.cnpj_cpf;
          }
        }

        const dataCompra = dados.dataRecebimentoFisico || 
                           dados.recebimentoFisico?.data || 
                           nota?.dataEmissao || 
                           row.atualizado_em || 
                           dados.dataCriacao;

        ultimaCompra = {
          requisicaoId: row.id,
          numeroOS: dados.numeroOS || null,
          dataCompra,
          fornecedorId: fornId || null,
          fornecedorNome: fornNome || 'Fornecedor Cadastrado',
          fornecedorCnpj: fornCnpj,
          valorUnitario: valorUnit,
          quantidade: qtdComprada,
          chaveAcessoNfe: nota?.chaveAcesso || null
        };
        break; // Como rows está em ORDER BY id DESC, o primeiro achado é o mais recente!
      }
    }

    // Apenas retorna se realmente houver entrada/compra anterior registrada no sistema
    res.json({ ultimaCompra });
  } catch (error) {
    console.error('Erro ao buscar última compra:', error);
    res.status(500).json({ message: 'Erro ao buscar última compra', error: error.message });
  }
});

// Rota simulada para buscar histórico/sugestão de preços de fornecedores para um produto
router.get('/:codigo/sugestao-precos', async (req, res) => {
  try {
    const { codigo } = req.params;

    // Ler produtos para pegar o preço base (valor_unitario)
    const produtos = await getProdutosDb();

    const produto = produtos.find(p => p.codigo === codigo);
    if (!produto) {
      return res.status(404).json({ message: 'Produto não encontrado' });
    }

    const precoBase = produto.valor_unitario || 100; // se não tiver, usa 100 como fallback

    // Ler fornecedores cadastrados
    let fornecedores = await obterCadastro('fornecedores', 'fornecedores.json');
    if (!Array.isArray(fornecedores)) fornecedores = [];

    // 1. Busca todas as compras anteriores deste produto no EntradaEstoque (requisições entregues/concluídas)
    const db = await getDb();
    const rows = await db.all(`SELECT id, atualizado_em, dados_json FROM requisicoes ORDER BY id DESC`);

    const comprasReais = [];
    const fornecedoresJaAdicionados = new Set();

    for (const r of rows) {
      try {
        const dados = JSON.parse(r.dados_json || '{}');
        const st = dados.status_compras || '';
        const isEntregueOuConcluido = 
          st === 'entregue' || 
          st === 'entregue_parcial' || 
          st === 'concluido' || 
          Boolean(dados.recebimentoFisico);

        if (!isEntregueOuConcluido) continue;

        const nota = dados.pedidos_omie?.find(p => p.nota_fiscal_vinculada)?.nota_fiscal_vinculada || dados.nota_fiscal_vinculada;
        const itensNota = nota?.itens || [];
        const itensReq = dados.itens || dados.pedidos_omie?.[0]?.itens || [];
        const maps = dados.mapeamento_nfe || {};

        let itemAchado = null;
        let valorUnit = null;

        // 1º Testa na NF-e vinculada
        for (const i of itensNota) {
          const codNota = String(i.codigo || i.codigo_item || '').trim();
          const codMapeado = maps[codNota] || codNota;
          if (codMapeado === String(codigo).trim() || codNota === String(codigo).trim()) {
            itemAchado = i;
            valorUnit = Number(i.valorUnitario || i.valor_unitario || 0);
            break;
          }
        }

        // 2º Testa nos itens da requisição direta
        if (!itemAchado) {
          for (const i of itensReq) {
            const codItem = String(i.codigo || i.codigo_item || i.codigo_produto || '').trim();
            if (codItem === String(codigo).trim()) {
              itemAchado = i;
              const cotVenc = i.cotacoes?.find(c => c.selecionada || c.vencedora) || i.cotacoes?.[0];
              valorUnit = Number(i.valor_unitario || i.valorUnitario || cotVenc?.valorUnitario || 0);
              break;
            }
          }
        }

        if (itemAchado && valorUnit && valorUnit > 0) {
          const fornId = dados.pedidos_omie?.[0]?.fornecedorId || 
                         itemAchado.cotacoes?.[0]?.fornecedorId || 
                         dados.itens?.[0]?.cotacoes?.[0]?.fornecedorId;

          if (fornId && !fornecedoresJaAdicionados.has(String(fornId))) {
            fornecedoresJaAdicionados.add(String(fornId));

            const dataCompra = dados.dataRecebimentoFisico || 
                               dados.recebimentoFisico?.data || 
                               nota?.dataEmissao || 
                               r.atualizado_em || 
                               dados.dataCriacao;

            comprasReais.push({
              id: Date.now().toString() + Math.random().toString(36).substring(2, 6),
              fornecedorId: String(fornId),
              valorUnitario: Number(valorUnit).toFixed(2),
              previsaoDias: '5',
              dataCompra: dataCompra || null,
              isUltimaCompra: true
            });

            // Limite de 5 a 6 fornecedores históricos mais recentes
            if (comprasReais.length >= 6) break;
          }
        }
      } catch (e) {}
    }

    // Se não encontrou compras suficientes no EntradaEstoque local, consulta a API oficial da Omie (PesquisarPedCompra)
    if (comprasReais.length < 6) {
      const limiteRestante = 6 - comprasReais.length;
      const comprasOmieApi = await buscarHistoricoComprasOmie(codigo, limiteRestante);
      
      for (const c of comprasOmieApi) {
        if (!fornecedoresJaAdicionados.has(String(c.fornecedorId))) {
          fornecedoresJaAdicionados.add(String(c.fornecedorId));
          comprasReais.push(c);
          if (comprasReais.length >= 6) break;
        }
      }
    }

    // Se encontramos fornecedores reais (seja no EntradaEstoque ou na API da Omie), retornamos eles!
    if (comprasReais.length > 0) {
      return res.json(comprasReais);
    }

    // Se o produto nunca foi comprado nem no Almoxarifado nem na Omie, retorna array vazio
    // para não inventar empresas aleatórias (o comprador escolhe os fornecedores certos)
    res.json([]);

  } catch (error) {
    res.status(500).json({ message: 'Erro ao gerar sugestão de preços', error: error.message });
  }
});

// Rota para vincular um novo código de barras a um produto existente
router.post('/:codigo/barcode', async (req, res) => {
  try {
    const { codigo } = req.params;
    const { barcode } = req.body;

    if (!barcode) {
      return res.status(400).json({ message: 'O código de barras (barcode) é obrigatório' });
    }

    let produtos = await getProdutosDb();

    const prodIndex = produtos.findIndex(p => p.codigo === codigo);
    if (prodIndex === -1) {
      return res.status(404).json({ message: 'Produto não encontrado' });
    }

    produtos[prodIndex].codigos_barras_adicionais = produtos[prodIndex].codigos_barras_adicionais || [];
    if (!produtos[prodIndex].codigos_barras_adicionais.includes(barcode)) {
      produtos[prodIndex].codigos_barras_adicionais.push(barcode);
    }
    produtos[prodIndex].ean = barcode; // Define como principal para facilitar

    const db = await getDb();
    if (db.driver === 'mysql') {
      await db.run(
        `UPDATE produtos_omie SET ean = ?, dados_json = ?, atualizado_em = NOW() WHERE codigo = ?`,
        [barcode, JSON.stringify(produtos[prodIndex]), codigo]
      );
    } else {
      await db.run(
        `UPDATE produtos_omie SET ean = ?, dados_json = ?, atualizado_em = CURRENT_TIMESTAMP WHERE codigo = ?`,
        [barcode, JSON.stringify(produtos[prodIndex]), codigo]
      );
    }

    res.json({ message: 'Código de barras vinculado com sucesso', produto: produtos[prodIndex] });
  } catch (error) {
    console.error('Erro ao vincular código de barras:', error);
    res.status(500).json({ message: 'Erro ao vincular código de barras', error: error.message });
  }
});

// Rota para upload de imagem em base64
router.post('/:codigo/imagem', async (req, res) => {
  try {
    const { codigo } = req.params;
    const { imagemBase64 } = req.body;

    if (!imagemBase64) {
      return res.status(400).json({ message: 'Imagem base64 não fornecida.' });
    }

    const base64Data = imagemBase64.replace(/^data:image\/\w+;base64,/, "");
    const extMatch = imagemBase64.match(/^data:image\/(\w+);base64,/);
    const extensao = extMatch ? extMatch[1] : 'jpg';

    const uploadsDir = path.resolve(process.cwd(), 'data', 'uploads');
    await fs.mkdir(uploadsDir, { recursive: true });

    const fileName = `${codigo}_${Date.now()}.${extensao}`;
    const filePath = path.join(uploadsDir, fileName);

    await fs.writeFile(filePath, base64Data, 'base64');

    const imageUrl = `http://localhost:3000/uploads/${fileName}`;

    let produtos = await getProdutosDb();
    const prodIndex = produtos.findIndex(p => p.codigo === req.params.codigo);
    
    if (prodIndex === -1) {
      return res.status(404).json({ message: 'Produto não encontrado no banco local' });
    }

    produtos[prodIndex].imagem_url = imageUrl;

    const db = await getDb();
    if (db.driver === 'mysql') {
      await db.run(
        `UPDATE produtos_omie SET dados_json = ?, atualizado_em = NOW() WHERE codigo = ?`,
        [JSON.stringify(produtos[prodIndex]), req.params.codigo]
      );
    } else {
      await db.run(
        `UPDATE produtos_omie SET dados_json = ?, atualizado_em = CURRENT_TIMESTAMP WHERE codigo = ?`,
        [JSON.stringify(produtos[prodIndex]), req.params.codigo]
      );
    }

    res.json({ message: 'Imagem salva com sucesso', imageUrl, produto: produtos[prodIndex] });

  } catch (error) {
    console.error('Erro ao salvar imagem:', error);
    res.status(500).json({ message: 'Erro ao salvar imagem', error: error.message });
  }
});

// Rota para editar dados de um produto (ex: EAN)
router.put('/:codigo', async (req, res) => {
  try {
    const { codigo } = req.params;
    const updates = req.body;

    let produtos = await getProdutosDb();

    const prodIndex = produtos.findIndex(p => p.codigo === codigo);
    if (prodIndex === -1) {
      return res.status(404).json({ message: 'Produto não encontrado' });
    }

    // Update keys
    Object.keys(updates).forEach(key => {
      if (key === 'endereco') {
        if (!produtos[prodIndex].caracteristicas) produtos[prodIndex].caracteristicas = [];
        const idx = produtos[prodIndex].caracteristicas.findIndex(c => (c.cNomeCaract || c.nome || c.cNomeCaracteristica)?.toUpperCase() === 'ENDEREÇO');
        if (idx !== -1) {
          if (produtos[prodIndex].caracteristicas[idx].cConteudo !== undefined) {
             produtos[prodIndex].caracteristicas[idx].cConteudo = updates[key];
          }
          if (produtos[prodIndex].caracteristicas[idx].conteudo !== undefined) {
             produtos[prodIndex].caracteristicas[idx].conteudo = updates[key];
          }
          // Fallback para caso onde nenhum dos dois campos estava definido
          if (produtos[prodIndex].caracteristicas[idx].cConteudo === undefined && produtos[prodIndex].caracteristicas[idx].conteudo === undefined) {
             produtos[prodIndex].caracteristicas[idx].cConteudo = updates[key];
          }
        } else {
          produtos[prodIndex].caracteristicas.push({ cNomeCaract: 'ENDEREÇO', cConteudo: updates[key] });
        }
        produtos[prodIndex].endereco = updates[key]; // Salva na raiz também como fallback
      } else {
        produtos[prodIndex][key] = updates[key];
      }
    });

    const db = await getDb();
    if (db.driver === 'mysql') {
      await db.run(
        `UPDATE produtos_omie SET dados_json = ?, atualizado_em = NOW() WHERE codigo = ?`,
        [JSON.stringify(produtos[prodIndex]), codigo]
      );
    } else {
      await db.run(
        `UPDATE produtos_omie SET dados_json = ?, atualizado_em = CURRENT_TIMESTAMP WHERE codigo = ?`,
        [JSON.stringify(produtos[prodIndex]), codigo]
      );
    }

    // Sincroniza com a Omie se houver código de integração e houver edição de EAN ou endereço
    if (produtos[prodIndex].codigo_produto) {
      try {
        const payloadOmie = {};
        if (updates.ean !== undefined) payloadOmie.ean = produtos[prodIndex].ean;
        if (updates.endereco !== undefined) {
          payloadOmie.caracteristicas = produtos[prodIndex].caracteristicas || [];
        }

        if (Object.keys(payloadOmie).length > 0) {
           await omieProdutosService.alterarProdutoNaOmie(produtos[prodIndex].codigo_produto, payloadOmie);
        }
      } catch (err) {
        console.error("Erro ao atualizar produto na Omie:", err);
      }
    }

    return res.json({ message: 'Produto atualizado com sucesso', produto: produtos[prodIndex] });

  } catch (error) {
    console.error('Erro ao atualizar produto:', error);
    res.status(500).json({ message: 'Erro ao atualizar produto', error: error.message });
  }
});

// Rota para editar a data de validade de um lote específico
router.put('/:codigo/lotes/:numeroLote', async (req, res) => {
  try {
    const { codigo, numeroLote } = req.params;
    const { novaValidade } = req.body;

    if (!novaValidade) {
      return res.status(400).json({ message: 'A nova data de validade é obrigatória' });
    }

    let produtos = await getProdutosDb();

    const prodIndex = produtos.findIndex(p => p.codigo === codigo);
    if (prodIndex === -1) {
      return res.status(404).json({ message: 'Produto não encontrado' });
    }

    if (!produtos[prodIndex].lotes) {
      return res.status(404).json({ message: 'Produto não possui lotes cadastrados' });
    }

    const loteIndex = produtos[prodIndex].lotes.findIndex(l => l.numero === numeroLote);
    if (loteIndex === -1) {
      return res.status(404).json({ message: 'Lote não encontrado' });
    }

    // Atualiza a validade do lote
    produtos[prodIndex].lotes[loteIndex].validade = novaValidade;

    // Recalcula a validade geral (raiz)
    const lotesAtivos = produtos[prodIndex].lotes.filter(l => l.quantidade > 0);
    if (lotesAtivos.length > 0) {
      lotesAtivos.sort((a, b) => new Date(a.validade) - new Date(b.validade));
      produtos[prodIndex].data_validade = lotesAtivos[0].validade;
    }

    const db = await getDb();
    if (db.driver === 'mysql') {
      await db.run(
        `UPDATE produtos_omie SET dados_json = ?, atualizado_em = NOW() WHERE codigo = ?`,
        [JSON.stringify(produtos[prodIndex]), codigo]
      );
    } else {
      await db.run(
        `UPDATE produtos_omie SET dados_json = ?, atualizado_em = CURRENT_TIMESTAMP WHERE codigo = ?`,
        [JSON.stringify(produtos[prodIndex]), codigo]
      );
    }

    return res.json({ message: 'Validade do lote atualizada com sucesso', produto: produtos[prodIndex] });

  } catch (error) {
    console.error('Erro ao editar lote:', error);
    res.status(500).json({ message: 'Erro ao editar lote', error: error.message });
  }
});

// Rota para registrar descarte de produto (vencimento, avaria, etc)
router.post('/:codigo/descarte', async (req, res) => {
  try {
    const { codigo } = req.params;
    const { quantidade, motivo, loteNumero } = req.body;

    if (!quantidade || quantidade <= 0) {
      return res.status(400).json({ message: 'Quantidade de descarte inválida.' });
    }

    let produtos = await getProdutosDb();

    const prodIndex = produtos.findIndex(p => p.codigo === codigo);
    if (prodIndex === -1) {
      return res.status(404).json({ message: 'Produto não encontrado.' });
    }

    // Se informou lote, verifica o saldo do lote
    if (loteNumero && produtos[prodIndex].lotes) {
      const loteIndex = produtos[prodIndex].lotes.findIndex(l => l.numero === loteNumero);
      if (loteIndex === -1) {
        return res.status(404).json({ message: 'Lote não encontrado no produto.' });
      }
      if (produtos[prodIndex].lotes[loteIndex].quantidade < quantidade) {
        return res.status(400).json({ message: 'Quantidade no lote insuficiente para este descarte.' });
      }
      // Baixa do lote
      produtos[prodIndex].lotes[loteIndex].quantidade -= quantidade;
    } else {
      if (produtos[prodIndex].quantidade_estoque < quantidade) {
        return res.status(400).json({ message: 'Quantidade em estoque insuficiente para este descarte.' });
      }
    }

    // Diminui o estoque geral do produto
    produtos[prodIndex].quantidade_estoque -= quantidade;

    // Atualiza a validade raiz se necessário (recalcular o mais próximo)
    if (produtos[prodIndex].lotes) {
      const lotesAtivos = produtos[prodIndex].lotes.filter(l => l.quantidade > 0);
      if (lotesAtivos.length > 0) {
        lotesAtivos.sort((a, b) => new Date(a.validade) - new Date(b.validade));
        produtos[prodIndex].data_validade = lotesAtivos[0].validade;
      } else {
        // Se acabaram todos os lotes, pode limpar a validade raiz ou manter a ultima
        produtos[prodIndex].data_validade = null;
      }
    }

    const db = await getDb();
    if (db.driver === 'mysql') {
      await db.run(
        `UPDATE produtos_omie SET quantidade_estoque = ?, dados_json = ?, atualizado_em = NOW() WHERE codigo = ?`,
        [produtos[prodIndex].quantidade_estoque, JSON.stringify(produtos[prodIndex]), codigo]
      );
    } else {
      await db.run(
        `UPDATE produtos_omie SET quantidade_estoque = ?, dados_json = ?, atualizado_em = CURRENT_TIMESTAMP WHERE codigo = ?`,
        [produtos[prodIndex].quantidade_estoque, JSON.stringify(produtos[prodIndex]), codigo]
      );
    }

    // Registrar o descarte em um arquivo de log simples (opcional, mock)
    try {
      const descartesPath = path.resolve(process.cwd(), 'data', 'descartes.json');
      let descartes = [];
      try {
        const descData = await fs.readFile(descartesPath, 'utf-8');
        descartes = JSON.parse(descData);
      } catch (e) { }

      descartes.push({
        id: Date.now(),
        data: new Date().toISOString(),
        codigoProduto: codigo,
        descricaoProduto: produtos[prodIndex].descricao,
        quantidade,
        motivo
      });
      await fs.writeFile(descartesPath, JSON.stringify(descartes, null, 2), 'utf-8');
    } catch (e) {
      console.error('Falha ao gravar log de descarte:', e);
    }

    return res.json({ message: 'Descarte registrado com sucesso.', produto: produtos[prodIndex] });
  } catch (error) {
    console.error('Erro no descarte:', error);
    res.status(500).json({ message: 'Erro interno ao processar o descarte.', error: error.message });
  }
});

// ============================================================================
// ROTAS DE SINCRONIZAÇÃO DE ESTOQUE COM A OMIE & AUDITORIA
// ============================================================================

// ROTA PARA CONSULTAR HISTÓRICO GERAL DE SINCRONIZAÇÃO
router.get('/historico-sync/geral', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const historico = await omieEstoqueService.obterHistorico(null, limit);
    res.json(historico);
  } catch (error) {
    console.error('Erro ao buscar histórico geral de sincronização:', error);
    res.status(500).json({ error: error.message });
  }
});

// ROTA PARA CONSULTAR HISTÓRICO DE UM PRODUTO ESPECÍFICO
router.get('/:codigo/historico-sync', async (req, res) => {
  try {
    const { codigo } = req.params;
    const limit = parseInt(req.query.limit) || 20;
    const historico = await omieEstoqueService.obterHistorico(codigo, limit);
    res.json(historico);
  } catch (error) {
    console.error(`Erro ao buscar histórico de sincronização do produto ${req.params.codigo}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// ROTA PARA SINCRONIZAR SALDO DE UM ÚNICO PRODUTO (GET e POST)
const handleSyncIndividual = async (req, res) => {
  try {
    const { codigo } = req.params;
    const usuario = req.body?.usuario || req.query?.usuario || 'Almoxarife';

    const resultado = await omieEstoqueService.consultarSaldoIndividual(codigo, usuario);

    // Notifica em tempo real os clientes conectados via Socket.io
    const io = req.app.get('io');
    if (io) {
      io.emit('estoque_atualizado', {
        codigo,
        quantidade_estoque: resultado.novoSaldo,
        atualizado_em: resultado.atualizadoEm
      });
    }

    return res.json({
      message: 'Saldo atualizado da Omie com sucesso!',
      ...resultado
    });
  } catch (error) {
    console.error(`Erro ao sincronizar produto ${req.params.codigo} com a Omie:`, error);
    res.status(500).json({ message: 'Erro ao comunicar com a Omie', error: error.message });
  }
};

router.get('/:codigo/sync-estoque', handleSyncIndividual);
router.post('/:codigo/sync-estoque', handleSyncIndividual);

// ROTA PARA SINCRONIZAR TODOS (BULK / DISPARO MANUAL GERAL)
router.post('/sync-todos-estoque', async (req, res) => {
  try {
    const usuario = req.body?.usuario || 'Administrador';
    const limitePaginas = req.body?.limitePaginas || null;
    const resultado = await omieEstoqueService.sincronizarPosicaoEstoqueGeral('MANUAL_PAINEL', usuario, limitePaginas);

    const io = req.app.get('io');
    if (io) {
      io.emit('estoque_atualizado', { tipo: 'TODOS' });
    }

    return res.json(resultado);
  } catch (error) {
    console.error('Erro na sincronização em lote de estoque:', error);
    res.status(500).json({ message: 'Erro na sincronização em lote', error: error.message });
  }
});

export default router;

