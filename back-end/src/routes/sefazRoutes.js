import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import SefazService from '../services/sefaz.js';

const router = express.Router();

// Armazenamento em memória (mock) para simular um banco de dados de notas baixadas
let notasSincronizadas = [];

/**
 * GET /api/sefaz/sincronizar
 * Dispara o robô da SEFAZ para baixar as notas recentes
 */
router.get('/sincronizar', async (req, res) => {
  try {
    const notas = await SefazService.sincronizarNotasRecentes();
    
    // Adiciona apenas notas novas que não estejam no nosso "banco"
    let novas = 0;
    notas.forEach(nota => {
      if (!notasSincronizadas.find(n => n.chaveAcesso === nota.chaveAcesso)) {
        notasSincronizadas.push(nota);
        novas++;
      }
    });

    // MATCHING AUTOMÁTICO (Auto-pareamento)
    const reqPath = path.resolve(process.cwd(), 'data', 'requisicoes.json');
    const fornPath = path.resolve(process.cwd(), 'data', 'fornecedores.json');
    
    let requisicoes = [];
    let fornecedores = [];
    try {
      requisicoes = JSON.parse(await fs.readFile(reqPath, 'utf-8'));
      fornecedores = JSON.parse(await fs.readFile(fornPath, 'utf-8'));
    } catch(e) {}

    let reqsModificadas = false;

    // Função utilitária para limpar CNPJ/CPF (remover pontuações)
    const cleanDoc = (doc) => doc ? String(doc).replace(/[^\d]/g, '') : '';

    // Passar por todas as notas sincronizadas
    notasSincronizadas.forEach(nota => {
      if (nota.vinculadaAoPedido) return; // já foi vinculada antes

      const cnpjNota = cleanDoc(nota.emitente.cnpj_cpf);

      // Procurar em requisições que estão 'aguardando_nfe'
      requisicoes.forEach(req => {
        if (req.status_compras === 'aguardando_nfe' && req.pedidos_omie) {
          req.pedidos_omie.forEach(pedido => {
            if (pedido.nota_fiscal_vinculada) return; // já tem nota

            // Achar o fornecedor do pedido
            const forn = fornecedores.find(f => String(f.codigo_cliente_omie) === String(pedido.fornecedorId));
            if (forn) {
              const cnpjFornecedor = cleanDoc(forn.cnpj_cpf);
              // SE DER MATCH NO CNPJ
              if (cnpjFornecedor === cnpjNota) {
                // VINCULAR!
                pedido.nota_fiscal_vinculada = nota;
                nota.vinculadaAoPedido = pedido.numeroPedido;
                reqsModificadas = true;
                
                // Opcional: Se todos os pedidos da req tiverem nota, avança para concluido
                const todasTemNota = req.pedidos_omie.every(p => p.nota_fiscal_vinculada);
                if (todasTemNota) {
                  req.status_compras = 'concluido';
                  req.historico_status.push({ status: 'concluido', data: new Date().toISOString() });
                }
              }
            }
          });
        }
      });
    });

    if (reqsModificadas) {
      await fs.writeFile(reqPath, JSON.stringify(requisicoes, null, 2), 'utf-8');
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
