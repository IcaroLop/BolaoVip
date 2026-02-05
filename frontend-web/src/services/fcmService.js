/**
 * Serviço de Notificações Push - Web
 * 
 * Versão web pura que usa Notification API do navegador
 * e Web Push API quando disponível
 * 
 * Para APK/Mobile, use a versão original em frontend/bolao-vip/src/services/fcmService.js
 */

class FCMService {
  constructor() {
    this.isInitialized = false;
    this.fcmToken = null;
    this.notificationPermission = false;
  }

  /**
   * Inicializa o serviço de notificações web
   * Solicita permissão do navegador
   */
  async init(token) {
    if (this.isInitialized) return;

    try {
      // Verificar suporte para Notification API
      if (!('Notification' in window)) {
        console.log('[FCMService] ⚠️ Navegador não suporta Notification API');
        return;
      }

      // Se já tem permissão, não precisa pedir novamente
      if (Notification.permission === 'granted') {
        this.notificationPermission = true;
        console.log('[FCMService] ✅ Permissão de notificação já concedida');
      } else if (Notification.permission !== 'denied') {
        // Pedir permissão
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          this.notificationPermission = true;
          console.log('[FCMService] ✅ Permissão de notificação concedida');
        } else {
          console.log('[FCMService] ⚠️ Permissão de notificação negada');
        }
      }

      // Registrar Service Worker para Web Push API (se disponível)
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        try {
          await navigator.serviceWorker.register('/service-worker.js');
          console.log('[FCMService] ✅ Service Worker registrado');
        } catch (error) {
          console.log('[FCMService] ⚠️ Erro ao registrar Service Worker:', error.message);
        }
      }

      this.isInitialized = true;
      console.log('[FCMService] ✅ Inicializado para web');
    } catch (error) {
      console.error('[FCMService] Erro ao inicializar:', error);
    }
  }

  /**
   * Envia token ao backend (para versão web, pode ser opcional)
   */
  async enviarTokenAoBackend(fcmToken, platform = 'web') {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('[FCMService] ⚠️ Usuário não autenticado, não enviando token');
        return;
      }

      // Usar API_BASE_URL do ambiente
      const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:3001';

      const response = await fetch(`${apiBase}/fcm/registrar-token`, {
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
      const token = localStorage.getItem('token');
      if (!token) return;

      const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:3001';

      await fetch(`${apiBase}/fcm/remover-token`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('[FCMService] ✅ Token removido ao fazer logout');
      this.fcmToken = null;
    } catch (error) {
      console.error('[FCMService] Erro ao remover token:', error);
    }
  }

  /**
   * Mostra notificação nativa do navegador
   */
  mostrarNotificacao(titulo, opcoes = {}) {
    if (!this.notificationPermission) {
      console.log('[FCMService] ⚠️ Sem permissão para mostrar notificação');
      return;
    }

    try {
      const notificacao = new Notification(titulo, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: opcoes.tag || 'bolao-vip',
        ...opcoes
      });

      // Handler ao clicar na notificação
      notificacao.onclick = () => {
        if (opcoes.dados?.rodada) {
          window.dispatchEvent(new CustomEvent('fcmNotificationClicked', {
            detail: opcoes.dados
          }));
        }
        notificacao.close();
      };

      return notificacao;
    } catch (error) {
      console.error('[FCMService] Erro ao mostrar notificação:', error);
    }
  }

  /**
   * Handler quando notificação é recebida
   */
  handleNotificationReceived(notification) {
    const data = notification.notification || notification;
    
    console.log('[FCMService] Notificação recebida:', {
      titulo: data.title,
      mensagem: data.body,
      dados: data.data
    });

    // Mostrar notificação
    if (this.notificationPermission) {
      this.mostrarNotificacao(data.title || 'Notificação', {
        body: data.body,
        dados: data.data,
        tag: 'bolao-vip-' + (data.data?.rodada || 'geral')
      });
    }

    // Disparar evento customizado para app reagir
    window.dispatchEvent(new CustomEvent('fcmNotificationReceived', {
      detail: data
    }));
  }

  /**
   * Handler quando usuário clica em notificação
   */
  handleNotificationClicked(notification) {
    const data = notification.notification?.data || notification.data;
    
    console.log('[FCMService] Usuário clicou em notificação:', data);

    // Redirecionar se houver rodada nos dados
    if (data?.rodada) {
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

      const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:3001';

      const response = await fetch(`${apiBase}/fcm/testar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          titulo: '🧪 Teste de Notificação Web',
          mensagem: 'Se você vê isso, notificações estão funcionando!'
        })
      });

      if (response.ok) {
        console.log('[FCMService] ✅ Notificação de teste enviada');
        // Mostrar notificação imediatamente para teste
        this.mostrarNotificacao('🧪 Teste de Notificação Web', {
          body: 'Se você vê isso, notificações estão funcionando!'
        });
      }
    } catch (error) {
      console.error('[FCMService] Erro ao testar:', error);
    }
  }
}

const fcmService = new FCMService();

export default fcmService;