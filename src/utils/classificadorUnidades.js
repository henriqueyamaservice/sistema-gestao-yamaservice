/**
 * Utilitário Central para Tratamento e Classificação de Unidades de Medida
 * Padroniza:
 * 1. QUANTIDADE INTEIRA (UN, PC, CX, KT, PAR)
 * 2. LÍQUIDOS (L, LT, GL, TB)
 * 3. METRAGEM LINEAR (M, MT, RL)
 * 4. PESO / GRANEL (KG, G)
 */

export const TIPO_UNIDADE = {
  UNIDADE: 'UNIDADE',
  LIQUIDO: 'LIQUIDO',
  METRO: 'METRO',
  PESO: 'PESO'
};

/**
 * Normaliza a string de unidade recebida do banco/Omie
 */
export const normalizarUnidade = (unidade) => {
  if (!unidade) return 'UN';
  return String(unidade).trim().toUpperCase();
};

/**
 * Retorna a categoria da unidade de medida
 */
export const obterTipoUnidade = (unidade) => {
  const un = normalizarUnidade(unidade);

  // Líquidos
  if (['L', 'LT', 'LTS', 'LITRO', 'LITROS', 'GL', 'GALAO', 'GALÃO', 'TB', 'TAMBOR', 'ML'].includes(un)) {
    return TIPO_UNIDADE.LIQUIDO;
  }

  // Metragem / Linear
  if (['M', 'MT', 'MTS', 'METRO', 'METROS', 'RL', 'ROLO', 'ROLOS', 'CM', 'MM'].includes(un)) {
    return TIPO_UNIDADE.METRO;
  }

  // Peso / Granel
  if (['KG', 'KGS', 'QUILO', 'QUILOS', 'KILOGRAMA', 'G', 'GR', 'GRAMA', 'GRAMAS', 'TON'].includes(un)) {
    return TIPO_UNIDADE.PESO;
  }

  // Padrão: Quantidade Inteira (Peças, Caixas, Kits, etc.)
  return TIPO_UNIDADE.UNIDADE;
};

/**
 * Verifica se a unidade aceita valores fracionados/decimais
 */
export const permiteDecimais = (unidade) => {
  const tipo = obterTipoUnidade(unidade);
  return tipo === TIPO_UNIDADE.LIQUIDO || tipo === TIPO_UNIDADE.METRO || tipo === TIPO_UNIDADE.PESO;
};

/**
 * Retorna a sigla amigável para exibição em inputs e tabelas
 */
export const obterRotuloUnidade = (unidade) => {
  const un = normalizarUnidade(unidade);
  if (['L', 'LT', 'LTS', 'LITRO', 'LITROS'].includes(un)) return 'L';
  if (['GL', 'GALAO', 'GALÃO'].includes(un)) return 'gl';
  if (['TB', 'TAMBOR'].includes(un)) return 'tb';
  if (['ML'].includes(un)) return 'ml';

  if (['M', 'MT', 'MTS', 'METRO', 'METROS'].includes(un)) return 'm';
  if (['RL', 'ROLO', 'ROLOS'].includes(un)) return 'rl';
  if (['CM'].includes(un)) return 'cm';
  if (['MM'].includes(un)) return 'mm';

  if (['KG', 'KGS', 'QUILO', 'QUILOS', 'KILOGRAMA'].includes(un)) return 'kg';
  if (['G', 'GR', 'GRAMA', 'GRAMAS'].includes(un)) return 'g';

  if (['PC', 'PÇ', 'PECA', 'PEÇA'].includes(un)) return 'pç';
  if (['CX', 'CAIXA'].includes(un)) return 'cx';
  if (['KT', 'KIT'].includes(un)) return 'kt';
  if (['PAR', 'PARES'].includes(un)) return 'par';

  return un.toLowerCase() || 'un';
};

/**
 * Formata um valor numérico respeitando as regras da unidade de medida
 */
export const formatarQuantidade = (valor, unidade) => {
  if (valor === undefined || valor === null || valor === '') return '0';
  const num = typeof valor === 'number' ? valor : parseFloat(String(valor).replace(',', '.'));
  if (isNaN(num)) return '0';

  if (permiteDecimais(unidade)) {
    // Mostra até 2 casas decimais, removendo zeros à direita (ex: 2.50 -> 2,5; 3.00 -> 3)
    return num.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }

  // Quantidade inteira
  return Math.round(num).toString();
};

/**
 * Formata o valor já acompanhado do sufixo da unidade (Ex: "2,5 L", "1,8 m", "4 un")
 */
export const formatarQuantidadeComUnidade = (valor, unidade) => {
  const rotulo = obterRotuloUnidade(unidade);
  const qtdFormatada = formatarQuantidade(valor, unidade);
  return `${qtdFormatada} ${rotulo}`;
};

/**
 * Informações visuais para badges de tipo no Almoxarifado
 */
export const obterBadgeInfo = (unidade) => {
  const tipo = obterTipoUnidade(unidade);
  switch (tipo) {
    case TIPO_UNIDADE.LIQUIDO:
      return {
        tipo: 'LIQUIDO',
        label: 'Líquido (Litros)',
        cor: '#0ea5e9',
        bg: 'rgba(14, 165, 233, 0.1)',
        border: 'rgba(14, 165, 233, 0.25)',
        icone: '💧'
      };
    case TIPO_UNIDADE.METRO:
      return {
        tipo: 'METRO',
        label: 'Metragem (Linear)',
        cor: '#8b5cf6',
        bg: 'rgba(139, 92, 246, 0.1)',
        border: 'rgba(139, 92, 246, 0.25)',
        icone: '📏'
      };
    case TIPO_UNIDADE.PESO:
      return {
        tipo: 'PESO',
        label: 'Peso / Granel',
        cor: '#f59e0b',
        bg: 'rgba(245, 158, 11, 0.1)',
        border: 'rgba(245, 158, 11, 0.25)',
        icone: '⚖️'
      };
    default:
      return {
        tipo: 'UNIDADE',
        label: 'Peça / Unidade',
        cor: '#10b981',
        bg: 'rgba(16, 185, 129, 0.1)',
        border: 'rgba(16, 185, 129, 0.25)',
        icone: '📦'
      };
  }
};
