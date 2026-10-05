/**
 * divergenciasService.js
 * 
 * Serviço isolado e modular para tratamento de divergências físicas e fiscais
 * entre o Almoxarifado (RecebimentoProdutos), Compras (DivergenciasDevolucao)
 * e o Recebimento Fiscal (DashboardRecebimentoFiscal).
 */

/**
 * Calcula os itens faltantes, valor unitário, valor físico recebido e valor da divergência.
 * 
 * @param {Array} itensEsperados - Lista de itens esperados da ordem/nota
 * @param {Object} itensRecebidos - Mapa { [codigo]: quantidadeContada }
 * @param {number} valorTotalNota - Valor total faturado na NF-e
 * @returns {Object} Detalhes da divergência calculada
 */
export function calcularDivergencia(itensEsperados = [], itensRecebidos = {}, valorTotalNota = 0) {
  const itensFaltantes = [];
  let valorTotalCalculado = 0;
  let valorFisicoRecebido = 0;

  for (const item of itensEsperados) {
    const cod = item.codigo || item.codigo_item;
    const esperado = Number(item.quantidadeEsperada || item.quantidade || 0);
    const contado = Number(itensRecebidos[cod] !== undefined ? itensRecebidos[cod] : (itensRecebidos[item.codigoNfeOriginal] || 0));
    let valorUnit = Number(item.valorUnitario || item.valor_unitario || item.preco || item.valor || 0);
    if (valorUnit <= 0 && valorTotalNota > 0 && esperado > 0 && itensEsperados.length === 1) {
      valorUnit = Number((valorTotalNota / esperado).toFixed(2));
    }

    valorTotalCalculado += esperado * valorUnit;
    valorFisicoRecebido += contado * valorUnit;

    if (contado < esperado) {
      const falta = esperado - contado;
      const valorFalta = falta * valorUnit;
      itensFaltantes.push({
        codigo: cod,
        codigoNfeOriginal: item.codigoNfeOriginal || cod,
        descricao: item.descricao || 'Produto sem descrição',
        esperado,
        recebido: contado,
        falta,
        valorUnitario: valorUnit,
        valorFalta: Number(valorFalta.toFixed(2))
      });
    }
  }

  const valorTotalFinal = valorTotalNota > 0 ? Number(valorTotalNota) : Number(valorTotalCalculado.toFixed(2));
  const valorDivergencia = itensFaltantes.reduce((acc, curr) => acc + curr.valorFalta, 0);

  return {
    temDivergencia: itensFaltantes.length > 0,
    itensFaltantes,
    valorTotalNota: valorTotalFinal,
    valorFisicoRecebido: Number(valorFisicoRecebido.toFixed(2)),
    valorDivergencia: Number(valorDivergencia.toFixed(2)),
    percentualAtendido: valorTotalFinal > 0 ? Number(((valorFisicoRecebido / valorTotalFinal) * 100).toFixed(1)) : 100
  };
}

/**
 * Registra a divergência e atualiza a requisição quando o almoxarife salva um recebimento parcial/incompleto.
 * 
 * @param {Object} params
 * @param {string} params.reqId - ID da requisição
 * @param {string} params.pedidoId - ID do pedido físico (REC-...)
 * @param {Object} params.itensRecebidos - Mapa de itens contados
 * @param {Array} params.itensEsperados - Lista de itens esperados
 * @param {string} params.observacao - Justificativa do almoxarife
 * @param {Object} params.db - Instância do banco MariaDB/SQLite
 * @param {Object} params.io - Instância do Socket.IO
 */
export async function registrarDivergenciaRecebimento({
  reqId,
  pedidoId,
  itensRecebidos,
  itensEsperados,
  observacao,
  db,
  io
}) {
  if (!reqId || !db) return null;

  const row = await db.get(`SELECT * FROM requisicoes WHERE id = ?`, [reqId]);
  if (!row) return null;

  let dados = {};
  try { dados = JSON.parse(row.dados_json || '{}'); } catch (e) {}

  const valorNota = dados.nota_fiscal_vinculada?.valorTotal || dados.valor || 0;
  const calc = calcularDivergencia(itensEsperados, itensRecebidos, valorNota);

  const novoStatusCompras = calc.temDivergencia ? 'entregue_parcial' : 'entregue';
  dados.status_compras = novoStatusCompras;
  dados.dataRecebimentoFisico = new Date().toISOString();

  if (calc.temDivergencia) {
    dados.divergencia = {
      status: 'pendente_compras', // pendente_compras | resolvido | aguardando_entrega
      dataRegistro: new Date().toISOString(),
      pedidoId,
      observacao: observacao || 'Sem observação informada pelo Almoxarifado',
      itensFaltantes: calc.itensFaltantes,
      itensRecebidos,
      valorTotalNota: calc.valorTotalNota,
      valorFisicoRecebido: calc.valorFisicoRecebido,
      valorDivergencia: calc.valorDivergencia,
      percentualAtendido: calc.percentualAtendido,
      resolucao: null
    };
  } else {
    dados.divergencia = null;
  }

  const dadosJson = JSON.stringify(dados);
  if (db.driver === 'mysql') {
    await db.run(
      `UPDATE requisicoes SET status_compras = ?, dados_json = ?, atualizado_em = NOW() WHERE id = ?`,
      [novoStatusCompras, dadosJson, reqId]
    );
  } else {
    await db.run(
      `UPDATE requisicoes SET status_compras = ?, dados_json = ?, atualizado_em = CURRENT_TIMESTAMP WHERE id = ?`,
      [novoStatusCompras, dadosJson, reqId]
    );
  }

  if (io) {
    io.emit('pedidos_pendentes_atualizados');
    io.emit('recebimento_fiscal_atualizado');
    io.emit('requisicao_atualizada', { id: reqId });
    if (calc.temDivergencia) {
      io.emit('nova_divergencia_recebimento', {
        id: reqId,
        pedidoId,
        fornecedor: dados.nota_fiscal_vinculada?.emitente?.nome || dados.fornecedor,
        faltaValor: calc.valorDivergencia,
        itensFaltantes: calc.itensFaltantes,
        observacao: observacao
      });
    }
  }

  return { calc, dados };
}

/**
 * Registra a resolução comercial tomada pelo setor de Compras na Central de Divergências.
 * 
 * @param {Object} params
 * @param {string} params.reqId - ID da requisição
 * @param {string} params.acao - 'abatimento_boleto' | 'nota_devolucao' | 'aguardar_entrega'
 * @param {string} [params.notaDevolucao] - Número da NF-e de devolução (se aplicável)
 * @param {number} [params.valorAbatimento] - Valor do desconto em reais negociado no boleto
 * @param {string} [params.observacaoResolucao] - Observações do comprador
 * @param {Object} params.db - Banco de dados
 * @param {Object} params.io - Socket.IO
 */
export async function resolverDivergenciaCompras({
  reqId,
  acao,
  notaDevolucao = '',
  valorAbatimento = 0,
  observacaoResolucao = '',
  db,
  io
}) {
  if (!reqId || !db) throw new Error('Parâmetros inválidos');

  const row = await db.get(`SELECT * FROM requisicoes WHERE id = ?`, [reqId]);
  if (!row) throw new Error('Requisição não encontrada');

  let dados = {};
  try { dados = JSON.parse(row.dados_json || '{}'); } catch(e){}

  if (!dados.divergencia) {
    dados.divergencia = {};
  }

  const abatimentoNum = Number(valorAbatimento || dados.divergencia.valorDivergencia || 0);

  const resolucao = {
    acao,
    notaDevolucao: notaDevolucao || '',
    valorAbatimento: abatimentoNum,
    observacaoResolucao: observacaoResolucao || '',
    dataResolucao: new Date().toISOString()
  };

  dados.divergencia.resolucao = resolucao;

  // Define novo status
  let novoStatusCompras = 'entregue';
  if (acao === 'aguardar_entrega') {
    novoStatusCompras = 'entregue_parcial';
    dados.divergencia.status = 'aguardando_entrega';

    // Reabre a ordem no Almoxarifado para receber as peças restantes
    try {
      const { getJsonData, saveJsonData } = await import('./jsonDbService.js');
      let pendentes = await getJsonData('pedidos_pendentes') || [];
      const pIndex = pendentes.findIndex(p => String(p.requisicaoOrigemId) === String(reqId) || p.id === `REC-${reqId}`);
      
      const itensFaltantes = (dados.divergencia.itensFaltantes || []).map(f => ({
        codigo: f.codigo,
        codigoNfeOriginal: f.codigoNfeOriginal || f.codigo,
        descricao: f.descricao,
        quantidadeEsperada: f.falta,
        quantidadeRecebida: 0,
        valorUnitario: f.valorUnitario || 0
      }));

      if (pIndex !== -1) {
        pendentes[pIndex].status = 'Aguardando Recebimento';
        pendentes[pIndex].observacao = `Entrega Complementar (Falta de ${dados.divergencia.itensFaltantes?.map(f => `${f.falta} un de ${f.descricao}`).join(', ')})`;
        pendentes[pIndex].itens = itensFaltantes.length > 0 ? itensFaltantes : pendentes[pIndex].itens;
      } else if (itensFaltantes.length > 0) {
        pendentes.push({
          id: `REC-${reqId}`,
          requisicaoOrigemId: reqId,
          fornecedor: dados.nota_fiscal_vinculada?.emitente?.nome || dados.fornecedor || 'Fornecedor',
          dataEmissao: new Date().toISOString(),
          status: 'Aguardando Recebimento',
          numeroNfe: dados.numeroNF || dados.nota_fiscal || '',
          numeroNF: dados.numeroNF || dados.nota_fiscal || '',
          chaveNfe: dados.chaveNfe || '',
          valorTotal: Number(dados.divergencia.valorDivergencia || 0),
          itens: itensFaltantes
        });
      }
      await saveJsonData('pedidos_pendentes', pendentes);
    } catch(errPed) {
      console.warn('Erro ao atualizar pedidos_pendentes para entrega complementar:', errPed.message);
    }
  } else {
    dados.divergencia.status = 'resolvido';
    novoStatusCompras = 'entregue'; // Liberado para fechamento fiscal

    // Se houve abatimento negociado no boleto, sugere o abatimento financeiro das parcelas
    if (acao === 'abatimento_boleto' && abatimentoNum > 0) {
      if (Array.isArray(dados.parcelas_financeiro) && dados.parcelas_financeiro.length > 0) {
        dados.parcelas_financeiro = dados.parcelas_financeiro.map((parc, idx) => {
          if (idx === 0) {
            const valorOrig = Number(parc.nValor || 0);
            const novoValor = Math.max(0, valorOrig - abatimentoNum);
            return {
              ...parc,
              nValorOriginal: valorOrig,
              nValor: Number(novoValor.toFixed(2)),
              descontoAbatimento: abatimentoNum,
              motivoDesconto: `Abatimento por falta física: R$ ${abatimentoNum.toFixed(2)}`
            };
          }
          return parc;
        });
      }
    }
  }

  dados.status_compras = novoStatusCompras;

  const dadosJson = JSON.stringify(dados);
  if (db.driver === 'mysql') {
    await db.run(
      `UPDATE requisicoes SET status_compras = ?, dados_json = ?, atualizado_em = NOW() WHERE id = ?`,
      [novoStatusCompras, dadosJson, reqId]
    );
  } else {
    await db.run(
      `UPDATE requisicoes SET status_compras = ?, dados_json = ?, atualizado_em = CURRENT_TIMESTAMP WHERE id = ?`,
      [novoStatusCompras, dadosJson, reqId]
    );
  }

  if (io) {
    io.emit('pedidos_pendentes_atualizados');
    io.emit('recebimento_fiscal_atualizado');
    io.emit('requisicao_atualizada', { id: reqId });
    io.emit('divergencia_resolvida', {
      id: reqId,
      resolucao,
      status: dados.divergencia.status
    });
  }

  return { sucesso: true, requisicao: dados };
}

export default {
  calcularDivergencia,
  registrarDivergenciaRecebimento,
  resolverDivergenciaCompras
};
