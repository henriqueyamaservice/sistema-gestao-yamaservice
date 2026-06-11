import express from 'express';
import fs from 'fs/promises';
import path from 'path';

const router = express.Router();

// Gera um link/token único para um fornecedor fazer a cotação
router.post('/cotacao-link', async (req, res) => {
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
router.get('/cotacao-externa/:token', async (req, res) => {
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
    const fornPath = path.resolve(process.cwd(), 'data', 'vendedores.json');
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
router.post('/cotacao-externa/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { cotacoes, descontoGeral } = req.body; 

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
          const listaCotacoes = item.cotacoes || [];
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

export default router;
