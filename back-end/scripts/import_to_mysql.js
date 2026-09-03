import fs from 'fs/promises';
import path from 'path';
import getDb from '../src/config/database.js';

// Função auxiliar para tentar ler um JSON e retornar null se não existir
async function readJsonSafe(filePath) {
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    // Verifica se tem conteúdo
    if (!data || data.trim().length === 0) return null;
    return data;
  } catch (error) {
    return null;
  }
}

async function runImport() {
  console.log('🔄 Iniciando importação forçada de JSONs para o MySQL...');
  
  try {
    const db = await getDb();
    const dataDir = path.resolve(process.cwd(), 'data');

    // Mapeamento: Chave no banco (colecao) -> Caminho do arquivo JSON
    const arquivosParaImportar = [
      { key: 'fornecedores', path: path.join(dataDir, 'omie_collection', 'fornecedores.json') },
      { key: 'vendedores', path: path.join(dataDir, 'omie_collection', 'vendedores.json') },
      { key: 'departamentos', path: path.join(dataDir, 'omie_collection', 'departamentos.json') },
      { key: 'projetos', path: path.join(dataDir, 'omie_collection', 'projetos.json') },
      { key: 'locais_estoque', path: path.join(dataDir, 'omie_collection', 'locais_estoque.json') },
      { key: 'produtos', path: path.join(dataDir, 'almoxarifado', 'produtos.json') },
      { key: 'requisicoes', path: path.join(dataDir, 'almoxarifado', 'requisicoes.json') }
    ];

    let inseridos = 0;

    for (const item of arquivosParaImportar) {
      console.log(`\n⏳ Lendo ${item.key}...`);
      const fileData = await readJsonSafe(item.path);

      if (fileData) {
        if (db.driver === 'mysql') {
          await db.run(
            `INSERT INTO omie_collections (colecao, dados) VALUES (?, ?) 
             ON DUPLICATE KEY UPDATE dados = VALUES(dados), atualizado_em = NOW()`,
            [item.key, fileData]
          );
        } else {
          await db.run(
            `INSERT INTO omie_collections (colecao, dados) VALUES (?, ?) 
             ON CONFLICT(colecao) DO UPDATE SET dados = excluded.dados, atualizado_em = CURRENT_TIMESTAMP`,
            [item.key, fileData]
          );
        }
        console.log(`✅ Sucesso: '${item.key}' importado para a tabela omie_collections!`);
        inseridos++;
      } else {
        console.log(`⚠️ Arquivo não encontrado ou vazio: ${item.path}`);
      }
    }

    console.log(`\n🎉 Importação concluída! ${inseridos} coleções injetadas no banco de dados com sucesso.`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Erro fatal durante a importação:', err);
    process.exit(1);
  }
}

runImport();
