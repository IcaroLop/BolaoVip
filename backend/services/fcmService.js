/**
 * Serviço Firebase Cloud Messaging (FCM)
 * 
 * Gerencia envio de notificações push reais para dispositivos Android/iOS
 * Permite que notificações funcionem em background e foreground
 */

const admin = require('firebase-admin');
const pool = require('../database/conexao');
const path = require('path');
const fs = require('fs');

// Inicializar Firebase Admin SDK
let firebaseInitialized = false;

function initializeFirebase() {
  if (firebaseInitialized) return;

  try {
    // Buscar caminho do arquivo de credenciais
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    
    if (!serviceAccountPath) {
      console.warn('[FCMService] ⚠️ FIREBASE_SERVICE_ACCOUNT_PATH não configurado. Push notifications desabilitadas.');
      return;
    }

    // Resolver caminho relativo ou absoluto
    const absolutePath = path.isAbsolute(serviceAccountPath) 
      ? serviceAccountPath 
      : path.join(process.cwd(), serviceAccountPath);

    // Verificar se arquivo existe
    if (!fs.existsSync(absolutePath)) {
      console.error(`[FCMService] ❌ Arquivo Firebase não encontrado: ${absolutePath}`);
      return;
    }

    // Carregar credenciais do arquivo
    const serviceAccount = require(absolutePath);

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
    });
    
    firebaseInitialized = true;
    console.log(`[FCMService] ✅ Firebase Admin SDK inicializado (arquivo: ${absolutePath})`);
  } catch (err) {
    console.error('[FCMService] ❌ Erro ao inicializar Firebase:', err.message);
  }
}

class FCMService {
  /**
   * Registra token FCM de um dispositivo para um usuário
   * @param {number} usuarioId - ID do usuário
   * @param {string} fcmToken - Token FCM do dispositivo
   * @param {string} platform - 'android' ou 'ios'
   */
  async registrarToken(usuarioId, fcmToken, platform = 'android') {
    try {
      const conexao = await pool.getConnection();
      
      try {
        await conexao.query(
          `INSERT INTO usuarios_fcm_tokens (usuario_id, fcm_token, platform, data_registro, ultima_atividade)
           VALUES (?, ?, ?, NOW(), NOW())
           ON DUPLICATE KEY UPDATE
             ultima_atividade = NOW()`,
          [usuarioId, fcmToken, platform]
        );
        
        console.log(`[FCMService] ✅ Token FCM registrado para usuário ${usuarioId}`);
        return true;
      } finally {
        conexao.release();
      }
    } catch (err) {
      console.error('[FCMService] Erro ao registrar token FCM:', err.message);
      return false;
    }
  }

  /**
   * Envia notificação push para um usuário específico
   * @param {number} usuarioId - ID do usuário
   * @param {object} notificationData - { titulo, mensagem, dados_extras }
   */
  async enviarPushParaUsuario(usuarioId, notificationData) {
    if (!firebaseInitialized) {
      console.warn('[FCMService] Firebase não inicializado. Push não enviado.');
      return false;
    }

    try {
      const conexao = await pool.getConnection();
      
      try {
        // Buscar tokens FCM ativas do usuário
        const [tokens] = await conexao.query(
          `SELECT fcm_token FROM usuarios_fcm_tokens 
           WHERE usuario_id = ? AND data_registro > DATE_SUB(NOW(), INTERVAL 90 DAY)
           LIMIT 10`,
          [usuarioId]
        );

        if (tokens.length === 0) {
          console.log(`[FCMService] ℹ️ Nenhum token FCM encontrado para usuário ${usuarioId}`);
          return false;
        }

        // Preparar mensagem push
        const message = {
          notification: {
            title: notificationData.titulo || '⚽ Bolão VIP',
            body: notificationData.mensagem || 'Nova notificação'
          },
          data: notificationData.dadosExtras || {},
          android: {
            priority: 'high',
            ttl: 86400, // 24 horas
            notification: {
              clickAction: 'FLUTTER_NOTIFICATION_CLICK'
            }
          },
          apns: {
            headers: {
              'apns-priority': '10'
            }
          }
        };

        // Enviar para cada token
        const tokenList = tokens.map(t => t.fcm_token);
        const response = await admin.messaging().sendMulticast({
          ...message,
          tokens: tokenList
        });

        console.log(`[FCMService] ✅ Push enviado para usuário ${usuarioId}: ${response.successCount} sucesso, ${response.failureCount} falhas`);

        // Remover tokens que falharam permanentemente
        const failedTokens = response.responses
          .map((resp, idx) => resp.success ? null : tokenList[idx])
          .filter(t => t !== null);

        if (failedTokens.length > 0) {
          await conexao.query(
            `DELETE FROM usuarios_fcm_tokens WHERE fcm_token IN (${failedTokens.map(() => '?').join(',')})`,
            failedTokens
          );
        }

        return response.successCount > 0;
      } finally {
        conexao.release();
      }
    } catch (err) {
      console.error(`[FCMService] Erro ao enviar push para usuário ${usuarioId}:`, err.message);
      return false;
    }
  }

  /**
   * Envia notificação push para múltiplos usuários
   * @param {array} usuarioIds - Array de IDs de usuários
   * @param {object} notificationData - { titulo, mensagem, dados_extras }
   */
  async enviarPushEmLote(usuarioIds, notificationData) {
    if (!firebaseInitialized) {
      console.warn('[FCMService] Firebase não inicializado. Push não enviado.');
      return 0;
    }

    let totalEnviado = 0;
    
    for (const usuarioId of usuarioIds) {
      const sucesso = await this.enviarPushParaUsuario(usuarioId, notificationData);
      if (sucesso) totalEnviado++;
    }

    console.log(`[FCMService] 📤 ${totalEnviado}/${usuarioIds.length} notificações push enviadas`);
    return totalEnviado;
  }

  /**
   * Envia notificação de alerta de jogo começando
   * @param {array} usuarioIds - IDs dos apostadores a notificar
   * @param {object} jogoData - { time_mandante, time_visitante, rodada, campeonato }
   * @param {number} minutosAlerta - 60, 30, 15 ou 5 minutos
   */
  async enviarAlertaJogo(usuarioIds, jogoData, minutosAlerta) {
    const notificationData = {
      titulo: `⚽ ${jogoData.campeonato}`,
      mensagem: `${jogoData.time_mandante} vs ${jogoData.time_visitante}\nFaltam ${minutosAlerta}min para começar`,
      dadosExtras: {
        tipo: 'alerta_jogo',
        rodada: String(jogoData.rodada),
        campeonato: jogoData.campeonato,
        minutosAlerta: String(minutosAlerta)
      }
    };

    return await this.enviarPushEmLote(usuarioIds, notificationData);
  }

  /**
   * Remove token inativo/revogado
   */
  async removerToken(fcmToken) {
    try {
      const conexao = await pool.getConnection();
      
      try {
        await conexao.query(
          `DELETE FROM usuarios_fcm_tokens WHERE fcm_token = ?`,
          [fcmToken]
        );
        console.log(`[FCMService] ✅ Token removido`);
        return true;
      } finally {
        conexao.release();
      }
    } catch (err) {
      console.error('[FCMService] Erro ao remover token:', err.message);
      return false;
    }
  }
}

// Inicializar Firebase na importação
initializeFirebase();

module.exports = new FCMService();
