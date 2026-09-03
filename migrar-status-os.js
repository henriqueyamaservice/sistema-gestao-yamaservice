/**
 * Script de Migração de Status das O.S. (One-shot)
 * 
 * Normaliza os status antigos (com espaços, acentos etc.) para o
 * novo padrão da Máquina de Estados em 4 Fases.
 * 
 * Uso: node back-end/migrar-status-os.js
 */
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const filePath = path.resolve(__dirname, 'back-end', 'data', 'dashboard-os', 'ordens_servico.json');

const MAPA_MIGRACAO = {
  // Status antigos -> Novo status canônico
  'À EXECUTAR':          'AGUARDANDO_CHEFE_SETOR',
  'PENDENTE':            'AGUARDANDO_CHEFE_SETOR',
  'EM ANDAMENTO':        'EM_ANDAMENTO',
  'CONCLUÍDO':           'CONCLUIDO',
  'FINALIZADO':          'CONCLUIDO',
  'AGUARDANDO INSUMO':   'AGUARDANDO_INSUMO',
  // Os status já corretos são mantidos (não precisam de mapeamento)
};

async function migrar() {
  console.log('🔄 Iniciando migração de status das O.S...');
  const raw = await fs.readFile(filePath, 'utf-8');
  const ordens = JSON.parse(raw);

  let migradas = 0;

  const ordensAtualizadas = ordens.map(os => {
    const novoStatus = MAPA_MIGRACAO[os.situacao];
    if (novoStatus) {
      console.log(`  📋 ${os.codigo}: "${os.situacao}" → "${novoStatus}"`);
      migradas++;
      return { ...os, situacao: novoStatus };
    }
    return os;
  });

  await fs.writeFile(filePath, JSON.stringify(ordensAtualizadas, null, 2), 'utf-8');
  console.log(`\n✅ Migração concluída! ${migradas} O.S. atualizadas.`);
}

migrar().catch(err => {
  console.error('❌ Erro na migração:', err);
  process.exit(1);
});
