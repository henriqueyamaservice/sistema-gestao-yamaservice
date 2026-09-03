/**
 * notificationService.js
 * 
 * Serviço centralizado para disparo de notificações via WebSocket (Socket.io).
 * Isso mantém as rotas limpas e concentra a lógica de como a mensagem
 * é formatada antes de ser enviada ao front-end.
 */

const notificationService = {
  /**
   * Emite um evento global informando que houve uma mudança de status
   * em uma Requisição, O.S, ou qualquer outro fluxo que exija atenção de outro setor.
   * 
   * @param {Object} io - A instância do socket.io injetada no 'app' (req.app.get('io'))
   * @param {Object} data - Objeto contendo os dados da notificação
   * @param {string} data.tipo - 'requisicao', 'os', 'autorizacao', etc
   * @param {string|number} data.id - ID do item que sofreu alteração
   * @param {string} data.novoStatus - O status atual após a mudança
   * @param {string} data.mensagem - Mensagem amigável que aparecerá no Toast
   */
  notificarMudancaStatus(io, data) {
    if (!io) {
      console.warn('⚠️ [NotificationService] Instância do Socket.io não fornecida.');
      return;
    }

    try {
      console.log(`🔔 [NotificationService] Disparando notificação de mudança de status:`, data);
      
      // Emitimos o evento 'mudanca_status' para TODOS os clientes conectados.
      // O Front-end será responsável por verificar a 'role' do usuário atual
      // e decidir se deve ou não exibir o Toast na tela.
      io.emit('mudanca_status', {
        ...data,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ [NotificationService] Erro ao emitir notificação:', error);
    }
  }
};

export default notificationService;
