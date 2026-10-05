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

    let nota = requisicao.pedidos_omie?.find(p => p.nota_fiscal_vinculada)?.nota_fiscal_vinculada || requisicao.nota_fiscal_vinculada;
    if (!nota) {
      const pedido = requisicao.pedidos_omie?.[0];
      const fornId = pedido?.fornecedorId || requisicao.itens?.[0]?.cotacoes?.[0]?.fornecedorId;
      const chaveBruta = requisicao.chaveNfe || pedido?.chaveNfe || '';
      const chaveLimpa = chaveBruta && !chaveBruta.startsWith('352609') ? chaveBruta : '';
      nota = {
        chaveAcesso: chaveLimpa,
        numeroNF: requisicao.nota_fiscal || pedido?.numeroNF || '',
        emitente: {
          nome: requisicao.solicitante || 'Fornecedor',
          cnpj_cpf: 'Não informado'
        },
        dataEmissao: new Date().toISOString(),
        valorTotal: pedido?.valorTotal || 0,
        itens: (pedido?.itens || requisicao.itens || []).map(i => ({
          codigo: i.codigo || i.codigo_item || 'PRD001',
          descricao: i.descricao || 'Item do Pedido',
          quantidade: Number(i.quantidade) || 1,
          valorUnitario: Number(i.valor_unitario) || 0,
          valorTotal: (Number(i.quantidade) || 1) * (Number(i.valor_unitario) || 0)
        }))
      };
      if (pedido) pedido.nota_fiscal_vinculada = nota;
      requisicao.nota_fiscal_vinculada = nota;
    }

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
          quantidadeEsperada: Number(item.quantidade) || 1,
          quantidadeRecebida: 0,
          valorUnitario: Number(item.valorUnitario || item.valor_unitario || 0)
        });
      }
    }

    if (itensParaReceber.length > 0) {
      pendentes.push({
        id: `REC-${reqId}`,
        requisicaoOrigemId: reqId,
        fornecedor: nota.emitente?.nome || requisicao.fornecedor || requisicao.solicitante,
        dataEmissao: new Date().toISOString(),
        status: 'Aguardando Recebimento',
        numeroNfe: nota.numero || nota.numeroNF || requisicao.nota_fiscal || '',
        numeroNF: nota.numero || nota.numeroNF || requisicao.nota_fiscal || '',
        chaveNfe: nota.chaveAcesso || requisicao.nota_fiscal_vinculada?.chaveAcesso || requisicao.chaveNfe || '',
        valorTotal: Number(nota.valorTotal || requisicao.valor || 0),
        itens: itensParaReceber
      });
      await saveJsonData('pedidos_pendentes', pendentes);
    }

    if (db.driver === 'mysql') {
      await db.run(`UPDATE requisicoes SET dados_json = ?, atualizado_em = NOW() WHERE id = ?`, [JSON.stringify(requisicao), reqId]);
    } else {
      await db.run(`UPDATE requisicoes SET dados_json = ?, atualizado_em = CURRENT_TIMESTAMP WHERE id = ?`, [JSON.stringify(requisicao), reqId]);
    }

    try {
      const io = req.app.get('io');
      if (io) {
        io.emit('novo_pedido_recebimento', {
          id: `REC-${reqId}`,
          fornecedor: nota?.emitente?.nome || requisicao.solicitante,
          mensagem: 'Nova mercadoria despachada para recebimento físico no Almoxarifado!'
        });
        io.emit('pedidos_pendentes_atualizados');
      }
    } catch (errIo) {
      console.warn('Erro ao emitir socket de recebimento:', errIo.message);
    }

    res.json({ message: 'Mapeamento salvo. Aguardando Almoxarifado.' });

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
