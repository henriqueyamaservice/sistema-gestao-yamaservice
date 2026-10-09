import mysql from 'mysql2/promise';

let dbInstance = null;

export async function getDb() {
  if (dbInstance) return dbInstance;

  const dbHost = process.env.DB_HOST || '127.0.0.1';
  let pool = null;
  let tentativas = 0;
  const maxTentativas = 12;

  while (tentativas < maxTentativas) {
    try {
      tentativas++;
      pool = mysql.createPool({
        host: dbHost,
        port: Number(process.env.DB_PORT || 3306),
        user: process.env.DB_USER || 'almox_user',
        password: process.env.DB_PASSWORD || 'almox_password_123',
        database: process.env.DB_NAME || 'almoxarifado_db',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
      });

      // Testar a conexão
      await pool.query('SELECT 1');
      break; // Sucesso na conexão!
    } catch (err) {
      console.log(`⏳ MariaDB/MySQL ainda inicializando (${dbHost})... tentativa ${tentativas}/${maxTentativas} em 3s`);
      if (tentativas >= maxTentativas) {
        console.error(`❌ Erro ao conectar no MariaDB/MySQL (${dbHost}):`, err.message);
        throw err;
      }
      await new Promise(r => setTimeout(r, 3000));
    }
  }

  // Wrapper com API unificada
  dbInstance = {
    driver: 'mysql',
    pool,
    async exec(sql) {
      return pool.query(sql);
    },
    async run(sql, params = []) {
      const [result] = await pool.query(sql, params);
      return result;
    },
    async all(sql, params = []) {
      const [rows] = await pool.query(sql, params);
      return rows;
    },
    async get(sql, params = []) {
      const [rows] = await pool.query(sql, params);
      return rows[0] || null;
    }
  };

  await initTablesMysql(dbInstance);
  console.log(`🐬 Banco de dados MariaDB/MySQL conectado com sucesso em ${dbHost}`);
  return dbInstance;
}

async function initTablesMysql(db) {
  // 0. Tabela genérica de coleções JSON do sistema (dados não migrados ainda)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS json_collections (
      colecao VARCHAR(191) PRIMARY KEY,
      dados LONGTEXT NOT NULL,
      atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    );
  `);

  // 1. Tabela de Coleções da Omie (Cadastros: fornecedores, produtos, departamentos, projetos, etc.)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS omie_collections (
      colecao VARCHAR(191) PRIMARY KEY,
      dados LONGTEXT NOT NULL,
      atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    );
  `);

  // 1.5. Tabela de Usuários do Sistema (Autenticação e Hierarquia)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id VARCHAR(191) PRIMARY KEY,
      nome VARCHAR(191) NOT NULL,
      username VARCHAR(191) UNIQUE NOT NULL,
      senha_hash VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL,
      setor VARCHAR(100),
      codigo_omie VARCHAR(100),
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 2. Tabela de Ordens de Serviço (OS) — Modelo Híbrido: colunas indexáveis + dados_json
  await db.exec(`
    CREATE TABLE IF NOT EXISTS ordens_servico (
      id VARCHAR(191) PRIMARY KEY,
      numero_os VARCHAR(191) UNIQUE,
      situacao VARCHAR(191),
      tipo VARCHAR(191),
      setor VARCHAR(191),
      centro_custo VARCHAR(191),
      requisitante VARCHAR(191),
      tecnico VARCHAR(191),
      prioridade VARCHAR(191),
      complexidade VARCHAR(191),
      valor_estimado DECIMAL(15,2) DEFAULT 0,
      descricao LONGTEXT,
      motivo LONGTEXT,
      observacao LONGTEXT,
      resultado VARCHAR(191),
      prazo VARCHAR(50),
      is_emergencia BOOLEAN DEFAULT FALSE,
      data_justificativa VARCHAR(50),
      data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,
      atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      dados_json LONGTEXT
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS os_turnos (
      id VARCHAR(191) PRIMARY KEY,
      os_id VARCHAR(191),
      data_apontamento VARCHAR(50),
      hora_inicio VARCHAR(10),
      hora_fim1 VARCHAR(10),
      hora_inicio2 VARCHAR(10),
      hora_fim VARCHAR(10),
      descricao_servico LONGTEXT,
      is_saved BOOLEAN DEFAULT FALSE,
      FOREIGN KEY(os_id) REFERENCES ordens_servico(id) ON DELETE CASCADE
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS os_equipe (
      id VARCHAR(191) PRIMARY KEY,
      turno_id VARCHAR(191),
      matricula VARCHAR(191),
      nome VARCHAR(255),
      funcao VARCHAR(100),
      horas DOUBLE,
      FOREIGN KEY(turno_id) REFERENCES os_turnos(id) ON DELETE CASCADE
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS os_pecas_utilizadas (
      id VARCHAR(191) PRIMARY KEY,
      turno_id VARCHAR(191),
      codigo VARCHAR(191),
      descricao VARCHAR(255),
      quantidade DOUBLE,
      FOREIGN KEY(turno_id) REFERENCES os_turnos(id) ON DELETE CASCADE
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS os_veiculos_utilizados (
      id VARCHAR(191) PRIMARY KEY,
      turno_id VARCHAR(191),
      placa VARCHAR(50),
      km_inicial DOUBLE,
      km_final DOUBLE,
      km_total DOUBLE,
      FOREIGN KEY(turno_id) REFERENCES os_turnos(id) ON DELETE CASCADE
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS relatorios_custos (
      id VARCHAR(191) PRIMARY KEY,
      data_inicio VARCHAR(50),
      data_fim VARCHAR(50),
      horas_uteis DOUBLE,
      data_fechamento DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS relatorios_custos_funcionarios (
      id VARCHAR(191) PRIMARY KEY,
      relatorio_id VARCHAR(191),
      cpf VARCHAR(191),
      nome VARCHAR(255),
      cargo VARCHAR(191),
      horas_trabalhadas DOUBLE,
      folha_mensal DOUBLE,
      ferias DOUBLE,
      desligado DOUBLE,
      fgts DOUBLE,
      FOREIGN KEY(relatorio_id) REFERENCES relatorios_custos(id) ON DELETE CASCADE
    );
  `);

  // 3. Tabela de Requisições — Modelo Híbrido: colunas indexáveis + dados_json
  await db.exec(`
    CREATE TABLE IF NOT EXISTS requisicoes (
      id VARCHAR(191) PRIMARY KEY,
      numero_os VARCHAR(191),
      status VARCHAR(191),
      status_compras VARCHAR(191),
      tipo VARCHAR(191),
      solicitante VARCHAR(191),
      departamento VARCHAR(191),
      entregador VARCHAR(191),
      local_estoque VARCHAR(191),
      data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,
      atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      dados_json LONGTEXT
    );
  `);

  // 4. Tabela de Abastecimentos / Combustível
  await db.exec(`
    CREATE TABLE IF NOT EXISTS saidas_combustivel (
      id VARCHAR(191) PRIMARY KEY,
      placa VARCHAR(191),
      modelo VARCHAR(191),
      veiculo_id VARCHAR(191),
      motorista VARCHAR(191),
      tipo_combustivel VARCHAR(191),
      litros DOUBLE,
      valor_litro DECIMAL(15,4),
      valor_total DECIMAL(15,2),
      km_abastecimento DOUBLE,
      tanque_origem VARCHAR(191),
      data_hora VARCHAR(191),
      dados_json LONGTEXT
    );
  `);
  try {
    await db.exec(`ALTER TABLE saidas_combustivel MODIFY COLUMN dados_json LONGTEXT`);
  } catch(e) { /* ignore if already LONGTEXT */ }

  // 5. Tabela de Veículos / Frota
  await db.exec(`
    CREATE TABLE IF NOT EXISTS frota_veiculos (
      id VARCHAR(191) PRIMARY KEY,
      placa VARCHAR(191) UNIQUE,
      modelo VARCHAR(191),
      tipo VARCHAR(191),
      marca VARCHAR(191),
      ano INT,
      status VARCHAR(191),
      dados_json LONGTEXT
    );
  `);

  // 6. Entradas de Combustível
  await db.exec(`
    CREATE TABLE IF NOT EXISTS entradas_combustivel (
      id VARCHAR(191) PRIMARY KEY,
      fornecedor VARCHAR(191),
      tipo_combustivel VARCHAR(191),
      quantidade_litros DOUBLE,
      valor_total DECIMAL(15,2),
      data_entrada DATETIME,
      nota_fiscal VARCHAR(191),
      valor_unitario DECIMAL(15,4),
      estoque_destino VARCHAR(191),
      situacao VARCHAR(191),
      observacao LONGTEXT,
      dados_json LONGTEXT
    );
  `);

  // 7. Geradores
  await db.exec(`
    CREATE TABLE IF NOT EXISTS frota_geradores (
      id VARCHAR(191) PRIMARY KEY,
      codigo VARCHAR(191) UNIQUE,
      nome VARCHAR(191),
      localizacao VARCHAR(191),
      status VARCHAR(191),
      dados_json LONGTEXT
    );
  `);

  // 7.1 Checklists de Veículos
  await db.exec(`
    CREATE TABLE IF NOT EXISTS checklists_veiculos (
      id VARCHAR(191) PRIMARY KEY,
      placa VARCHAR(191),
      modelo VARCHAR(191),
      condutor_nome VARCHAR(191),
      data_hora VARCHAR(50),
      dados_json LONGTEXT,
      data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 8. Estoque Interno
  await db.exec(`
    CREATE TABLE IF NOT EXISTS estoque_interno (
      id VARCHAR(191) PRIMARY KEY,
      codigo VARCHAR(191) UNIQUE,
      descricao VARCHAR(191),
      quantidade DOUBLE,
      unidade VARCHAR(50),
      categoria VARCHAR(191),
      dados_json LONGTEXT
    );
  `);

  // 9. Coleções Omie Migradas (Fase 3)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS produtos_omie (
      codigo VARCHAR(191) PRIMARY KEY,
      descricao VARCHAR(255),
      ncm VARCHAR(50),
      ean VARCHAR(50),
      valor_unitario DOUBLE,
      quantidade_estoque DOUBLE,
      dados_json LONGTEXT,
      atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS fornecedores_omie (
      codigo VARCHAR(191) PRIMARY KEY,
      razao_social VARCHAR(255),
      cnpj_cpf VARCHAR(50),
      dados_json LONGTEXT,
      atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS departamentos_omie (
      codigo VARCHAR(191) PRIMARY KEY,
      descricao VARCHAR(255),
      dados_json LONGTEXT,
      atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS projetos_omie (
      codigo VARCHAR(191) PRIMARY KEY,
      nome VARCHAR(255),
      dados_json LONGTEXT,
      atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS locais_estoque_omie (
      codigo VARCHAR(191) PRIMARY KEY,
      descricao VARCHAR(255),
      dados_json LONGTEXT,
      atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS vendedores_omie (
      codigo VARCHAR(191) PRIMARY KEY,
      nome VARCHAR(255),
      dados_json LONGTEXT,
      atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    );
  `);

  // 10. Kits de Serviços — Tabela Dedicada com Área de Manutenção
  await db.exec(`
    CREATE TABLE IF NOT EXISTS servicos_kits (
      id VARCHAR(191) PRIMARY KEY,
      nome VARCHAR(255),
      area_manutencao VARCHAR(100),
      categoria VARCHAR(100),
      dados_json LONGTEXT,
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
      atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    );
  `);

  // 11. Cotações Arquivadas / Salvas
  await db.exec(`
    CREATE TABLE IF NOT EXISTS cotacoes_arquivadas (
      id INT AUTO_INCREMENT PRIMARY KEY,
      requisicao_id VARCHAR(191),
      fornecedor_id VARCHAR(191),
      fornecedor_nome VARCHAR(255),
      tipo_arquivamento VARCHAR(50),
      dados_json LONGTEXT,
      texto_original_pdf LONGTEXT,
      usuario_salvamento VARCHAR(191),
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 12. Histórico de Sincronização de Estoque com a Omie
  await db.exec(`
    CREATE TABLE IF NOT EXISTS historico_sincronizacao_estoque (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tipo VARCHAR(50),
      codigo_produto VARCHAR(191),
      descricao_produto VARCHAR(255),
      saldo_anterior DOUBLE,
      saldo_novo DOUBLE,
      diferenca DOUBLE,
      origem VARCHAR(50),
      usuario VARCHAR(191),
      status VARCHAR(50),
      detalhes TEXT,
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // --- MIGRAÇÃO AUTOMÁTICA DE json_collections PARA servicos_kits ---
  try {
    const rowOld = await db.get(`SELECT dados FROM json_collections WHERE colecao = 'servicos_kits'`);
    if (rowOld && rowOld.dados) {
      const oldKits = JSON.parse(rowOld.dados);
      if (Array.isArray(oldKits) && oldKits.length > 0) {
        console.log(`[MIGRAÇÃO] Encontrados ${oldKits.length} kits em json_collections. Movendo para servicos_kits...`);
        for (const kit of oldKits) {
          const area = kit.areaManutencao || 'MECANICA';
          const cat = kit.categoria || 'GERAL';
          // Para não quebrar se já existir, fazemos um INSERT IGNORE ou ON DUPLICATE KEY UPDATE (MariaDB/MySQL) ou ON CONFLICT (SQLite)
          const kitJson = JSON.stringify(kit);
          
          if (db.driver === 'mysql') {
            await db.run(
              `INSERT INTO servicos_kits (id, nome, area_manutencao, categoria, dados_json) 
               VALUES (?, ?, ?, ?, ?)
               ON DUPLICATE KEY UPDATE nome=VALUES(nome), area_manutencao=VALUES(area_manutencao), categoria=VALUES(categoria), dados_json=VALUES(dados_json)`,
              [kit.id, kit.nome, area, cat, kitJson]
            );
          } else {
            await db.run(
              `INSERT INTO servicos_kits (id, nome, area_manutencao, categoria, dados_json) 
               VALUES (?, ?, ?, ?, ?)
               ON CONFLICT(id) DO UPDATE SET nome=excluded.nome, area_manutencao=excluded.area_manutencao, categoria=excluded.categoria, dados_json=excluded.dados_json`,
              [kit.id, kit.nome, area, cat, kitJson]
            );
          }
        }
        // Apaga o registro antigo para não rodar a migração duas vezes
        await db.run(`DELETE FROM json_collections WHERE colecao = 'servicos_kits'`);
        console.log(`[MIGRAÇÃO] Kits movidos com sucesso. Registro antigo deletado.`);
      }
    }
  } catch (err) {
    console.error(`[MIGRAÇÃO] Erro ao tentar migrar servicos_kits:`, err.message);
  }

}

export default getDb;
