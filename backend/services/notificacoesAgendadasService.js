/**
 * Serviço de Agendamento de Notificações
 * 
 * Monitora rodadas e agenda notificações push para 60, 30, 15 e 5 min antes do início
 * Sincroniza notificações pendentes com o app mobile via Local Notifications
 */

const pool = require('../database/conexao');
const axios = require('axios');

class NotificacoesAgendadasService {
  /**
   * Busca rodadas que estão próximas de começar
   * e agenda notificações se ainda não foram agendadas
   */
  async agendarNotificacoesRodadas() {
    try {
      // Buscar rodadas que começam nos próximos 70 minutos
      const [rodadas] = await pool.query(
        `SELECT 
          r.id,
          r.numero,
          r.data_inicio,
          NULL as campeonato,
          NULL as campeonato_id
         FROM rodadas r
         WHERE r.status = 'agendada'
           AND r.data_inicio BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 70 MINUTE)
         ORDER BY r.data_inicio ASC`
      );

      if (rodadas.length > 0) {
        console.log(`[NotificacoesAgendadasService] 📋 Encontradas ${rodadas.length} rodadas próximas`);
      }

      for (const rodada of rodadas) {
        await this.agendarNotificacoesParaRodada(rodada);
      }
    } catch (err) {
      console.error('[NotificacoesAgendadasService] Erro ao agendar notificações:', err.message);
    }
  }

  /**
   * Agenda as 4 notificações (60, 30, 15, 5 min) para uma rodada específica
   */
  async agendarNotificacoesParaRodada(rodada) {
    const temposAlerta = [60, 30, 15, 5];
    const conexao = await pool.getConnection();

    try {
      await conexao.beginTransaction();

      for (const minutos of temposAlerta) {
        // Verificar se já existe
        const [existe] = await conexao.query(
          'SELECT id FROM notificacoes_enviadas WHERE rodada_id = ? AND tempo_alerta = ?',
          [rodada.id, minutos]
        );

        if (existe.length === 0) {
          const dataEvento = new Date(rodada.data_inicio);
          const dataDisparo = new Date(dataEvento.getTime() - minutos * 60 * 1000);

          // ID único: rodada + minutos (ex: 18 + 60 = 1860)
          const notificationId = parseInt(`${rodada.id}${minutos}`.padEnd(10, '0'), 10);

          await conexao.query(
            `INSERT INTO notificacoes_enviadas 
             (rodada_id, campeonato_id, tempo_alerta, notification_id, data_agendada, status)
             VALUES (?, ?, ?, ?, ?, 'agendada')`,
            [rodada.id, rodada.campeonato_id, minutos, notificationId, dataDisparo]
          );

          console.log(
            `[NotificacoesAgendadasService] ✅ Notificação agendada: Rodada ${rodada.numero} (${minutos}min antes)`
          );
        }
      }

      await conexao.commit();
    } catch (err) {
      await conexao.rollback();
      console.error(
        `[NotificacoesAgendadasService] Erro ao agendar para rodada ${rodada.id}:`,
        err.message
      );
    } finally {
      conexao.release();
    }
  }

  /**
   * Dispara notificações que estão vencidas e ainda não foram enviadas
   * Chamado periodicamente pelo cron job
   */
  async dispararNotificacoesPendentes() {
    try {
      // Buscar notificações que devem disparar agora
      const [notificacoes] = await pool.query(
        `SELECT 
          n.id,
          n.rodada_id,
          n.campeonato_id,
          n.tempo_alerta,
          n.notification_id,
          r.numero,
          NULL as campeonato
         FROM notificacoes_enviadas n
         JOIN rodadas r ON n.rodada_id = r.id
         WHERE n.status = 'agendada'
           AND n.data_agendada <= NOW()
         ORDER BY n.data_agendada ASC
         LIMIT 20`
      );

      if (notificacoes.length === 0) {
        return;
      }

      console.log(
        `[NotificacoesAgendadasService] 🚀 Disparando ${notificacoes.length} notificações...`
      );

      for (const notif of notificacoes) {
        try {
          // Disparar via axios (o frontend receberá via Local Notifications)
          // Este é mais um registro de que a notificação foi processada
          await this.registrarNotificacaoEnviada(notif.id);

          console.log(
            `[NotificacoesAgendadasService] ✅ Notificação ${notif.notification_id} processada: ` +
              `Rodada ${notif.numero} ${notif.tempo_alerta}min antes (${notif.campeonato})`
          );
        } catch (err) {
          console.error(
            `[NotificacoesAgendadasService] Erro ao processar notificação ${notif.id}:`,
            err.message
          );
        }
      }
    } catch (err) {
      console.error('[NotificacoesAgendadasService] Erro ao disparar notificações:', err.message);
    }
  }

  /**
   * Marca notificação como enviada no banco
   */
  async registrarNotificacaoEnviada(notificacao_id) {
    try {
      await pool.query(
        'UPDATE notificacoes_enviadas SET status = ?, data_envio = NOW() WHERE id = ?',
        ['enviada', notificacao_id]
      );
    } catch (err) {
      console.error('[NotificacoesAgendadasService] Erro ao registrar envio:', err.message);
    }
  }

  /**
   * Cancela notificações de uma rodada se ela for reprogramada/cancelada
   */
  async cancelarNotificacoesRodada(rodada_id) {
    try {
      const [resultado] = await pool.query(
        'UPDATE notificacoes_enviadas SET status = ? WHERE rodada_id = ? AND status IN (?, ?)',
        ['cancelada', rodada_id, 'agendada', 'enviada']
      );

      if (resultado.affectedRows > 0) {
        console.log(
          `[NotificacoesAgendadasService] ❌ ${resultado.affectedRows} notificações canceladas para rodada ${rodada_id}`
        );
      }
    } catch (err) {
      console.error('[NotificacoesAgendadasService] Erro ao cancelar notificações:', err.message);
    }
  }

  /**
   * Limpa notificações expiradas (mais de 24h)
   */
  async limparNotificacoesExpiradas() {
    try {
      const [resultado] = await pool.query(
        'UPDATE notificacoes_enviadas SET status = ? WHERE status = ? AND data_agendada < DATE_SUB(NOW(), INTERVAL 24 HOUR)',
        ['expirada', 'agendada']
      );

      if (resultado.affectedRows > 0) {
        console.log(
          `[NotificacoesAgendadasService] 🗑️ ${resultado.affectedRows} notificações marcadas como expiradas`
        );
      }
    } catch (err) {
      console.error('[NotificacoesAgendadasService] Erro ao limpar expiradas:', err.message);
    }
  }
}

module.exports = new NotificacoesAgendadasService();
