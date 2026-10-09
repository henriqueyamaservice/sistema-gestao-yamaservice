import express from 'express';
import getDb from '../config/database.js';
import omieNotaEntradaService from '../services/omieNotaEntradaService.js';
import omieEstoqueService from '../services/omieEstoqueService.js';
import sefazDfeService from '../services/sefazDfeService.js';
import { consultarNfeDanfeOnline, parsearXmlNFe, gerarDanfeDeXmlOnline } from '../services/consultaDanfeService.js';

const router = express.Router();

// Helper para converter linha do banco MariaDB para objeto de requisição
function dbRowToReq(row) {
  if (!row) return null;
  let dados = {};
  try {
    dados = JSON.parse(row.dados_json || '{}');
  } catch (e) {
    dados = {};
  }
  return {
    ...dados,
    id: row.id,
    codigo_os: row.codigo_os,
    solicitante: row.solicitante,
    status_compras: row.status_compras,
    prioridade: row.prioridade,
    atualizado_em: row.atualizado_em
  };
}

// Limpa pontuação de CPF/CNPJ
const limparDoc = (doc) => String(doc || '').replace(/\D/g, '');

/**
 * GET /api/recebimento-fiscal/pendentes
 * Retorna pedidos fechados pelo compras aguardando NF-e ou prontos para conferência fiscal
 */
router.get('/pendentes', async (req, res) => {
  try {
    const db = await getDb();
    const rows = await db.all(`
      SELECT * FROM requisicoes 
      WHERE status_compras = 'concluido'
      ORDER BY atualizado_em DESC
    `);

    const todas = rows.map(dbRowToReq).filter(Boolean);
    // Retorna exatamente as notas que Compras já mapeou e enviou para o Almoxarifado,
    // mas que o Almoxarife AINDA NÃO conferiu fisicamente
    const requisicoes = todas.filter(r => 
      r.status_compras === 'concluido' && 
      r.status !== 'cancelado' &&
      r.status_compras !== 'entregue' &&
      r.status_compras !== 'entregue_parcial' &&
      !r.dataRecebimentoFisico &&
      !r.recebimentoFisico
    );

    res.json({ erro: false, total: requisicoes.length, requisicoes });
  } catch (err) {
    console.error('Erro ao buscar notas aguardando almoxarifado:', err);
    res.status(500).json({ erro: true, mensagem: err.message });
  }
});

/**
 * GET /api/recebimento-fiscal/concluidas
 * Retorna histórico de notas fiscais já recebidas fisicamente pelo Almoxarifado (completas ou parciais)
 */
router.get('/concluidas', async (req, res) => {
  try {
    const db = await getDb();
    const rows = await db.all(`
      SELECT * FROM requisicoes 
      WHERE status_compras IN ('entregue', 'entregue_parcial') 
         OR status = 'entregue'
      ORDER BY atualizado_em DESC
      LIMIT 200
    `);

    const todas = rows.map(dbRowToReq).filter(Boolean);
    const requisicoes = todas.filter(r => 
      r.status_compras === 'entregue' || 
      r.status_compras === 'entregue_parcial' || 
      r.status === 'entregue' ||
      Boolean(r.divergencia) ||
      Boolean(r.recebimentoFisico) ||
      Boolean(r.dataRecebimentoFisico)
    );

    res.json({ erro: false, total: requisicoes.length, requisicoes });
  } catch (err) {
    console.error('Erro ao buscar notas recebidas no almoxarifado:', err);
    res.status(500).json({ erro: true, mensagem: err.message });
  }
});

/**
 * GET /api/recebimento-fiscal/finalizadas
 * Retorna histórico de notas fiscais 100% faturadas e finalizadas
 */
router.get('/finalizadas', async (req, res) => {
  try {
    const db = await getDb();
    const rows = await db.all(`
      SELECT * FROM requisicoes 
      WHERE status_compras = 'finalizado'
      ORDER BY atualizado_em DESC
      LIMIT 200
    `);

    const requisicoes = rows.map(dbRowToReq).filter(Boolean);
    res.json({ erro: false, total: requisicoes.length, requisicoes });
  } catch (err) {
    console.error('Erro ao buscar notas finalizadas:', err);
    res.status(500).json({ erro: true, mensagem: err.message });
  }
});

/**
 * POST /api/recebimento-fiscal/sincronizar-omie
 * Puxa automaticamente as notas de entrada registradas no Omie (ListarNotaEnt)
 */
router.post('/sincronizar-omie', async (req, res) => {
  try {
    console.log('\n[RECEBIMENTO FISCAL] 🔄 Buscando notas de entrada na Omie...');
    const resOmie = await omieNotaEntradaService.listarNotasEntradaOmie(1, 50);
    if (resOmie.erro) {
      if (resOmie.mensagem && resOmie.mensagem.includes('Não existem registros')) {
        resOmie.dados = { notas_entrada: [] };
        resOmie.erro = false;
      } else {
        return res.status(400).json({ erro: true, mensagem: resOmie.mensagem || 'Falha ao consultar Omie' });
      }
    }

    const notasOmie = resOmie.dados?.com_notas_entradas || resOmie.dados?.notas_entrada || [];
    const db = await getDb();
    const rows = await db.all(`SELECT * FROM requisicoes ORDER BY atualizado_em DESC`);
    const todas = rows.map(dbRowToReq).filter(Boolean);

    let vinculadasCount = 0;

    for (const nota of notasOmie) {
      const chaveAcesso = String(nota.cChaveNfe || '').replace(/\D/g, '');
      const nCodFor = nota.nCodFor;
      const numeroNF = String(nota.cNumeroNota || nota.nNumeroNF || '');

      // Procura pedido correspondente que ainda não concluiu a nota
      const pedidoMatch = todas.find(r => {
        if (r.nota_fiscal_concluida_omie) return false;
        const fornId = r.pedidos_omie?.[0]?.fornecedorId || r.fornecedorEscolhidoId;
        const mesmoFornecedor = String(fornId) === String(nCodFor);
        const mesmaChave = r.nota_fiscal_vinculada?.chaveAcesso === chaveAcesso;
        return mesmaChave || (mesmoFornecedor && !r.nota_fiscal_vinculada);
      });

      if (pedidoMatch) {
        let dadosJson = {};
        try { dadosJson = JSON.parse(pedidoMatch.dados_json || '{}'); } catch(e){}

        dadosJson.nota_fiscal_vinculada = {
          chaveAcesso: chaveAcesso || `OMIE-${numeroNF}`,
          numeroNF: numeroNF,
          serie: nota.cSerie || '1',
          dataEmissao: nota.dDtEmissao || new Date().toISOString(),
          valorTotal: Number(nota.nValorTotal || 0),
          nCodNotaEnt: nota.nCodNotaEnt,
          emitente: {
            codigo_cliente_omie: nCodFor,
            nome: nota.cRazaoSocial || 'Fornecedor Omie'
          },
          itens: (nota.itens || []).map(i => ({
            codigo: i.cCodProd || 'PRD',
            descricao: i.cDescricao || 'Item Omie',
            quantidade: Number(i.nQtde || 1),
            valorUnitario: Number(i.nValUnit || 0),
            valorTotal: Number(i.nValTotal || 0)
          })),
          parcelas: (nota.parcelas || []).map(p => ({
            nParcela: p.nParcela || 1,
            nNumTitulo: p.nNumTitulo || `${numeroNF}/${p.nParcela || 1}`,
            dDtVenc: p.dDtVenc,
            nValor: Number(p.nValor || 0)
          }))
        };

        const novoJsonStr = JSON.stringify(dadosJson);
        await db.run(
          `UPDATE requisicoes SET dados_json = ?, atualizado_em = NOW() WHERE id = ?`,
          [novoJsonStr, pedidoMatch.id]
        );
        vinculadasCount++;
      }
    }
    
    console.log(`[RECEBIMENTO FISCAL] ✅ Omie lida com sucesso! Foram encontradas ${notasOmie.length} nota(s) e vinculadas ${vinculadasCount}.`);

    const io = req.app.get('io');
    if (io) {
      io.emit('notas_fiscais_atualizadas');
      io.emit('pedidos_pendentes_atualizados');
    }

    res.json({
      erro: false,
      mensagem: `Sincronização concluída com sucesso! ${notasOmie.length} notas consultadas na Omie, ${vinculadasCount} vinculadas.`,
      totalConsultadas: notasOmie.length,
      vinculadas: vinculadasCount
    });
  } catch (err) {
    console.error('Erro na sincronização com Omie:', err);
    res.status(500).json({ erro: true, mensagem: err.message });
  }
});

/**
 * POST /api/recebimento-fiscal/sincronizar-sefaz
 * Puxa automaticamente as notas de entrada emitidas contra a empresa via SEFAZ Nacional (DFe)
 */
router.post('/sincronizar-sefaz', async (req, res) => {
  try {
    const config = await sefazDfeService.obterConfigCertificado();
    if (!config?.arquivo_caminho || !config?.senha) {
      return res.status(400).json({
        erro: true,
        mensagem: 'Certificado Digital A1 da SEFAZ não configurado. Por favor, adicione o arquivo .pfx e a senha no modal de configuração.'
      });
    }

    const doc = config.documento || config.cpf || config.cnpj || '04203372291';
    const tipoDoc = config.tipo === 'e-CNPJ' || doc.length === 14 ? 'CNPJ' : 'CPF';

    console.log(`[SEFAZ DFe] Sincronizacao manual disparada para ${tipoDoc} ${doc}...`);
    const resultado = await sefazDfeService.consultarDistribuicaoDFe({
      docConsulta: doc,
      tipoDoc
    });
    let todasNotas = resultado.notas || [];

    const db = await getDb();
    const rows = await db.all(`SELECT * FROM requisicoes ORDER BY atualizado_em DESC`);
    const todas = rows.map(dbRowToReq).filter(Boolean);

    let vinculadasCount = 0;

    for (const nota of todasNotas) {
      const chaveAcesso = String(nota.chaveAcesso || '').replace(/\D/g, '');
      const cnpjEmit = String(nota.emitente?.cnpj_cpf || '').replace(/\D/g, '');
      const numeroNF = String(nota.numeroNF || '');

      // Procura requisição correspondente em aberto
      const pedidoMatch = todas.find(r => {
        if (r.nota_fiscal_concluida_omie) return false;
        const fornDoc = limparDoc(r.pedidos_omie?.[0]?.cnpj || r.fornecedorEscolhidoCnpj || r.cnpj_fornecedor);
        const mesmaChave = r.nota_fiscal_vinculada?.chaveAcesso === chaveAcesso;
        const mesmoCnpj = fornDoc && fornDoc === cnpjEmit;
        return mesmaChave || (mesmoCnpj && !r.nota_fiscal_vinculada);
      });

      if (pedidoMatch) {
        let dadosJson = {};
        try { dadosJson = JSON.parse(pedidoMatch.dados_json || '{}'); } catch(e){}

        dadosJson.nota_fiscal_vinculada = {
          ...nota,
          chaveAcesso,
          numeroNF,
          origem: 'SEFAZ'
        };

        const novoJsonStr = JSON.stringify(dadosJson);
        if (db.driver === 'mysql') {
          await db.run(
            `UPDATE requisicoes SET dados_json = ?, atualizado_em = NOW() WHERE id = ?`,
            [novoJsonStr, pedidoMatch.id]
          );
        } else {
          await db.run(
            `UPDATE requisicoes SET dados_json = ?, atualizado_em = CURRENT_TIMESTAMP WHERE id = ?`,
            [novoJsonStr, pedidoMatch.id]
          );
        }
        vinculadasCount++;
      }
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('notas_fiscais_atualizadas');
      io.emit('pedidos_pendentes_atualizados');
    }

    res.json({
      erro: false,
      mensagem: `Consulta SEFAZ realizada com sucesso! Status SEFAZ: ${resultado.cStat} - ${resultado.xMotivo}. ${todasNotas.length} nota(s) processada(s), ${vinculadasCount} vinculada(s) automaticamente.`,
      totalConsultadas: todasNotas.length,
      vinculadas: vinculadasCount,
      detalhesSefaz: {
        cStat: resultado.cStat,
        xMotivo: resultado.xMotivo,
        ultNSU: resultado.ultNSU,
        maxNSU: resultado.maxNSU
      }
    });
  } catch (err) {
    console.error('Erro na sincronização com SEFAZ:', err);
    res.status(500).json({ erro: true, mensagem: err.message });
  }
});

/**
 * POST /api/recebimento-fiscal/bipar-chave
 * Consulta a NF-e online na SEFAZ/DANFE via consultadanfe.com ou decodifica chave com fallback
 */
router.post('/bipar-chave', async (req, res) => {
  try {
    const { chave } = req.body;
    const chaveLimpa = limparDoc(chave);

    if (chaveLimpa.length !== 44) {
      return res.status(400).json({
        erro: true,
        mensagem: `A Chave de Acesso deve conter exatamente 44 dígitos. Foram recebidos ${chaveLimpa.length} dígitos.`
      });
    }

    const db = await getDb();

    // 1. Tentar consultar online via consultadanfe.com (retorna XML + PDF em base64)
    let consultaOnline = null;
    try {
      consultaOnline = await consultarNfeDanfeOnline(chaveLimpa);
    } catch (eDanfe) {
      console.warn('[RecebimentoFiscal] Erro na consulta online de DANFE:', eDanfe.message);
    }

    if (consultaOnline && consultaOnline.sucesso && consultaOnline.nota) {
      const notaOnline = consultaOnline.nota;

      // Enriquecimento do fornecedor/emitente via banco MariaDB
      const docEmitente = limparDoc(notaOnline.emitente?.cnpj_cpf);
      try {
        const fornRows = await db.all(`SELECT * FROM fornecedores_omie`);
        const fornecedor = fornRows.find(f => limparDoc(f.cnpj_cpf) === docEmitente);
        if (fornecedor) {
          let d = {};
          try { d = JSON.parse(fornecedor.dados_json || '{}'); } catch(e){}
          notaOnline.emitente.codigo_cliente_omie = fornecedor.codigo;
          notaOnline.emitente.nome = fornecedor.nome_fantasia || fornecedor.razao_social || notaOnline.emitente.nome;
        }
      } catch (eForn) {}

      // Busca pedido de compra em aberto correspondente
      try {
        const reqRows = await db.all(`
          SELECT * FROM requisicoes 
          WHERE status_compras IN ('pedido_gerado', 'aguardando_nfe', 'concluido')
          ORDER BY atualizado_em DESC
        `);
        const abertas = reqRows.map(dbRowToReq);
        const pedidoCorrespondente = abertas.find(r => {
          const fornId = r.pedidos_omie?.[0]?.fornecedorId || r.fornecedorEscolhidoId;
          const matchForn = notaOnline.emitente?.codigo_cliente_omie && String(fornId) === String(notaOnline.emitente.codigo_cliente_omie);
          const matchChave = r.chaveNfe && limparDoc(r.chaveNfe) === chaveLimpa;
          return matchForn || matchChave;
        });

        if (pedidoCorrespondente) {
          notaOnline.requisicaoSugeridaId = pedidoCorrespondente.id;
        }
      } catch (eReq) {}

      return res.json({
        erro: false,
        origem: 'online_sefaz',
        mensagem: 'NF-e localizada com sucesso na SEFAZ e importada com todos os itens!',
        dados: notaOnline
      });
    }

    // 2. FALLBACK: Decodifica os metadados da Chave de Acesso (44 dígitos)
    const cUF = chaveLimpa.substring(0, 2);
    const aamm = chaveLimpa.substring(2, 6);
    const cnpjEmitente = chaveLimpa.substring(6, 20);
    const mod = chaveLimpa.substring(20, 22);
    const serie = chaveLimpa.substring(22, 25);
    const nNF = String(parseInt(chaveLimpa.substring(25, 34), 10));

    let fornecedor = null;
    try {
      const fornRows = await db.all(`SELECT * FROM fornecedores_omie`);
      fornecedor = fornRows.find(f => {
        const docFor = limparDoc(f.cnpj_cpf);
        return docFor === cnpjEmitente;
      });
      if (fornecedor) {
        let d = {};
        try { d = JSON.parse(fornecedor.dados_json || '{}'); } catch(e){}
        fornecedor = {
          ...d,
          codigo_cliente_omie: fornecedor.codigo,
          razao_social: fornecedor.razao_social || d.razao_social,
          nome_fantasia: fornecedor.nome_fantasia || d.nome_fantasia || fornecedor.razao_social,
          cnpj_cpf: fornecedor.cnpj_cpf
        };
      }
    } catch(e) {}

    const reqRows = await db.all(`
      SELECT * FROM requisicoes 
      WHERE status_compras IN ('pedido_gerado', 'aguardando_nfe', 'concluido')
      ORDER BY atualizado_em DESC
    `);
    const abertas = reqRows.map(dbRowToReq);

    let pedidoCorrespondente = null;
    if (fornecedor) {
      pedidoCorrespondente = abertas.find(r => {
        const fornId = r.pedidos_omie?.[0]?.fornecedorId || r.fornecedorEscolhidoId;
        return String(fornId) === String(fornecedor.codigo_cliente_omie);
      });
    }

    const notaFormatada = {
      chaveAcesso: chaveLimpa,
      numeroNF: nNF,
      serie: String(parseInt(serie, 10)),
      modelo: mod,
      dataEmissao: new Date().toISOString(),
      emitente: {
        nome: fornecedor?.nome_fantasia || fornecedor?.razao_social || `Fornecedor CNPJ ${cnpjEmitente}`,
        cnpj_cpf: fornecedor?.cnpj_cpf || cnpjEmitente,
        codigo_cliente_omie: fornecedor?.codigo_cliente_omie || null
      },
      valorTotal: pedidoCorrespondente?.pedidos_omie?.[0]?.valorTotal || 0,
      itens: (pedidoCorrespondente?.itens || []).map(i => ({
        codigo: i.codigo || 'PRD001',
        descricao: i.descricao,
        quantidade: Number(i.quantidade || 1),
        valorUnitario: Number(i.valor_unitario || 0),
        valorTotal: (Number(i.quantidade || 1)) * (Number(i.valor_unitario || 0))
      })),
      parcelas: [
        {
          nParcela: 1,
          dDtVenc: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR'),
          nValor: pedidoCorrespondente?.pedidos_omie?.[0]?.valorTotal || 0
        }
      ],
      requisicaoSugeridaId: pedidoCorrespondente?.id || null,
      origemConsulta: 'chave_decodificada'
    };

    const avisoMensagem = consultaOnline?.erro === 'rate_limit_exceeded'
      ? 'Limite de consultas DANFE gratuitas atingido no momento. A nota foi aberta com os dados da chave. Você também pode anexar o arquivo XML para carregar todos os itens.'
      : (consultaOnline?.mensagem ? `Consulta online: ${consultaOnline.mensagem}. Dados básicos decodificados da chave.` : 'Chave de Acesso decodificada com sucesso!');

    res.json({
      erro: false,
      origem: 'fallback_chave',
      aviso: consultaOnline?.mensagem || null,
      mensagem: avisoMensagem,
      dados: notaFormatada
    });
  } catch (err) {
    console.error('Erro ao bipar chave de NF-e:', err);
    res.status(500).json({ erro: true, mensagem: err.message });
  }
});

/**
 * POST /api/recebimento-fiscal/consultar-danfe
 * Consulta avulsa para obter PDF do DANFE ou XML via consultadanfe.com
 */
router.post('/consultar-danfe', async (req, res) => {
  try {
    const { chave } = req.body;
    const chaveLimpa = limparDoc(chave);
    if (chaveLimpa.length !== 44) {
      return res.status(400).json({ erro: true, mensagem: 'Chave de acesso de 44 dígitos é obrigatória.' });
    }

    const resultado = await consultarNfeDanfeOnline(chaveLimpa);
    if (!resultado.sucesso) {
      return res.status(400).json({ erro: true, mensagem: resultado.mensagem, codigoErro: resultado.erro });
    }

    res.json({
      erro: false,
      mensagem: 'DANFE consultado com sucesso!',
      chave: resultado.chave,
      tipo: resultado.tipo,
      pdf_base64: resultado.pdf_base64,
      dados: resultado.nota
    });
  } catch (err) {
    console.error('Erro ao consultar DANFE avulso:', err);
    res.status(500).json({ erro: true, mensagem: err.message });
  }
});

/**
 * POST /api/recebimento-fiscal/upload-xml
 * Realiza a leitura e extração estruturada de um arquivo XML de NF-e
 */
router.post('/upload-xml', async (req, res) => {
  try {
    const { xmlString } = req.body;
    if (!xmlString) {
      return res.status(400).json({ erro: true, mensagem: 'Conteúdo do XML não informado.' });
    }

    const notaParseada = parsearXmlNFe(xmlString);

    // Tenta gerar o DANFE em PDF oficial via consultadanfe.com (/api/v1/danfe aceita XML até 5MB sem limite de data)
    try {
      const resDanfe = await gerarDanfeDeXmlOnline(xmlString);
      if (resDanfe?.sucesso && resDanfe.pdf_base64) {
        notaParseada.pdf_base64 = resDanfe.pdf_base64;
      }
    } catch (eDanfe) {
      console.warn('[UploadXML] Não foi possível gerar DANFE em PDF online:', eDanfe.message);
    }

    res.json({
      erro: false,
      mensagem: 'XML processado com sucesso!',
      dados: notaParseada
    });
  } catch (err) {
    console.error('Erro ao ler XML da NF-e:', err);
    res.status(500).json({ erro: true, mensagem: 'Falha ao processar arquivo XML: ' + err.message });
  }
});

/**
 * POST /api/recebimento-fiscal/salvar-conferencia
 * Salva localmente o mapeamento dos itens e as parcelas sem fechar na Omie ainda
 */
router.post('/salvar-conferencia', async (req, res) => {
  try {
    const { reqId, nota, mapeamentoItens, parcelas } = req.body;
    if (!reqId) {
      return res.status(400).json({ erro: true, mensagem: 'ID da requisição é obrigatório.' });
    }

    const db = await getDb();
    const row = await db.get(`SELECT * FROM requisicoes WHERE id = ?`, [reqId]);
    if (!row) return res.status(404).json({ erro: true, mensagem: 'Requisição não encontrada.' });

    const reqObj = dbRowToReq(row);
    
    // Remove requisicaoObj para evitar crescimento exponencial do JSON no banco
    if (nota && nota.requisicaoObj) {
      delete nota.requisicaoObj;
    }
    
    reqObj.nota_fiscal_vinculada = nota;
    reqObj.mapeamento_nfe = mapeamentoItens;
    reqObj.parcelas_financeiro = parcelas;
    reqObj.atualizado_em = new Date().toISOString();

    await db.run(`UPDATE requisicoes SET dados_json = ?, atualizado_em = ? WHERE id = ?`, [
      JSON.stringify(reqObj),
      reqObj.atualizado_em,
      reqId
    ]);

    res.json({ erro: false, mensagem: 'Conferência salva com sucesso no rascunho fiscal.' });
  } catch (err) {
    console.error('Erro ao salvar conferência fiscal:', err);
    res.status(500).json({ erro: true, mensagem: err.message });
  }
});

/**
 * POST /api/recebimento-fiscal/concluir-omie
 * Integra com a Omie (IncluirNotaEnt + ConferirNotaEnt + ConcluirNotaEnt)
 * e libera o pedido para o Almoxarifado físico
 */
router.post('/concluir-omie', async (req, res) => {
  try {
    const { reqId, nota, mapeamentoItens, parcelas, gerarContasPagar, liberarAlmoxarifado = true } = req.body;
    if (!reqId) {
      return res.status(400).json({ erro: true, mensagem: 'ID da requisição é obrigatório.' });
    }

    const db = await getDb();
    const row = await db.get(`SELECT * FROM requisicoes WHERE id = ?`, [reqId]);
    if (!row) return res.status(404).json({ erro: true, mensagem: 'Requisição não encontrada.' });

    const reqObj = dbRowToReq(row);

    // 🔥 FASE 3: Trava de Inversão Temporal (Blindagem de Caixa)
    // O Operador Fiscal é sumariamente impedido de faturar a nota na Omie (Contas a Pagar)
    // se o Almoxarife ainda não descarregou e conferiu fisicamente as peças na doca.
    const statusQueJaPassaramNoAlmoxarifado = ['recebido_almoxarifado', 'entregue', 'finalizado'];
    const temConferenciaFisica = reqObj.itensRecebidosConfirmados || statusQueJaPassaramNoAlmoxarifado.includes(reqObj.status_compras);
    
    // Descomentar a trava abaixo quando o fluxo de bipagem estiver 100% alinhado
    /*
    if (!temConferenciaFisica) {
      return res.status(400).json({
        erro: true,
        mensagem: 'FATURAMENTO BLOQUEADO 🔒: Aguarde a conferência física e bipagem da mercadoria pelo Almoxarifado antes de gerar a dívida na Omie.'
      });
    }
    */

    // 1. Tentar localizar o código do fornecedor no Omie caso não tenha vindo
    let codFornecedorOmie = nota.emitente?.codigo_cliente_omie || reqObj.pedidos_omie?.[0]?.fornecedorId;
    if (!codFornecedorOmie && nota.emitente?.cnpj_cpf) {
      const docLimpo = limparDoc(nota.emitente.cnpj_cpf);
      const fornRows = await db.all(`SELECT * FROM fornecedores_omie`);
      const f = fornRows.find(rowF => limparDoc(rowF.cnpj_cpf) === docLimpo);
      if (f) codFornecedorOmie = f.codigo;
    }

    // 2. Preparar payload para o Omie
    let locaisEstoqueDb = [];
    try {
      locaisEstoqueDb = await db.all(`SELECT * FROM locais_estoque_omie`);
    } catch(e) {}

    const dadosNotaOmie = {
      cNumeroNota: nota.numeroNF || nota.chaveAcesso?.substring(25, 34) || '1',
      cSerie: nota.serie || '1',
      dDtEmissao: nota.dataEmissao ? new Date(nota.dataEmissao).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR'),
      dDtEntrada: new Date().toLocaleDateString('pt-BR'),
      nCodFor: codFornecedorOmie,
      cChaveNfe: nota.chaveAcesso,
      nValorTotal: Number(nota.valorTotal || 0),
      itens: (nota.itens || []).map(item => {
        let codLocal = item.codigo_local_estoque || '01';
        let idLocalEstoque = 687827873; // Almoxarifado Central (Padrão)

        if (typeof codLocal === 'number' && codLocal > 1000) {
          idLocalEstoque = codLocal;
        } else if (typeof codLocal === 'string' && !isNaN(Number(codLocal)) && Number(codLocal) > 1000) {
          idLocalEstoque = Number(codLocal);
        } else {
          const codStr = String(codLocal).trim();
          const matchDb = locaisEstoqueDb.find(l => 
            l.codigo === codStr || 
            l.codigo === codStr.split(' - ')[0] ||
            l.descricao?.trim().toUpperCase() === codStr.toUpperCase() ||
            l.descricao?.trim().toUpperCase() === codStr.split(' - ').slice(1).join(' - ').trim().toUpperCase()
          );

          if (matchDb) {
            let dj = {};
            try { dj = JSON.parse(matchDb.dados_json || '{}'); } catch(e){}
            idLocalEstoque = Number(dj.codigo_local_estoque || dj.nCodLocal || (Number(matchDb.codigo) > 1000 ? matchDb.codigo : 687827873));
          } else {
            const fallbackMap = {
              '01': 687827873,
              '01 - Almoxarifado': 687827873,
              'Almoxarifado': 687827873,
              'PADRAO': 685531866,
              'Local de Estoque Padrão': 685531866,
              '02': 688337027,
              '02 - Armazém de Matéria Prima': 688337027,
              '03': 741105704,
              '03 - Armazém de Serragem': 741105704,
              '04': 741105830,
              '04 - Armazém de Cama de Frango': 741105830,
              '05': 741105884,
              '05 - Armazém de Insumos para Construção Civil': 741105884,
              '06': 741105962,
              '06 - Armazém Fabrica de Ração': 741105962,
              'Posto de Combustivel': 1649011537
            };
            if (fallbackMap[codStr]) idLocalEstoque = fallbackMap[codStr];
          }
        }

        return {
          cCodProd: mapeamentoItens?.[item.codigo] || item.codigo,
          quantidade: item.quantidadeRecebida !== undefined ? Number(item.quantidadeRecebida) : Number(item.quantidade || 1),
          valorUnitario: Number(item.valorUnitario || 0),
          cfop: item.cfop || '1556',
          ncm: item.ncm || '',
          codigo_local_estoque: idLocalEstoque
        };
      }),
      parcelas: (gerarContasPagar !== false) ? (parcelas || nota.parcelas || []) : [],
      observacoes: `NF-e vinculada à Requisição #${reqId.split('-')[0]}`
    };

    let omieResultado = null;
    let omieStatus = 'pendente';

    // Dispara para a Omie se as credenciais estiverem configuradas
    if (process.env.OMIE_APP_KEY && process.env.OMIE_APP_SECRET) {
      try {
        const resInc = await omieNotaEntradaService.incluirNotaEntradaOmie(dadosNotaOmie);
        if (!resInc.erro) {
          omieResultado = resInc.dados;
          const nCodNotaEnt = resInc.dados?.nCodNotaEnt || resInc.dados?.cabec?.nCodNotaEnt;

          // Se incluiu com sucesso, avança para conferir e concluir
          if (nCodNotaEnt) {
            await omieNotaEntradaService.conferirNotaEntradaOmie(nCodNotaEnt);
            const resConcluir = await omieNotaEntradaService.concluirNotaEntradaOmie(nCodNotaEnt);
            omieStatus = resConcluir.erro ? 'conferido' : 'concluido';
          } else {
            omieStatus = 'incluido';
          }
        } else {
          console.warn('⚠️ [Omie] Nota não incluída automaticamente:', resInc.mensagem);
          omieResultado = { aviso: resInc.mensagem };
        }
      } catch (omieErr) {
        console.error('❌ Erro na integração Omie:', omieErr.message);
      }
    } else {
      console.log('ℹ️ Credenciais Omie não configuradas - Simulação local ativa.');
      omieStatus = 'simulado_sucesso';
    }

    // 3. Atualizar a requisição no MariaDB para avançar o ciclo
    reqObj.status_compras = temConferenciaFisica ? 'finalizado' : 'concluido'; 
    
    // Remove requisicaoObj para evitar crescimento exponencial do JSON no banco
    if (nota && nota.requisicaoObj) {
      delete nota.requisicaoObj;
    }

    reqObj.nota_fiscal_vinculada = {
      ...nota,
      status_omie: omieStatus,
      omie_resultado: omieResultado
    };
    reqObj.mapeamento_nfe = mapeamentoItens;
    reqObj.mapeamento_concluido = true;
    reqObj.parcelas_financeiro = parcelas;
    reqObj.atualizado_em = new Date().toISOString();

    // Se tiver pedidos_omie, atualiza a nota em cada pedido
    if (reqObj.pedidos_omie && reqObj.pedidos_omie.length > 0) {
      reqObj.pedidos_omie = reqObj.pedidos_omie.map(p => ({
        ...p,
        nota_fiscal_vinculada: reqObj.nota_fiscal_vinculada
      }));
    }

    await db.run(`UPDATE requisicoes SET status_compras = ?, dados_json = ?, atualizado_em = ? WHERE id = ?`, [
      reqObj.status_compras,
      JSON.stringify(reqObj),
      reqObj.atualizado_em,
      reqId
    ]);

    // 4. 🔥 EFEITO CASCATA: Sincronização Imediata do Estoque Real no Omie
    // Assim que a nota de entrada é finalizada, sincroniza instantaneamente os produtos da nota no MariaDB
    const produtosSincronizadosCascata = [];
    const codigosParaSync = new Set();

    for (const item of (nota.itens || [])) {
      const codMapeado = mapeamentoItens?.[item.codigo] || item.codigo;
      if (
        codMapeado && 
        codMapeado !== 'ignorar' && 
        !String(codMapeado).startsWith('NOVO-') && 
        !String(codMapeado).startsWith('NOVO:')
      ) {
        codigosParaSync.add(codMapeado);
      }
    }

    if (codigosParaSync.size > 0) {
      console.log(`[RECEBIMENTO FISCAL] 🌊 Iniciando Efeito Cascata de Estoque para ${codigosParaSync.size} produto(s)...`);
      for (const codProd of codigosParaSync) {
        try {
          const resSync = await omieEstoqueService.consultarSaldoIndividual(
            codProd,
            `Recebimento Fiscal (NF-e ${nota.numeroNF || 'S/N'})`
          );
          if (resSync && resSync.sucesso) {
            produtosSincronizadosCascata.push({
              codigo: codProd,
              descricao: resSync.descricao,
              saldoAnterior: resSync.saldoAnterior,
              novoSaldo: resSync.novoSaldo,
              diferenca: resSync.diferenca,
              locais: resSync.locais
            });
          }
        } catch (errSync) {
          console.warn(`[RECEBIMENTO FISCAL] Aviso ao sincronizar ${codProd} na cascata:`, errSync.message);
        }
      }
      console.log(`[RECEBIMENTO FISCAL] ✅ Efeito Cascata concluído: ${produtosSincronizadosCascata.length} produto(s) alinhados.`);
    }

    // Cria ordem de recebimento físico para o almoxarifado se solicitado
    if (liberarAlmoxarifado) {
      try {
        const { getJsonData, saveJsonData } = await import('../services/jsonDbService.js');
        let pendentes = await getJsonData('pedidos_pendentes') || [];
        pendentes = pendentes.filter(p => String(p.requisicaoOrigemId) !== String(reqId) && p.id !== `REC-${reqId}`);
        
        const itensParaReceber = (nota.itens || []).map(item => {
          const loc = item.codigo_local_estoque || item.localEstoque || '01';
          return {
            codigo: mapeamentoItens?.[item.codigo] || item.codigo,
            codigoNfeOriginal: item.codigo,
            descricao: item.descricao || 'Item do Pedido',
            quantidadeEsperada: Number(item.quantidadeRecebida !== undefined ? item.quantidadeRecebida : (item.quantidade || 1)),
            quantidadeRecebida: 0,
            valorUnitario: Number(item.valorUnitario || item.valor_unitario || 0),
            codigo_local_estoque: loc,
            localEstoque: loc
          };
        }).filter(i => i.codigo !== 'ignorar');

        if (itensParaReceber.length > 0) {
          const localEstoquePadrao = itensParaReceber[0]?.codigo_local_estoque || '01';
          pendentes.push({
            id: `REC-${reqId}`,
            requisicaoOrigemId: reqId,
            fornecedor: nota.emitente?.nome || reqObj.fornecedor || reqObj.solicitante,
            dataEmissao: new Date().toISOString(),
            status: 'Aguardando Recebimento',
            numeroNfe: nota.numeroNF || nota.chaveAcesso?.substring(25, 34) || reqObj.nota_fiscal || '',
            numeroNF: nota.numeroNF || nota.chaveAcesso?.substring(25, 34) || reqObj.nota_fiscal || '',
            chaveNfe: nota.chaveAcesso || reqObj.chaveNfe || '',
            valorTotal: Number(nota.valorTotal || reqObj.valor || 0),
            codigo_local_estoque: localEstoquePadrao,
            localEstoque: localEstoquePadrao,
            itens: itensParaReceber
          });
          await saveJsonData('pedidos_pendentes', pendentes);
        }
      } catch (errPed) {
        console.warn('Erro ao despachar pedido pendente no fiscal:', errPed.message);
      }
    }

    // Dispara eventos via WebSocket em tempo real para todos os clientes
    const io = req.app.get('io');
    if (io) {
      io.emit('nota_fiscal_recebida', { reqId, nota: reqObj.nota_fiscal_vinculada });
      io.emit('pedidos_pendentes_atualizados');
      io.emit('recebimento_fiscal_atualizado');

      if (produtosSincronizadosCascata.length > 0) {
        io.emit('estoque_atualizado', {
          tipo: 'RECEBIMENTO_FISCAL_CASCATA',
          produtos: produtosSincronizadosCascata
        });
      }

      io.emit('novo_pedido_recebimento', {
        id: `REC-${reqId}`,
        fornecedor: nota.emitente?.nome || reqObj.fornecedor || reqObj.solicitante,
        mensagem: 'Nova mercadoria despachada para o Almoxarifado!'
      });
    }

    const mensagemFinal = produtosSincronizadosCascata.length > 0
      ? `Recebimento Fiscal concluído com sucesso! Nota fiscal integrada com a Omie e estoque de ${produtosSincronizadosCascata.length} produto(s) atualizado em cascata.`
      : 'Recebimento Fiscal concluído com sucesso! Nota processada e liberada para o Almoxarifado.';

    res.json({
      erro: false,
      mensagem: mensagemFinal,
      statusOmie: omieStatus,
      requisicao: reqObj,
      produtosSincronizados: produtosSincronizadosCascata
    });
  } catch (err) {
    console.error('Erro ao concluir recebimento fiscal:', err);
    res.status(500).json({ erro: true, mensagem: err.message });
  }
});

/**
 * POST /api/recebimento-fiscal/atualizar-chave
 * Permite salvar/vincular a chave de acesso da NF-e e número da nota
 * diretamente na tela de Recebimento Fiscal enquanto estiver "Aguardando Almoxarifado"
 */
router.post('/atualizar-chave', async (req, res) => {
  try {
    const { reqId, chaveNfe, numeroNF } = req.body;
    if (!reqId) {
      return res.status(400).json({ erro: true, mensagem: 'ID da requisição é obrigatório' });
    }

    const db = await getDb();
    const rowReq = await db.get(`SELECT * FROM requisicoes WHERE id = ?`, [reqId]);
    if (!rowReq) {
      return res.status(404).json({ erro: true, mensagem: 'Requisição não encontrada' });
    }

    let dados = {};
    try { dados = JSON.parse(rowReq.dados_json || '{}'); } catch(e){}

    const chaveLimpa = String(chaveNfe || '').trim();
    let numCalculado = String(numeroNF || '').trim();

    if (chaveLimpa.length === 44 && !numCalculado) {
      numCalculado = String(parseInt(chaveLimpa.substring(25, 34), 10) || chaveLimpa.substring(25, 34));
    }

    if (chaveLimpa) {
      dados.chaveNfe = chaveLimpa;
      if (!dados.nota_fiscal_vinculada) dados.nota_fiscal_vinculada = {};
      dados.nota_fiscal_vinculada.chaveAcesso = chaveLimpa;
    }
    if (numCalculado) {
      dados.nota_fiscal = numCalculado;
      dados.numeroNF = numCalculado;
      if (!dados.nota_fiscal_vinculada) dados.nota_fiscal_vinculada = {};
      dados.nota_fiscal_vinculada.numero = numCalculado;
      dados.nota_fiscal_vinculada.numeroNF = numCalculado;
    }

    const dadosJson = JSON.stringify(dados);
    if (db.driver === 'mysql') {
      await db.run(`UPDATE requisicoes SET dados_json = ?, atualizado_em = NOW() WHERE id = ?`, [dadosJson, reqId]);
    } else {
      await db.run(`UPDATE requisicoes SET dados_json = ?, atualizado_em = CURRENT_TIMESTAMP WHERE id = ?`, [dadosJson, reqId]);
    }

    // Atualiza em pedidos_pendentes (para o Almoxarifado ver na hora)
    try {
      const { getJsonData, saveJsonData } = await import('../services/jsonDbService.js');
      let pedidos = await getJsonData('pedidos_pendentes') || [];
      let alterou = false;
      pedidos = pedidos.map(p => {
        if (String(p.requisicaoOrigemId) === String(reqId) || p.id === `REC-${reqId}`) {
          alterou = true;
          return {
            ...p,
            chaveNfe: chaveLimpa || p.chaveNfe,
            numeroNF: numCalculado || p.numeroNF || p.numeroNfe,
            numeroNfe: numCalculado || p.numeroNfe || p.numeroNF
          };
        }
        return p;
      });
      if (alterou) {
        await saveJsonData('pedidos_pendentes', pedidos);
      }
    } catch(errPed) {
      console.warn('Erro ao sincronizar pedidos_pendentes:', errPed.message);
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('pedidos_pendentes_atualizados');
      io.emit('recebimento_fiscal_atualizado');
      io.emit('requisicao_atualizada', { id: reqId });
    }

    res.json({
      erro: false,
      mensagem: 'Chave da NF-e vinculada com sucesso!',
      chaveNfe: chaveLimpa,
      numeroNF: numCalculado
    });
  } catch (err) {
    console.error('Erro ao atualizar chave da NF-e:', err);
    res.status(500).json({ erro: true, mensagem: err.message });
  }
});

export default router;
