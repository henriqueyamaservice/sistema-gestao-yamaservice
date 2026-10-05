/**
 * Utilitário de Formatação e Validação de Odômetro (KM) e Horímetro (Horas)
 * Padrão Brasileiro: Ponto (.) para milhares e vírgula (,) para decimais.
 */

/**
 * Converte qualquer entrada para número limpo
 */
export const limparNumeroOdometro = (valor) => {
  if (valor === null || valor === undefined) return '';
  const str = String(valor).trim();
  if (!str) return '';
  
  // Se contiver vírgula ou ponto como decimal
  const limpo = str.replace(/\s+/g, '').replace(/\./g, '').replace(',', '.');
  const num = parseFloat(limpo);
  return isNaN(num) ? '' : num;
};

/**
 * Formata um número no padrão BR com separador de milhares (.) e decimais (,)
 * Ex: 3337273 -> "3.337.273"
 * Ex: 1250.5 -> "1.250,5"
 */
export const formatarNumeroBR = (valor, decimais = null) => {
  if (valor === null || valor === undefined || valor === '') return '';
  const num = typeof valor === 'number' ? valor : limparNumeroOdometro(valor);
  if (num === '' || isNaN(num)) return '';

  const casasDecimais = decimais !== null 
    ? decimais 
    : (num % 1 !== 0 ? 1 : 0);

  return num.toLocaleString('pt-BR', {
    minimumFractionDigits: casasDecimais,
    maximumFractionDigits: casasDecimais
  });
};

/**
 * Formata o valor com a unidade de medição apropriada (km ou h)
 * Ex: (3337273, 'KM') -> "3.337.273 km"
 * Ex: (1250.5, 'Horas') -> "1.250,5 h"
 */
export const formatarOdometroDisplay = (valor, tipoMedicao = 'KM') => {
  const formatado = formatarNumeroBR(valor);
  if (!formatado) return '';
  
  const isHoras = String(tipoMedicao).toUpperCase().includes('HORA');
  return `${formatado} ${isHoras ? 'h' : 'km'}`;
};

/**
 * Validação Anti-Retrocesso:
 * Garante que o odômetro informado não seja menor que o último KM registrado no banco de dados.
 */
export const validarAntiRetrocessoKM = (novoValor, valorAnterior, tipoMedicao = 'KM') => {
  // Verifica se o valor original contém vírgula ANTES de limpar (pois o limparNumeroOdometro converte , em .)
  if (String(novoValor).includes(',')) {
    return {
      valido: false,
      retrocedeu: false,
      mensagem: 'Por favor, não utilize vírgula (,). Digite apenas números contínuos.',
      diferenca: 0,
      valorNumerico: null
    };
  }

  const novoNum = limparNumeroOdometro(novoValor);
  const anteriorNum = limparNumeroOdometro(valorAnterior);

  // Se o novo valor estiver vazio ou não houver registro anterior, não bloqueia
  if (novoNum === '' || anteriorNum === '' || anteriorNum <= 0) {
    return {
      valido: true,
      retrocedeu: false,
      mensagem: '',
      diferenca: 0,
      valorNumerico: typeof novoNum === 'number' ? novoNum : 0
    };
  }

  const isHoras = String(tipoMedicao).toUpperCase().includes('HORA');
  const unidade = isHoras ? 'horas' : 'km';

  if (novoNum < anteriorNum) {
    const dif = anteriorNum - novoNum;
    return {
      valido: false,
      retrocedeu: true,
      mensagem: `Atenção: O ${isHoras ? 'horímetro' : 'KM'} informado (${formatarNumeroBR(novoNum)} ${unidade}) é menor que o atual da frota (${formatarNumeroBR(anteriorNum)} ${unidade}). Ele será salvo apenas no histórico desta O.S.`,
      diferenca: dif,
      valorNumerico: novoNum
    };
  }

  if (novoNum > anteriorNum) {
    const dif = novoNum - anteriorNum;
    // Bloqueia se o salto for > 50000 ou se digitou zero a mais (ex: 20000 -> 200000)
    const isSaltoExagerado = (anteriorNum > 0) && (dif > 50000 || (String(Math.floor(novoNum)).length > String(Math.floor(anteriorNum)).length && novoNum > anteriorNum * 5));
    
    if (isSaltoExagerado) {
      return {
        valido: false,
        retrocedeu: false,
        mensagem: `ATENÇÃO - SALTO MUITO ALTO DE ${isHoras ? 'HORÍMETRO' : 'ODÔMETRO'}:\n\nO valor informado (${formatarNumeroBR(novoNum)}) representa um salto exagerado em relação ao atual (${formatarNumeroBR(anteriorNum)}).\n\nDiferença: ${formatarNumeroBR(dif)} ${unidade}.\n\nIsso parece ser um erro de digitação (ex: dígito a mais). Verifique e corrija o valor para prosseguir.`,
        diferenca: dif,
        valorNumerico: novoNum
      };
    }
  }

  return {
    valido: true,
    retrocedeu: false,
    mensagem: '',
    diferenca: novoNum - anteriorNum,
    valorNumerico: novoNum
  };
};
