/**
 * Serviço Firebase Cloud Messaging (FCM) - Frontend
 * 
 * Inicializa Firebase, gerencia tokens e recebe notificações push
 * Funciona em foreground e background (com Capacitor)
 */

import { App as CapacitorApp } from '@capacitor/app';
import { PushNotifications } from '@capacitor/push-notifications';

class FCMService {
  constructor() {
    this.isInitialized = false;
    this.fcmToken = null;
    this.apiBase = 'http://191.243.196.240:3001';
  }

  /**
   * Inicializa o serviço FCM
   * Solicita permissões e registra listeners
   */
  async init(token) {
    if (this.isInitialized) return;

    try {
      // Solicitar permissão para notificações push
      const permStatus = await PushNotifications.requestPermissions();
      console.log('[FCMService] Permissões push:', permStatus);

      // Registrar para receber notificações push
      await PushNotifications.register();
      console.log('[FCMService] ✅ Registrado para push notifications');

      // Listener: quando token é obtido/renovado
      PushNotifications.addListener('registration', async (token) => {
        console.log('[FCMService] 📱 Token FCM recebido:', token.value);
        this.fcmToken = token.value;
        
        // Enviar token ao backend
        if (token) {
          await this.enviarTokenAoBackend(token.value, 'android');
        }
      });

      // Listener: erro no registro
      PushNotifications.addListener('registrationError', (error) => {
        console.error('[FCMService] ❌ Erro no registro:', error.error);
      });

      // Listener: notificação recebida
      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('[FCMService] 🔔 Notificação recebida:', notification);
        this.handleNotificationReceived(notification);
      });

      // Listener: usuário clicou em notificação
      PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
        console.log('[FCMService] 👆 Notificação clicada:', notification);
        this.handleNotificationClicked(notification);
      });

      this.isInitialized = true;
      console.log('[FCMService] ✅ Inicializado com sucesso');
    } catch (error) {
      console.error('[FCMService] Erro ao inicializar:', error);
    }
  }

  /**
   * Envia o token FCM ao backend
   */
  async enviarTokenAoBackend(fcmToken, platform = 'android') {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('[FCMService] ⚠️ Usuário não autenticado, não enviando token');
        return;
      }

      const response = await fetch(`${this.apiBase}/fcm/registrar-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          fcmToken,
          platform
        })
      });

      if (response.ok) {
        console.log('[FCMService] ✅ Token enviado ao backend');
      } else {
        console.error('[FCMService] ❌ Erro ao enviar token:', response.statusText);
      }
    } catch (error) {
      console.error('[FCMService] Erro ao enviar token:', error);
    }
  }

  /**
   * Remove token quando usuário faz logout
   */
  async removerToken() {
    try {
      if (!this.fcmToken) return;

      const token = localStorage.getItem('token');
      if (!token) return;

      await fetch(`${this.apiBase}/fcm/remover-token`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          fcmToken: this.fcmToken
        })
      });

      console.log('[FCMService] ✅ Token removido ao fazer logout');
      this.fcmToken = null;
    } catch (error) {
      console.error('[FCMService] Erro ao remover token:', error);
    }
  }

  /**
   * Handler quando notificação é recebida
   */
  handleNotificationReceived(notification) {
    const data = notification.notification;
    
    // Mostrar notificação visual se app está em foreground
    console.log('[FCMService] Notificação recebida:', {
      titulo: data.title,
      mensagem: data.body,
      dados: data.data
    });

    // Disparar evento customizado para app reagir
    window.dispatchEvent(new CustomEvent('fcmNotificationReceived', {
      detail: data
    }));
  }

  /**
   * Handler quando usuário clica em notificação
   */
  handleNotificationClicked(notification) {
    const data = notification.notification.data;
    
    console.log('[FCMService] Usuário clicou em notificação:', data);

    // Redirecionar se houver rodada nos dados
    if (data.rodada) {
      window.dispatchEvent(new CustomEvent('fcmNotificationClicked', {
        detail: data
      }));
    }
  }

  /**
   * Testar envio de notificação (debug)
   */
  async testarNotificacao() {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('[FCMService] ⚠️ Usuário não autenticado');
        return;
      }

      const response = await fetch(`${this.apiBase}/fcm/testar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          titulo: '🧪 Teste de Push Notification',
          mensagem: 'Se você vê isso, push notifications estão funcionando!'
        })
      });

      if (response.ok) {
        console.log('[FCMService] ✅ Notificação de teste enviada');
      }
    } catch (error) {
      console.error('[FCMService] Erro ao testar:', error);
    }
  }
}

export default new FCMService();
