import express from 'express';
import getDb from '../config/database.js';


const router = express.Router();

import { getJsonData, saveJsonData } from '../services/jsonDbService.js';

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
    const pedidos = await getJsonData('pedidos_pendentes') || [];
    const pendentes = pedidos.filter(p => p.status === 'Aguardando Recebimento');
    res.json(pendentes);
  } catch (error) {
    res.status(500).json({ message: 'Erro interno ao ler pedidos', error: error.message });
  }
});

// Rota para Confirmar Recebimento Físico (Almoxarifado)
router.post('/:id/receber', async (req, res) => {
  try {
    const pedidoId = req.params.id;
    const { itensRecebidos, isParcial, observacao, validades, eansCapturados } = req.body;
    
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
    pedidos[pedidoIndex].dataRecebimento = new Date().toISOString();

    await saveJsonData('pedidos_pendentes', pedidos);

    // 2. Atualizar o estoque físico no banco de dados
    try {
      let produtos = await getProdutosDb();
      let atualizouEstoque = false;

      for (const [codigo, quantidade] of Object.entries(itensRecebidos)) {
        if (quantidade > 0) {
          const produtoIndex = produtos.findIndex(p => p.codigo === codigo);
          if (produtoIndex !== -1) {
            produtos[produtoIndex].quantidade_estoque = (produtos[produtoIndex].quantidade_estoque || 0) + quantidade;
            
            if (validades && validades[codigo]) {
              const dataValidade = validades[codigo];
              if (!produtos[produtoIndex].lotes) {
                produtos[produtoIndex].lotes = [];
                const estoqueAntigo = produtos[produtoIndex].quantidade_estoque - quantidade;
                if (estoqueAntigo > 0 && produtos[produtoIndex].data_validade) {
                  produtos[produtoIndex].lotes.push({
                    numero: 'LOTE-LEGADO',
                    validade: produtos[produtoIndex].data_validade,
                    quantidade: estoqueAntigo,
                    ean: produtos[produtoIndex].ean || ''
                  });
                }
              }
              
              const eanDoLote = (eansCapturados && eansCapturados[codigo]) 
                ? eansCapturados[codigo] 
                : (produtos[produtoIndex].ean || '');

              const novoLote = {
                numero: `LOTE-${Date.now().toString().slice(-6)}`,
                validade: dataValidade,
                quantidade: quantidade,
                ean: eanDoLote
              };
              produtos[produtoIndex].lotes.push(novoLote);

              const lotesAtivos = produtos[produtoIndex].lotes.filter(l => l.quantidade > 0);
              if (lotesAtivos.length > 0) {
                lotesAtivos.sort((a, b) => new Date(a.validade) - new Date(b.validade));
                produtos[produtoIndex].data_validade = lotesAtivos[0].validade;
              } else {
                produtos[produtoIndex].data_validade = dataValidade;
              }
            }
            
            atualizouEstoque = true;
          } else if (codigo.startsWith('NEW-')) {
            const maxPRD = Math.max(...produtos.map(p => p.codigo).filter(c => c.startsWith('PRD')).map(c => parseInt(c.replace(/\D/g, '')) || 0));
            const nextNumber = isFinite(maxPRD) ? maxPRD + 1 : 1;
            const nextCode = `PRD${String(nextNumber).padStart(5, '0')}`;

            let descricaoNovo = "Produto Pré-cadastrado via Recebimento";
            const itemPedido = pedidos[pedidoIndex].itens?.find(i => i.codigo === codigo);
            if (itemPedido && itemPedido.descricao) {
              descricaoNovo = itemPedido.descricao;
            }

            const dataValidade = (validades && validades[codigo]) ? validades[codigo] : '';
            const eanDoLote = (eansCapturados && eansCapturados[codigo]) ? eansCapturados[codigo] : '';

            const novoLote = {
              numero: `LOTE-${Date.now().toString().slice(-6)}`,
              validade: dataValidade,
              quantidade: quantidade,
              ean: eanDoLote
            };

            const novoProduto = {
              codigo: nextCode,
              descricao: descricaoNovo,
              ncm: "",
              unidade: "UN",
              valor_unitario: 0,
              quantidade_estoque: quantidade,
              produto_lote: 'S',
              data_validade: dataValidade,
              ean: eanDoLote,
              lotes: [novoLote]
            };

            produtos.push(novoProduto);
            atualizouEstoque = true;
          }
        }
      }

      if (atualizouEstoque) {
        const isMysql = db.driver === 'mysql';
        for (const [codigo, qtde] of Object.entries(itensRecebidos)) {
           // Acha o produto modificado ou adicionado
           // Note: Se era NEW-, o novo produto foi inserido em 'produtos' com PRDxxxx
           let prodToSave = null;
           if (codigo.startsWith('NEW-')) {
             // Precisamos achar pelo lote ou pelo que foi gerado. Na prática, 
             // iterar todos os produtos recém-criados e salvar é melhor.
           }
        }
        
        // Forma simples e segura: salva todo o array `produtos` que mudou.
        // Como o array inteiro está modificado, salvamos apenas os itens do pedido.
        // Melhor: salvar todos os que tiverem no itensRecebidos e também os novos (código gerado agora).
        // Vamos varrer o array todo para evitar perder os gerados:
        for (const p of produtos) {
          // Filtra só os que realmente precisamos salvar (os alterados localmente não dá pra saber fácil, 
          // mas como este app é pequeno, podemos iterar o itensRecebidos e mapear pra salvar, e os que não tinham código a gente salva os ultimos)
          // Na vdd vamos salvar iterando. 
          if (!p.codigo) continue;
          const c = p.codigo.toString();
          const d = p.descricao || '';
          const n = p.ncm || '';
          const e = p.ean || '';
          const v = parseFloat(p.valor_unitario) || 0;
          const q = parseFloat(p.quantidade_estoque) || 0;
          const j = JSON.stringify(p);
          
          if (itensRecebidos[p.codigo] || (p.codigo.startsWith('PRD') && p.descricao === "Produto Pré-cadastrado via Recebimento")) {
            if (isMysql) {
              await db.run(
                `INSERT INTO produtos_omie (codigo, descricao, ncm, ean, valor_unitario, quantidade_estoque, dados_json) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE descricao=VALUES(descricao), ncm=VALUES(ncm), ean=VALUES(ean), valor_unitario=VALUES(valor_unitario), quantidade_estoque=VALUES(quantidade_estoque), dados_json=VALUES(dados_json), atualizado_em=NOW()`,
                [c, d, n, e, v, q, j]
              );
            } else {
              await db.run(
                `INSERT INTO produtos_omie (codigo, descricao, ncm, ean, valor_unitario, quantidade_estoque, dados_json) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(codigo) DO UPDATE SET descricao=excluded.descricao, ncm=excluded.ncm, ean=excluded.ean, valor_unitario=excluded.valor_unitario, quantidade_estoque=excluded.quantidade_estoque, dados_json=excluded.dados_json, atualizado_em=CURRENT_TIMESTAMP`,
                [c, d, n, e, v, q, j]
              );
            }
          }
        }
      }
    } catch (errEstoque) {
      console.error('Erro ao atualizar estoque no banco de dados:', errEstoque);
    }

    // 3. Atualizar a requisição original
    if (pedidos[pedidoIndex].requisicaoOrigemId) {
      try {
        const rowReq = await db.get(`SELECT * FROM requisicoes WHERE id = ?`, [pedidos[pedidoIndex].requisicaoOrigemId]);
        if (rowReq) {
          let dados = {};
          try { dados = JSON.parse(rowReq.dados_json || '{}'); } catch (e) { /* ignore */ }
          const novoStatusCompras = isParcial ? 'entregue_parcial' : 'entregue';
          dados.status_compras = novoStatusCompras;
          if (isParcial) {
            dados.divergencia = {
              observacao: observacao || 'Sem observação',
              itensRecebidos: itensRecebidos,
              dataRegistro: new Date().toISOString()
            };
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

    res.json({ message: 'Recebimento confirmado com sucesso! Status e estoque atualizados.' });
  } catch (error) {
    res.status(500).json({ message: 'Erro interno ao confirmar recebimento', error: error.message });
  }
});

export default router;
