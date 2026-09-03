import express from 'express';
import { getJsonData, saveJsonData } from '../services/jsonDbService.js';
import getDb from '../config/database.js';
import SefazService from '../services/sefaz.js';

const router = express.Router();

// Armazenamento em memória para notas sincronizadas nesta sessão
let notasSincronizadas = [];

/**
 * GET /api/sefaz/sincronizar
 * Dispara o robô da SEFAZ para baixar as notas recentes
 */
router.get('/sincronizar', async (req, res) => {
  try {
    const notas = await SefazService.sincronizarNotasRecentes();
    
    let novas = 0;
    notas.forEach(nota => {
      if (!notasSincronizadas.find(n => n.chaveAcesso === nota.chaveAcesso)) {
        notasSincronizadas.push(nota);
        novas++;
      }
    });

    // MATCHING AUTOMÁTICO
    let requisicoes = await getJsonData('requisicoes') || [];
    let fornecedores = [];

    try {
      const db = await getDb();
      const rows = await db.all(`SELECT * FROM fornecedores_omie`);
      fornecedores = rows.map(r => {
        let d = {};
        try { d = JSON.parse(r.dados_json || '{}'); } catch(e){}
        return { ...d, codigo_cliente_omie: r.codigo, razao_social: r.razao_social, cnpj_cpf: r.cnpj_cpf };
      });
    } catch (e) {}

    let reqsModificadas = false;
    const cleanDoc = (doc) => doc ? String(doc).replace(/[^\d]/g, '') : '';

    notasSincronizadas.forEach(nota => {
      if (nota.vinculadaAoPedido) return;

      const cnpjNota = cleanDoc(nota.emitente.cnpj_cpf);

      requisicoes.forEach(req => {
        if (req.status_compras === 'aguardando_nfe' && req.pedidos_omie) {
          req.pedidos_omie.forEach(pedido => {
            if (pedido.nota_fiscal_vinculada) return;

            const forn = fornecedores.find(f => String(f.codigo_cliente_omie) === String(pedido.fornecedorId));
            if (forn) {
              const cnpjFornecedor = cleanDoc(forn.cnpj_cpf);
              if (cnpjFornecedor === cnpjNota) {
                pedido.nota_fiscal_vinculada = nota;
                nota.vinculadaAoPedido = pedido.numeroPedido;
                reqsModificadas = true;
                
                const todasTemNota = req.pedidos_omie.every(p => p.nota_fiscal_vinculada);
                if (todasTemNota) {
                  req.status_compras = 'concluido';
                  req.historico_status = req.historico_status || [];
                  req.historico_status.push({ status: 'concluido', data: new Date().toISOString() });
                }
              }
            }
          });
        }
      });
    });

    if (reqsModificadas) {
      await saveJsonData('requisicoes', requisicoes);
    }

    res.json({
      message: `Sincronização concluída. ${novas} notas novas baixadas e pareamento executado.`,
      notas: notasSincronizadas
    });
  } catch (error) {
    console.error('Erro na sincronização SEFAZ:', error);
    res.status(500).json({ message: 'Erro ao sincronizar com a SEFAZ', error: error.message });
  }
});

/**
 * GET /api/sefaz/notas
 * Lista as notas já baixadas pelo sistema
 */
router.get('/notas', (req, res) => {
  res.json(notasSincronizadas);
});

export default router;
