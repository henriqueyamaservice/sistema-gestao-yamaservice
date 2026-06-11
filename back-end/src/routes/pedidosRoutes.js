import express from 'express';
import fs from 'fs/promises';
import path from 'path';

const router = express.Router();

// Rota simulada para listar Pedidos Pendentes da Omie
router.get('/', async (req, res) => {
  try {
    const filePath = path.resolve(process.cwd(), 'data', 'pedidos_pendentes.json');
    const data = await fs.readFile(filePath, 'utf-8');
    const pedidos = JSON.parse(data);
    
    // Retorna apenas os pendentes
    const pendentes = pedidos.filter(p => p.status === 'Aguardando Recebimento');
    res.json(pendentes);
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.json([]);
    } else {
      res.status(500).json({ message: 'Erro interno ao ler pedidos', error: error.message });
    }
  }
});

// Rota simulada para Confirmar Recebimento Físico (Almoxarifado)
router.post('/:id/receber', async (req, res) => {
  try {
    const pedidoId = req.params.id;
    const { itensRecebidos, isParcial, observacao } = req.body;
    
    // 1. Atualizar o pedido pendente
    const pedidosPath = path.resolve(process.cwd(), 'data', 'pedidos_pendentes.json');
    const dataPedidos = await fs.readFile(pedidosPath, 'utf-8');
    let pedidos = JSON.parse(dataPedidos);
    
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

    await fs.writeFile(pedidosPath, JSON.stringify(pedidos, null, 2), 'utf-8');

    // 2. Atualizar o estoque físico em produtos.json
    try {
      const produtosPath = path.resolve(process.cwd(), 'data', 'produtos.json');
      const dataProdutos = await fs.readFile(produtosPath, 'utf-8');
      let produtos = JSON.parse(dataProdutos);
      let atualizouEstoque = false;

      // itensRecebidos é um objeto { 'codigo': quantidadeRecebida }
      for (const [codigo, quantidade] of Object.entries(itensRecebidos)) {
        if (quantidade > 0) {
          const produtoIndex = produtos.findIndex(p => p.codigo === codigo);
          if (produtoIndex !== -1) {
            produtos[produtoIndex].quantidade_estoque = (produtos[produtoIndex].quantidade_estoque || 0) + quantidade;
            atualizouEstoque = true;
          }
        }
      }

      if (atualizouEstoque) {
        await fs.writeFile(produtosPath, JSON.stringify(produtos, null, 2), 'utf-8');
      }
    } catch (errEstoque) {
      console.error('Erro ao atualizar estoque em produtos.json:', errEstoque);
    }

    // 3. Atualizar a requisição original para sumir da tela de Entrada de Estoque (Compras)
    if (pedidos[pedidoIndex].requisicaoOrigemId) {
      try {
        const reqsPath = path.resolve(process.cwd(), 'data', 'requisicoes.json');
        let requisicoes = JSON.parse(await fs.readFile(reqsPath, 'utf-8'));
        const reqIdx = requisicoes.findIndex(r => r.id === pedidos[pedidoIndex].requisicaoOrigemId);
        if (reqIdx !== -1) {
          requisicoes[reqIdx].status_compras = isParcial ? 'entregue_parcial' : 'entregue';
          if (isParcial) {
            requisicoes[reqIdx].divergencia = {
              observacao: observacao || 'Sem observação',
              itensRecebidos: itensRecebidos,
              dataRegistro: new Date().toISOString()
            };
          }
          await fs.writeFile(reqsPath, JSON.stringify(requisicoes, null, 2), 'utf-8');
        }
      } catch(e) {
        console.error('Erro ao atualizar status na requisição:', e);
      }
    }

    res.json({ message: 'Recebimento confirmado com sucesso! Status e estoque atualizados (simulado).' });
  } catch (error) {
    res.status(500).json({ message: 'Erro interno ao confirmar recebimento', error: error.message });
  }
});

export default router;
