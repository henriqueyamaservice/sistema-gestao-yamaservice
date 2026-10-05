/**
 * Máquina de Estados da Requisição de Combustível
 * 
 * Este arquivo é a FONTE DE VERDADE para os status de combustível.
 * NUNCA escreva strings de status na mão nos componentes.
 * Sempre importe e use as constantes deste arquivo.
 */

export const AGUARDANDO_ABASTECIMENTO = 'em_andamento'; // Requisição aberta, frentista/motorista ainda não abasteceu
export const ABASTECIDA               = 'ABASTECIDA';               // Sucesso! Combustível entregue e abatido do estoque
export const CANCELADA                = 'CANCELADA';                // Requisição anulada

export const COMBUSTIVEL_STATUS = {
  AGUARDANDO_ABASTECIMENTO,
  ABASTECIDA,
  CANCELADA
};

export default COMBUSTIVEL_STATUS;
