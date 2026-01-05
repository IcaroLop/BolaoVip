/**
 * Serviço de Polling de Notificações
 * 
 * Verifica periodicamente se há novas notificações no backend
 * e dispara notificações nativas no celular
 */

import axios from 'axios';
import notificationService from './notificationService';

// API - servidor de produção
const API = 'http://191.243.196.240:3001';

class NotificationPollingService {
  constructor() {
    this.intervalId = null;
    this.isRunning = false;
    this.lastCheckId = 0; // ID da última notificação verificada
  }

  /**
   * Inicia o polling de notificações
   * Verifica a cada 30 segundos se há novas notificações
   */
  async start(token) {
    if (this.isRunning || !token) {
      console.log('[NotificationPolling] Já está rodando ou token ausente');
      return;
    }

    this.isRunning = true;
    console.log(`[NotificationPolling] ✅ Iniciado (API: ${API})`);

    // Primeira verificação imediata
    await this.checkNewNotifications(token);

    // Verificar a cada 30 segundos
    this.intervalId = setInterval(async () => {
      await this.checkNewNotifications(token);
    }, 30000); // 30 segundos
  }

  /**
   * Para o polling
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('[NotificationPolling] ⏹️ Parado');
  }

  /**
   * Verifica se há novas notificações e dispara notificações nativas
   */
  async checkNewNotifications(token) {
    try {
      // Buscar notificações não lidas
      console.log(`[NotificationPolling] 🔄 Verificando notificações em ${API}...`);
      
      const res = await axios.get(`${API}/notificacoes/usuario?limite=10`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const notificacoes = res.data.notificacoes || [];
      console.log(`[NotificationPolling] 📦 Recebidas ${notificacoes.length} notificações`);

      // Filtrar apenas as novas (ID maior que o último verificado)
      const novas = notificacoes.filter(n => n.id > this.lastCheckId && !n.lida);

      if (novas.length > 0) {
        console.log(`[NotificationPolling] 📬 ${novas.length} novas notificações detectadas`);

        // Atualizar o ID da última verificada
        this.lastCheckId = Math.max(...novas.map(n => n.id));

        // Disparar notificação nativa para cada uma
        for (const notif of novas) {
          await this.dispararNotificacaoNativa(notif);
        }
      } else {
        console.log(`[NotificationPolling] ✓ Nenhuma notificação nova`);
      }
    } catch (err) {
      console.error('[NotificationPolling] ❌ Erro ao verificar notificações:', {
        message: err.message,
        code: err.code,
        status: err.response?.status,
        statusText: err.response?.statusText,
        url: `${API}/notificacoes/usuario`
      });
    }
  }

  /**
   * Dispara uma notificação nativa no celular
   */
  async dispararNotificacaoNativa(notificacao) {
    try {
      // Gerar ID único baseado no ID da notificação
      const notificationId = notificacao.id;

      console.log(`[NotificationPolling] 📲 Disparando nativa: "${notificacao.titulo}"`);

      // Disparar notificação nativa imediatamente
      await notificationService.dispararNotificacaoImediata(
        notificacao.titulo,
        notificacao.mensagem,
        notificationId
      );

      console.log(
        `[NotificationPolling] ✅ Notificação nativa disparada: "${notificacao.titulo}"`
      );
    } catch (err) {
      console.error('[NotificationPolling] ❌ Erro ao disparar notificação nativa:', err.message);
    }
  }

  /**
   * Define manualmente o último ID verificado (útil ao inicializar)
   */
  setLastCheckId(id) {
    this.lastCheckId = id;
    console.log(`[NotificationPolling] Último ID definido: ${id}`);
  }
}

export default new NotificationPollingService();
