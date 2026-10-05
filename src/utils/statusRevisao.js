/**
 * Utilitário para cálculo e classificação de manutenção preventiva da frota
 * Utilizado pelo Dashboard de Revisões, Notificações e Terminal de Apontamento (Totem)
 */

export const calcularStatusManutencao = (kmUltimo, intervalo, kmAtual) => {
  if (!kmUltimo || !intervalo || Number(intervalo) <= 0) {
    return {
      id: 'nao_configurado',
      cor: '#cbd5e1',
      texto: 'Não Configurado',
      pct: 0,
      falta: 0,
      proxima: 0
    };
  }

  const numUltimo = Number(kmUltimo) || 0;
  const numIntervalo = Number(intervalo) || 0;
  const proxima = numUltimo + numIntervalo;

  if (!kmAtual && kmAtual !== 0) {
    return {
      id: 'alvo',
      cor: '#3b82f6',
      texto: `Alvo: ${proxima.toLocaleString('pt-BR')}`,
      pct: 0,
      falta: proxima,
      proxima
    };
  }

  const numAtual = Number(kmAtual) || 0;
  const falta = proxima - numAtual;
  const proporcao = falta / numIntervalo;

  let pct = ((numAtual - numUltimo) / numIntervalo) * 100;
  if (pct < 0) pct = 0;
  if (pct > 100) pct = 100;

  if (falta <= 0) {
    return {
      id: 'atrasado',
      cor: 'var(--cor-erro, #ef4444)',
      texto: 'Vencida',
      pct: 100,
      falta,
      atrasoAbsoluto: Math.abs(falta),
      proxima
    };
  } else if (proporcao <= 0.1) {
    return {
      id: 'atencao',
      cor: '#f59e0b',
      texto: 'Atenção',
      pct,
      falta,
      proxima
    };
  } else {
    return {
      id: 'em_dia',
      cor: 'var(--cor-sucesso, #10b981)',
      texto: 'Em Dia',
      pct,
      falta,
      proxima
    };
  }
};

/**
 * Analisa completamente um veículo ou máquina e retorna métricas, alertas e prioridades
 */
export const calcularStatusRevisaoVeiculo = (veiculo) => {
  if (!veiculo) {
    return {
      isMaq: false,
      unidade: 'km',
      labelMedicao: 'KM Atual',
      statusOleo: { id: 'nao_configurado', cor: '#cbd5e1', texto: 'Não Configurado', pct: 0 },
      statusRevisao: { id: 'nao_configurado', cor: '#cbd5e1', texto: 'Não Configurado', pct: 0 },
      temAlerta: false,
      critico: false,
      prioridade: 5,
      alertaPrincipal: null
    };
  }

  const isMaq = veiculo.tipoEquipamento === 'MAQUINA' ||
    veiculo.tipoMedicao === 'Horas' ||
    veiculo.tipoMedicao === 'HORAS' ||
    String(veiculo.tipoMedicao || '').toUpperCase().includes('HORA');

  const unidade = isMaq ? 'h' : 'km';
  const labelMedicao = isMaq ? 'Horímetro Atual' : 'KM Atual';

  const statusOleo = calcularStatusManutencao(veiculo.kmTrocaOleo, veiculo.intervaloTrocaOleo, veiculo.kmAtual);
  const statusRevisao = calcularStatusManutencao(veiculo.kmRevisao, veiculo.intervaloRevisao, veiculo.kmAtual);

  const prioridades = {
    'atrasado': 1,
    'atencao': 2,
    'em_dia': 3,
    'alvo': 4,
    'nao_configurado': 5
  };

  const pOleo = prioridades[statusOleo.id] || 5;
  const pRev = prioridades[statusRevisao.id] || 5;
  const prioridade = Math.min(pOleo, pRev);

  const temAlerta = statusOleo.id === 'atrasado' || statusOleo.id === 'atencao' ||
                    statusRevisao.id === 'atrasado' || statusRevisao.id === 'atencao';

  const critico = statusOleo.id === 'atrasado' || statusRevisao.id === 'atrasado';

  // Alerta principal resumido
  let alertaPrincipal = null;
  if (statusOleo.id === 'atrasado' && statusRevisao.id === 'atrasado') {
    alertaPrincipal = {
      tipo: 'ambos',
      gravidade: 'atrasado',
      texto: `Óleo & Revisão Vencidos`,
      detalhe: `Óleo (+${statusOleo.atrasoAbsoluto.toLocaleString('pt-BR')} ${unidade}) | Rev (+${statusRevisao.atrasoAbsoluto.toLocaleString('pt-BR')} ${unidade})`,
      cor: 'var(--cor-erro, #ef4444)'
    };
  } else if (statusOleo.id === 'atrasado') {
    alertaPrincipal = {
      tipo: 'oleo',
      gravidade: 'atrasado',
      texto: `Óleo Vencido (+${statusOleo.atrasoAbsoluto.toLocaleString('pt-BR')} ${unidade})`,
      detalhe: `Venceu em ${statusOleo.proxima.toLocaleString('pt-BR')} ${unidade}`,
      cor: 'var(--cor-erro, #ef4444)'
    };
  } else if (statusRevisao.id === 'atrasado') {
    alertaPrincipal = {
      tipo: 'revisao',
      gravidade: 'atrasado',
      texto: `Revisão Vencida (+${statusRevisao.atrasoAbsoluto.toLocaleString('pt-BR')} ${unidade})`,
      detalhe: `Venceu em ${statusRevisao.proxima.toLocaleString('pt-BR')} ${unidade}`,
      cor: 'var(--cor-erro, #ef4444)'
    };
  } else if (statusOleo.id === 'atencao') {
    alertaPrincipal = {
      tipo: 'oleo',
      gravidade: 'atencao',
      texto: `Óleo Próximo (restam ${statusOleo.falta.toLocaleString('pt-BR')} ${unidade})`,
      detalhe: `Meta: ${statusOleo.proxima.toLocaleString('pt-BR')} ${unidade}`,
      cor: '#f59e0b'
    };
  } else if (statusRevisao.id === 'atencao') {
    alertaPrincipal = {
      tipo: 'revisao',
      gravidade: 'atencao',
      texto: `Revisão Próxima (restam ${statusRevisao.falta.toLocaleString('pt-BR')} ${unidade})`,
      detalhe: `Meta: ${statusRevisao.proxima.toLocaleString('pt-BR')} ${unidade}`,
      cor: '#f59e0b'
    };
  }

  return {
    isMaq,
    unidade,
    labelMedicao,
    statusOleo,
    statusRevisao,
    prioridade,
    temAlerta,
    critico,
    alertaPrincipal
  };
};
