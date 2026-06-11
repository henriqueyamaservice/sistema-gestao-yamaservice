import express from 'express';
import fs from 'fs/promises';
import path from 'path';

const router = express.Router();

// Rota simulada para Mapeamento Fiscal (Entrada de Estoque -> Salvar Mapeamento)
router.post('/receber-nota/:id', async (req, res) => {
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

    // OBS: O código antigo tinha uma segunda rota idêntica que mudava status_compras = 'estoque_faturado'.
    // Mantivemos a mais robusta aqui. Se precisar da outra lógica, ela deve ser renomeada.
    await fs.writeFile(reqsPath, JSON.stringify(requisicoes, null, 2));
    res.json({ message: 'Mapeamento salvo. Aguardando Almoxarifado.' });

  } catch(e) {
    res.status(500).json({error: e.message});
  }
});

export default router;
