import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import 'dotenv/config';

import sefazRoutes from './routes/sefazRoutes.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Rotas da SEFAZ
app.use('/api/sefaz', sefazRoutes);

// Rota para pegar os produtos salvos da Omie
app.get('/api/produtos', async (req, res) => {
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

// Rota para vincular um novo código de barras a um produto existente
app.post('/api/produtos/:codigo/barcode', async (req, res) => {
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
app.put('/api/produtos/:codigo', async (req, res) => {
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
app.post('/api/produtos/:codigo/descarte', async (req, res) => {
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

// Rota para pegar os fornecedores salvos da Omie
app.get('/api/fornecedores', async (req, res) => {
  try {
    const filePath = path.resolve(process.cwd(), 'data', 'fornecedores.json');
    const data = await fs.readFile(filePath, 'utf-8');
    const fornecedores = JSON.parse(data);
    res.json(fornecedores);
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.status(404).json({ message: 'Banco de dados de fornecedores não encontrado. Rode o script de sincronização primeiro.' });
    } else {
      res.status(500).json({ message: 'Erro interno ao ler os fornecedores', error: error.message });
    }
  }
});

// Rota simulada para salvar uma Nova Requisição
app.post('/api/requisicao', async (req, res) => {
  try {
    const filePath = path.resolve(process.cwd(), 'data', 'requisicoes.json');
    let requisicoes = [];
    
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      requisicoes = JSON.parse(data);
    } catch (e) {
      // Se não existir, usa array vazio
    }

    const statusInicial = req.body.origem === 'app_funcionario' ? 'aguardando_diretoria' : 'pendente';

    const novaRequisicao = {
      id: Date.now().toString(),
      dataCriacao: new Date().toISOString(),
      status: statusInicial,
      ...req.body,
      departamento: req.body.centroCusto || req.body.departamento || '',
      solicitante: req.body.contatoCliente || req.body.solicitante || 'Não Informado',
    };

    // Garante que os itens tenham o status correto também
    if (novaRequisicao.itens && Array.isArray(novaRequisicao.itens)) {
      novaRequisicao.itens = novaRequisicao.itens.map(item => ({
        ...item,
        status: statusInicial === 'aguardando_diretoria' ? 'aguardando_diretoria' : (item.status || 'aguardando_separacao')
      }));
    }

    requisicoes.push(novaRequisicao);
    await fs.writeFile(filePath, JSON.stringify(requisicoes, null, 2), 'utf-8');

    res.status(201).json({ 
      message: 'Requisição salva com sucesso (Simulação Local)', 
      requisicao: novaRequisicao 
    });
  } catch (error) {
    res.status(500).json({ message: 'Erro interno ao salvar requisição', error: error.message });
  }
});
// Rota simulada para listar Requisições
app.get('/api/requisicoes', async (req, res) => {
  try {
    const filePath = path.resolve(process.cwd(), 'data', 'requisicoes.json');
    const data = await fs.readFile(filePath, 'utf-8');
    const requisicoes = JSON.parse(data);
    res.json(requisicoes);
  } catch (error) {
    if (error.code === 'ENOENT') {
      // Se não existir, retorna array vazio
      res.json([]);
    } else {
      res.status(500).json({ message: 'Erro interno ao ler requisições', error: error.message });
    }
  }
});
// Rota simulada para listar Pedidos Pendentes da Omie
app.get('/api/pedidos', async (req, res) => {
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

// Rota simulada para Mapeamento Fiscal (Entrada de Estoque -> Salvar Mapeamento)
app.post('/api/estoque/receber-nota/:id', async (req, res) => {
  try {
    const reqId = req.params.id;
    const { mapeamentoItens } = req.body;

    const reqsPath = path.resolve(process.cwd(), 'data', 'requisicoes.json');
    let requisicoes = [];
    try { requisicoes = JSON.parse(await fs.readFile(reqsPath, 'utf-8')); } catch(e){}
    
    const reqIndex = requisicoes.findIndex(r => r.id === reqId);
    if (reqIndex === -1) return res.status(404).json({message: 'Not found'});
    
    const requisicao = requisicoes[reqIndex];
    requisicao.mapeamento_nfe = mapeamentoItens;
    requisicao.mapeamento_concluido = true;

    const nota = requisicao.pedidos_omie?.find(p => p.nota_fiscal_vinculada)?.nota_fiscal_vinculada;
    if (!nota) return res.status(400).json({message: 'Sem NFe vinculada'});

    // Cria a Ordem de Recebimento Físico para o Almoxarifado
    const pendentesPath = path.resolve(process.cwd(), 'data', 'pedidos_pendentes.json');
    let pendentes = [];
    try { pendentes = JSON.parse(await fs.readFile(pendentesPath, 'utf-8')); } catch(e){}

    // Remove se já existir um recebimento pendente para essa mesma requisição para evitar duplicatas (caso ele salve novamente)
    pendentes = pendentes.filter(p => p.requisicaoOrigemId !== reqId);

    const itensParaReceber = [];
    for (const item of nota.itens) {
      const mapping = mapeamentoItens[item.codigo];
      if (mapping && mapping !== 'ignorar') {
        let finalCode = mapping;
        let finalDesc = item.descricao;

        if (mapping.startsWith('NOVO:')) {
          finalCode = 'NEW-' + Date.now().toString().substring(8) + Math.floor(Math.random()*100);
          finalDesc = mapping.substring(5);
        }

        itensParaReceber.push({
          codigo: finalCode,
          codigoNfeOriginal: item.codigo,
          descricao: finalDesc,
          quantidadeEsperada: item.quantidade,
          quantidadeRecebida: 0
        });
      }
    }

    if (itensParaReceber.length > 0) {
      pendentes.push({
        id: `REC-${reqId}`,
        requisicaoOrigemId: reqId,
        fornecedor: nota.emitente.nome,
        dataEmissao: new Date().toISOString(),
        status: 'Aguardando Recebimento',
        itens: itensParaReceber
      });
      await fs.writeFile(pendentesPath, JSON.stringify(pendentes, null, 2));
    }

    await fs.writeFile(reqsPath, JSON.stringify(requisicoes, null, 2));
    res.json({ message: 'Mapeamento salvo. Aguardando Almoxarifado.' });

  } catch(e) {
    res.status(500).json({error: e.message});
  }
});

// Rota simulada para Confirmar Recebimento Físico (Almoxarifado)
app.post('/api/pedidos/:id/receber', async (req, res) => {
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
// Rota para o setor de Compras resolver uma divergência/recebimento parcial
app.post('/api/requisicoes/:id/resolver-divergencia', async (req, res) => {
  try {
    const { id } = req.params;
    const { acao, notaDevolucao, observacaoResolucao } = req.body;
    
    const reqsPath = path.resolve(process.cwd(), 'data', 'requisicoes.json');
    let requisicoes = JSON.parse(await fs.readFile(reqsPath, 'utf-8'));
    
    const reqIdx = requisicoes.findIndex(r => r.id === id);
    if (reqIdx === -1) return res.status(404).json({ message: 'Requisição não encontrada' });
    
    requisicoes[reqIdx].status_compras = 'entregue'; // Encerra a pendência
    requisicoes[reqIdx].resolucao_divergencia = {
      acao,
      notaDevolucao,
      observacaoResolucao,
      dataResolucao: new Date().toISOString()
    };
    
    await fs.writeFile(reqsPath, JSON.stringify(requisicoes, null, 2), 'utf-8');
    res.json({ message: 'Divergência resolvida com sucesso!', requisicao: requisicoes[reqIdx] });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao resolver divergência', error: err.message });
  }
});

// Rota para registrar Substituição por Similaridade
app.post('/api/requisicoes/:id/substituir-item', async (req, res) => {
  try {
    const requisicaoId = req.params.id;
    const { codigoOriginal, produtoSubstituto, motivo } = req.body;
    
    const filePath = path.resolve(process.cwd(), 'data', 'requisicoes.json');
    const data = await fs.readFile(filePath, 'utf-8');
    let requisicoes = JSON.parse(data);
    
    const reqIndex = requisicoes.findIndex(r => r.id === requisicaoId);
    if (reqIndex === -1) return res.status(404).json({ message: 'Requisição não encontrada' });
    
    const itemIndex = requisicoes[reqIndex].itens.findIndex(i => i.codigo === codigoOriginal);
    if (itemIndex === -1) return res.status(404).json({ message: 'Item original não encontrado na requisição' });

    const itemOriginal = requisicoes[reqIndex].itens[itemIndex];
    
    // Registra a substituição no histórico do item
    requisicoes[reqIndex].itens[itemIndex] = {
      ...itemOriginal,
      codigo: produtoSubstituto.codigo,
      descricao: produtoSubstituto.descricao,
      valor_unitario: produtoSubstituto.valor_unitario || itemOriginal.valor_unitario, // atualiza o custo estimado
      substituicao: {
        codigoOriginal: itemOriginal.codigo,
        descricaoOriginal: itemOriginal.descricao,
        motivo,
        data: new Date().toISOString()
      }
    };

    await fs.writeFile(filePath, JSON.stringify(requisicoes, null, 2), 'utf-8');
    res.json({ message: 'Substituição registrada com sucesso', requisicao: requisicoes[reqIndex] });

  } catch (error) {
    res.status(500).json({ message: 'Erro ao registrar substituição', error: error.message });
  }
});

// Rota para avançar a etapa (Pipeline)
app.post('/api/requisicoes/:id/avancar-etapa', async (req, res) => {
  try {
    const requisicaoId = req.params.id;
    const { novoStatus } = req.body;
    
    if (!novoStatus) {
      return res.status(400).json({ message: 'O novo status é obrigatório' });
    }

    const filePath = path.resolve(process.cwd(), 'data', 'requisicoes.json');
    const data = await fs.readFile(filePath, 'utf-8');
    let requisicoes = JSON.parse(data);
    
    const reqIndex = requisicoes.findIndex(r => r.id === requisicaoId);
    if (reqIndex === -1) return res.status(404).json({ message: 'Requisição não encontrada' });
    
    requisicoes[reqIndex].status_compras = novoStatus;
    // Grava também a data da movimentação
    requisicoes[reqIndex].historico_status = requisicoes[reqIndex].historico_status || [];
    requisicoes[reqIndex].historico_status.push({
      status: novoStatus,
      data: new Date().toISOString()
    });

    await fs.writeFile(filePath, JSON.stringify(requisicoes, null, 2), 'utf-8');
    res.json({ message: `Requisição avançada para ${novoStatus} com sucesso`, requisicao: requisicoes[reqIndex] });

  } catch (error) {
    res.status(500).json({ message: 'Erro ao avançar etapa', error: error.message });
  }
});

// Rota para registrar recebimento físico da mercadoria (Entrada no Estoque)
app.post('/api/estoque/receber-nota/:idReq', async (req, res) => {
  try {
    const requisicaoId = req.params.idReq;
    const { mapeamentoItens } = req.body; 
    // Exemplo de mapeamentoItens: { "idDoItemNaNota": "novo_produto", "idDoItemNaNota2": "PRD0001" }

    const reqPath = path.resolve(process.cwd(), 'data', 'requisicoes.json');
    const dataReq = await fs.readFile(reqPath, 'utf-8');
    let requisicoes = JSON.parse(dataReq);
    
    const reqIndex = requisicoes.findIndex(r => r.id === requisicaoId);
    if (reqIndex === -1) return res.status(404).json({ message: 'Requisição não encontrada' });

    // Atualiza status para recebido/faturado
    requisicoes[reqIndex].status_compras = 'estoque_faturado';
    requisicoes[reqIndex].mapeamento_recebimento = mapeamentoItens;
    requisicoes[reqIndex].historico_status = requisicoes[reqIndex].historico_status || [];
    requisicoes[reqIndex].historico_status.push({
      status: 'estoque_faturado',
      data: new Date().toISOString()
    });

    await fs.writeFile(reqPath, JSON.stringify(requisicoes, null, 2), 'utf-8');
    res.json({ message: 'Recebimento de estoque concluído com sucesso!', requisicao: requisicoes[reqIndex] });

  } catch (error) {
    console.error('Erro no recebimento:', error);
    res.status(500).json({ message: 'Erro ao processar recebimento', error: error.message });
  }
});

// Rota para gerar pedidos de compra na Omie (via API) e avançar etapa
app.post('/api/requisicoes/:id/gerar-pedidos', async (req, res) => {
  try {
    const requisicaoId = req.params.id;
    const { vencedores } = req.body; // ex: { "PRD11302": "idCotacaoXYZ", "PRD9999": "idCotacaoABC" }
    
    if (!vencedores || Object.keys(vencedores).length === 0) {
      return res.status(400).json({ message: 'Nenhum vencedor informado' });
    }

    const reqPath = path.resolve(process.cwd(), 'data', 'requisicoes.json');
    const dataReq = await fs.readFile(reqPath, 'utf-8');
    let requisicoes = JSON.parse(dataReq);
    
    const reqIndex = requisicoes.findIndex(r => r.id === requisicaoId);
    if (reqIndex === -1) return res.status(404).json({ message: 'Requisição não encontrada' });
    
    const requisicao = requisicoes[reqIndex];

    // Ler produtos para pegar o codigo_produto real da Omie
    const prodPath = path.resolve(process.cwd(), 'data', 'produtos.json');
    const dataProd = await fs.readFile(prodPath, 'utf-8');
    const produtos = JSON.parse(dataProd);

    // Agrupar itens ganhos por fornecedor
    // formato: { fornecedorId: [ { codigo_item, quantidade, valor_unitario }, ... ] }
    const itensPorFornecedor = {};

    Object.entries(vencedores).forEach(([codigoItemStr, cotacaoId]) => {
      const itemReq = requisicao.itens.find(i => i.codigo === codigoItemStr);
      if (!itemReq || !itemReq.cotacoes) return;

      const cotacaoVencedora = itemReq.cotacoes.find(c => c.id === cotacaoId);
      if (!cotacaoVencedora) return;

      const fornecedorId = cotacaoVencedora.fornecedorId;
      const produtoOmie = produtos.find(p => p.codigo === codigoItemStr);
      const codigoProdutoOmie = produtoOmie ? produtoOmie.codigo_produto : null;

      if (!itensPorFornecedor[fornecedorId]) {
        itensPorFornecedor[fornecedorId] = [];
      }

      // Cálculo real considerando Caixa/Pacote e Descontos
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

      // Montar uma observação para a Omie com as informações extras
      let obs = [];
      if (cotacaoVencedora.marca) obs.push(`Marca: ${cotacaoVencedora.marca}`);
      if (tipo !== 'Unidade') obs.push(`Emb: ${tipo} c/ ${qtdInterna}`);
      if (cotacaoVencedora.previsaoDias) obs.push(`Prazo: ${cotacaoVencedora.previsaoDias} dias`);
      if (descItem > 0) obs.push(`Desc. Item: ${descItem}%`);
      if (descGeral > 0) obs.push(`Desc. Geral: ${descGeral}%`);

      itensPorFornecedor[fornecedorId].push({
        codigo_item: codigoProdutoOmie || codigoItemStr, // fallback
        descricao: itemReq.descricao,
        quantidade: qtdComprar,
        valor_unitario: Number(valorUnitarioComDesconto.toFixed(4)),
        observacao: obs.join(' | ')
      });
    });

    // Simular o envio para a Omie
    const appKey = process.env.OMIE_APP_KEY;
    const appSecret = process.env.OMIE_APP_SECRET;
    
    const pedidosGerados = [];

    for (const [fornecedorId, detalhes] of Object.entries(itensPorFornecedor)) {
      const payloadOmie = {
        call: "IncluirPedidoCompra",
        app_key: appKey || "mock_key",
        app_secret: appSecret || "mock_secret",
        param: [{
          cabecalho: {
            codigo_fornecedor: Number(fornecedorId),
            etapa: "10"
          },
          detalhes: detalhes
        }]
      };

      console.log(`[OMIE INTEGRAÇÃO] Gerando Pedido de Compra para o fornecedor ${fornecedorId}...`);
      console.log(JSON.stringify(payloadOmie, null, 2));

      // Se tivermos as chaves reais, poderíamos fazer um fetch() aqui.
      // fetch('https://app.omie.com.br/api/v1/produtos/pedidocompra/', ...)
      
      // Simulação de resposta de sucesso da Omie
      const mockNumeroPedido = `PED-${Math.floor(Math.random() * 100000)}`;
      
      const valorTotal = detalhes.reduce((acc, i) => acc + (i.quantidade * i.valor_unitario), 0);
      
      pedidosGerados.push({ 
        fornecedorId, 
        numeroPedido: mockNumeroPedido,
        itens: detalhes,
        valorTotal
      });
    }

    // Atualiza a requisição
    requisicoes[reqIndex].status_compras = 'pedido_gerado';
    requisicoes[reqIndex].pedidos_omie = pedidosGerados;
    requisicoes[reqIndex].historico_status = requisicoes[reqIndex].historico_status || [];
    requisicoes[reqIndex].historico_status.push({
      status: 'pedido_gerado',
      data: new Date().toISOString()
    });

    await fs.writeFile(reqPath, JSON.stringify(requisicoes, null, 2), 'utf-8');
    
    res.json({ 
      message: 'Pedidos gerados com sucesso na Omie', 
      pedidosGerados,
      requisicao: requisicoes[reqIndex] 
    });

  } catch (error) {
    console.error("Erro ao gerar pedidos:", error);
    res.status(500).json({ message: 'Erro ao gerar pedidos na Omie', error: error.message });
  }
});

// Rota para o Diretor autorizar ou rejeitar uma requisição
app.post('/api/requisicoes/:id/autorizar', async (req, res) => {
  try {
    const requisicaoId = req.params.id;
    const { acao, motivo } = req.body; // acao = 'aprovar' | 'rejeitar'

    const filePath = path.resolve(process.cwd(), 'data', 'requisicoes.json');
    let requisicoes = [];
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      requisicoes = JSON.parse(data);
    } catch (e) {
      return res.status(500).json({ message: 'Erro ao ler banco de dados' });
    }

    const reqIndex = requisicoes.findIndex(r => r.id === requisicaoId);
    if (reqIndex === -1) {
      return res.status(404).json({ message: 'Requisição não encontrada' });
    }

    if (acao === 'aprovar') {
      requisicoes[reqIndex].status = 'pendente'; // Vai para o Almoxarifado
      if (requisicoes[reqIndex].itens) {
        requisicoes[reqIndex].itens = requisicoes[reqIndex].itens.map(i => ({ ...i, status: 'aguardando_separacao' }));
      }
    } else if (acao === 'rejeitar') {
      requisicoes[reqIndex].status = 'rejeitado_diretoria';
      if (motivo) requisicoes[reqIndex].motivoRejeicao = motivo;
      if (requisicoes[reqIndex].itens) {
        requisicoes[reqIndex].itens = requisicoes[reqIndex].itens.map(i => ({ ...i, status: 'rejeitado_diretoria' }));
      }
    }

    await fs.writeFile(filePath, JSON.stringify(requisicoes, null, 2), 'utf-8');
    res.json({ message: `Requisição ${acao} com sucesso.`, requisicao: requisicoes[reqIndex] });

  } catch (error) {
    res.status(500).json({ message: 'Erro ao processar autorização', error: error.message });
  }
});

// Rota para o Almoxarifado finalizar a entrega (Separação Concluída)
app.post('/api/requisicoes/:id/finalizar', async (req, res) => {
  try {
    const requisicaoId = req.params.id;
    const { vendedor, localEstoque, itensEntregues } = req.body; // itensEntregues = { 'CODIGO': qtd_entregue }

    const filePath = path.resolve(process.cwd(), 'data', 'requisicoes.json');
    let requisicoes = [];
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      requisicoes = JSON.parse(data);
    } catch (e) {
      return res.status(500).json({ message: 'Erro ao ler banco de dados' });
    }

    const reqIndex = requisicoes.findIndex(r => r.id === requisicaoId);
    if (reqIndex === -1) {
      return res.status(404).json({ message: 'Requisição não encontrada' });
    }

    requisicoes[reqIndex].status = 'finalizado';
    if (vendedor) requisicoes[reqIndex].vendedor = vendedor;
    if (localEstoque) requisicoes[reqIndex].localEstoque = localEstoque;
    
    let isParcial = false;

    if (requisicoes[reqIndex].itens) {
      requisicoes[reqIndex].itens = requisicoes[reqIndex].itens.map(i => {
        const pedida = Number(i.quantidade);
        // Se mandou itensEntregues, usa ele. Se não mandou (compatibilidade), assume que entregou tudo.
        const entregue = itensEntregues && itensEntregues[i.codigo] !== undefined 
            ? Number(itensEntregues[i.codigo]) 
            : pedida;

        if (entregue < pedida) {
          isParcial = true;
        }

        return { ...i, status: 'entregue', quantidade_entregue: entregue, devolvido: 0 };
      });
    }

    requisicoes[reqIndex].entrega_parcial = isParcial;

    await fs.writeFile(filePath, JSON.stringify(requisicoes, null, 2), 'utf-8');
    res.json({ message: 'Requisição finalizada com sucesso.', requisicao: requisicoes[reqIndex] });

  } catch (error) {
    res.status(500).json({ message: 'Erro ao processar finalização', error: error.message });
  }
});

// Rota para o Almoxarifado registrar devolução de peça não utilizada
app.post('/api/requisicoes/:id/devolver', async (req, res) => {
  try {
    const requisicaoId = req.params.id;
    const { codigo_produto, quantidade_devolvida } = req.body; 

    const filePath = path.resolve(process.cwd(), 'data', 'requisicoes.json');
    let requisicoes = [];
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      requisicoes = JSON.parse(data);
    } catch (e) {
      return res.status(500).json({ message: 'Erro ao ler banco de dados' });
    }

    const reqIndex = requisicoes.findIndex(r => r.id === requisicaoId);
    if (reqIndex === -1) return res.status(404).json({ message: 'Requisição não encontrada' });

    let itemAchado = false;
    if (requisicoes[reqIndex].itens) {
      requisicoes[reqIndex].itens = requisicoes[reqIndex].itens.map(i => {
        if (i.codigo === codigo_produto) {
          itemAchado = true;
          const devolvidoAntes = Number(i.devolvido || 0);
          return { ...i, devolvido: devolvidoAntes + Number(quantidade_devolvida) };
        }
        return i;
      });
    }

    if (!itemAchado) {
      return res.status(400).json({ message: 'Produto não encontrado nesta requisição' });
    }

    // Opcional: aqui é onde você conectaria com a API da Omie ou atualizaria produtos.json para devolver o saldo físico.
    
    await fs.writeFile(filePath, JSON.stringify(requisicoes, null, 2), 'utf-8');
    res.json({ message: 'Devolução registrada com sucesso!', requisicao: requisicoes[reqIndex] });

  } catch (error) {
    res.status(500).json({ message: 'Erro ao registrar devolução', error: error.message });
  }
});

// Rota para salvar cotações inseridas na aba de Concorrência
app.post('/api/requisicoes/:id/salvar-cotacoes', async (req, res) => {
  try {
    const requisicaoId = req.params.id;
    const { cotacoes } = req.body; // { 'codigoItem1': [...], 'codigoItem2': [...] }
    
    const filePath = path.resolve(process.cwd(), 'data', 'requisicoes.json');
    const data = await fs.readFile(filePath, 'utf-8');
    let requisicoes = JSON.parse(data);
    
    const reqIndex = requisicoes.findIndex(r => r.id === requisicaoId);
    if (reqIndex === -1) return res.status(404).json({ message: 'Requisição não encontrada' });
    
    // Atualiza cada item com suas cotações
    requisicoes[reqIndex].itens = requisicoes[reqIndex].itens.map(item => {
      if (cotacoes[item.codigo]) {
        return {
          ...item,
          cotacoes: cotacoes[item.codigo]
        };
      }
      return item;
    });

    await fs.writeFile(filePath, JSON.stringify(requisicoes, null, 2), 'utf-8');
    res.json({ message: 'Cotações salvas com sucesso', requisicao: requisicoes[reqIndex] });

  } catch (error) {
    res.status(500).json({ message: 'Erro ao salvar cotações', error: error.message });
  }
});

// Rota simulada para buscar histórico/sugestão de preços de fornecedores para um produto
app.get('/api/produtos/:codigo/sugestao-precos', async (req, res) => {
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

// Rota para pegar os vendedores salvos da Omie
app.get('/api/vendedores', async (req, res) => {
  try {
    const filePath = path.resolve(process.cwd(), 'data', 'vendedores.json');
    const data = await fs.readFile(filePath, 'utf-8');
    const vendedores = JSON.parse(data);
    res.json(vendedores);
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.status(404).json({ message: 'Banco de dados de vendedores não encontrado. Rode o script de sincronização primeiro.' });
    } else {
      res.status(500).json({ message: 'Erro interno ao ler os vendedores', error: error.message });
    }
  }
});

// Rota para cadastrar um novo fornecedor manualmente
app.post('/api/fornecedores', async (req, res) => {
  try {
    const { razao_social, nome_fantasia, cnpj_cpf } = req.body;
    
    if (!razao_social || !cnpj_cpf) {
      return res.status(400).json({ message: 'Razão social e CNPJ/CPF são obrigatórios' });
    }

    const filePath = path.resolve(process.cwd(), 'data', 'vendedores.json');
    let vendedores = [];
    
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      vendedores = JSON.parse(data);
    } catch (e) {
      // Se não existir, cria vazio
    }

    // Gera um código interno, para garantir que não colida com a Omie que usa Int
    const novoCodigo = Number(`99${Math.floor(Date.now() / 1000)}`);
    
    const novoFornecedor = {
      codigo_cliente_omie: novoCodigo,
      razao_social: razao_social.toUpperCase(),
      nome_fantasia: (nome_fantasia || razao_social).toUpperCase(),
      cnpj_cpf: cnpj_cpf
    };

    vendedores.push(novoFornecedor);
    
    await fs.writeFile(filePath, JSON.stringify(vendedores, null, 2), 'utf-8');
    
    res.status(201).json(novoFornecedor);
    
  } catch (error) {
    res.status(500).json({ message: 'Erro ao salvar o fornecedor', error: error.message });
  }
});

// Rota para pegar os departamentos
app.get('/api/departamentos', async (req, res) => {
  try {
    const filePath = path.resolve(process.cwd(), 'data', 'departamentos.json');
    const data = await fs.readFile(filePath, 'utf-8');
    res.json(JSON.parse(data));
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.status(404).json({ message: 'Banco de dados de departamentos não encontrado. Rode o script de sincronização.' });
    } else {
      res.status(500).json({ message: 'Erro interno', error: error.message });
    }
  }
});

// GET /api/locais-estoque
app.get('/api/locais-estoque', async (req, res) => {
  try {
    const filePath = path.resolve(process.cwd(), 'data', 'locais_estoque.json');
    const data = await fs.readFile(filePath, 'utf-8');
    res.json(JSON.parse(data));
  } catch (error) {
    res.json([]); // Retorna vazio se arquivo não existir
  }
});

// Rota para pegar os projetos (OS)
app.get('/api/projetos', async (req, res) => {
  try {
    const filePath = path.resolve(process.cwd(), 'data', 'projetos.json');
    const data = await fs.readFile(filePath, 'utf-8');
    res.json(JSON.parse(data));
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.status(404).json({ message: 'Banco de dados de projetos não encontrado. Rode o script de sincronização.' });
    } else {
      res.status(500).json({ message: 'Erro interno', error: error.message });
    }
  }
});

// ==========================================
// ROTAS PARA PORTAL EXTERNO DO FORNECEDOR
// ==========================================

// Gera um link/token único para um fornecedor fazer a cotação
app.post('/api/cotacao-link', async (req, res) => {
  try {
    const { requisicaoId, fornecedorId } = req.body;
    if (!requisicaoId || !fornecedorId) return res.status(400).json({ message: 'requisicaoId e fornecedorId são obrigatórios' });

    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const tokensPath = path.resolve(process.cwd(), 'data', 'tokens.json');
    
    let tokens = [];
    try {
      const data = await fs.readFile(tokensPath, 'utf-8');
      tokens = JSON.parse(data);
    } catch (e) {
      // Arquivo não existe ou vazio
    }

    const novoToken = {
      token,
      requisicaoId,
      fornecedorId,
      status: 'ativo',
      dataCriacao: new Date().toISOString()
    };

    tokens.push(novoToken);
    await fs.writeFile(tokensPath, JSON.stringify(tokens, null, 2), 'utf-8');

    res.json({ token, link: `/cotacao/${token}` });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao gerar link de cotação', error: error.message });
  }
});

// Fornecedor acessa os dados da requisição via token
app.get('/api/cotacao-externa/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const tokensPath = path.resolve(process.cwd(), 'data', 'tokens.json');
    const dataTokens = await fs.readFile(tokensPath, 'utf-8').catch(() => '[]');
    const tokens = JSON.parse(dataTokens);

    const tokenObj = tokens.find(t => t.token === token);
    if (!tokenObj) return res.status(404).json({ message: 'Link inválido ou não encontrado.' });
    if (tokenObj.status !== 'ativo') return res.status(403).json({ message: 'Este link já foi utilizado ou expirou.' });

    // Pega a requisição
    const reqPath = path.resolve(process.cwd(), 'data', 'requisicoes.json');
    const dataReq = await fs.readFile(reqPath, 'utf-8');
    const requisicoes = JSON.parse(dataReq);
    
    const requisicao = requisicoes.find(r => r.id === tokenObj.requisicaoId);
    if (!requisicao) return res.status(404).json({ message: 'Requisição não encontrada.' });

    // Pega o fornecedor (para exibir na tela)
    const fornPath = path.resolve(process.cwd(), 'data', 'vendedores.json'); // ou fornecedores.json
    const dataForn = await fs.readFile(fornPath, 'utf-8').catch(() => '[]');
    const fornecedores = JSON.parse(dataForn);
    const fornecedor = fornecedores.find(f => f.codigo_cliente_omie == tokenObj.fornecedorId) || { razao_social: 'Fornecedor' };

    // Retorna apenas os dados necessários para cotar (segurança)
    const dadosPublicos = {
      requisicaoId: requisicao.id,
      fornecedorNome: fornecedor.razao_social || fornecedor.nome_fantasia,
      fornecedorId: tokenObj.fornecedorId,
      itens: requisicao.itens.map(i => ({
        codigo: i.codigo,
        descricao: i.descricao,
        quantidade: i.quantidade
      }))
    };

    res.json(dadosPublicos);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao carregar dados da cotação', error: error.message });
  }
});

// Fornecedor envia os preços e finaliza a cotação
app.post('/api/cotacao-externa/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { cotacoes, descontoGeral } = req.body; // { 'codigoItem1': { valorUnitario: 10, previsaoDias: 5, marca: 'Tigre', ... }, ... }

    const tokensPath = path.resolve(process.cwd(), 'data', 'tokens.json');
    const dataTokens = await fs.readFile(tokensPath, 'utf-8').catch(() => '[]');
    let tokens = JSON.parse(dataTokens);

    const tokenIndex = tokens.findIndex(t => t.token === token);
    if (tokenIndex === -1) return res.status(404).json({ message: 'Link inválido.' });
    if (tokens[tokenIndex].status !== 'ativo') return res.status(403).json({ message: 'Este link já foi utilizado.' });

    const reqId = tokens[tokenIndex].requisicaoId;
    const fornId = tokens[tokenIndex].fornecedorId;

    // Atualiza a requisição
    const reqPath = path.resolve(process.cwd(), 'data', 'requisicoes.json');
    const dataReq = await fs.readFile(reqPath, 'utf-8');
    let requisicoes = JSON.parse(dataReq);
    
    const reqIndex = requisicoes.findIndex(r => r.id === reqId);
    if (reqIndex !== -1) {
      requisicoes[reqIndex].itens = requisicoes[reqIndex].itens.map(item => {
        const precoFornecedor = cotacoes[item.codigo];
        if (precoFornecedor) {
          // Cria a estrutura de cotações se não existir
          const listaCotacoes = item.cotacoes || [];
          
          // Verifica se este fornecedor já tem cotação (substitui se sim)
          const cotIndex = listaCotacoes.findIndex(c => c.fornecedorId == fornId);
          const novaCotacao = {
            id: Date.now().toString(),
            fornecedorId: fornId,
            valorUnitario: precoFornecedor.valorUnitario,
            previsaoDias: precoFornecedor.previsaoDias,
            marca: precoFornecedor.marca || '',
            tipoUnidade: precoFornecedor.tipoUnidade || 'Unidade',
            quantidadePacote: precoFornecedor.quantidadePacote || '',
            desconto: precoFornecedor.desconto || 0,
            descontoGeral: descontoGeral || 0,
            origem: 'portal',
            dataCotacao: new Date().toISOString()
          };

          if (cotIndex !== -1) {
            listaCotacoes[cotIndex] = novaCotacao;
          } else {
            listaCotacoes.push(novaCotacao);
          }

          return { ...item, cotacoes: listaCotacoes };
        }
        return item;
      });
      await fs.writeFile(reqPath, JSON.stringify(requisicoes, null, 2), 'utf-8');
    }

    // "Queima" o token
    tokens[tokenIndex].status = 'usado';
    tokens[tokenIndex].dataUso = new Date().toISOString();
    await fs.writeFile(tokensPath, JSON.stringify(tokens, null, 2), 'utf-8');

    res.json({ message: 'Cotação enviada com sucesso!' });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao salvar cotação', error: error.message });
  }
});

// --- ROTA DE FORNECEDORES / FUNCIONÁRIOS ---
app.get('/api/fornecedores', async (req, res) => {
  try {
    const filePath = path.resolve(process.cwd(), 'data', 'fornecedores.json');
    const data = await fs.readFile(filePath, 'utf-8');
    res.json(JSON.parse(data));
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.json([]);
    } else {
      res.status(500).json({ message: 'Erro ao ler fornecedores', error: error.message });
    }
  }
});

// --- ROTAS DE ORDEM DE SERVIÇO (O.S.) ---

app.get('/api/os', async (req, res) => {
  try {
    const filePath = path.resolve(process.cwd(), 'data', 'ordens_servico.json');
    const data = await fs.readFile(filePath, 'utf-8');
    const ordens = JSON.parse(data);
    res.json(ordens);
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.json([]);
    } else {
      res.status(500).json({ message: 'Erro ao ler ordens de serviço', error: error.message });
    }
  }
});

app.post('/api/os', async (req, res) => {
  try {
    const filePath = path.resolve(process.cwd(), 'data', 'ordens_servico.json');
    let ordens = [];
    
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      ordens = JSON.parse(data);
    } catch (e) {
      // Se não existir, usa array vazio
    }

    let finalCodigo = req.body.codigo;
    
    // Se não tiver código (ou for vazio), gera automaticamente o sequencial
    if (!finalCodigo) {
      const dataReq = req.body.data || new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"
      const [ano, mes, dia] = dataReq.split('-');
      const mesAno = `${mes}${ano.slice(-2)}`; // "0626"
      
      // Filtrar as OS do mesmo mes/ano
      const osDoMes = ordens.filter(o => o.codigo && o.codigo.endsWith(`-${mesAno}`));
      
      let proximoNumero = 1;
      if (osDoMes.length > 0) {
        // Pega o número antes do traço e encontra o maior
        const numeros = osDoMes.map(o => {
          const numStr = o.codigo.split('-')[0];
          return parseInt(numStr, 10) || 0;
        });
        proximoNumero = Math.max(...numeros) + 1;
      }
      
      // Formata como XX-MMYY (ex: 01-0626)
      finalCodigo = `${proximoNumero.toString().padStart(2, '0')}-${mesAno}`;
    }

    const novaOS = {
      id: Date.now().toString(),
      dataCriacao: new Date().toISOString(),
      ...req.body,
      codigo: finalCodigo
    };

    // Adiciona no início da lista para aparecer primeiro
    ordens.unshift(novaOS);
    await fs.writeFile(filePath, JSON.stringify(ordens, null, 2), 'utf-8');

    res.status(201).json({ 
      message: 'Ordem de Serviço salva com sucesso', 
      os: novaOS 
    });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao salvar Ordem de Serviço', error: error.message });
  }
});

app.put('/api/os/:codigo', async (req, res) => {
  try {
    const { codigo } = req.params;
    const updates = req.body;
    
    const filePath = path.resolve(process.cwd(), 'data', 'ordens_servico.json');
    const data = await fs.readFile(filePath, 'utf-8');
    let ordens = JSON.parse(data);
    
    const osIndex = ordens.findIndex(o => o.codigo === codigo);
    if (osIndex === -1) {
      return res.status(404).json({ message: 'Ordem de Serviço não encontrada' });
    }

    // Atualiza os dados da OS mantendo o que não foi alterado
    ordens[osIndex] = {
      ...ordens[osIndex],
      ...updates
    };
    
    await fs.writeFile(filePath, JSON.stringify(ordens, null, 2), 'utf-8');
    
    res.json({ 
      message: 'Ordem de Serviço atualizada com sucesso', 
      os: ordens[osIndex] 
    });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao atualizar Ordem de Serviço', error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`Rotas disponíveis:`);
  console.log(`- GET http://localhost:${PORT}/api/produtos`);
  console.log(`- GET http://localhost:${PORT}/api/fornecedores`);
  console.log(`- GET http://localhost:${PORT}/api/requisicoes`);
  console.log(`- POST http://localhost:${PORT}/api/requisicoes/:id/substituir-item`);
  console.log(`- POST http://localhost:${PORT}/api/requisicoes/:id/avancar-etapa`);
  console.log(`- POST http://localhost:${PORT}/api/requisicoes/:id/salvar-cotacoes`);
  console.log(`- GET/POST http://localhost:${PORT}/api/os`);
});
