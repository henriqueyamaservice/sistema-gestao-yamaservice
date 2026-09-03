/**
 * Máquina de Estados da Ordem de Serviço (O.S.) - 4 Fases
 * 
 * Este arquivo é a FONTE DE VERDADE de todos os status do sistema.
 * NUNCA escreva strings de status na mão nos componentes.
 * Sempre importe e use as constantes deste arquivo.
 */

// ─────────────────────────────────────────────────────────────────────────────
// FASE 1: TRIAGEM & APROVAÇÃO
// A O.S. nasce aqui e aguarda avaliação de um gestor.
// ─────────────────────────────────────────────────────────────────────────────
export const EMERGENCIA_CHEFE_SETOR     = 'EMERGENCIA_CHEFE_SETOR';     // Urgente - fura fila
export const AGUARDANDO_CHEFE_SETOR     = 'AGUARDANDO_CHEFE_SETOR';     // Normal - aguarda triagem
export const AGUARDANDO_GERENTE_SERVICOS= 'AGUARDANDO_GERENTE_SERVICOS'; // Investimento R$1k a R$5k
export const AGUARDANDO_DIRETORIA       = 'AGUARDANDO_DIRETORIA';       // Investimento > R$5k

// ─────────────────────────────────────────────────────────────────────────────
// FASE 2: REQUISITAGEM & INSUMOS
// A O.S. foi aprovada e o técnico está se preparando.
// ─────────────────────────────────────────────────────────────────────────────
export const ATRIBUIDO_TECNICO          = 'ATRIBUIDO_TECNICO';          // Aprovada, esperando técnico
export const AGUARDANDO_ALMOXARIFADO    = 'AGUARDANDO_ALMOXARIFADO';    // Técnico pediu peças
export const PECAS_ENTREGUES            = 'PECAS_ENTREGUES';            // Peças liberadas para uso

// ─────────────────────────────────────────────────────────────────────────────
// FASE 3: EXECUÇÃO
// O técnico está com a mão na massa.
// ─────────────────────────────────────────────────────────────────────────────
export const EM_ANDAMENTO               = 'EM_ANDAMENTO';               // Técnico trabalhando / rascunho salvo
export const AGUARDANDO_INSUMO          = 'AGUARDANDO_INSUMO';          // Pausado por falta de material

// ─────────────────────────────────────────────────────────────────────────────
// FASE 4: ENCERRAMENTO (Terminal - não volta mais)
// ─────────────────────────────────────────────────────────────────────────────
export const CONCLUIDO                  = 'CONCLUIDO';                  // Serviço feito e validado
export const CANCELADO                  = 'CANCELADO';                  // Cancelado em qualquer fase
export const REJEITADO_DIRETORIA        = 'REJEITADO_DIRETORIA';        // Reprovado pela Diretoria

// ─────────────────────────────────────────────────────────────────────────────
// GRUPOS (arrays) - para facilitar filtros nos Dashboards
// ─────────────────────────────────────────────────────────────────────────────
export const FASE_1_TRIAGEM = [
  EMERGENCIA_CHEFE_SETOR,
  AGUARDANDO_CHEFE_SETOR,
  AGUARDANDO_GERENTE_SERVICOS,
  AGUARDANDO_DIRETORIA,
];

export const FASE_2_INSUMOS = [
  ATRIBUIDO_TECNICO,
  AGUARDANDO_ALMOXARIFADO,
  PECAS_ENTREGUES,
];

export const FASE_3_EXECUCAO = [
  EM_ANDAMENTO,
  AGUARDANDO_INSUMO,
];

export const FASE_4_ENCERRAMENTO = [
  CONCLUIDO,
  CANCELADO,
  REJEITADO_DIRETORIA,
];

export const FILA_TECNICO = [...FASE_2_INSUMOS, ...FASE_3_EXECUCAO, EMERGENCIA_CHEFE_SETOR];

// Status padrão para OS criadas normalmente
export const STATUS_INICIAL = AGUARDANDO_CHEFE_SETOR;

// Objeto unificado para quem preferir usar OS_STATUS.CONCLUIDO
export const OS_STATUS = {
  // Fase 1
  EMERGENCIA_CHEFE_SETOR,
  AGUARDANDO_CHEFE_SETOR,
  AGUARDANDO_GERENTE_SERVICOS,
  AGUARDANDO_DIRETORIA,
  // Fase 2
  ATRIBUIDO_TECNICO,
  AGUARDANDO_ALMOXARIFADO,
  PECAS_ENTREGUES,
  // Fase 3
  EM_ANDAMENTO,
  AGUARDANDO_INSUMO,
  // Fase 4
  CONCLUIDO,
  CANCELADO,
  REJEITADO_DIRETORIA,
};

export default OS_STATUS;
