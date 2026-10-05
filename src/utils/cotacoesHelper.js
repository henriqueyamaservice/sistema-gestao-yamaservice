/**
 * src/utils/cotacoesHelper.js
 * 
 * Utilitários para manipulação e cálculo de cotações de compras,
 * garantindo integridade e prevenção contra cotações duplicadas do mesmo fornecedor.
 */

/**
 * Deduplica uma lista de cotações para um item.
 * Garante que cada fornecedor tenha no máximo 1 cotação.
 * Se houver cotações repetidas do mesmo fornecedorId, mantém a mais completa ou a do portal.
 * 
 * @param {Array} cotacoes 
 * @returns {Array}
 */
export function deduplicarCotacoes(cotacoes) {
  if (!Array.isArray(cotacoes) || cotacoes.length === 0) return [];

  const mapa = new Map();

  for (const cot of cotacoes) {
    if (!cot) continue;
    // Chave única: fornecedorId (se não tiver, usa id do registro)
    const chave = cot.fornecedorId != null && cot.fornecedorId !== '' 
      ? String(cot.fornecedorId) 
      : (cot.id ? `id_${cot.id}` : Math.random().toString());

    if (mapa.has(chave)) {
      const anterior = mapa.get(chave);
      // Se veio do portal, prioriza sobre a digitada/sugerida
      if (cot.origem === 'portal' && anterior.origem !== 'portal') {
        mapa.set(chave, cot);
      } else if (cot.valorUnitario && !anterior.valorUnitario) {
        mapa.set(chave, cot);
      } else {
        // Mescla garantindo que propriedades novas/atualizadas sejam aproveitadas
        mapa.set(chave, { ...anterior, ...cot });
      }
    } else {
      mapa.set(chave, cot);
    }
  }

  return Array.from(mapa.values());
}

/**
 * Calcula o subtotal de uma cotação considerando unidade/embalagem (Unidade, Pacote, Caixa)
 * e descontos individuais e gerais.
 * 
 * @param {Object} cot 
 * @param {number} quantidadePedida 
 * @returns {number}
 */
export function calcularSubtotalOpcao(cot, quantidadePedida) {
  if (!cot || !cot.valorUnitario) return 0;
  const tipo = cot.tipoUnidade || 'Unidade';
  const qtdInterna = Number(cot.quantidadePacote) || 1;
  let qtdComprar = Number(quantidadePedida) || 1;
  if (tipo === 'Pacote' || tipo === 'Caixa') {
    qtdComprar = Math.ceil(qtdComprar / (qtdInterna > 0 ? qtdInterna : 1));
  }
  const descItem = Number(cot.desconto) || 0;
  const descGeral = Number(cot.descontoGeral) || 0;
  return (Number(cot.valorUnitario) * qtdComprar) * (1 - descItem / 100) * (1 - descGeral / 100);
}

export default {
  deduplicarCotacoes,
  calcularSubtotalOpcao
};
