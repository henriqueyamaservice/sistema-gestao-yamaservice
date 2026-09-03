import 'dotenv/config';
import getDb from '../src/config/database.js';

const pecasHistoricasExtras = {
  '10-0826': [
    { codigo: 'PRD03025', descricao: 'REGISTRO PRESSAO SOLDAVEL 20MM HERC', quantidade: 2 },
    { codigo: 'PRD03166', descricao: 'JOELHO SOLDAVEL DE 20MM PLASTILIT - PRD03166', quantidade: 8 },
    { codigo: 'PRD11345', descricao: 'SERRA MANUAL STARRETT RS1218 300MM-18D 12"-18T', quantidade: 1 },
    { codigo: 'PRD03044', descricao: 'VEDACAO PROSCA POLYFITA PTFE 100% PURO ROLO DE 12MMx5M POLYFITA-PRD03044', quantidade: 1 },
    { codigo: 'PRD08889', descricao: 'LUVA SOLDAVEL BCH LATAO 25X3/4 FORTLEV', quantidade: 4 },
    { codigo: 'PRD02943', descricao: 'CIMENTO POTY 50KG VOTORANTIM-PRD02943', quantidade: 1.5 },
    { codigo: 'PRD06932', descricao: 'AREIA', quantidade: 0.3 }
  ],
  '77-0826': [
    { codigo: 'PRD07057', descricao: 'IPIRANGA F1 MASTER SINTETICO 0W20 SP 1LT', quantidade: 3 },
    { codigo: 'PRD09724', descricao: 'FILTRO DE OLEO MANN W6100', quantidade: 1 },
    { codigo: 'PRD01620', descricao: 'FILTRO DE COMBUSTIVEL MANN WK58', quantidade: 1 },
    { codigo: 'PRD09343', descricao: 'IPIRANGA ADITIVO RADIADOR CARRO CONCENTRADO 1LT', quantidade: 1 },
    { codigo: 'PRD06049', descricao: 'PANO COSTURADO PARA USO GERAL-PRD06049', quantidade: 5 },
    { codigo: 'PRD09776', descricao: 'AGUA DESMINERALIZADA 1LT MARCA: OX AUTO', quantidade: 5 },
    { codigo: 'PRD01775', descricao: 'FILTRO DE AR MANN C29003/1', quantidade: 1 }
  ],
  '82-0826': [
    { codigo: 'PRD03033', descricao: 'TORNEIRA P TANQUE 12\'\' LONGA 15CM HERC-PRD03033', quantidade: 2 },
    { codigo: 'PRD03044', descricao: 'VEDACAO PROSCA POLYFITA PTFE 100% PURO ROLO DE 12MMx5M POLYFITA-PRD03044', quantidade: 1 },
    { codigo: 'PRD03043', descricao: 'VALVULA LAVATORIO BRA-PRD03043', quantidade: 2 },
    { codigo: 'PRD08083', descricao: 'JOELHO ESGOTO 90 GRAUS DN 40MM - PLASTILIT', quantidade: 1 },
    { codigo: 'PRD03421', descricao: 'TANQUE DUPLO LINHA MARMORE SINTETICO 1,20M CINZA-PRD03421', quantidade: 1 },
    { codigo: 'PRD06932', descricao: 'AREIA', quantidade: 1.5 },
    { codigo: 'PRD02943', descricao: 'CIMENTO POTY 50KG VOTORANTIM-PRD02943', quantidade: 5 }
  ],
  '92-0826': [
    { codigo: 'PRD07382', descricao: 'PIA INOX 1.20 22763 TECNOCUBA - AMA.ORTE', quantidade: 1 },
    { codigo: 'PRD03033', descricao: 'TORNEIRA P TANQUE 12\'\' LONGA 15CM HERC-PRD03033', quantidade: 1 },
    { codigo: 'PRD03168', descricao: 'SIFAO COPO SANFONADO 1 (7/8) 1.1/4 1.1/2 ASTRA', quantidade: 1 },
    { codigo: 'PRD08083', descricao: 'JOELHO ESGOTO 90 GRAUS DN 40MM - PLASTILIT', quantidade: 1 },
    { codigo: 'PRD11376', descricao: 'ADESIVO PVC BISNAGA 75G PLASTILIT', quantidade: 1 },
    { codigo: 'PRD03044', descricao: 'VEDACAO PROSCA POLYFITA PTFE 100% PURO ROLO DE 12MMx5M POLYFITA-PRD03044', quantidade: 1 },
    { codigo: 'PRD11345', descricao: 'SERRA MANUAL STARRETT RS1218 300MM-18D 12"-18T', quantidade: 1 },
    { codigo: 'PRD02943', descricao: 'CIMENTO POTY 50KG VOTORANTIM-PRD02943', quantidade: 1.5 },
    { codigo: 'PRD06932', descricao: 'AREIA', quantidade: 0.3 }
  ]
};

async function rodarAjusteTotal() {
  const db = await getDb();
  console.log('🚀 Conectado ao banco de dados! Iniciando cálculo e ajuste de todas as O.S...');

  // 1. Carregar mapa de produtos com preços
  const prodRows = await db.all('SELECT codigo, descricao, valor_unitario FROM produtos_omie');
  const prodMap = new Map();
  prodRows.forEach(p => {
    const v = parseFloat(p.valor_unitario) || 0;
    if (p.codigo) prodMap.set(p.codigo.trim().toUpperCase(), v);
    if (p.descricao) prodMap.set(p.descricao.trim().toUpperCase(), v);
  });
  console.log(`📦 Mapa de produtos carregado com ${prodMap.size} referências de preços.`);

  // 2. Carregar todas as ordens de serviço
  const oss = await db.all('SELECT id, numero_os, dados_json FROM ordens_servico');
  const turnos = await db.all('SELECT * FROM os_turnos');
  const pecas = await db.all('SELECT * FROM os_pecas_utilizadas');

  console.log(`📋 Processando ${oss.length} Ordens de Serviço...`);

  let totalGeral = 0;
  let osAtualizadas = 0;

  for (const os of oss) {
    let dados = {};
    try { dados = JSON.parse(os.dados_json || '{}'); } catch (e) {}

    // Achar peças nos turnos relacionais
    const turnosDaOs = turnos.filter(t => t.os_id === os.id);
    const pecasDosTurnos = [];
    turnosDaOs.forEach(t => {
      const pecasDoTurno = pecas.filter(p => p.turno_id === t.id);
      pecasDoTurno.forEach(p => {
        const cod = (p.codigo || '').trim().toUpperCase();
        const desc = (p.descricao || '').trim().toUpperCase();
        const vUnit = prodMap.get(cod) || prodMap.get(desc) || parseFloat(p.valor_unitario) || 0;
        pecasDosTurnos.push({
          codigo: p.codigo || '',
          descricao: p.descricao || '',
          quantidade: parseFloat(p.quantidade) || 0,
          valor_unitario: vUnit
        });
      });
    });

    // Peças existentes em dados.consumiveis
    let consumiveisFinais = [];
    if (dados.consumiveis && Array.isArray(dados.consumiveis) && dados.consumiveis.length > 0) {
      consumiveisFinais = dados.consumiveis.map(c => {
        const cod = (c.codigo || '').trim().toUpperCase();
        const desc = (c.descricao || '').trim().toUpperCase();
        let vUnit = parseFloat(c.valor_unitario) || 0;
        if (!vUnit) {
          vUnit = prodMap.get(cod) || prodMap.get(desc) || 0;
        }
        return {
          ...c,
          quantidade: parseFloat(c.quantidade) || 0,
          valor_unitario: vUnit
        };
      });
    }

    // Se consumiveisFinais está vazio mas pecasDosTurnos tem itens, usar pecasDosTurnos
    if (consumiveisFinais.length === 0 && pecasDosTurnos.length > 0) {
      consumiveisFinais = pecasDosTurnos;
    }

    // Se ainda está vazio e a OS está no dicionário de peças históricas extras:
    if (consumiveisFinais.length === 0 && pecasHistoricasExtras[os.numero_os]) {
      consumiveisFinais = pecasHistoricasExtras[os.numero_os].map(p => {
        const cod = (p.codigo || '').trim().toUpperCase();
        const desc = (p.descricao || '').trim().toUpperCase();
        const vUnit = prodMap.get(cod) || prodMap.get(desc) || 0;
        return {
          ...p,
          quantidade: parseFloat(p.quantidade) || 0,
          valor_unitario: vUnit
        };
      });
    }

    // Se pecasDosTurnos tem itens e consumiveis tem itens, enriquecer os preços que estão zerados
    if (consumiveisFinais.length > 0) {
      consumiveisFinais = consumiveisFinais.map(c => {
        let vUnit = parseFloat(c.valor_unitario) || 0;
        if (!vUnit) {
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

    let totalOs = consumiveisFinais.reduce((acc, i) => acc + (i.quantidade * i.valor_unitario), 0);

    if (totalOs > 0 || (dados.consumiveis && dados.consumiveis.length > 0)) {
      dados.consumiveis = consumiveisFinais;
      dados.codigo = os.numero_os;
      
      await db.run(
        'UPDATE ordens_servico SET dados_json = ? WHERE id = ?',
        [JSON.stringify(dados), os.id]
      );

      totalGeral += totalOs;
      osAtualizadas++;
      console.log(`✅ OS ${os.numero_os.padEnd(10)} | Custo Total Peças: R$ ${totalOs.toFixed(2).padStart(8)} | Itens: ${consumiveisFinais.length}`);
    }
  }

  console.log('\n======================================================');
  console.log(`✨ AJUSTE CONCLUÍDO COM SUCESSO!`);
  console.log(`📊 Total de O.S. com Peças: ${osAtualizadas}`);
  console.log(`💰 CUSTO TOTAL GERAL: R$ ${totalGeral.toFixed(2)}`);
  console.log('======================================================\n');

  process.exit(0);
}

rodarAjusteTotal();
