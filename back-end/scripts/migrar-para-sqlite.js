import fs from 'fs';
import path from 'path';
import getDb from '../src/config/database.js';

async function migrarTudo() {
  console.log('🚀 Iniciando migração dos dados JSON para o banco SQLite (banco.db)...');
  const db = await getDb();

  const dataDir = path.join(process.cwd(), 'data');

  function listarArquivosJson(dirPath) {
    let arquivos = [];
    if (!fs.existsSync(dirPath)) return arquivos;

    const itens = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const item of itens) {
      const fullPath = path.join(dirPath, item.name);
      if (item.isDirectory() && item.name !== 'uploads') {
        arquivos = arquivos.concat(listarArquivosJson(fullPath));
      } else if (item.isFile() && item.name.endsWith('.json')) {
        arquivos.push(fullPath);
      }
    }
    return arquivos;
  }

  const jsonFiles = listarArquivosJson(dataDir);
  console.log(`📂 Encontrados ${jsonFiles.length} arquivos JSON para migrar.`);

  for (const filePath of jsonFiles) {
    try {
      const relPath = path.relative(dataDir, filePath).replace(/\\/g, '/');
      const rawData = fs.readFileSync(filePath, 'utf-8');
      
      // Valida se é JSON válido
      const parsedData = JSON.parse(rawData);

      // Salva na tabela genérica json_collections
      await db.run(
        `INSERT OR REPLACE INTO json_collections (colecao, dados, atualizado_em) VALUES (?, ?, CURRENT_TIMESTAMP)`,
        [relPath, JSON.stringify(parsedData)]
      );

      // Se for Ordens de Serviço
      if (relPath.includes('ordens_servico.json') && Array.isArray(parsedData)) {
        for (const os of parsedData) {
          if (!os.id) continue;
          await db.run(
            `INSERT OR REPLACE INTO ordens_servico 
            (id, numero_os, tipo, veiculo_id, placa, modelo, km_atual, horimetro_atual, oficina, mecanico, status, prioridade, descricao, itens, valor_total, criado_em, atualizado_em, dados_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              os.id,
              os.numeroOS || os.numero_os || '',
              os.tipo || '',
              os.veiculoId || os.veiculo_id || '',
              os.placa || '',
              os.modelo || '',
              os.kmAtual || os.km_atual || 0,
              os.horimetroAtual || os.horimetro_atual || 0,
              os.oficina || '',
              os.mecanico || '',
              os.status || '',
              os.prioridade || '',
              os.descricao || '',
              JSON.stringify(os.itens || []),
              os.valorTotal || os.valor_total || 0,
              os.dataAbertura || os.criado_em || new Date().toISOString(),
              os.dataFechamento || os.atualizado_em || new Date().toISOString(),
              JSON.stringify(os)
            ]
          );
        }
        console.log(`  ✅ Ordens de Serviço migradas: ${parsedData.length} registros.`);
      }

      // Se for Abastecimentos / Controle Combustível
      if ((relPath.includes('controle_combustivel.json') || relPath.includes('entradas_combustivel.json')) && Array.isArray(parsedData)) {
        for (const item of parsedData) {
          if (!item.id) continue;
          await db.run(
            `INSERT OR REPLACE INTO abastecimentos 
            (id, placa, modelo, veiculo_id, motorista, tipo_combustivel, litros, valor_litro, valor_total, km_abastecimento, tanque_origem, data_hora, dados_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              item.id,
              item.placa || '',
              item.modelo || '',
              item.veiculoId || item.veiculo_id || '',
              item.motorista || item.condutor || '',
              item.tipoCombustivel || item.tipo || '',
              item.litros || item.quantidade || 0,
              item.valorLitro || item.valor_unitario || 0,
              item.valorTotal || item.valor_total || 0,
              item.kmAbastecimento || item.km || 0,
              item.tanqueOrigem || item.tanque || '',
              item.dataHora || item.data || new Date().toISOString(),
              JSON.stringify(item)
            ]
          );
        }
        console.log(`  ✅ Abastecimentos/Entradas migrados (${relPath}): ${parsedData.length} registros.`);
      }

      // Se for Veículos
      if (relPath.includes('veiculos.json') && Array.isArray(parsedData)) {
        for (const v of parsedData) {
          if (!v.id) continue;
          await db.run(
            `INSERT OR REPLACE INTO veiculos (id, placa, modelo, tipo, marca, ano, status, dados_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              v.id,
              v.placa || '',
              v.modelo || '',
              v.tipo || '',
              v.marca || '',
              v.ano || 0,
              v.status || 'Ativo',
              JSON.stringify(v)
            ]
          );
        }
        console.log(`  ✅ Veículos migrados: ${parsedData.length} registros.`);
      }

      console.log(` ✔ Coleção '${relPath}' salva no banco SQLite.`);
    } catch (err) {
      console.error(` ❌ Erro ao migrar arquivo '${filePath}':`, err.message);
    }
  }

  console.log('🎉 Migração concluída com sucesso! Banco SQLite gerado em: data/banco.db');
}

migrarTudo();
