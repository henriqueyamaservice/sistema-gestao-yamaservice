import express from 'express';
import fs from 'fs/promises';
import path from 'path';

const router = express.Router();

// Rota simulada para listar Requisições
router.get('/', async (req, res) => {
  try {
    const filePath = path.resolve(process.cwd(), 'data', 'requisicoes.json');
    const data = await fs.readFile(filePath, 'utf-8');
    const requisicoes = JSON.parse(data);
    res.json(requisicoes);
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.json([]);
    } else {
      res.status(500).json({ message: 'Erro interno ao ler requisições', error: error.message });
    }
  }
});

// Rota simulada para salvar uma Nova Requisição
router.post('/', async (req, res) => {
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

    if (novaRequisicao.itens && Array.isArray(novaRequisicao.itens)) {
      novaRequisicao.itens = novaRequisicao.itens.map(item => ({
        ...item,
        status: statusInicial === 'aguardando_diretoria' ? 'aguardando_diretoria' : (item.status || 'aguardando_separacao')
      }));
    }

    requisicoes.push(novaRequisicao);
    await fs.writeFile(filePath, JSON.stringify(requisicoes, null, 2), 'utf-8');

    res.status(201).json({ 
      message: 'Requisição salva com sucesso', 
      requisicao: novaRequisicao 
    });
  } catch (error) {
    res.status(500).json({ message: 'Erro interno ao salvar requisição', error: error.message });
  }
});

// Rota para o setor de Compras resolver uma divergência/recebimento parcial
router.post('/:id/resolver-divergencia', async (req, res) => {
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
router.post('/:id/substituir-item', async (req, res) => {
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
router.post('/:id/avancar-etapa', async (req, res) => {
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

// Rota para gerar pedidos de compra na Omie (via API) e avançar etapa
router.post('/:id/gerar-pedidos', async (req, res) => {
  try {
    const requisicaoId = req.params.id;
    const { vencedores } = req.body;
    
    if (!vencedores || Object.keys(vencedores).length === 0) {
      return res.status(400).json({ message: 'Nenhum vencedor informado' });
    }

    const reqPath = path.resolve(process.cwd(), 'data', 'requisicoes.json');
    const dataReq = await fs.readFile(reqPath, 'utf-8');
    let requisicoes = JSON.parse(dataReq);
    
    const reqIndex = requisicoes.findIndex(r => r.id === requisicaoId);
    if (reqIndex === -1) return res.status(404).json({ message: 'Requisição não encontrada' });
    
    const requisicao = requisicoes[reqIndex];

    const prodPath = path.resolve(process.cwd(), 'data', 'produtos.json');
    const dataProd = await fs.readFile(prodPath, 'utf-8');
    const produtos = JSON.parse(dataProd);

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
      
      const mockNumeroPedido = `PED-${Math.floor(Math.random() * 100000)}`;
      const valorTotal = detalhes.reduce((acc, i) => acc + (i.quantidade * i.valor_unitario), 0);
      
      pedidosGerados.push({ 
        fornecedorId, 
        numeroPedido: mockNumeroPedido,
        itens: detalhes,
        valorTotal
      });
    }

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
router.post('/:id/autorizar', async (req, res) => {
  try {
    const requisicaoId = req.params.id;
    const { acao, motivo } = req.body; 

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
      requisicoes[reqIndex].status = 'pendente';
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

// Mapa de Locais de Estoque Omie
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

// Rota para o Almoxarifado finalizar a entrega (Separação Concluída)
router.post('/:id/finalizar', async (req, res) => {
  try {
    const requisicaoId = req.params.id;
    const { vendedor, localEstoque, itensEntregues } = req.body; 

    const filePath = path.resolve(process.cwd(), 'data', 'requisicoes.json');
    const produtosPath = path.resolve(process.cwd(), 'data', 'produtos.json');
    
    let requisicoes = [];
    let produtos = [];
    
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      requisicoes = JSON.parse(data);
      
      const pData = await fs.readFile(produtosPath, 'utf-8');
      produtos = JSON.parse(pData);
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
        const entregue = itensEntregues && itensEntregues[i.codigo] !== undefined 
            ? Number(itensEntregues[i.codigo]) 
            : pedida;

        if (entregue < pedida) {
          isParcial = true;
        }

        // --- BAIXA DE ESTOQUE LOCAL E OMIE ---
        if (entregue > 0) {
          const prodIdx = produtos.findIndex(p => p.codigo === i.codigo);
          if (prodIdx !== -1) {
            // 1. Baixa no estoque local
            produtos[prodIdx].quantidade_estoque = (produtos[prodIdx].quantidade_estoque || 0) - entregue;
            
            // 2. Integração com Omie para dar a baixa
            const appKey = process.env.OMIE_APP_KEY;
            const appSecret = process.env.OMIE_APP_SECRET;

            const idLocalEstoque = OMIE_LOCAIS_ESTOQUE[localEstoque] || OMIE_LOCAIS_ESTOQUE[requisicoes[reqIndex].localEstoque] || 687827873; // Default: Almoxarifado

            if (appKey && appSecret && produtos[prodIdx].codigo_produto) {
              const destinatario = requisicoes[reqIndex].vendedor || 'Não informado';
              const payloadOmie = {
                call: "IncluirAjusteEstoque",
                app_key: appKey,
                app_secret: appSecret,
                param: [{
                  codigo_local_estoque: idLocalEstoque,
                  id_prod: produtos[prodIdx].codigo_produto,
                  data: new Date().toLocaleDateString('pt-BR'),
                  quan: entregue,
                  obs: `Baixa Almox. Req ${requisicoes[reqIndex].id} | Destinatário: ${destinatario}`,
                  origem: "AJU",
                  tipo: "SAI",
                  motivo: "INV"
                }]
              };

              console.log(`[OMIE] Enviando tentativa de baixa para ${i.codigo}...`);
              
              // Faz a requisição em background para não travar a resposta pro usuário
              fetch('https://app.omie.com.br/api/v1/estoque/ajuste/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payloadOmie)
              })
              .then(res => res.json())
              .then(data => console.log(`[OMIE RESPOSTA - BAIXA ${i.codigo}]:`, data))
              .catch(err => console.error(`[OMIE ERRO - BAIXA ${i.codigo}]:`, err.message));
            }
          }
        }

        return { ...i, status: 'entregue', quantidade_entregue: entregue, devolvido: 0 };
      });
    }

    requisicoes[reqIndex].entrega_parcial = isParcial;

    // Salva atualizações em ambos arquivos JSON
    await fs.writeFile(filePath, JSON.stringify(requisicoes, null, 2), 'utf-8');
    await fs.writeFile(produtosPath, JSON.stringify(produtos, null, 2), 'utf-8');
    res.json({ message: 'Requisição finalizada com sucesso.', requisicao: requisicoes[reqIndex] });

  } catch (error) {
    res.status(500).json({ message: 'Erro ao processar finalização', error: error.message });
  }
});

// Rota para o Almoxarifado registrar devolução de peça não utilizada
router.post('/:id/devolver', async (req, res) => {
  try {
    const requisicaoId = req.params.id;
    const { codigo_produto, quantidade_devolvida } = req.body; 

    const filePath = path.resolve(process.cwd(), 'data', 'requisicoes.json');
    const produtosPath = path.resolve(process.cwd(), 'data', 'produtos.json');
    let requisicoes = [];
    let produtos = [];
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      requisicoes = JSON.parse(data);
      const pData = await fs.readFile(produtosPath, 'utf-8');
      produtos = JSON.parse(pData);
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

    // --- ESTORNO DE ESTOQUE LOCAL E OMIE ---
    const devolvido = Number(quantidade_devolvida);
    if (devolvido > 0) {
      const prodIdx = produtos.findIndex(p => p.codigo === codigo_produto);
      if (prodIdx !== -1) {
        // 1. Estorno no estoque local (aumenta a quantidade)
        produtos[prodIdx].quantidade_estoque = (produtos[prodIdx].quantidade_estoque || 0) + devolvido;
        
        // 2. Integração com Omie para dar a entrada (devolução)
        const appKey = process.env.OMIE_APP_KEY;
        const appSecret = process.env.OMIE_APP_SECRET;

        const idLocalEstoque = OMIE_LOCAIS_ESTOQUE[requisicoes[reqIndex].localEstoque] || 687827873; // Default: Almoxarifado

        if (appKey && appSecret && produtos[prodIdx].codigo_produto) {
          const valorUnitario = produtos[prodIdx].valor_unitario || 0.01;
          const valorMovimento = devolvido * valorUnitario;
          const destinatario = requisicoes[reqIndex].vendedor || 'Não informado';

          const payloadOmie = {
            call: "IncluirAjusteEstoque",
            app_key: appKey,
            app_secret: appSecret,
            param: [{
              codigo_local_estoque: idLocalEstoque,
              id_prod: produtos[prodIdx].codigo_produto,
              data: new Date().toLocaleDateString('pt-BR'),
              quan: devolvido,
              valor: valorMovimento > 0 ? valorMovimento : 0.01,
              obs: `Devolução Almox. Req ${requisicoes[reqIndex].id} | Destinatário: ${destinatario}`,
              origem: "AJU",
              tipo: "ENT", // Entrada de estoque
              motivo: "INV"
            }]
          };

          console.log(`[OMIE] Enviando tentativa de entrada (devolução) para ${codigo_produto}...`);
          
          fetch('https://app.omie.com.br/api/v1/estoque/ajuste/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payloadOmie)
          })
          .then(res => res.json())
          .then(data => console.log(`[OMIE RESPOSTA - DEVOLUÇÃO ${codigo_produto}]:`, data))
          .catch(err => console.error(`[OMIE ERRO - DEVOLUÇÃO ${codigo_produto}]:`, err.message));
        }
      }
    }

    await fs.writeFile(filePath, JSON.stringify(requisicoes, null, 2), 'utf-8');
    await fs.writeFile(produtosPath, JSON.stringify(produtos, null, 2), 'utf-8');
    res.json({ message: 'Devolução registrada com sucesso!', requisicao: requisicoes[reqIndex] });

  } catch (error) {
    res.status(500).json({ message: 'Erro ao registrar devolução', error: error.message });
  }
});

// Rota para salvar cotações inseridas na aba de Concorrência
router.post('/:id/salvar-cotacoes', async (req, res) => {
  try {
    const requisicaoId = req.params.id;
    const { cotacoes } = req.body;
    
    const filePath = path.resolve(process.cwd(), 'data', 'requisicoes.json');
    const data = await fs.readFile(filePath, 'utf-8');
    let requisicoes = JSON.parse(data);
    
    const reqIndex = requisicoes.findIndex(r => r.id === requisicaoId);
    if (reqIndex === -1) return res.status(404).json({ message: 'Requisição não encontrada' });
    
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

export default router;
