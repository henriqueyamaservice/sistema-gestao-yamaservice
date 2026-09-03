import express from 'express';
import omieRemessaService from '../services/omieRemessaService.js';
import getDb from '../config/database.js';

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

// Mapa de Locais de Estoque Omie (mesmo usado nas requisições)
const OMIE_LOCAIS_ESTOQUE = {
  "01 - Almoxarifado": 687827873,
  "Almoxarifado": 687827873,
  "Local de Estoque Padrão": 685531866,
  "PADRAO - Local de Estoque Padrão": 685531866,
  "02 - Armazém de Matéria Prima": 688337027,
  "03 - Armazém de Serragem": 741105704,
  "04 - Armazém de Cama de Frango": 741105830,
  "05 - Armazém de Insumos para Construção Civil": 741105884,
  "06 - Armazém Fabrica de Ração": 741105962,
  "Posto de Combustivel": 1649011537
};

/**
 * POST /api/remessa/enviar
 * 
 * Recebe os dados de uma requisição finalizada e envia como Remessa para a Omie.
 * Body esperado:
 * {
 *   requisicaoId: "1781027320895",       // ID da requisição de origem
 *   codigoCliente: 12345678,             // nCodCli da Omie (obrigatório)
 *   localEstoque: "01 - Almoxarifado",   // Local de estoque (para log)
 *   observacao: "Baixa do Almoxarifado", // Obs opcional
 *   itens: [
 *     { codigo: "PRD11302", quantidade: 2 }
 *   ]
 * }
 */
router.post('/enviar', async (req, res) => {
  try {
    const { requisicaoId, codigoCliente, localEstoque, observacao, itens } = req.body;

    if (!codigoCliente || codigoCliente <= 0) {
      return res.status(400).json({ 
        message: 'Código do cliente Omie (nCodCli) é obrigatório para gerar a remessa.' 
      });
    }

    if (!itens || itens.length === 0) {
      return res.status(400).json({ message: 'Nenhum item informado para a remessa.' });
    }

    // Busca os dados completos dos produtos no banco
    let produtos = [];
    try {
      produtos = await getProdutosDb();
    } catch (e) {
      return res.status(500).json({ message: 'Erro ao ler base de produtos do banco.' });
    }

    // Monta o array de produtos com o codigo_produto (nCodProd) da Omie
    const produtosRemessa = [];
    const itensSemCodigo = [];

    for (const item of itens) {
      const produtoLocal = produtos.find(p => p.codigo === item.codigo);

      if (!produtoLocal || !produtoLocal.codigo_produto) {
        itensSemCodigo.push(item.codigo);
        continue;
      }

      produtosRemessa.push({
        codigoItemIntegracao: `${item.codigo}-${Date.now()}`,
        codigoProduto: produtoLocal.codigo_produto,
        quantidade: Number(item.quantidade),
        valorUnitario: item.valor_unitario || produtoLocal.valor_unitario || 0.01
      });
    }

    if (itensSemCodigo.length > 0) {
      console.warn(`[REMESSA] ⚠️ Produtos sem codigo_produto Omie (ignorados na remessa): ${itensSemCodigo.join(', ')}`);
    }

    if (produtosRemessa.length === 0) {
      return res.status(400).json({ 
        message: 'Nenhum produto possui codigo_produto da Omie. Remessa não pode ser gerada.',
        itensSemCodigo 
      });
    }

    // Chama o serviço que envia para a Omie
    const codigoIntegracao = `REQ-${requisicaoId || Date.now()}`;
    const resultado = await omieRemessaService.criarRemessa({
      codigoIntegracao,
      codigoCliente: Number(codigoCliente),
      dataPrevisao: new Date().toLocaleDateString('pt-BR'),
      observacao: observacao || `Baixa Almoxarifado - Requisição ${requisicaoId}`,
      produtos: produtosRemessa
    });

    if (resultado.erro) {
      return res.status(502).json({ 
        message: `Erro ao criar remessa na Omie: ${resultado.mensagem}`,
        faultcode: resultado.faultcode
      });
    }

    // Salva o resultado da remessa na requisição para rastreabilidade
    try {
      const db = await getDb();
      const row = await db.get(`SELECT * FROM requisicoes WHERE id = ?`, [requisicaoId]);
      if (row) {
        let dados = {};
        try { dados = JSON.parse(row.dados_json || '{}'); } catch (e) { /* ignore */ }
        dados.remessa_omie = {
          nCodRem: resultado.dados?.nCodRem || null,
          cCodIntRem: codigoIntegracao,
          dataEnvio: new Date().toISOString(),
          status: 'enviada'
        };
        const dadosJson = JSON.stringify(dados);
        if (db.driver === 'mysql') {
          await db.run(
            `UPDATE requisicoes SET dados_json = ?, atualizado_em = NOW() WHERE id = ?`,
            [dadosJson, requisicaoId]
          );
        } else {
          await db.run(
            `UPDATE requisicoes SET dados_json = ?, atualizado_em = CURRENT_TIMESTAMP WHERE id = ?`,
            [dadosJson, requisicaoId]
          );
        }
      }
    } catch (e) {
      console.error('[REMESSA] Erro ao salvar rastreabilidade:', e.message);
    }

    res.json({ 
      message: 'Remessa criada com sucesso na Omie!',
      remessa: resultado.dados,
      codigoIntegracao,
      itensSemCodigo: itensSemCodigo.length > 0 ? itensSemCodigo : undefined
    });

  } catch (error) {
    console.error('[REMESSA] Erro geral:', error);
    res.status(500).json({ message: 'Erro interno ao processar remessa.', error: error.message });
  }
});

/**
 * GET /api/remessa/status/:codigoIntegracao
 * 
 * Consulta o status de uma remessa já enviada.
 */
router.get('/status/:codigoIntegracao', async (req, res) => {
  try {
    const { codigoIntegracao } = req.params;

    const resultado = await omieRemessaService.statusRemessa(0, codigoIntegracao);

    if (resultado.erro) {
      return res.status(502).json({ 
        message: `Erro ao consultar status: ${resultado.mensagem}` 
      });
    }

    res.json({ status: resultado.dados });
  } catch (error) {
    res.status(500).json({ message: 'Erro interno.', error: error.message });
  }
});

/**
 * GET /api/remessa/consultar/:codigoIntegracao
 * 
 * Consulta os dados completos de uma remessa.
 */
router.get('/consultar/:codigoIntegracao', async (req, res) => {
  try {
    const { codigoIntegracao } = req.params;

    const resultado = await omieRemessaService.consultarRemessa(0, codigoIntegracao);

    if (resultado.erro) {
      return res.status(502).json({ 
        message: `Erro ao consultar remessa: ${resultado.mensagem}` 
      });
    }

    res.json({ remessa: resultado.dados });
  } catch (error) {
    res.status(500).json({ message: 'Erro interno.', error: error.message });
  }
});

export default router;
