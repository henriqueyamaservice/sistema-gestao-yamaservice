import express from 'express';
import getDb from '../config/database.js';
import { getJsonData, saveJsonData } from '../services/jsonDbService.js';
import { parseMonetaryValue } from '../utils/currency.js';

const router = express.Router();

// ============================================================
// HELPERS
// ============================================================

function isoToSql(isoStr) {
  if (!isoStr) return null;
  return isoStr.slice(0, 19).replace('T', ' ');
}

function dbRowToEntrada(row) {
  if (!row) return null;
  let dados = {};
  try { dados = JSON.parse(row.dados_json || '{}'); } catch (e) { /* ignore */ }
  return {
    id: row.id,
    fornecedor: row.fornecedor,
    tipo_combustivel: row.tipo_combustivel,
    produto: row.tipo_combustivel, // compatibilidade
    quantidade_litros: row.quantidade_litros,
    quantidade: row.quantidade_litros, // compatibilidade
    valor_total: row.valor_total,
    valorTotal: row.valor_total, // compatibilidade
    data_entrada: row.data_entrada,
    data: row.data_entrada ? String(row.data_entrada).split(' ')[0] : null, // compatibilidade
    notaFiscal: row.nota_fiscal || dados.notaFiscal,
    valorUn: row.valor_unitario || dados.valorUn,
    estoque: row.estoque_destino || dados.estoque,
    situacao: row.situacao || dados.situacao || dados.situacaoAuto,
    observacao: row.observacao || dados.observacao,
    ...dados
  };
}

function dbRowToAbastecimento(row) {
  if (!row) return null;
  let dados = {};
  try { dados = JSON.parse(row.dados_json || '{}'); } catch (e) { /* ignore */ }
  const fotoValida = dados.foto || dados.fotoNota || dados.fotoVisor || dados.fotoComprovante || null;
  return {
    ...dados,
    id: row.id,
    foto: fotoValida,
    fotoNota: fotoValida,
    fotoVisor: fotoValida,
    fotoComprovante: fotoValida,
    placa: row.placa || dados.veiculo || dados.placa,
    modelo: row.modelo || dados.modelo,
    veiculo_id: row.veiculo_id || dados.veiculo_id,
    motorista: row.motorista || dados.motorista || dados.requisitante,
    tipo_combustivel: row.tipo_combustivel || dados.combustivel,
    litros: row.litros || dados.qtde,
    valor_litro: row.valor_litro || dados.valorUnitario,
    valor_total: row.valor_total || dados.valorTotal,
    km_abastecimento: row.km_abastecimento || dados.km,
    tanque_origem: row.tanque_origem || dados.fornecedor,
    data_hora: row.data_hora || dados.data
  };
}

// ============================================================
// ROTAS
// ============================================================

// Listar lotes disponíveis para uma requisição (FIFO Híbrido)
router.get('/lotes-disponiveis', async (req, res) => {
  try {
    const { estoque, produto } = req.query;
    if (!estoque || !produto) return res.status(400).json({ message: 'estoque e produto são obrigatórios' });

    const db = await getDb();
    const entradasRaw = await db.all(`SELECT * FROM entradas_combustivel`);
    const saidasRaw = await db.all(`SELECT * FROM saidas_combustivel`);

    const matchEstoque = (est1, est2) => {
      if (!est1 || !est2) return false;
      const u1 = String(est1).trim().toUpperCase();
      const u2 = String(est2).trim().toUpperCase();
      if (u1 === u2) return true;
      if (u1.includes('YAMAVES') && u2.includes('YAMAVES')) return true;
      if (u1.includes('ALMOXARIFADO') && u2.includes('ALMOXARIFADO')) return true;
      return false;
    };

    const matchProduto = (p1, p2) => {
      if (!p1 || !p2) return false;
      const u1 = String(p1).trim().toUpperCase();
      const u2 = String(p2).trim().toUpperCase();
      if (u1 === u2) return true;
      if (u1.includes('DIESEL') && u2.includes('DIESEL')) return true;
      if (u1.includes('ARLA') && u2.includes('ARLA')) return true;
      if (u1.includes('GASOLINA') && u2.includes('GASOLINA')) return true;
      return false;
    };

    const entradas = entradasRaw.map(dbRowToEntrada).filter(e => 
      matchEstoque(e.estoque, estoque) && matchProduto(e.produto, produto)
    );
    
    const saidas = saidasRaw.map(dbRowToAbastecimento).filter(s => 
      matchEstoque(s.tanque_origem || s.fornecedor, estoque) && 
      matchProduto(s.tipo_combustivel || s.combustivel, produto) && 
      (s.status === 'ABASTECIDA' || s.status === 'CONCLUÍDO')
    );

    // Ordenar entradas por data (do mais antigo para o mais novo)
    entradas.sort((a, b) => new Date(a.data || 0) - new Date(b.data || 0));

    // 1. Abater Saídas Manuais (aquelas que já tem lote_origem_id)
    const saidasManuais = saidas.filter(s => s.lote_origem_id);
    const saidasAutomaticas = saidas.filter(s => !s.lote_origem_id);

    saidasManuais.forEach(s => {
      const lote = entradas.find(e => String(e.id) === String(s.lote_origem_id));
      const situacaoLote = lote ? (lote.situacao === 'AGUARDANDO COMBUSTIVEL' ? 'AGUARDANDO COMBUSTIVEL' : 'INTEGRO') : '';
      if (lote && situacaoLote !== 'AGUARDANDO COMBUSTIVEL') {
         if (lote.quantidadeReservada === undefined) lote.quantidadeReservada = 0;
         lote.quantidadeReservada += parseMonetaryValue(s.litros || s.qtde) || 0;
      } else if (lote && situacaoLote === 'AGUARDANDO COMBUSTIVEL') {
         // Se amarraram um lote AGUARDANDO COMBUSTIVEL, cai para consumo automático
         saidasAutomaticas.push(s);
      }
    });

    // 2. Abater Saídas Automáticas via FIFO
    let consumoRestante = saidasAutomaticas.reduce((acc, s) => acc + (parseMonetaryValue(s.litros || s.qtde) || 0), 0);

    let lotesDisponiveis = entradas.map(ent => {
      let qtdEntrada = parseMonetaryValue(ent.quantidade) || 0;
      qtdEntrada -= (ent.quantidadeReservada || 0);
      if (qtdEntrada < 0) qtdEntrada = 0;

      let saldo = qtdEntrada;
      let situacao = ent.situacao === 'AGUARDANDO COMBUSTIVEL' ? 'AGUARDANDO COMBUSTIVEL' : 'INTEGRO';

      if (situacao !== 'AGUARDANDO COMBUSTIVEL' && consumoRestante > 0) {
        if (consumoRestante >= qtdEntrada) {
          saldo = 0;
          consumoRestante -= qtdEntrada;
        } else {
          saldo = qtdEntrada - consumoRestante;
          consumoRestante = 0;
        }
      }

      return {
        id: ent.id,
        fornecedor: ent.fornecedor,
        notaFiscal: ent.notaFiscal,
        data: ent.data,
        quantidadeOriginal: ent.quantidade,
        saldoRestante: saldo,
        valorUn: ent.valorUn,
        situacao: situacao
      };
    }).filter(e => e.saldoRestante > 0 && e.situacao !== 'AGUARDANDO COMBUSTIVEL');

    // Se nenhum lote com saldo positivo foi encontrado, traz a última entrada válida como preço de referência do estoque
    if (lotesDisponiveis.length === 0 && entradas.length > 0) {
      const ultimaValida = [...entradas].reverse().find(e => parseFloat(e.valorUn) > 0);
      if (ultimaValida) {
        lotesDisponiveis = [{
          id: ultimaValida.id,
          fornecedor: ultimaValida.fornecedor,
          notaFiscal: ultimaValida.notaFiscal,
          data: ultimaValida.data,
          quantidadeOriginal: ultimaValida.quantidade,
          saldoRestante: 0,
          valorUn: ultimaValida.valorUn,
          situacao: ultimaValida.situacao
        }];
      }
    }

    res.json(lotesDisponiveis);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar lotes disponíveis', error: error.message });
  }
});


// Listar todas as requisições de combustível (saidas_combustivel)
router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    const rows = await db.all(`SELECT * FROM saidas_combustivel ORDER BY id DESC`);
    res.json(rows.map(dbRowToAbastecimento));
  } catch (error) {
    res.status(500).json({ message: 'Erro ao ler dados de combustível', error: error.message });
  }
});

// Listar todas as entradas de combustível
router.get('/entradas', async (req, res) => {
  try {
    const db = await getDb();
    const rows = await db.all(`SELECT * FROM entradas_combustivel`);
    res.json(rows.map(dbRowToEntrada));
  } catch (error) {
    res.status(500).json({ message: 'Erro ao ler dados de entradas', error: error.message });
  }
});

// Criar nova Entrada de Combustível
router.post('/entradas', async (req, res) => {
  try {
    const db = await getDb();
    const id = Date.now().toString();
    const dadosJson = JSON.stringify(req.body);
    
    const situacao = req.body.situacao || req.body.situacaoAuto || null;
    const qtdLitrosParaEstoque = situacao === 'AGUARDANDO COMBUSTIVEL' ? 0 : (req.body.quantidade || null);

    await db.run(
      `INSERT INTO entradas_combustivel (id, fornecedor, tipo_combustivel, quantidade_litros, valor_total, data_entrada, nota_fiscal, valor_unitario, estoque_destino, situacao, observacao, dados_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        req.body.fornecedor || null,
        req.body.produto || null,
        parseMonetaryValue(qtdLitrosParaEstoque),
        parseMonetaryValue(req.body.valorTotal),
        isoToSql(req.body.data || new Date().toISOString()),
        req.body.notaFiscal || null,
        parseMonetaryValue(req.body.valorUn),
        req.body.estoque || null,
        situacao,
        req.body.observacao || null,
        dadosJson
      ]
    );

    res.status(201).json({ message: 'Entrada cadastrada com sucesso', entrada: { id, ...req.body } });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao salvar entrada', error: error.message });
  }
});

// Atualizar Entrada de Estoque
router.put('/entradas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = await getDb();
    const row = await db.get(`SELECT * FROM entradas_combustivel WHERE id = ?`, [id]);
    
    if (!row) return res.status(404).json({ message: 'Entrada não encontrada' });
    
    let dados = {};
    try { dados = JSON.parse(row.dados_json || '{}'); } catch (e) {}
    dados = { ...dados, ...req.body };
    
    const situacaoFinal = dados.situacao || row.situacao;
    const qtdLitrosParaEstoque = situacaoFinal === 'AGUARDANDO COMBUSTIVEL' ? 0 : (dados.quantidade || row.quantidade_litros);

    await db.run(
      `UPDATE entradas_combustivel SET 
        fornecedor = ?, tipo_combustivel = ?, quantidade_litros = ?, valor_total = ?, data_entrada = ?,
        nota_fiscal = ?, valor_unitario = ?, estoque_destino = ?, situacao = ?, observacao = ?, dados_json = ?
       WHERE id = ?`,
      [
        dados.fornecedor || row.fornecedor,
        dados.produto || dados.tipo_combustivel || row.tipo_combustivel,
        qtdLitrosParaEstoque,
        dados.valorTotal || dados.valor_total || row.valor_total,
        isoToSql(dados.data || row.data_entrada),
        dados.notaFiscal || row.nota_fiscal,
        dados.valorUn || row.valor_unitario,
        dados.estoque || row.estoque_destino,
        situacaoFinal,
        dados.observacao || row.observacao,
        JSON.stringify(dados),
        id
      ]
    );

    res.json({ message: 'Entrada atualizada', entrada: dados });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao atualizar entrada', error: error.message });
  }
});

// Transferência de Combustível (Origem -> Destino)
router.post('/transferencia', async (req, res) => {
  try {
    const { data, origem, destino, produto, quantidade, observacao, lote_origem_id, valorUn = 0 } = req.body;
    const timestamp = Date.now();
    const db = await getDb();

    // 1. Criar Saída na Origem (Abastecimentos)
    const idSaida = `${timestamp}_S`;
    const valorTransferencia = (parseFloat(quantidade) * parseFloat(valorUn)).toFixed(2);
    const objSaida = {
      numeroRequisicao: `TRANSF-${timestamp}`,
      data: data,
      fornecedor: origem,
      combustivel: produto,
      qtde: quantidade,
      veiculo: destino,
      status: 'CONCLUÍDO',
      observacao: observacao || `Transferência para ${destino}`,
      valorUnitario: parseFloat(valorUn).toFixed(2),
      valorTotal: valorTransferencia,
      lote_origem_id: lote_origem_id || null
    };
    
    await db.run(
      `INSERT INTO saidas_combustivel (id, placa, tipo_combustivel, litros, valor_total, tanque_origem, data_hora, dados_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [idSaida, destino, produto, quantidade, valorTransferencia, origem, data, JSON.stringify(objSaida)]
    );

    // 2. Criar Entrada no Destino (Entradas)
    const idEntrada = `${timestamp}_E`;
    const valorTotal = (parseFloat(quantidade) * parseFloat(valorUn)).toFixed(2);
    const objEntrada = {
      data: data,
      fornecedor: origem,
      produto: produto,
      quantidade: quantidade,
      valorUn: parseFloat(valorUn),
      valorTotal: parseFloat(valorTotal),
      notaFiscal: `TRANSF-${timestamp}`,
      estoque: destino,
      situacaoAuto: 'INTEGRO',
      observacao: observacao || `Transferência de ${origem}`
    };

    await db.run(
      `INSERT INTO entradas_combustivel (id, fornecedor, tipo_combustivel, quantidade_litros, valor_total, data_entrada, nota_fiscal, valor_unitario, estoque_destino, situacao, observacao, dados_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        idEntrada, 
        origem, 
        produto, 
        quantidade, 
        objEntrada.valorTotal, 
        isoToSql(data),
        objEntrada.notaFiscal,
        objEntrada.valorUn,
        objEntrada.estoque,
        objEntrada.situacaoAuto,
        objEntrada.observacao,
        JSON.stringify(objEntrada)
      ]
    );

    res.status(201).json({ message: 'Transferência realizada', saida: { id: idSaida, ...objSaida }, entrada: { id: idEntrada, ...objEntrada } });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao registrar transferência', error: error.message });
  }
});

// Registrar Descarte de Borra / Limpeza
router.post('/descarte', async (req, res) => {
  try {
    const { data, origem, produto, quantidade, observacao } = req.body;
    const db = await getDb();
    const id = `${Date.now()}_D`;

    const objSaida = {
      numeroRequisicao: `DESCARTE-${Date.now()}`,
      data: data,
      fornecedor: origem,
      combustivel: produto,
      qtde: quantidade,
      veiculo: 'DESCARTE',
      status: 'CONCLUÍDO',
      observacao: observacao || 'Descarte de Borra / Limpeza'
    };

    await db.run(
      `INSERT INTO saidas_combustivel (id, placa, tipo_combustivel, litros, valor_total, tanque_origem, data_hora, dados_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        'DESCARTE',
        produto,
        quantidade,
        0,
        origem,
        data,
        JSON.stringify(objSaida)
      ]
    );

    res.status(201).json({ message: 'Descarte registrado com sucesso', saida: { id, ...objSaida } });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao registrar descarte', error: error.message });
  }
});

// Criar nova Requisição de combustível (Abastecimento Pendente)
router.post('/requisicao', async (req, res) => {
  try {
    const db = await getDb();
    const id = Date.now().toString();
    const reqObj = { status: 'EM ANDAMENTO', ...req.body };
    const dadosJson = JSON.stringify(reqObj);
    const novoKm = reqObj.km ? parseFloat(reqObj.km) : null;

    // === Trava Global Anti-Retrocesso de KM (Requisição) ===
    if (novoKm && reqObj.veiculo) {
      const placaRef = reqObj.veiculo.trim().toUpperCase();
      const vRow = await db.get(`SELECT * FROM frota_veiculos WHERE placa = ?`, [placaRef]);
      if (vRow) {
        let vDados = {};
        try { vDados = JSON.parse(vRow.dados_json || '{}'); } catch(e){}
        const kmAtualBd = parseFloat(vDados.kmAtual) || 0;
        if (novoKm < kmAtualBd) {
          const diferenca = kmAtualBd - novoKm;
          if (diferenca > 2000) {
            return res.status(400).json({ message: `TRAVA DE SEGURANÇA: O KM informado (${novoKm}) é menor que o histórico do veículo (${kmAtualBd}). Diferença exagerada: ${diferenca}.` });
          }
        }
      } else {
        const gRow = await db.get(`SELECT * FROM frota_geradores WHERE nome = ? OR codigo = ?`, [placaRef, placaRef]);
        if (gRow) {
          let gDados = {};
          try { gDados = JSON.parse(gRow.dados_json || '{}'); } catch(e){}
          const hAtualBd = parseFloat(gDados.horimetroAtual) || 0;
          if (novoKm < hAtualBd) {
            const diferenca = hAtualBd - novoKm;
            if (diferenca > 2000) {
              return res.status(400).json({ message: `TRAVA DE SEGURANÇA: O Horímetro informado (${novoKm}) é menor que o histórico (${hAtualBd}). Diferença exagerada: ${diferenca}.` });
            }
          }
        }
      }
    }

    await db.run(
      `INSERT INTO saidas_combustivel (id, placa, motorista, tipo_combustivel, litros, valor_litro, valor_total, km_abastecimento, tanque_origem, data_hora, dados_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        reqObj.veiculo || null,
        reqObj.motorista || reqObj.requisitante || null,
        reqObj.combustivel || null,
        parseMonetaryValue(reqObj.qtde),
        parseMonetaryValue(reqObj.valorUnitario || reqObj.valor_litro),
        parseMonetaryValue(reqObj.valorTotal),
        novoKm,
        reqObj.fornecedor || null,
        reqObj.data || null,
        dadosJson
      ]
    );

    // === Automação Frota (KM) ao abrir requisição se informado ===
    if (novoKm && reqObj.veiculo) {
      const placaRef = reqObj.veiculo.trim().toUpperCase();
      const vRow = await db.get(`SELECT * FROM frota_veiculos WHERE placa = ?`, [placaRef]);
      if (vRow) {
        let vDados = {};
        try { vDados = JSON.parse(vRow.dados_json || '{}'); } catch(e){}
        if (novoKm > (parseFloat(vDados.kmAtual) || 0)) {
          vDados.kmAtual = novoKm;
          await db.run(`UPDATE frota_veiculos SET dados_json = ? WHERE id = ?`, [JSON.stringify(vDados), vRow.id]);
        }
      }

      // === Automação Geradores (Horímetro) ===
      const granjaRef = reqObj.veiculo.trim(); 
      const gRow = await db.get(`SELECT * FROM frota_geradores WHERE nome = ? OR codigo = ?`, [granjaRef, granjaRef]);
      if (gRow) {
        let gDados = {};
        try { gDados = JSON.parse(gRow.dados_json || '{}'); } catch(e){}
        if (novoKm > (parseFloat(gDados.horimetroAtual) || 0)) {
          gDados.horimetroAtual = novoKm;
          await db.run(`UPDATE frota_geradores SET dados_json = ? WHERE id = ?`, [JSON.stringify(gDados), gRow.id]);
        }
      }
    }

    res.status(201).json({ message: 'Requisição cadastrada', requisicao: { id, ...reqObj } });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao salvar requisição', error: error.message });
  }
});

// Anexar Foto do Comprovante / Visor da Bomba na Requisição
router.patch('/requisicao/:id/foto', async (req, res) => {
  try {
    const { id } = req.params;
    const { foto, fotoNota, fotoVisor, fotoComprovante } = req.body;
    const img = foto || fotoNota || fotoVisor || fotoComprovante;
    if (!img) return res.status(400).json({ message: 'Foto é obrigatória' });

    const db = await getDb();
    let row = await db.get(`SELECT * FROM saidas_combustivel WHERE id = ?`, [id]);
    if (!row) {
      const rows = await db.all(`SELECT * FROM saidas_combustivel`);
      row = rows.find(r => {
        try {
          const d = JSON.parse(r.dados_json || '{}');
          return String(d.numeroRequisicao).trim() === String(id).trim() || String(r.id).trim() === String(id).trim();
        } catch(e) { return false; }
      });
    }

    if (!row) return res.status(404).json({ message: 'Requisição não encontrada' });

    let dados = {};
    try { dados = JSON.parse(row.dados_json || '{}'); } catch(e){}

    dados.foto = img;
    dados.fotoNota = img;
    dados.fotoVisor = img;
    dados.fotoComprovante = img;

    await db.run(`UPDATE saidas_combustivel SET dados_json = ? WHERE id = ?`, [JSON.stringify(dados), row.id]);
    
    const io = req.app.get('io');
    if (io) {
      io.emit('combustivel_atualizado', { tipo: 'foto', id: row.id, numeroRequisicao: dados.numeroRequisicao });
    }

    res.json({ message: 'Foto anexada à requisição com sucesso', foto: img, requisicao: { id: row.id, ...dados } });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao anexar foto', error: error.message });
  }
});

// Registrar Abastecimento (Finaliza Requisição)
router.put('/abastecimento/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = await getDb();

    // Busca pela requisição
    let row = await db.get(`SELECT * FROM saidas_combustivel WHERE id = ?`, [id]);
    if (!row) {
      // fallback: busca por numeroRequisicao (guardado em dados_json)
      const rows = await db.all(`SELECT * FROM saidas_combustivel`);
      row = rows.find(r => {
        try {
          const d = JSON.parse(r.dados_json || '{}');
          return String(d.numeroRequisicao).trim() === String(id).trim() || String(r.id).trim() === String(id).trim();
        } catch(e) { return false; }
      });
    }

    if (!row) return res.status(404).json({ message: 'Requisição não encontrada' });
    
    let dados = {};
    try { dados = JSON.parse(row.dados_json || '{}'); } catch(e){}

    if (dados.status === 'ABASTECIDA') {
      return res.status(400).json({ message: 'Esta requisição já foi abastecida' });
    }

    // Preserva foto prévia caso o payload chegue sem foto ou com campo vazio
    const fotoExistente = dados.foto || dados.fotoNota || dados.fotoVisor || dados.fotoComprovante || null;
    const fotoRecebida = req.body.foto || req.body.fotoNota || req.body.fotoVisor || req.body.fotoComprovante || null;
    const fotoFinal = fotoRecebida || fotoExistente;

    const agora = new Date();
    const ano = agora.getFullYear();
    const mes = String(agora.getMonth() + 1).padStart(2, '0');
    const dia = String(agora.getDate()).padStart(2, '0');
    const dataAtual = `${ano}-${mes}-${dia}`;
    const horaAtual = `${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`;
    const dataHoraISO = req.body.data_hora || req.body.data_hora_abastecimento || `${dataAtual}T${horaAtual}:00`;

    dados = {
      ...dados,
      ...req.body,
      data_abastecimento: req.body.data_abastecimento || dataAtual,
      hora_abastecimento: req.body.hora_abastecimento || horaAtual,
      data_hora: dataHoraISO,
      data_hora_abastecimento: dataHoraISO,
      status: 'ABASTECIDA'
    };
    if (fotoFinal) {
      dados.foto = fotoFinal;
      dados.fotoNota = fotoFinal;
      dados.fotoVisor = fotoFinal;
      dados.fotoComprovante = fotoFinal;
    }
    const novoKm = req.body.km ? parseFloat(req.body.km) : null;

    // === Trava Global Anti-Retrocesso de KM (Abastecimento) ===
    if (novoKm && dados.veiculo) {
      const placaRef = dados.veiculo.trim().toUpperCase();
      const vRow = await db.get(`SELECT * FROM frota_veiculos WHERE placa = ?`, [placaRef]);
      if (vRow) {
        let vDados = {};
        try { vDados = JSON.parse(vRow.dados_json || '{}'); } catch(e){}
        const kmAtualBd = parseFloat(vDados.kmAtual) || 0;
        if (novoKm < kmAtualBd) {
          const diferenca = kmAtualBd - novoKm;
          if (diferenca > 2000) {
            return res.status(400).json({ message: `TRAVA DE SEGURANÇA: O KM abastecido (${novoKm}) é menor que o histórico do veículo (${kmAtualBd}). Operação bloqueada.` });
          }
        }
      } else {
        const gRow = await db.get(`SELECT * FROM frota_geradores WHERE nome = ? OR codigo = ?`, [placaRef, placaRef]);
        if (gRow) {
          let gDados = {};
          try { gDados = JSON.parse(gRow.dados_json || '{}'); } catch(e){}
          const hAtualBd = parseFloat(gDados.horimetroAtual) || 0;
          if (novoKm < hAtualBd) {
            const diferenca = hAtualBd - novoKm;
            if (diferenca > 2000) {
              return res.status(400).json({ message: `TRAVA DE SEGURANÇA: O Horímetro abastecido (${novoKm}) é menor que o histórico (${hAtualBd}). Operação bloqueada.` });
            }
          }
        }
      }
    }

    await db.run(
      `UPDATE saidas_combustivel SET 
         placa = ?, motorista = ?, tipo_combustivel = ?, litros = ?, valor_litro = ?, valor_total = ?, km_abastecimento = ?, tanque_origem = ?, data_hora = ?, dados_json = ?
       WHERE id = ?`,
      [
        dados.veiculo || row.placa,
        dados.motorista || row.motorista,
        req.body.combustivel || req.body.tipo_combustivel || null,
        parseMonetaryValue(req.body.qtde || row.litros),
        parseMonetaryValue(req.body.valorUnitario || row.valor_litro),
        parseMonetaryValue(req.body.valorTotal || row.valor_total),
        parseMonetaryValue(req.body.kmAtual || req.body.km_abastecimento),
        req.body.fornecedor || req.body.tanque_origem || null,
        dataHoraISO,
        JSON.stringify(dados),
        row.id
      ]
    );

    // === Automação Frota (KM) ===
    if (novoKm && dados.veiculo) {
      const placaRef = dados.veiculo.trim().toUpperCase();
      const vRow = await db.get(`SELECT * FROM frota_veiculos WHERE placa = ?`, [placaRef]);
      if (vRow) {
        let vDados = {};
        try { vDados = JSON.parse(vRow.dados_json || '{}'); } catch(e){}
        if (novoKm > (parseFloat(vDados.kmAtual) || 0)) {
          vDados.kmAtual = novoKm;
          await db.run(`UPDATE frota_veiculos SET dados_json = ? WHERE id = ?`, [JSON.stringify(vDados), vRow.id]);
        }
      }
    }

    // === Automação Geradores (Horímetro) ===
    if (novoKm && dados.veiculo) {
      const granjaRef = dados.veiculo.trim(); 
      const gRow = await db.get(`SELECT * FROM frota_geradores WHERE nome = ? OR codigo = ?`, [granjaRef, granjaRef]);
      if (gRow) {
        let gDados = {};
        try { gDados = JSON.parse(gRow.dados_json || '{}'); } catch(e){}
        if (novoKm > (parseFloat(gDados.horimetroAtual) || 0)) {
          gDados.horimetroAtual = novoKm;
          await db.run(`UPDATE frota_geradores SET dados_json = ? WHERE id = ?`, [JSON.stringify(gDados), gRow.id]);
        }
      }
    }

    res.json({ message: 'Abastecimento registrado', requisicao: { id: row.id, ...dados } });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao registrar abastecimento', error: error.message });
  }
});

// Cancelar Requisição de Combustível
router.put('/cancelar/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { motivoCancelamento } = req.body;
    const db = await getDb();

    let row = await db.get(`SELECT * FROM saidas_combustivel WHERE id = ?`, [id]);
    if (!row) {
      const rows = await db.all(`SELECT * FROM saidas_combustivel`);
      row = rows.find(r => {
        try {
          const d = JSON.parse(r.dados_json || '{}');
          return d.numeroRequisicao === id;
        } catch(e) { return false; }
      });
    }

    if (!row) return res.status(404).json({ message: 'Requisição não encontrada' });

    let dados = {};
    try { dados = JSON.parse(row.dados_json || '{}'); } catch(e){}
    
    dados.status = 'CANCELADA';
    dados.motivoCancelamento = motivoCancelamento || 'Cancelado pelo usuário';
    dados.dataCancelamento = new Date().toISOString();

    await db.run(`UPDATE saidas_combustivel SET dados_json = ? WHERE id = ?`, [JSON.stringify(dados), row.id]);

    res.json({ message: 'Requisição cancelada', requisicao: { id: row.id, ...dados } });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao cancelar', error: error.message });
  }
});

export default router;
