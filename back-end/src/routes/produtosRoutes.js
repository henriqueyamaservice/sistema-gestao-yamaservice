import express from 'express';
import fs from 'fs/promises';
import path from 'path';

const router = express.Router();

// Rota para pegar os produtos salvos da Omie
router.get('/', async (req, res) => {
  try {
    const filePath = path.resolve(process.cwd(), 'data', 'produtos.json');
    const data = await fs.readFile(filePath, 'utf-8');
    const produtos = JSON.parse(data);

    let requisicoes = [];
    try {
      const requisicoesPath = path.resolve(process.cwd(), 'data', 'requisicoes.json');
      const reqData = await fs.readFile(requisicoesPath, 'utf-8');
      requisicoes = JSON.parse(reqData);
    } catch(e) {
      // Ignora se não existir
    }

    // Calcula quantidade pedida por produto apenas para requisições do tipo 'reposicao'
    const pedidaPorProduto = {};
    requisicoes.forEach(r => {
      if (r.tipo === 'reposicao') {
        r.itens?.forEach(item => {
          pedidaPorProduto[item.codigo] = (pedidaPorProduto[item.codigo] || 0) + Number(item.quantidade);
        });
      }
    });

    const produtosComStatus = produtos.map(p => ({
      ...p,
      quantidade_pedida: pedidaPorProduto[p.codigo] || 0
    }));

    res.json(produtosComStatus);
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.status(404).json({ message: 'Banco de dados de produtos não encontrado. Rode o script de sincronização da Omie primeiro.' });
    } else {
      res.status(500).json({ message: 'Erro interno ao ler os produtos', error: error.message });
    }
  }
});

// Rota simulada para buscar histórico/sugestão de preços de fornecedores para um produto
router.get('/:codigo/sugestao-precos', async (req, res) => {
  try {
    const { codigo } = req.params;
    
    // Ler produtos para pegar o preço base (valor_unitario)
    const produtosPath = path.resolve(process.cwd(), 'data', 'produtos.json');
    const dataProdutos = await fs.readFile(produtosPath, 'utf-8');
    const produtos = JSON.parse(dataProdutos);
    
    const produto = produtos.find(p => p.codigo === codigo);
    if (!produto) {
      return res.status(404).json({ message: 'Produto não encontrado' });
    }
    
    const precoBase = produto.valor_unitario || 100; // se não tiver, usa 100 como fallback
    
    // Ler fornecedores para sortear 3
    const fornecedoresPath = path.resolve(process.cwd(), 'data', 'fornecedores.json');
    const dataFornecedores = await fs.readFile(fornecedoresPath, 'utf-8');
    const fornecedores = JSON.parse(dataFornecedores);
    
    // Embaralha e pega 3
    const shuffledFornecedores = [...fornecedores].sort(() => 0.5 - Math.random());
    const selectedFornecedores = shuffledFornecedores.slice(0, 3);
    
    // Gera as sugestões
    const sugestoes = selectedFornecedores.map(f => {
      // Variação de -5% a +10%
      const variacao = (Math.random() * 0.15) - 0.05; 
      const valorSugerido = (precoBase * (1 + variacao)).toFixed(2);
      // Previsão de dias de 3 a 15
      const previsaoDias = Math.floor(Math.random() * 13) + 3;
      
      return {
        id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
        fornecedorId: f.codigo_cliente_omie.toString(),
        valorUnitario: valorSugerido,
        previsaoDias: previsaoDias.toString()
      };
    });
    
    res.json(sugestoes);
    
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

    const filePath = path.resolve(process.cwd(), 'data', 'produtos.json');
    const data = await fs.readFile(filePath, 'utf-8');
    let produtos = JSON.parse(data);
    
    const prodIndex = produtos.findIndex(p => p.codigo === codigo);
    if (prodIndex === -1) {
      return res.status(404).json({ message: 'Produto não encontrado' });
    }

    const produto = produtos[prodIndex];
    let eans = produto.ean ? produto.ean.split(',').map(e => e.trim()).filter(Boolean) : [];
    
    if (!eans.includes(barcode.trim())) {
      eans.push(barcode.trim());
      produtos[prodIndex].ean = eans.join(', ');
      
      await fs.writeFile(filePath, JSON.stringify(produtos, null, 2), 'utf-8');
      return res.json({ message: 'Código de barras vinculado com sucesso', produto: produtos[prodIndex] });
    } else {
      return res.json({ message: 'O código de barras já estava vinculado a este produto', produto: produtos[prodIndex] });
    }

  } catch (error) {
    console.error('Erro ao vincular código de barras:', error);
    res.status(500).json({ message: 'Erro ao vincular código de barras', error: error.message });
  }
});

// Rota para editar dados de um produto (ex: EAN)
router.put('/:codigo', async (req, res) => {
  try {
    const { codigo } = req.params;
    const updates = req.body;
    
    const filePath = path.resolve(process.cwd(), 'data', 'produtos.json');
    const data = await fs.readFile(filePath, 'utf-8');
    let produtos = JSON.parse(data);
    
    const prodIndex = produtos.findIndex(p => p.codigo === codigo);
    if (prodIndex === -1) {
      return res.status(404).json({ message: 'Produto não encontrado' });
    }

    // Update keys
    Object.keys(updates).forEach(key => {
      produtos[prodIndex][key] = updates[key];
    });
    
    await fs.writeFile(filePath, JSON.stringify(produtos, null, 2), 'utf-8');
    return res.json({ message: 'Produto atualizado com sucesso', produto: produtos[prodIndex] });

  } catch (error) {
    console.error('Erro ao atualizar produto:', error);
    res.status(500).json({ message: 'Erro ao atualizar produto', error: error.message });
  }
});

// Rota para registrar descarte de produto (vencimento, avaria, etc)
router.post('/:codigo/descarte', async (req, res) => {
  try {
    const { codigo } = req.params;
    const { quantidade, motivo } = req.body;

    if (!quantidade || quantidade <= 0) {
      return res.status(400).json({ message: 'Quantidade de descarte inválida.' });
    }

    const filePath = path.resolve(process.cwd(), 'data', 'produtos.json');
    const data = await fs.readFile(filePath, 'utf-8');
    let produtos = JSON.parse(data);

    const prodIndex = produtos.findIndex(p => p.codigo === codigo);
    if (prodIndex === -1) {
      return res.status(404).json({ message: 'Produto não encontrado.' });
    }

    if (produtos[prodIndex].quantidade_estoque < quantidade) {
      return res.status(400).json({ message: 'Quantidade em estoque insuficiente para este descarte.' });
    }

    // Diminui o estoque do produto
    produtos[prodIndex].quantidade_estoque -= quantidade;

    await fs.writeFile(filePath, JSON.stringify(produtos, null, 2), 'utf-8');

    // Registrar o descarte em um arquivo de log simples (opcional, mock)
    try {
      const descartesPath = path.resolve(process.cwd(), 'data', 'descartes.json');
      let descartes = [];
      try {
        const descData = await fs.readFile(descartesPath, 'utf-8');
        descartes = JSON.parse(descData);
      } catch (e) {}

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

export default router;
