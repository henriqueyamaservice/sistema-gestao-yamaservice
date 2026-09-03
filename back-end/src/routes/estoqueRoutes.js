import express from 'express';
import { getJsonData, saveJsonData } from '../services/jsonDbService.js';
import getDb from '../config/database.js';

const router = express.Router();

// Rota para Mapeamento Fiscal (Entrada de Estoque -> Salvar Mapeamento)
router.post('/receber-nota/:id', async (req, res) => {
  try {
    const reqId = req.params.id;
    const { mapeamentoItens } = req.body;

    const db = await getDb();
    const row = await db.get(`SELECT * FROM requisicoes WHERE id = ?`, [reqId]);
    
    if (!row) return res.status(404).json({ message: 'Not found' });
    
    let requisicao = {};
    try { requisicao = JSON.parse(row.dados_json || '{}'); } catch(e){}

    requisicao.mapeamento_nfe = mapeamentoItens;
    requisicao.mapeamento_concluido = true;

    const nota = requisicao.pedidos_omie?.find(p => p.nota_fiscal_vinculada)?.nota_fiscal_vinculada;
    if (!nota) return res.status(400).json({ message: 'Sem NFe vinculada' });

    // Cria a Ordem de Recebimento Físico para o Almoxarifado
    let pendentes = await getJsonData('pedidos_pendentes') || [];

    // Remove se já existir um recebimento pendente para essa requisição
    pendentes = pendentes.filter(p => p.requisicaoOrigemId !== reqId);

    const itensParaReceber = [];
    for (const item of nota.itens) {
      const mapping = mapeamentoItens[item.codigo];
      if (mapping && mapping !== 'ignorar') {
        let finalCode = mapping;
        let finalDesc = item.descricao;

        if (mapping.startsWith('NOVO:')) {
          finalCode = 'NEW-' + Date.now().toString().substring(8) + Math.floor(Math.random() * 100);
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
      await saveJsonData('pedidos_pendentes', pendentes);
    }

    if (db.driver === 'mysql') {
      await db.run(`UPDATE requisicoes SET dados_json = ?, atualizado_em = NOW() WHERE id = ?`, [JSON.stringify(requisicao), reqId]);
    } else {
      await db.run(`UPDATE requisicoes SET dados_json = ?, atualizado_em = CURRENT_TIMESTAMP WHERE id = ?`, [JSON.stringify(requisicao), reqId]);
    }

    res.json({ message: 'Mapeamento salvo. Aguardando Almoxarifado.' });

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
