/**
 * Serviço de Notificações - Web
 * 
 * Versão web que usa Notification API do navegador
 * para notificações locais/agendadas
 */

class NotificationService {
  constructor() {
    this.isInitialized = false;
    this.pendingNotifications = [];
    this.scheduledNotifications = new Map();
  }

  /**
   * Inicializa o serviço de notificações
   * Solicita permissão do navegador
   */
  async init() {
    if (this.isInitialized) return;

    try {
      // Verificar suporte para Notification API
      if (!('Notification' in window)) {
        console.log('[NotificationService] ⚠️ Navegador não suporta Notification API');
        return;
      }

      // Pedir permissão se necessário
      if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        console.log('[NotificationService] Permissão solicitada:', permission);
      }

      this.isInitialized = true;
      console.log('[NotificationService] ✅ Inicializado com sucesso');
    } catch (error) {
      console.error('[NotificationService] Erro ao inicializar:', error);
    }
  }

  /**
   * Dispara notificação imediata (genérica)
   * @param {string} titulo - Título da notificação
   * @param {string} mensagem - Corpo da notificação
   * @param {number} notificationId - ID único da notificação
   */
  async dispararNotificacaoImediata(titulo, mensagem, notificationId) {
    try {
      if (Notification.permission !== 'granted') {
        console.log('[NotificationService] ⚠️ Sem permissão para notificações');
        return false;
      }

      const notif = new Notification(titulo, {
        body: mensagem,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: `notif-${notificationId}`,
        requireInteraction: false
      });

      notif.onclick = () => {
        window.focus();
        notif.close();
      };

      console.log(`[NotificationService] ✅ Notificação disparada: ${titulo}`);
      return true;
    } catch (error) {
      console.error('[NotificationService] Erro ao disparar notificação:', error);
      return false;
    }
  }

  /**
   * Agenda uma notificação para um tempo específico
   * @param {number} minutosAteEvento - Minutos até o evento (60, 30, 15, 5)
   * @param {string} rodada - Número da rodada
   * @param {string} campeonato - Nome do campeonato
   * @param {Date} dataEvento - Data/hora que o evento começa
   * @param {number} notificationId - ID único para a notificação
   */
  async agendarNotificacao(minutosAteEvento, rodada, campeonato, dataEvento, notificationId) {
    try {
      // Calcular quando dispara a notificação
      const dataDisparo = new Date(dataEvento.getTime() - minutosAteEvento * 60 * 1000);

      // Validar se a data já passou
      if (dataDisparo < new Date()) {
        console.log(`[NotificationService] ⏭️ Notificação ${notificationId} já vencida, pulando`);
        return false;
      }

      // Calcular delay até disparo
      const delay = dataDisparo.getTime() - Date.now();

      // Montar mensagem
      const titulo = `⚽ Rodada ${rodada}`;
      const body = `${campeonato}\nFaltam ${minutosAteEvento}min para começar`;

      // Agendar notificação com setTimeout
      const timeoutId = setTimeout(() => {
        this.dispararNotificacaoImediata(titulo, body, notificationId);
      }, delay);

      // Armazenar para possível cancelamento
      this.scheduledNotifications.set(notificationId, timeoutId);

      console.log(`[NotificationService] ✅ Notificação agendada para ${new Date(dataDisparo).toLocaleString()}`);
      return true;
    } catch (error) {
      console.error('[NotificationService] Erro ao agendar notificação:', error);
      return false;
    }
  }

  /**
   * Cancela uma notificação agendada
   * @param {number} notificationId - ID da notificação a cancelar
   */
  cancelarNotificacao(notificationId) {
    const timeoutId = this.scheduledNotifications.get(notificationId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.scheduledNotifications.delete(notificationId);
      console.log(`[NotificationService] ✅ Notificação ${notificationId} cancelada`);
      return true;
    }
    return false;
  }

  /**
   * Cancela todas as notificações agendadas
   */
  cancelarTodas() {
    this.scheduledNotifications.forEach((timeoutId) => {
      clearTimeout(timeoutId);
    });
    this.scheduledNotifications.clear();
    console.log('[NotificationService] ✅ Todas as notificações foram canceladas');
  }

  /**
   * Handler quando usuário clica em notificação
   */
  handleNotificationClick(notification) {
    console.log('[NotificationService] Notificação clicada:', notification);
    window.focus();

    // Disparar evento customizado
    window.dispatchEvent(new CustomEvent('notificationClicked', {
      detail: notification
    }));
  }
}

const notificationService = new NotificationService();

export default notificationService;
