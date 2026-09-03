import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import omieProdutosService from '../services/omieProdutosService.js';
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
    const produtos = await getProdutosDb();

    let requisicoes = [];
    try {
      const reqData = await obterCadastro('requisicoes', 'requisicoes.json');
      if (Array.isArray(reqData)) {
        requisicoes = reqData;
      }
    } catch (e) {
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
    res.status(500).json({ message: 'Erro interno ao ler os produtos', error: error.message });
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

    // Ler fornecedores para sortear 3
    let fornecedores = await obterCadastro('fornecedores', 'fornecedores.json');
    if (!Array.isArray(fornecedores)) fornecedores = [];

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

// Cache global simples para não ficar puxando os locais toda hora
let locaisCache = null;
let locaisCacheTime = 0;

async function getOmieStock(codigo, id_prod) {
  const OMIE_APP_KEY = process.env.OMIE_APP_KEY;
  const OMIE_APP_SECRET = process.env.OMIE_APP_SECRET;
  
  if (!OMIE_APP_KEY || !OMIE_APP_SECRET) throw new Error("Chaves da Omie ausentes");

  // Pega os locais de estoque usando cache (válido por 1 hora)
  if (!locaisCache || (Date.now() - locaisCacheTime > 3600000)) {
    const locaisUrl = 'https://app.omie.com.br/api/v1/estoque/local/';
    const locaisRes = await fetch(locaisUrl, {
      method: 'POST',
      headers: { 'Content-type': 'application/json' },
      body: JSON.stringify({
        call: "ListarLocaisEstoque",
        app_key: OMIE_APP_KEY,
        app_secret: OMIE_APP_SECRET,
        param: [{ nPagina: 1, nRegPorPagina: 50 }]
      })
    });
    
    const locaisData = await locaisRes.json();
    if (!locaisData.locaisEncontrados) throw new Error("Não foi possível listar os locais de estoque da Omie.");
    locaisCache = locaisData.locaisEncontrados;
    locaisCacheTime = Date.now();
  }
  
  let saldoTotal = 0;
  const consultaUrl = 'https://app.omie.com.br/api/v1/estoque/consulta/';
  
  // Para cada local, consulta o saldo em blocos (concorrência controlada de 4 em 4) para ser muito mais rápido
  const chunkSize = 4;
  for (let i = 0; i < locaisCache.length; i += chunkSize) {
    const chunk = locaisCache.slice(i, i + chunkSize);
    
    const promises = chunk.map(local => 
      fetch(consultaUrl, {
        method: 'POST',
        headers: { 'Content-type': 'application/json' },
        body: JSON.stringify({
          call: "PosicaoEstoque",
          app_key: OMIE_APP_KEY,
          app_secret: OMIE_APP_SECRET,
          param: [{
            id_prod: id_prod,
            codigo_local_estoque: local.codigo_local_estoque,
            data: ""
          }]
        })
      }).then(r => r.json()).catch(err => {
        console.warn(`Aviso: Erro no local ${local.codigo_local_estoque}:`, err.message);
        return {};
      })
    );
    
    const results = await Promise.all(promises);
    for (const data of results) {
      if (data.saldo) saldoTotal += data.saldo;
    }
    
    // Pequeno delay entre blocos de 4 para não ofender o Rate Limit da Omie
    if (i + chunkSize < locaisCache.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  return saldoTotal;
}

// ROTA PARA SINCRONIZAR SALDO DE UM ÚNICO PRODUTO
router.get('/:codigo/sync-estoque', async (req, res) => {
  try {
    const { codigo } = req.params;
    
    let produtos = await getProdutosDb();
    
    const prodIndex = produtos.findIndex(p => p.codigo === codigo);
    if (prodIndex === -1) {
      return res.status(404).json({ message: 'Produto não encontrado.' });
    }
    
    const produto = produtos[prodIndex];
    const saldoTotal = await getOmieStock(produto.codigo, produto.codigo_produto);
    
    produtos[prodIndex].quantidade_estoque = saldoTotal;
    
    const db = await getDb();
    if (db.driver === 'mysql') {
      await db.run(
        `UPDATE produtos_omie SET quantidade_estoque = ?, dados_json = ?, atualizado_em = NOW() WHERE codigo = ?`,
        [saldoTotal, JSON.stringify(produtos[prodIndex]), codigo]
      );
    } else {
      await db.run(
        `UPDATE produtos_omie SET quantidade_estoque = ?, dados_json = ?, atualizado_em = CURRENT_TIMESTAMP WHERE codigo = ?`,
        [saldoTotal, JSON.stringify(produtos[prodIndex]), codigo]
      );
    }
    
    return res.json({ message: 'Saldo atualizado da Omie com sucesso!', saldo: saldoTotal, produto: produtos[prodIndex] });
    
  } catch (error) {
    console.error('Erro ao sincronizar estoque Omie:', error);
    res.status(500).json({ message: 'Erro ao comunicar com a Omie', error: error.message });
  }
});

// ROTA PARA SINCRONIZAR TODOS (BULK) - Rota demorada, ideal chamar via Background ou UI com Timeout alto
router.post('/sync-todos-estoque', async (req, res) => {
  try {
    const { limit = 50 } = req.body; // Puxar lote de 50 produtos para não travar muito
    
    let produtos = await getProdutosDb();
    
    let processados = 0;
    for (let i = 0; i < Math.min(limit, produtos.length); i++) {
      if (!produtos[i].codigo_produto) continue; // Pula se não tiver ID da Omie
      
      try {
        const saldo = await getOmieStock(produtos[i].codigo, produtos[i].codigo_produto);
        produtos[i].quantidade_estoque = saldo;
        processados++;
      } catch (err) {
        console.error(`Erro ao syncar ${produtos[i].codigo}:`, err.message);
      }
    }
    
    const db = await getDb();
    for (let i = 0; i < Math.min(limit, produtos.length); i++) {
      if (!produtos[i].codigo_produto) continue;
      if (db.driver === 'mysql') {
        await db.run(
          `UPDATE produtos_omie SET quantidade_estoque = ?, dados_json = ?, atualizado_em = NOW() WHERE codigo = ?`,
          [produtos[i].quantidade_estoque, JSON.stringify(produtos[i]), produtos[i].codigo]
        );
      } else {
        await db.run(
          `UPDATE produtos_omie SET quantidade_estoque = ?, dados_json = ?, atualizado_em = CURRENT_TIMESTAMP WHERE codigo = ?`,
          [produtos[i].quantidade_estoque, JSON.stringify(produtos[i]), produtos[i].codigo]
        );
      }
    }
    
    return res.json({ message: `Sincronização em lote concluída. ${processados} produtos atualizados.` });
  } catch (error) {
    console.error('Erro na sincronização em lote:', error);
    res.status(500).json({ message: 'Erro na sincronização em lote', error: error.message });
  }
});

export default router;
