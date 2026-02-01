/**
 * Serviço de Notificações Locais
 * 
 * Gerencia notificações nativas do Android usando Capacitor
 * Permite agendar notificações para alertar sobre jogos começando
 */

import { LocalNotifications } from '@capacitor/local-notifications';

class NotificationService {
  constructor() {
    this.isInitialized = false;
    this.pendingNotifications = [];
  }

  /**
   * Inicializa o serviço de notificações
   * Deve ser chamado uma vez durante o startup da aplicação
   */
  async init() {
    if (this.isInitialized) return;

    try {
      // Pedir permissão para notificações
      const permission = await LocalNotifications.requestPermissions();
      console.log('[NotificationService] Permissão solicitada:', permission);

      // Configurar listener para quando usuário clica na notificação
      await LocalNotifications.addListener(
        'localNotificationActionPerformed',
        (notification) => this.handleNotificationClick(notification)
      );

      // Listener para notificações recebidas enquanto app está aberto
      await LocalNotifications.addListener(
        'localNotificationReceived',
        (notification) => this.handleNotificationReceived(notification)
      );

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
      await LocalNotifications.schedule({
        notifications: [
          {
            id: notificationId,
            title: titulo,
            body: mensagem,
            schedule: {
              at: new Date(Date.now() + 1000), // Dispara em 1 segundo (imediato)
            },
            actionTypeId: 'NOTIFICACAO_GERAL',
          },
        ],
      });

      console.log(`[NotificationService] ✅ Notificação nativa disparada: ${titulo}`);
      return true;
    } catch (error) {
      console.error('[NotificationService] Erro ao disparar notificação nativa:', error);
      return false;
    }
  }

  /**
   * Agenda uma notificação para um tempo específico
   * @param {number} minutosAteEvento - Minutos até o evento (60, 30, 15, 5)
   * @param {string} rodada - Número da rodada
   * @param {string} campeonato - Nome do campeonato
   * @param {Date} dataEvento - Data/hora que o evento começa
   * @param {number} notificationId - ID único para a notificação (hash rodada + tempo)
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

      // Montar mensagem
      const titulo = `⚽ Rodada ${rodada}`;
      const descricao = `${campeonato}\nFaltam ${minutosAteEvento}min para começar`;

      await LocalNotifications.schedule({
        notifications: [
          {
            id: notificationId,
            title: titulo,
            body: descricao,
            schedule: {
              at: dataDisparo,
            },
            actionTypeId: 'JOGO_NOTIFICACAO', // Categoria de ação
            extra: {
              rodada: String(rodada),
              campeonato: campeonato,
              minutosAlerta: minutosAteEvento,
            },
          },
        ],
      });

      console.log(
        `[NotificationService] ✅ Notificação ${notificationId} agendada para ${dataDisparo.toLocaleString()}`
      );
      return true;
    } catch (error) {
      console.error('[NotificationService] Erro ao agendar notificação:', error);
      return false;
    }
  }

  /**
   * Agenda múltiplas notificações para uma rodada
   * Dispara em 60, 30, 15 e 5 minutos antes
   */
  async agendarNotificacoesRodada(rodada, campeonato, dataInicio) {
    const temposAlerta = [60, 30, 15, 5]; // minutos
    const resultados = [];

    for (const minutos of temposAlerta) {
      // Gerar ID único: hash(rodada + minutos)
      const notificationId = parseInt(`${rodada}${minutos}`.padEnd(10, '0'), 10);

      const sucesso = await this.agendarNotificacao(
        minutos,
        rodada,
        campeonato,
        new Date(dataInicio),
        notificationId
      );

      resultados.push({ minutos, sucesso });
    }

    return resultados;
  }

  /**
   * Cancela notificações já agendadas
   */
  async cancelarNotificacao(notificationId) {
    try {
      await LocalNotifications.cancel({
        notifications: [{ id: notificationId }],
      });
      console.log(`[NotificationService] ❌ Notificação ${notificationId} cancelada`);
    } catch (error) {
      console.error('[NotificationService] Erro ao cancelar notificação:', error);
    }
  }

  /**
   * Limpa todas as notificações
   */
  async limparTodas() {
    try {
      await LocalNotifications.removeAllDelivered();
      console.log('[NotificationService] 🗑️ Todas as notificações removidas');
    } catch (error) {
      console.error('[NotificationService] Erro ao limpar notificações:', error);
    }
  }

  /**
   * Handler quando notificação é clicada pelo usuário
   * Navega para a página de palpites da rodada ou redireciona conforme dados_adicionais
   */
  handleNotificationClick(notification) {
    console.log('[NotificationService] 🔔 Usuário clicou em notificação:', notification);

    const rodada = notification.notification.extra?.rodada;
    const dadosAdicionais = notification.notification.extra?.dados_adicionais;

    // Se há redireciona nos dados_adicionais (ex: notificação 24h antes), usar esse
    if (dadosAdicionais && typeof dadosAdicionais === 'string') {
      try {
        const dados = JSON.parse(dadosAdicionais);
        if (dados.redireciona) {
          console.log('[NotificationService] ➡️ Redirecionando para:', dados.redireciona);
          window.dispatchEvent(
            new CustomEvent('notificacaoClicada', {
              detail: { redireciona: dados.redireciona },
            })
          );
          return;
        }
      } catch (e) {
        console.warn('[NotificationService] Erro ao parsear dados_adicionais:', e);
      }
    }

    // Fallback: se tem rodada, redireciona para palpites
    if (rodada) {
      // Disparar evento global para redirecionar
      window.dispatchEvent(
        new CustomEvent('notificacaoClicada', {
          detail: { rodada },
        })
      );

      // Ou chamar navigate diretamente se tiver acesso
      // window.location.hash = `#/palpites?rodada=${rodada}`;
    }
  }

  /**
   * Handler quando notificação é recebida enquanto app está aberto
   */
  handleNotificationReceived(notification) {
    console.log('[NotificationService] 📬 Notificação recebida em foreground:', notification);
  }

  /**
   * Verifica notificações pendentes e reagenda se necessário
   * (útil após reiniciar app)
   */
  async verificarPendentes() {
    try {
      const pending = await LocalNotifications.getPending();
      console.log('[NotificationService] Notificações pendentes:', pending.notifications.length);
      return pending.notifications;
    } catch (error) {
      console.error('[NotificationService] Erro ao verificar pendentes:', error);
      return [];
    }
  }
}

export default new NotificationService();
