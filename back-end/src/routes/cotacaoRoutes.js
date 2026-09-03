import express from 'express';
import { getJsonData, saveJsonData } from '../services/jsonDbService.js';
import getDb from '../config/database.js';

const router = express.Router();

// Gera um link/token único para um fornecedor fazer a cotação
router.post('/cotacao-link', async (req, res) => {
  try {
    const { requisicaoId, fornecedorId } = req.body;
    if (!requisicaoId || !fornecedorId) return res.status(400).json({ message: 'requisicaoId e fornecedorId são obrigatórios' });

    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    
    let tokens = await getJsonData('cotacao_tokens') || [];

    const novoToken = {
      token,
      requisicaoId,
      fornecedorId,
      status: 'ativo',
      dataCriacao: new Date().toISOString()
    };

    tokens.push(novoToken);
    await saveJsonData('cotacao_tokens', tokens);

    res.json({ token, link: `/cotacao/${token}` });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao gerar link de cotação', error: error.message });
  }
});

// Fornecedor acessa os dados da requisição via token
router.get('/cotacao-externa/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const tokens = await getJsonData('cotacao_tokens') || [];

    const tokenObj = tokens.find(t => t.token === token);
    if (!tokenObj) return res.status(404).json({ message: 'Link inválido ou não encontrado.' });
    if (tokenObj.status !== 'ativo') return res.status(403).json({ message: 'Este link já foi utilizado ou expirou.' });

    const requisicoes = await getJsonData('requisicoes') || [];
    const requisicao = requisicoes.find(r => r.id === tokenObj.requisicaoId);
    if (!requisicao) return res.status(404).json({ message: 'Requisição não encontrada.' });

    // Busca fornecedor na omie_collections
    let fornecedor = { razao_social: 'Fornecedor' };
    try {
      const db = await getDb();
      const rows = await db.all(`SELECT * FROM fornecedores_omie`);
      const f = rows.find(f => f.codigo == tokenObj.fornecedorId);
      if (f) {
        fornecedor = { ...f, codigo_cliente_omie: f.codigo };
      }
    } catch (e) { console.error('Erro ao buscar fornecedor para cotação', e); }

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

    let tokens = await getJsonData('cotacao_tokens') || [];

    const tokenIndex = tokens.findIndex(t => t.token === token);
    if (tokenIndex === -1) return res.status(404).json({ message: 'Link inválido.' });
    if (tokens[tokenIndex].status !== 'ativo') return res.status(403).json({ message: 'Este link já foi utilizado.' });

    const reqId = tokens[tokenIndex].requisicaoId;
    const fornId = tokens[tokenIndex].fornecedorId;

    let requisicoes = await getJsonData('requisicoes') || [];
    
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
      await saveJsonData('requisicoes', requisicoes);
    }

    // "Queima" o token
    tokens[tokenIndex].status = 'usado';
    tokens[tokenIndex].dataUso = new Date().toISOString();
    await saveJsonData('cotacao_tokens', tokens);

    res.json({ message: 'Cotação enviada com sucesso!' });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao salvar cotação', error: error.message });
  }
});

export default router;
