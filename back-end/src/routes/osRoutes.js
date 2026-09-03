import express from 'express';
import getDb from '../config/database.js';
import { getJsonData, saveJsonData } from '../services/jsonDbService.js';
import notificationService from '../services/notificationService.js';
import { parseMonetaryValue } from '../utils/currency.js';

const router = express.Router();

// ============================================================
// HELPERS
// ============================================================

function isoToSql(isoStr) {
  if (!isoStr) return null;
  return isoStr.slice(0, 19).replace('T', ' ');
}

async function obterMapProdutos(db) {
  try {
    const produtos = await db.all(`SELECT codigo, descricao, valor_unitario FROM produtos_omie`);
    const prodMap = new Map();
    produtos.forEach(p => {
      if (p.codigo) prodMap.set(p.codigo.trim().toUpperCase(), parseFloat(p.valor_unitario) || 0);
      if (p.descricao) prodMap.set(p.descricao.trim().toUpperCase(), parseFloat(p.valor_unitario) || 0);
    });
    return prodMap;
  } catch (e) {
    console.error('Erro ao carregar mapa de produtos:', e);
    return new Map();
  }
}

function enriquecerConsumiveisComPreco(consumiveis, prodMap) {
  if (!consumiveis || !Array.isArray(consumiveis)) return [];
  return consumiveis.map(c => {
    let vUnit = parseFloat(c.valor_unitario) || 0;
    if (!vUnit && prodMap) {
      const cod = (c.codigo || '').trim().toUpperCase();
      const desc = (c.descricao || '').trim().toUpperCase();
      vUnit = prodMap.get(cod) || prodMap.get(desc) || 0;
    }
    return {
      ...c,
      valor_unitario: vUnit
    };
  });
}


async function saveTurnos(db, osId, servicosExecutados) {
  if (!servicosExecutados || !Array.isArray(servicosExecutados)) return;
  
  await db.run(`DELETE FROM os_turnos WHERE os_id = ?`, [osId]);
  
  for (const turno of servicosExecutados) {
    const turnoId = Date.now().toString() + Math.floor(Math.random() * 10000).toString();
    
    await db.run(`
      INSERT INTO os_turnos (id, os_id, data_apontamento, hora_inicio, hora_fim1, hora_inicio2, hora_fim, descricao_servico, is_saved)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      turnoId, osId, turno.data || null, turno.horaInicio || null, turno.horaFim1 || null, turno.horaInicio2 || null, turno.horaFim || null, turno.descricao || null, turno.isSaved ? 1 : 0
    ]);

    if (turno.maoDeObra && Array.isArray(turno.maoDeObra)) {
      for (const m of turno.maoDeObra) {
        const mId = Date.now().toString() + Math.floor(Math.random() * 10000).toString();
        await db.run(`INSERT INTO os_equipe (id, turno_id, matricula, nome, funcao, horas) VALUES (?, ?, ?, ?, ?, ?)`,
          [mId, turnoId, m.matricula || null, m.nome || null, m.funcao || null, parseFloat(m.horas) || 0]
        );
      }
    }

    if (turno.pecasUtilizadas && Array.isArray(turno.pecasUtilizadas)) {
      for (const p of turno.pecasUtilizadas) {
        const pId = Date.now().toString() + Math.floor(Math.random() * 10000).toString();
        await db.run(`INSERT INTO os_pecas_utilizadas (id, turno_id, codigo, descricao, quantidade) VALUES (?, ?, ?, ?, ?)`,
          [pId, turnoId, p.codigo || null, p.descricao || null, parseFloat(p.quantidade) || 0]
        );
      }
    }

    if (turno.veiculosUtilizados && Array.isArray(turno.veiculosUtilizados)) {
      for (const v of turno.veiculosUtilizados) {
        const vId = Date.now().toString() + Math.floor(Math.random() * 10000).toString();
        await db.run(`INSERT INTO os_veiculos_utilizados (id, turno_id, placa, km_inicial, km_final, km_total) VALUES (?, ?, ?, ?, ?, ?)`,
          [vId, turnoId, v.placa || null, parseFloat(v.kmInicial) || null, parseFloat(v.kmFinal) || null, parseFloat(v.km) || 0]
        );
      }
    }
  }
}

// ============================================================
// GET /os — Listar todas as Ordens de Serviço
// ============================================================
router.get('/os', async (req, res) => {
  try {
    const db = await getDb();
    const rows = await db.all(`SELECT * FROM ordens_servico ORDER BY data_criacao DESC`);
    
    const turnos = await db.all(`SELECT * FROM os_turnos`);
    const equipe = await db.all(`SELECT * FROM os_equipe`);
    const pecas = await db.all(`SELECT * FROM os_pecas_utilizadas`);
    const veiculos = await db.all(`SELECT * FROM os_veiculos_utilizados`);
    const prodMap = await obterMapProdutos(db);

    const result = rows.map(row => {
      let dados = {};
      try { dados = JSON.parse(row.dados_json || '{}'); } catch (e) { /* ignore */ }
      
      const osTurnos = turnos.filter(t => t.os_id === row.id).map(t => {
        return {
          data: t.data_apontamento,
          horaInicio: t.hora_inicio,
          horaFim1: t.hora_fim1,
          horaInicio2: t.hora_inicio2,
          horaFim: t.hora_fim,
          descricao: t.descricao_servico,
          isSaved: Boolean(t.is_saved),
          maoDeObra: equipe.filter(e => e.turno_id === t.id).map(e => ({
            matricula: e.matricula, nome: e.nome, funcao: e.funcao, horas: e.horas
          })),
          pecasUtilizadas: pecas.filter(p => p.turno_id === t.id).map(p => {
            const cod = (p.codigo || '').trim().toUpperCase();
            const desc = (p.descricao || '').trim().toUpperCase();
            const vUnit = prodMap.get(cod) || prodMap.get(desc) || 0;
            return {
              codigo: p.codigo,
              descricao: p.descricao,
              quantidade: p.quantidade,
              valor_unitario: vUnit
            };
          }),
          veiculosUtilizados: veiculos.filter(v => v.turno_id === t.id).map(v => ({
            placa: v.placa, kmInicial: v.km_inicial, kmFinal: v.km_final, km: v.km_total
          }))
        };
      });

      let consumiveisTratados = enriquecerConsumiveisComPreco(dados.consumiveis, prodMap);

      const turnosFinais = dados.servicosExecutados && Array.isArray(dados.servicosExecutados) && dados.servicosExecutados.length > 0
        ? dados.servicosExecutados
        : (osTurnos.length > 0 ? osTurnos : []);

      // Fallback: se consumiveis está vazio mas existem peças nos turnos
      if ((!consumiveisTratados || consumiveisTratados.length === 0) && turnosFinais.length > 0) {
        const extraidos = [];
        turnosFinais.forEach(t => {
          (t.pecasUtilizadas || []).forEach(p => {
            if (p.descricao || p.codigo) {
              const cod = (p.codigo || '').trim().toUpperCase();
              const desc = (p.descricao || '').trim().toUpperCase();
              const vUnit = parseFloat(p.valor_unitario) || prodMap.get(cod) || prodMap.get(desc) || 0;
              const existente = extraidos.find(x => (p.codigo && x.codigo === p.codigo) || (p.descricao && x.descricao === p.descricao));
              if (existente) {
                existente.quantidade += (parseFloat(p.quantidade) || 0);
                if (p.fotoNota && !existente.fotoNota) existente.fotoNota = p.fotoNota;
              } else {
                extraidos.push({
                  data: t.data || '',
                  codigo: p.codigo || (p.tipo === 'EXTERNA' ? 'EXTERNO' : ''),
                  descricao: p.descricao || '',
                  quantidade: parseFloat(p.quantidade) || 0,
                  valor_unitario: vUnit,
                  tipo: p.tipo || (p.codigo === 'EXTERNO' ? 'EXTERNA' : 'ESTOQUE'),
                  fotoNota: p.fotoNota || ''
                });
              }
            }
          });
        });
        if (extraidos.length > 0) {
          consumiveisTratados = extraidos;
        }
      }

      const dataFormatadaFallback = row.data_criacao ? new Date(row.data_criacao).toISOString().slice(0, 10) : '';
      const horaFormatadaFallback = row.data_criacao ? new Date(row.data_criacao).toISOString().slice(11, 16) : '';

      return {
        id: row.id,
        codigo: row.numero_os,
        situacao: row.situacao,
        tipo: row.tipo,
        setor: row.setor,
        centroCusto: row.centro_custo,
        requisitante: row.requisitante,
        tecnicoResponsavel: row.tecnico,
        prioridade: row.prioridade,
        complexidade: row.complexidade,
        valorEstimado: row.valor_estimado,
        descricao: row.descricao || dados.descricao,
        motivo: row.motivo || dados.motivo,
        observacao: row.observacao || dados.observacao,
        resultado: row.resultado || dados.resultado,
        prazo: row.prazo || dados.prazo,
        isEmergencia: Boolean(row.is_emergencia || dados.isEmergencia),
        dataCriacao: row.data_criacao,
        ...dados,
        data: dados.data || dataFormatadaFallback,
        hora: dados.hora || horaFormatadaFallback,
        consumiveis: consumiveisTratados,
        servicosExecutados: turnosFinais
      };
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao ler ordens de serviço', error: error.message });
  }
});

// ============================================================
// GET /os/proximo-codigo — Calcular próximo código da OS do mês
// ============================================================
router.get('/os/proximo-codigo', async (req, res) => {
  try {
    const db = await getDb();
    const dataReq = req.query.data || new Date().toISOString().split('T')[0];
    const [ano, mes] = dataReq.split('-');
    const sufixo = `${mes}${ano.slice(-2)}`;

    const rows = await db.all(
      `SELECT numero_os FROM ordens_servico WHERE numero_os LIKE ?`,
      [`%-${sufixo}`]
    );

    let proximoNumero = 1;
    if (rows.length > 0) {
      const numeros = rows.map(r => {
        const numStr = (r.numero_os || '').split('-')[0];
        return parseInt(numStr, 10) || 0;
      });
      proximoNumero = Math.max(...numeros) + 1;
    }

    const proximoCodigo = `${proximoNumero.toString().padStart(2, '0')}-${sufixo}`;
    res.json({ proximoCodigo });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao calcular próximo código', error: error.message });
  }
});

// ============================================================
// POST /os — Criar nova Ordem de Serviço
// ============================================================
router.post('/os', async (req, res) => {
  try {
    const db = await getDb();
    
    // === TRAVA ANTI-DUPLICAÇÃO ===
    // Evita OS idênticas cadastradas nos últimos 2 minutos
    const requisitanteDuplicidade = req.body.requisitante ? String(req.body.requisitante).trim() : null;
    const setorDuplicidade = req.body.setor ? String(req.body.setor).trim() : null;
    const descricaoDuplicidade = req.body.descricao ? String(req.body.descricao).trim() : null;

    try {
      if (requisitanteDuplicidade && setorDuplicidade && descricaoDuplicidade) {
        const limiteTempo = new Date(Date.now() - 2 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
        const sqlDuplicidade = `
          SELECT * FROM ordens_servico 
          WHERE requisitante = ? 
            AND setor = ? 
            AND descricao = ? 
            AND data_criacao >= ?
        `;
        const dup = await db.get(sqlDuplicidade, [requisitanteDuplicidade, setorDuplicidade, descricaoDuplicidade, limiteTempo]);
        if (dup) {
          let dupOsCompleta = {};
          try { dupOsCompleta = JSON.parse(dup.dados_json); } catch(e){}
          console.log(`[ANTI-DUPLICAÇÃO] OS duplicada bloqueada. Requisitante: ${requisitanteDuplicidade}`);
          return res.status(201).json({
            message: 'Ordem de Serviço salva com sucesso',
            os: { id: dup.id, codigo: dup.numero_os, ...dupOsCompleta }
          });
        }
      }
    } catch (dupErr) {
      console.warn('Aviso ao verificar duplicidade (ignorado para não travar cadastro):', dupErr.message);
    }
    // === FIM TRAVA ANTI-DUPLICAÇÃO ===
    
    let situacaoInicial = req.body.situacao;
    if (typeof situacaoInicial === 'string') {
      situacaoInicial = situacaoInicial.trim().replace(/\s+/g, '_');
    }

    const STATUS_VALIDOS = [
      'EMERGENCIA_CHEFE_SETOR', 'AGUARDANDO_CHEFE_SETOR', 'AGUARDANDO_GERENTE_SERVICOS',
      'AGUARDANDO_DIRETORIA', 'ATRIBUIDO_TECNICO', 'AGUARDANDO_ALMOXARIFADO',
      'PECAS_ENTREGUES', 'EM_ANDAMENTO', 'AGUARDANDO_INSUMO',
      'CONCLUIDO', 'CANCELADO', 'REJEITADO_DIRETORIA'
    ];

    if (!situacaoInicial || !STATUS_VALIDOS.includes(situacaoInicial)) {
      if (req.body.isEmergencia) {
        situacaoInicial = 'EMERGENCIA_CHEFE_SETOR';
      } else if (req.body.tipo === 'INVESTIMENTO' && parseMonetaryValue(req.body.valorEstimado) > 5000) {
        situacaoInicial = 'AGUARDANDO_DIRETORIA';
      } else if (req.body.tipo === 'INVESTIMENTO' && parseMonetaryValue(req.body.valorEstimado) > 1000) {
        situacaoInicial = 'AGUARDANDO_GERENTE_SERVICOS';
      } else {
        situacaoInicial = 'AGUARDANDO_CHEFE_SETOR';
      }
    }

    let finalCodigo = req.body.codigo;
    let inseridoSucesso = false;
    let tentativas = 0;
    const maxTentativas = 10;
    let osCompleta = null;

    while (!inseridoSucesso && tentativas < maxTentativas) {
      if (!finalCodigo || tentativas > 0) {
        const dataReq = req.body.data || new Date().toISOString().split('T')[0];
        const [ano, mes] = dataReq.split('-');
        const sufixo = `${mes}${ano.slice(-2)}`;
        const rows = await db.all(`SELECT numero_os FROM ordens_servico WHERE numero_os LIKE ?`, [`%-${sufixo}`]);
        let proximoNumero = 1;
        if (rows.length > 0) {
          const numeros = rows.map(r => parseInt((r.numero_os || '').split('-')[0], 10) || 0);
          proximoNumero = Math.max(...numeros) + 1 + tentativas;
        }
        finalCodigo = `${proximoNumero.toString().padStart(2, '0')}-${sufixo}`;
      }

      const valorEstimado = parseMonetaryValue(req.body.valorEstimado) ||
        (req.body.itensCarrinho ? req.body.itensCarrinho.reduce((acc, i) => acc + (parseMonetaryValue(i.quantidade) * parseMonetaryValue(i.valor_unitario)), 0) : 0);

      const id = Date.now().toString() + Math.floor(Math.random() * 10000).toString();
      const dataCriacao = new Date().toISOString();

      osCompleta = {
        id,
        dataCriacao,
        ...req.body,
        codigo: finalCodigo,
        situacao: situacaoInicial,
        valorEstimado: valorEstimado || 0
      };
      
      const osParaJson = { ...osCompleta };
      const dadosJson = JSON.stringify(osParaJson);

      try {
        const queryInsert = `INSERT INTO ordens_servico 
          (id, numero_os, situacao, tipo, setor, centro_custo, requisitante, tecnico, prioridade, complexidade, valor_estimado, data_criacao, dados_json, descricao, motivo, observacao, resultado, prazo, is_emergencia)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        const params = [
          id,
          finalCodigo,
          situacaoInicial || null,
          req.body.tipo || null,
          req.body.setor || null,
          req.body.centroCusto || null,
          req.body.requisitante || null,
          req.body.tecnicoResponsavel || null,
          req.body.prioridade || null,
          req.body.complexidade || null,
          valorEstimado || 0,
          isoToSql(dataCriacao),
          dadosJson,
          req.body.descricao || null,
          req.body.motivo || null,
          req.body.observacao || null,
          req.body.resultado || null,
          req.body.prazo || null,
          req.body.isEmergencia ? 1 : 0
        ];

        await db.run(queryInsert, params);
        await saveTurnos(db, id, req.body.servicosExecutados);

        inseridoSucesso = true;
      } catch (err) {
        const isDuplicate = 
          (err.message && (err.message.includes('UNIQUE constraint') || err.message.includes('Duplicate entry') || err.message.includes('ER_DUP_ENTRY'))) ||
          err.code === 'ER_DUP_ENTRY' ||
          err.errno === 1062;

        if (isDuplicate) {
          console.warn(`Código de OS conflitante (${finalCodigo}). Tentando recalcular próximo... (tentativa ${tentativas + 1})`);
          finalCodigo = null; 
          tentativas++;
        } else {
          console.error('Erro real ao inserir OS:', err);
          throw err;
        }
      }
    }

    if (!inseridoSucesso) {
      throw new Error('Falha contínua ao gerar o código único da O.S. Tente novamente mais tarde.');
    }

    try {
      if (req.app && req.app.get('io')) {
        notificationService.notificarMudancaStatus(req.app.get('io'), {
          tipo: 'os',
          id: osCompleta.id,
          novoStatus: osCompleta.situacao,
          mensagem: `Nova OS gerada: ${osCompleta.codigo} - ${osCompleta.situacao}`
        });
      }
    } catch (socketErr) {
      console.warn('Aviso ao emitir socket de OS:', socketErr.message);
    }

    res.status(201).json({
      message: 'Ordem de Serviço salva com sucesso',
      os: osCompleta
    });
  } catch (error) {
    console.error('Erro global ao salvar OS:', error);
    res.status(500).json({ message: 'Erro ao salvar Ordem de Serviço', error: error.message });
  }
});

// ============================================================
// PUT /os/:codigo — Atualizar Ordem de Serviço
// ============================================================
router.put('/os/:codigo', async (req, res) => {
  try {
    const db = await getDb();
    const { codigo } = req.params;
    const updates = req.body;

    if (updates.situacao && typeof updates.situacao === 'string') {
      updates.situacao = updates.situacao.trim().replace(/\s+/g, '_');
    }

    if (updates.valorEstimado !== undefined) {
      updates.valorEstimado = parseMonetaryValue(updates.valorEstimado);
    }


    const codigoDecodificado = decodeURIComponent(codigo).trim();

    const row = await db.get(
      `SELECT * FROM ordens_servico WHERE UPPER(numero_os) = UPPER(?) OR id = ?`,
      [codigoDecodificado, codigoDecodificado]
    );

    if (!row) {
      return res.status(404).json({ message: `Ordem de Serviço ${codigo} não encontrada.` });
    }

    let dadosAntigos = {};
    try { dadosAntigos = JSON.parse(row.dados_json || '{}'); } catch (e) { /* ignore */ }
    const prodMap = await obterMapProdutos(db);
    const consumiveisAtualizados = enriquecerConsumiveisComPreco(updates.consumiveis || dadosAntigos.consumiveis, prodMap);

    // === Sistema de Auditoria / Histórico de Edições com Diff ===
    const historico = dadosAntigos.historicoEdicoes || [];
    
    if (updates.editorResponsavel) {
      const alteracoes = [];
      const camposIgnorados = ['editorResponsavel', 'motivoEdicao', 'historicoEdicoes'];
      
      // Montamos um objeto consolidado do que seria o novo estado para comparar
      const novoEstadoCalculado = { ...updates, consumiveis: consumiveisAtualizados };

      for (const key in novoEstadoCalculado) {
        if (camposIgnorados.includes(key)) continue;
        
        const valAntigo = dadosAntigos[key];
        const valNovo = novoEstadoCalculado[key];
        
        // Comparação robusta para strings, números, arrays e objetos
        const strAntigo = JSON.stringify(valAntigo !== undefined ? valAntigo : null);
        const strNovo = JSON.stringify(valNovo !== undefined ? valNovo : null);
        
        if (strAntigo !== strNovo) {
          alteracoes.push({
            campo: key,
            de: valAntigo,
            para: valNovo
          });
        }
      }

      historico.push({
        data: new Date().toISOString(),
        editor: updates.editorResponsavel,
        motivo: updates.motivoEdicao || 'Edição geral',
        alteracoes: alteracoes.length > 0 ? alteracoes : null
      });
    }

    const osAtualizada = { 
      ...dadosAntigos, 
      ...updates, 
      consumiveis: consumiveisAtualizados,
      historicoEdicoes: historico
    };
    
    // Limpar campos temporários de edição para não inflar o JSON
    delete osAtualizada.editorResponsavel;
    delete osAtualizada.motivoEdicao;

    const osParaJson = { ...osAtualizada };
    const dadosJson = JSON.stringify(osParaJson);

    const agora = new Date().toISOString();

    await db.run(
      `UPDATE ordens_servico 
       SET situacao = ?, tipo = ?, setor = ?, centro_custo = ?, requisitante = ?, tecnico = ?,
           prioridade = ?, complexidade = ?, valor_estimado = ?, atualizado_em = ?, dados_json = ?,
           descricao = ?, motivo = ?, observacao = ?, resultado = ?, prazo = ?, is_emergencia = ?
       WHERE id = ?`,
      [
        osAtualizada.situacao || row.situacao,
        osAtualizada.tipo || row.tipo,
        osAtualizada.setor || row.setor,
        osAtualizada.centroCusto || row.centro_custo,
        osAtualizada.requisitante || row.requisitante,
        osAtualizada.tecnicoResponsavel || row.tecnico,
        osAtualizada.prioridade || row.prioridade,
        osAtualizada.complexidade || row.complexidade,
        osAtualizada.valorEstimado !== undefined ? osAtualizada.valorEstimado : row.valor_estimado,
        isoToSql(agora),
        dadosJson,
        osAtualizada.descricao || row.descricao,
        osAtualizada.motivo || row.motivo,
        osAtualizada.observacao || row.observacao,
        osAtualizada.resultado || row.resultado,
        osAtualizada.prazo || row.prazo,
        osAtualizada.isEmergencia ? 1 : 0,
        row.id
      ]
    );

    await saveTurnos(db, row.id, osAtualizada.servicosExecutados);

    // === Automação de Frota: atualizar KM quando OS é CONCLUIDA ===
    const veiculosNoDiario = (osAtualizada.servicosExecutados || []).reduce((acc, s) => {
      if (s.veiculosUtilizados && Array.isArray(s.veiculosUtilizados)) {
        acc.push(...s.veiculosUtilizados);
      }
      return acc;
    }, []);
    const todosVeiculosNaOS = [...(osAtualizada.veiculos || []), ...veiculosNoDiario];

    if (osAtualizada.situacao === 'CONCLUIDO' && todosVeiculosNaOS.length > 0) {
      try {
        const strDescricao = (osAtualizada.descricao || '').toUpperCase();
        const strServicos = (osAtualizada.servicosExecutados || []).map(s => (s.descricao || '').toUpperCase()).join(' ');
        const textoParaBusca = `${strDescricao} ${strServicos}`;
        const trocouOleoTexto = textoParaBusca.includes('TROCA DE ÓLEO') || textoParaBusca.includes('TROCA DE OLEO') || textoParaBusca.includes('TROCOU OLEO') || textoParaBusca.includes('TROCA OLEO');
        const fezRevisaoTexto = textoParaBusca.includes('REVISÃO') || textoParaBusca.includes('REVISAO');

        for (const vOs of todosVeiculosNaOS) {
          if (!vOs.placa) continue;
          const vRow = await db.get(`SELECT * FROM frota_veiculos WHERE placa = ?`, [vOs.placa]);
          if (!vRow) continue;

          let dadosVeiculo = {};
          try { dadosVeiculo = JSON.parse(vRow.dados_json || '{}'); } catch (e) { /* ignore */ }

          const kmRegistro = parseFloat(vOs.kmFinal) || parseFloat(vOs.kmInicial) || 0;
          if (kmRegistro > 0) {
            if (kmRegistro > (parseFloat(dadosVeiculo.kmAtual) || 0)) {
              dadosVeiculo.kmAtual = kmRegistro;
            }
            const trocouOleo = vOs.trocouOleo !== undefined ? Boolean(vOs.trocouOleo) : trocouOleoTexto;
            const fezRevisao = vOs.fezRevisao !== undefined ? Boolean(vOs.fezRevisao) : fezRevisaoTexto;
            if (trocouOleo && kmRegistro > parseFloat(dadosVeiculo.kmTrocaOleo || 0)) {
              dadosVeiculo.kmTrocaOleo = kmRegistro;
            }
            if (fezRevisao && kmRegistro > parseFloat(dadosVeiculo.kmRevisao || 0)) {
              dadosVeiculo.kmRevisao = kmRegistro;
            }
            dadosVeiculo.ultimaAtualizacao = agora;

            await db.run(
              `UPDATE frota_veiculos SET dados_json = ? WHERE placa = ?`,
              [JSON.stringify(dadosVeiculo), vOs.placa]
            );
            console.log(`[FROTA] KM atualizado para placa ${vOs.placa}: ${kmRegistro}`);
          }
        }
      } catch (err) {
        console.error('Erro na automação da frota:', err);
      }
    }

    // === Automação de Geradores: atualizar Horímetro/Data quando OS é CONCLUIDA ===
    if (osAtualizada.situacao === 'CONCLUIDO') {
      try {
        const todosVeiculosNaOSParaGeradores = [...(osAtualizada.veiculos || []), ...veiculosNoDiario];
        let geradorProcessado = false;

        for (const vOs of todosVeiculosNaOSParaGeradores) {
          const gRow = await db.get(`SELECT * FROM frota_geradores WHERE nome = ? OR codigo = ?`, [vOs.placa, vOs.placa]);
          if (gRow) {
            geradorProcessado = true;
            let dadosGerador = {};
            try { dadosGerador = JSON.parse(gRow.dados_json || '{}'); } catch(e) {}
            
            const hVal = parseFloat(vOs.kmFinal);
            if (!isNaN(hVal) && hVal > 0) {
              // Só atualiza o horímetro atual se for maior que o já cadastrado
              if (hVal >= (parseFloat(dadosGerador.horimetroAtual) || 0)) {
                dadosGerador.horimetroAtual = hVal;
              }
              
              if (vOs.fezRevisao) {
                dadosGerador.horimetroUltimaRevisao = hVal;
                dadosGerador.dataUltimaRevisao = new Date().toISOString().split('T')[0];
              }
              if (vOs.trocouOleo) {
                dadosGerador.horimetroTrocaOleo = hVal;
                dadosGerador.dataTrocaOleo = new Date().toISOString().split('T')[0];
              }
            }
            await db.run(`UPDATE frota_geradores SET dados_json = ? WHERE id = ?`, [JSON.stringify(dadosGerador), gRow.id]);
            console.log(`[GERADORES] Horímetro/Manutenção atualizados via Frontend para gerador ${gRow.nome}`);
          }
        }

        // Fallback antigo via geradorId e regex
        if (!geradorProcessado && osAtualizada.geradorId) {
          const vRow = await db.get(`SELECT * FROM frota_geradores WHERE id = ?`, [osAtualizada.geradorId]);
          if (vRow) {
            let dadosGerador = {};
            try { dadosGerador = JSON.parse(vRow.dados_json || '{}'); } catch(e) {}
            
            dadosGerador.dataUltimaRevisao = new Date().toISOString().split('T')[0];
            
            const regexHorimetro = /Horímetro Atual:\s*([\d.,]+)/i;
            const match = (osAtualizada.descricao || '').match(regexHorimetro);
            if (match && match[1]) {
              const hVal = parseFloat(match[1].replace(',', '.'));
              if (!isNaN(hVal) && hVal > 0 && hVal >= (parseFloat(dadosGerador.horimetroAtual) || 0)) {
                dadosGerador.horimetroUltimaRevisao = hVal;
                dadosGerador.horimetroAtual = hVal;
              }
            }
            await db.run(`UPDATE frota_geradores SET dados_json = ? WHERE id = ?`, [JSON.stringify(dadosGerador), osAtualizada.geradorId]);
            console.log(`[GERADORES] Alerta resetado (Legacy) para gerador ID ${osAtualizada.geradorId}`);
          }
        }
      } catch (err) {
        console.error('Erro na automação de geradores:', err);
      }
    }

    if (req.body.situacao) {
      notificationService.notificarMudancaStatus(req.app.get('io'), {
        tipo: 'os',
        id: osAtualizada.id,
        novoStatus: osAtualizada.situacao,
        mensagem: `OS ${osAtualizada.codigo} atualizada para: ${osAtualizada.situacao}`
      });
    }

    res.json({
      message: 'Ordem de Serviço atualizada com sucesso',
      os: osAtualizada
    });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao atualizar Ordem de Serviço', error: error.message });
  }
});

// ============================================================
// Rotas de Serviços Padrão (ainda usam json_collections — OK)
// ============================================================

router.get('/servicos-padrao', async (req, res) => {
  try {
    const servicos = await getJsonData('servicos_padrao') || {};
    res.json(servicos);
  } catch (error) {
    res.status(500).json({ message: 'Erro interno ao ler serviços padrão', error: error.message });
  }
});

router.post('/servicos-padrao', async (req, res) => {
  try {
    const { setor, servico } = req.body;
    if (!setor || !servico) return res.status(400).json({ message: 'Setor e serviço são obrigatórios' });

    let servicos = await getJsonData('servicos_padrao') || {};
    if (!servicos[setor]) servicos[setor] = [];
    if (!servicos[setor].includes(servico)) servicos[setor].push(servico);

    await saveJsonData('servicos_padrao', servicos);
    res.json({ message: 'Serviço adicionado com sucesso', servicos });
  } catch (error) {
    res.status(500).json({ message: 'Erro interno', error: error.message });
  }
});

router.delete('/servicos-padrao', async (req, res) => {
  try {
    const { setor, servico } = req.body;
    if (!setor || !servico) return res.status(400).json({ message: 'Setor e serviço são obrigatórios' });

    let servicos = await getJsonData('servicos_padrao') || {};
    if (servicos[setor]) {
      servicos[setor] = servicos[setor].filter(s => s !== servico);
      await saveJsonData('servicos_padrao', servicos);
    }
    res.json({ message: 'Serviço excluído com sucesso', servicos });
  } catch (error) {
    res.status(500).json({ message: 'Erro interno', error: error.message });
  }
});

// ============================================================
// ============================================================
// Rotas de Custos de Funcionários
// ============================================================

router.get('/custos-funcionarios', async (req, res) => {
  try {
    const db = await getDb();
    const relatorios = await db.all(`SELECT * FROM relatorios_custos ORDER BY data_inicio ASC`);
    const funcionarios = await db.all(`SELECT * FROM relatorios_custos_funcionarios`);
    
    const resultado = relatorios.map(rel => {
      return {
        id: rel.id,
        dataInicio: rel.data_inicio,
        dataFim: rel.data_fim,
        horasUteis: rel.horas_uteis,
        dataFechamento: rel.data_fechamento,
        funcionarios: funcionarios.filter(f => f.relatorio_id === rel.id).map(f => ({
          cpf: f.cpf,
          nome: f.nome,
          cargo: f.cargo,
          horasTrabalhadas: f.horas_trabalhadas,
          folhaMensal: f.folha_mensal,
          ferias: f.ferias,
          desligado: f.desligado,
          fgts: f.fgts
        }))
      };
    });
    
    res.json(resultado);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao ler custos', error: error.message });
  }
});

router.post('/custos-funcionarios', async (req, res) => {
  try {
    const db = await getDb();
    const relatorios = req.body; 
    
    for (const rel of relatorios) {
      const existe = await db.get(`SELECT id FROM relatorios_custos WHERE id = ?`, [rel.id]);
      if (!existe) {
        await db.run(
          `INSERT INTO relatorios_custos (id, data_inicio, data_fim, horas_uteis, data_fechamento) VALUES (?, ?, ?, ?, ?)`, 
          [rel.id, rel.dataInicio, rel.dataFim, rel.horasUteis, isoToSql(rel.dataFechamento)]
        );
        
        if (rel.funcionarios && Array.isArray(rel.funcionarios)) {
          for (const f of rel.funcionarios) {
            const fId = Date.now().toString() + Math.random().toString(36).substring(7);
            await db.run(
              `INSERT INTO relatorios_custos_funcionarios (id, relatorio_id, cpf, nome, cargo, horas_trabalhadas, folha_mensal, ferias, desligado, fgts) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [fId, rel.id, f.cpf, f.nome, f.cargo, f.horasTrabalhadas, f.folhaMensal, f.ferias, f.desligado, f.fgts]
            );
          }
        }
      }
    }
    
    res.json({ message: 'Custos salvos com sucesso' });
  } catch (error) {
    console.error('❌ ERRO AO SALVAR CUSTOS-FUNCIONARIOS:', error);
    res.status(500).json({ message: 'Erro ao salvar custos', error: error.message });
  }
});

export default router;
