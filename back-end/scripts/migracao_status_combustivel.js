import dotenv from 'dotenv';
dotenv.config();

import { getDb } from '../src/config/database.js';

async function rodarMigracao() {
  console.log('🚀 Iniciando script de higienização de status do combustível...');
  
  try {
    const db = await getDb();
    console.log('✅ Conexão com o banco estabelecida com sucesso.');

    // Buscar todos os registros
    const rows = await db.run(`SELECT id, dados_json FROM saidas_combustivel`);
    
    let contAguardando = 0;
    let contAbastecida = 0;
    let contCancelada = 0;

    for (const row of rows) {
      if (!row.dados_json) continue;
      
      try {
        const dados = JSON.parse(row.dados_json);
        let precisaAtualizar = false;

        // 1. Atualizar para ABASTECIDA
        if (dados.status === 'CONCLUÍDO' || dados.status === 'CONCLUIDO' || dados.status === 'FINALIZADO') {
          dados.status = 'ABASTECIDA';
          precisaAtualizar = true;
          contAbastecida++;
        }
        // 2. Atualizar para AGUARDANDO_ABASTECIMENTO
        else if (dados.status === 'EM ANDAMENTO' || dados.status === 'ABERTA') {
          dados.status = 'AGUARDANDO_ABASTECIMENTO';
          precisaAtualizar = true;
          contAguardando++;
        }
        // 3. Atualizar para CANCELADA
        else if (dados.status === 'CANCELADO') {
          dados.status = 'CANCELADA';
          precisaAtualizar = true;
          contCancelada++;
        }

        if (precisaAtualizar) {
          await db.run(
            `UPDATE saidas_combustivel SET dados_json = ? WHERE id = ?`,
            [JSON.stringify(dados), row.id]
          );
        }
      } catch (err) {
        console.error(`Erro ao fazer parse do JSON no id ${row.id}:`, err.message);
      }
    }

    console.log(`🔄 Atualizados para 'ABASTECIDA': ${contAbastecida}`);
    console.log(`🔄 Atualizados para 'AGUARDANDO_ABASTECIMENTO': ${contAguardando}`);
    console.log(`🔄 Atualizados para 'CANCELADA': ${contCancelada}`);

    console.log('🎉 Higienização concluída com sucesso no banco de dados!');

  } catch (error) {
    console.error('❌ Erro durante a migração:', error);
  } finally {
    process.exit(0);
  }
}

rodarMigracao();
