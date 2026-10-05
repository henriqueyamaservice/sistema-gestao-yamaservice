import express from 'express';
import getDb from '../config/database.js';


const router = express.Router();

import { getJsonData, saveJsonData } from '../services/jsonDbService.js';
import { calcularDivergencia } from '../services/divergenciasService.js';

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

// A função salvarProdutosDb será substituída por um update pontual

// Rota para listar Pedidos Pendentes
router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    const pedidos = await getJsonData('pedidos_pendentes') || [];
    const pendentes = pedidos.filter(p => p.status === 'Aguardando Recebimento');

    // Enriquecer cada pedido com dados fiscais da requisição (chaveNfe, numeroNF, valorTotal)
    const pendentesEnriquecidos = await Promise.all(pendentes.map(async (ped) => {
      let chaveNfe = ped.chaveNfe || '';
      let numeroNF = ped.numeroNF || ped.numeroNfe || '';
      let valorTotal = ped.valorTotal || 0;

      if (ped.requisicaoOrigemId) {
        try {
          const rowReq = await db.get(`SELECT dados_json FROM requisicoes WHERE id = ?`, [ped.requisicaoOrigemId]);
          if (rowReq?.dados_json) {
            const dados = JSON.parse(rowReq.dados_json);
            if (!chaveNfe) {
              chaveNfe = dados.chaveNfe || dados.nota_fiscal_vinculada?.chaveAcesso || '';
            }
            if (!numeroNF) {
              numeroNF = dados.nota_fiscal || dados.nota_fiscal_vinculada?.numero || dados.nota_fiscal_vinculada?.numeroNF || dados.numeroNF || '';
            }
            if (!valorTotal) {
              valorTotal = dados.nota_fiscal_vinculada?.valorTotal || dados.valor || 0;
            }
          }
        } catch (e) {
          // ignora erro de busca
        }
      }

      return {
        ...ped,
        chaveNfe,
        numeroNF,
        valorTotal
      };
    }));

    res.json(pendentesEnriquecidos);
  } catch (error) {
    res.status(500).json({ message: 'Erro interno ao ler pedidos', error: error.message });
  }
});

// Rota para Confirmar Recebimento Físico (Almoxarifado)
router.post('/:id/receber', async (req, res) => {
  try {
    const db = await getDb();
    const pedidoId = req.params.id;
    const { 
      itensRecebidos, 
      isParcial, 
      observacao, 
      validades, 
      eansCapturados, 
      chaveNfe, 
      numeroNF,
      localEstoquePadrao,
      locaisEstoque
    } = req.body;
    
    // 1. Atualizar o pedido pendente
    let pedidos = await getJsonData('pedidos_pendentes') || [];
    
    const pedidoIndex = pedidos.findIndex(p => p.id === pedidoId);
    if (pedidoIndex === -1) {
      return res.status(404).json({ message: 'Pedido não encontrado' });
    }

    pedidos[pedidoIndex].status = isParcial ? 'Recebido Parcialmente' : 'Recebido';
    pedidos[pedidoIndex].itensRecebidosConfirmados = itensRecebidos;
    if (observacao) {
      pedidos[pedidoIndex].observacao = observacao;
    }
    if (chaveNfe) {
      pedidos[pedidoIndex].chaveNfe = chaveNfe;
    }
    if (numeroNF) {
      pedidos[pedidoIndex].numeroNF = numeroNF;
    }
    if (localEstoquePadrao) {
      pedidos[pedidoIndex].localEstoque = localEstoquePadrao;
      pedidos[pedidoIndex].codigo_local_estoque = localEstoquePadrao;
    }
    if (locaisEstoque) {
      pedidos[pedidoIndex].locaisEstoque = locaisEstoque;
    }
    pedidos[pedidoIndex].dataRecebimento = new Date().toISOString();

    await saveJsonData('pedidos_pendentes', pedidos);

    // 2. Atualizar o estoque físico no banco de dados (produtos_omie)
    try {
      const isMysql = db.driver === 'mysql';

      for (const [codigoRecebido, quantidadeRaw] of Object.entries(itensRecebidos || {})) {
        const quantidade = parseFloat(quantidadeRaw) || 0;
        if (quantidade <= 0) continue;

        const itemPedido = pedidos[pedidoIndex].itens?.find(i => 
          String(i.codigo) === String(codigoRecebido) || 
          String(i.codigoNfeOriginal) === String(codigoRecebido)
        );

        // Busca o produto pelo código direto ou pelo EAN ou código original da NF-e
        let rowProd = await db.get(
          `SELECT * FROM produtos_omie WHERE codigo = ? OR (ean IS NOT NULL AND ean != '' AND ean = ?)`,
          [codigoRecebido, codigoRecebido]
        );

        if (!rowProd && itemPedido?.codigoNfeOriginal) {
          rowProd = await db.get(
            `SELECT * FROM produtos_omie WHERE codigo = ?`,
            [itemPedido.codigoNfeOriginal]
          );
        }

        const validadeItem = (validades && validades[codigoRecebido]) ? validades[codigoRecebido] : '';
        const eanItem = (eansCapturados && eansCapturados[codigoRecebido]) ? eansCapturados[codigoRecebido] : '';
        const localItem = (locaisEstoque && locaisEstoque[codigoRecebido]) 
          || itemPedido?.codigo_local_estoque 
          || itemPedido?.localEstoque 
          || localEstoquePadrao 
          || '01';

        if (rowProd) {
          // Atualiza produto existente
          const estoqueAtual = parseFloat(rowProd.quantidade_estoque) || 0;
          const novoEstoque = estoqueAtual + quantidade;

          let dadosProd = {};
          try { dadosProd = JSON.parse(rowProd.dados_json || '{}'); } catch(e){}
          dadosProd.quantidade_estoque = novoEstoque;
          dadosProd.codigo_local_estoque = localItem;

          if (validadeItem) {
            if (!Array.isArray(dadosProd.lotes)) dadosProd.lotes = [];
            const eanLote = eanItem || rowProd.ean || '';
            dadosProd.lotes.push({
              numero: `LOTE-${Date.now().toString().slice(-6)}`,
              validade: validadeItem,
              quantidade: quantidade,
              ean: eanLote
            });
            dadosProd.data_validade = validadeItem;
            dadosProd.produto_lote = 'S';
          }
          if (eanItem) {
            dadosProd.ean = eanItem;
          }

          const j = JSON.stringify(dadosProd);
          const eanFinal = eanItem || rowProd.ean || '';

          if (isMysql) {
            await db.run(
              `UPDATE produtos_omie SET quantidade_estoque = ?, ean = COALESCE(NULLIF(?, ''), ean), dados_json = ?, atualizado_em = NOW() WHERE codigo = ?`,
              [novoEstoque, eanFinal, j, rowProd.codigo]
            );
          } else {
            await db.run(
              `UPDATE produtos_omie SET quantidade_estoque = ?, ean = COALESCE(NULLIF(?, ''), ean), dados_json = ?, atualizado_em = CURRENT_TIMESTAMP WHERE codigo = ?`,
              [novoEstoque, eanFinal, j, rowProd.codigo]
            );
          }
        } else {
          // Cria novo produto no banco de dados
          let finalCode = codigoRecebido;
          if (codigoRecebido.startsWith('NEW-')) {
            const maxRows = await db.all("SELECT codigo FROM produtos_omie WHERE codigo LIKE 'PRD%'");
            const maxNum = maxRows.reduce((max, r) => {
              const num = parseInt(r.codigo.replace(/\D/g, '')) || 0;
              return num > max ? num : max;
            }, 0);
            finalCode = `PRD${String(maxNum + 1).padStart(5, '0')}`;
          }

          const desc = itemPedido?.descricao || "Produto Recebido via Almoxarifado";
          const lotes = validadeItem ? [{
            numero: `LOTE-${Date.now().toString().slice(-6)}`,
            validade: validadeItem,
            quantidade: quantidade,
            ean: eanItem
          }] : [];

          const novoProduto = {
            codigo: finalCode,
            descricao: desc,
            ncm: "",
            unidade: "UN",
            valor_unitario: 0,
            quantidade_estoque: quantidade,
            produto_lote: validadeItem ? 'S' : 'N',
            data_validade: validadeItem,
            ean: eanItem,
            codigo_local_estoque: localItem,
            lotes: lotes
          };

          const j = JSON.stringify(novoProduto);

          if (isMysql) {
            await db.run(
              `INSERT INTO produtos_omie (codigo, descricao, ncm, ean, valor_unitario, quantidade_estoque, dados_json, atualizado_em)
               VALUES (?, ?, ?, ?, 0, ?, ?, NOW())
               ON DUPLICATE KEY UPDATE quantidade_estoque = quantidade_estoque + VALUES(quantidade_estoque), dados_json = VALUES(dados_json), atualizado_em = NOW()`,
              [finalCode, desc, '', eanItem, quantidade, j]
            );
          } else {
            await db.run(
              `INSERT INTO produtos_omie (codigo, descricao, ncm, ean, valor_unitario, quantidade_estoque, dados_json, atualizado_em)
               VALUES (?, ?, ?, ?, 0, ?, ?, CURRENT_TIMESTAMP)
               ON CONFLICT(codigo) DO UPDATE SET quantidade_estoque = quantidade_estoque + excluded.quantidade_estoque, dados_json = excluded.dados_json, atualizado_em = CURRENT_TIMESTAMP`,
              [finalCode, desc, '', eanItem, quantidade, j]
            );
          }
        }
      }
    } catch (errEstoque) {
      console.error('Erro ao atualizar estoque no banco de dados:', errEstoque);
    }

    // 3. Atualizar a requisição original
    let calcDivergencia = null;
    if (pedidos[pedidoIndex].requisicaoOrigemId) {
      try {
        const reqId = pedidos[pedidoIndex].requisicaoOrigemId;
        const rowReq = await db.get(`SELECT * FROM requisicoes WHERE id = ?`, [reqId]);
        if (rowReq) {
          let dados = {};
          try { dados = JSON.parse(rowReq.dados_json || '{}'); } catch (e) { /* ignore */ }
          const novoStatusCompras = isParcial ? 'entregue_parcial' : 'entregue';
          dados.status_compras = novoStatusCompras;
          dados.dataRecebimentoFisico = new Date().toISOString();

          if (chaveNfe) {
            dados.chaveNfe = chaveNfe;
            if (!dados.nota_fiscal_vinculada) dados.nota_fiscal_vinculada = {};
            dados.nota_fiscal_vinculada.chaveAcesso = chaveNfe;
          }
          if (numeroNF) {
            dados.numeroNF = numeroNF;
            dados.nota_fiscal = numeroNF;
            if (!dados.nota_fiscal_vinculada) dados.nota_fiscal_vinculada = {};
            dados.nota_fiscal_vinculada.numero = numeroNF;
            dados.nota_fiscal_vinculada.numeroNF = numeroNF;
          }

          dados.recebimentoFisico = {
            data: new Date().toISOString(),
            isParcial: isParcial,
            observacao: observacao || '',
            itensRecebidos: itensRecebidos,
            pedidoId: pedidoId,
            chaveNfe: chaveNfe || dados.chaveNfe || '',
            numeroNF: numeroNF || dados.nota_fiscal || '',
            localEstoque: localEstoquePadrao || '01',
            locaisEstoque: locaisEstoque || {}
          };

          const itensComValor = (pedidos[pedidoIndex].itens || []).map(item => {
            let vUnit = Number(item.valorUnitario || item.valor_unitario || 0);
            if (vUnit <= 0) {
              const itemNF = dados.nota_fiscal_vinculada?.itens?.find(i => 
                String(i.codigo) === String(item.codigo) || 
                String(i.codigo_item) === String(item.codigo) ||
                String(i.codigo) === String(item.codigoNfeOriginal) ||
                String(i.descricao).toLowerCase() === String(item.descricao).toLowerCase()
              );
              if (itemNF) {
                vUnit = Number(itemNF.valorUnitario || itemNF.valor_unitario || 0);
              }
            }
            if (vUnit <= 0) {
              const itemReq = dados.itens?.find(i => 
                String(i.codigo) === String(item.codigo) || 
                String(i.codigo_item) === String(item.codigo) ||
                String(i.descricao).toLowerCase() === String(item.descricao).toLowerCase()
              );
              if (itemReq) {
                vUnit = Number(itemReq.valor_unitario || itemReq.valorUnitario || 0);
              }
            }
            if (vUnit <= 0) {
              for (const p of (dados.pedidos_omie || [])) {
                const itemPedOmie = p.itens?.find(i => 
                  String(i.codigo) === String(item.codigo) || 
                  String(i.codigo_item) === String(item.codigo) ||
                  String(i.descricao).toLowerCase() === String(item.descricao).toLowerCase()
                );
                if (itemPedOmie) {
                  vUnit = Number(itemPedOmie.valor_unitario || itemPedOmie.valorUnitario || 0);
                  break;
                }
              }
            }
            if (vUnit <= 0 && dados.nota_fiscal_vinculada?.valorTotal > 0 && item.quantidadeEsperada > 0) {
              vUnit = Number((dados.nota_fiscal_vinculada.valorTotal / item.quantidadeEsperada).toFixed(2));
            }

            return {
              ...item,
              valorUnitario: vUnit,
              valor_unitario: vUnit
            };
          });

          calcDivergencia = calcularDivergencia(
            itensComValor,
            itensRecebidos,
            dados.nota_fiscal_vinculada?.valorTotal || dados.valor || 0
          );

          if (isParcial || calcDivergencia.temDivergencia) {
            dados.divergencia = {
              status: 'pendente_compras',
              dataRegistro: new Date().toISOString(),
              pedidoId: pedidoId,
              observacao: observacao || 'Sem observação informada pelo Almoxarifado',
              itensFaltantes: calcDivergencia.itensFaltantes,
              itensRecebidos: itensRecebidos,
              valorTotalNota: calcDivergencia.valorTotalNota,
              valorFisicoRecebido: calcDivergencia.valorFisicoRecebido,
              valorDivergencia: calcDivergencia.valorDivergencia,
              percentualAtendido: calcDivergencia.percentualAtendido,
              resolucao: null
            };
          } else {
            dados.divergencia = null;
          }
          const dadosJson = JSON.stringify(dados);
          if (db.driver === 'mysql') {
            await db.run(
              `UPDATE requisicoes SET status_compras = ?, dados_json = ?, atualizado_em = NOW() WHERE id = ?`,
              [novoStatusCompras, dadosJson, rowReq.id]
            );
          } else {
            await db.run(
              `UPDATE requisicoes SET status_compras = ?, dados_json = ?, atualizado_em = CURRENT_TIMESTAMP WHERE id = ?`,
              [novoStatusCompras, dadosJson, rowReq.id]
            );
          }
        }
      } catch(e) {
        console.error('Erro ao atualizar status na requisição:', e);
      }
    }

    try {
      const io = req.app.get('io');
      if (io) {
        io.emit('pedidos_pendentes_atualizados');
        io.emit('recebimento_fiscal_atualizado');
        io.emit('estoque_atualizado');
        io.emit('produtos_atualizados');
        const reqId = pedidos[pedidoIndex].requisicaoOrigemId;
        if (reqId) {
          io.emit('requisicao_atualizada', { id: reqId });
          io.emit('mudanca_status', {
            id: reqId,
            novoStatus: isParcial ? 'entregue_parcial' : 'entregue',
            mensagem: isParcial ? 'Mercadoria recebida com falta física no Almoxarifado!' : 'Mercadoria recebida e estocada com sucesso no Almoxarifado!'
          });
          if (isParcial || calcDivergencia?.temDivergencia) {
            io.emit('nova_divergencia_recebimento', {
              id: reqId,
              pedidoId: pedidoId,
              fornecedor: pedidos[pedidoIndex].fornecedor,
              faltaValor: calcDivergencia?.valorDivergencia || 0,
              itensFaltantes: calcDivergencia?.itensFaltantes || [],
              observacao: observacao
            });
          }
        }
      }
    } catch (errIo) {
      console.warn('Erro ao emitir socket de atualização de pedidos:', errIo.message);
    }

    res.json({ message: 'Recebimento confirmado com sucesso! Status e estoque atualizados.' });
  } catch (error) {
    res.status(500).json({ message: 'Erro interno ao confirmar recebimento', error: error.message });
  }
});

export default router;
