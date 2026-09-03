import 'dotenv/config';
import getDb from '../src/config/database.js';

async function aplicarMarcoZeroArla() {
  const db = await getDb();

  const id = 'AJUSTE-ARLA-INV-20260826';
  const dataIso = '2026-08-25T23:59:00';
  const litrosAjuste = 1112.47;

  const dadosJson = {
    id: id,
    status: 'CONCLUÍDO',
    numeroRequisicao: 'AJUSTE-INV-ARLA',
    data: '2026-08-25T23:59',
    requisitante: 'ALMOXARIFADO',
    emitente: 'SISTEMA',
    veiculo: 'AJUSTE INVENTÁRIO',
    fornecedor: 'ALMOXARIFADO',
    combustivel: 'ARLA REDUX',
    cupom: 'INV-600L',
    km: '0',
    qtde: litrosAjuste.toFixed(2),
    valorUnitario: '0',
    valorTotal: '0',
    observacao: 'Ajuste de Marco Zero / Inventário Físico Inicial (Consumo anterior em papel)'
  };

  // Remove anterior caso exista para não duplicar
  await db.run('DELETE FROM saidas_combustivel WHERE id = ?', [id]);

  await db.run(`
    INSERT INTO saidas_combustivel 
      (id, placa, motorista, tipo_combustivel, litros, valor_litro, valor_total, km_abastecimento, tanque_origem, data_hora, dados_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id,
    'AJUSTE INVENTÁRIO',
    'ALMOXARIFADO',
    'ARLA REDUX',
    litrosAjuste,
    0,
    0,
    0,
    'ALMOXARIFADO',
    dataIso,
    JSON.stringify(dadosJson)
  ]);

  console.log('✅ Ajuste de Marco Zero inserido com sucesso localmente!');
  process.exit(0);
}

aplicarMarcoZeroArla();
