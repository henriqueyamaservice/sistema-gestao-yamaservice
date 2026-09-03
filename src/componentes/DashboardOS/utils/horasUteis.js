/**
 * Lista padrão de Feriados Nacionais Brasileiros (fixos por MM-DD)
 */
export const FERIADOS_NACIONAIS_PADRAO = [
  { diaMes: '01-01', nome: 'Confraternização Universal', tipo: 'nacional' },
  { diaMes: '04-21', nome: 'Tiradentes', tipo: 'nacional' },
  { diaMes: '05-01', nome: 'Dia do Trabalhador', tipo: 'nacional' },
  { diaMes: '09-07', nome: 'Independência do Brasil', tipo: 'nacional' },
  { diaMes: '10-12', nome: 'Nossa Senhora Aparecida', tipo: 'nacional' },
  { diaMes: '11-02', nome: 'Finados', tipo: 'nacional' },
  { diaMes: '11-15', nome: 'Proclamação da República', tipo: 'nacional' },
  { diaMes: '11-20', nome: 'Dia da Consciência Negra', tipo: 'nacional' },
  { diaMes: '12-25', nome: 'Natal', tipo: 'nacional' },
];

/**
 * Calcula as Horas Úteis no período informado
 * - Segunda a Sexta: 8 horas/dia
 * - Sábado: 4 horas/dia
 * - Domingo: 0 horas
 * - Feriado (Nacional ou Municipal/Customizado): 0 horas
 * 
 * @param {string} dataInicioStr Data inicial no formato YYYY-MM-DD
 * @param {string} dataFimStr Data final no formato YYYY-MM-DD
 * @param {Array} feriadosCustomizados Lista de feriados adicionados pelo usuário [{ data: 'YYYY-MM-DD', nome: '...' }]
 * @returns {Object} { totalHorasUteis, diasUteisSegSex, diasSabados, totalFeriados, feriadosEncontrados }
 */
export const calcularHorasUteisPeriodo = (dataInicioStr, dataFimStr, feriadosCustomizados = []) => {
  if (!dataInicioStr || !dataFimStr) {
    return {
      totalHorasUteis: 0,
      diasUteisSegSex: 0,
      diasSabados: 0,
      totalFeriados: 0,
      feriadosEncontrados: []
    };
  }

  const inicio = new Date(dataInicioStr + 'T00:00:00');
  const fim = new Date(dataFimStr + 'T00:00:00');

  if (isNaN(inicio.getTime()) || isNaN(fim.getTime()) || inicio > fim) {
    return {
      totalHorasUteis: 0,
      diasUteisSegSex: 0,
      diasSabados: 0,
      totalFeriados: 0,
      feriadosEncontrados: []
    };
  }

  let totalHorasUteis = 0;
  let diasUteisSegSex = 0;
  let diasSabados = 0;
  let totalFeriados = 0;
  const feriadosEncontrados = [];

  const curr = new Date(inicio);

  while (curr <= fim) {
    const ano = curr.getFullYear();
    const mes = String(curr.getMonth() + 1).padStart(2, '0');
    const dia = String(curr.getDate()).padStart(2, '0');
    const dataISO = `${ano}-${mes}-${dia}`;
    const mmdd = `${mes}-${dia}`;

    const diaSemana = curr.getDay(); // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado

    // Verifica se é feriado nacional fixo
    const feriadoNacional = FERIADOS_NACIONAIS_PADRAO.find(f => f.diaMes === mmdd);

    // Verifica se é feriado customizado/municipal (por data ISO exata YYYY-MM-DD ou por MM-DD)
    const feriadoCustomizado = feriadosCustomizados.find(f =>
      f.data === dataISO || (f.recorrente && f.diaMes === mmdd)
    );

    const isFeriado = Boolean(feriadoNacional || feriadoCustomizado);
    const nomeFeriado = feriadoCustomizado?.nome || feriadoNacional?.nome || 'Feriado';
    const tipoFeriado = feriadoCustomizado ? 'municipal' : (feriadoNacional ? 'nacional' : null);

    if (isFeriado) {
      totalFeriados++;
      feriadosEncontrados.push({
        data: dataISO,
        nome: nomeFeriado,
        tipo: tipoFeriado
      });
    } else if (diaSemana === 0) {
      // Domingo -> 0h
    } else if (diaSemana === 6) {
      // Sábado -> 4h
      diasSabados++;
      totalHorasUteis += 4;
    } else {
      // Segunda a Sexta -> 8h
      diasUteisSegSex++;
      totalHorasUteis += 8;
    }

    curr.setDate(curr.getDate() + 1);
  }

  return {
    totalHorasUteis,
    diasUteisSegSex,
    diasSabados,
    totalFeriados,
    feriadosEncontrados
  };
};
