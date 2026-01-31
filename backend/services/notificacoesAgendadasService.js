/**
 * Serviço de Agendamento de Notificações
 * 
 * Monitora rodadas e agenda notificações push para 60, 30, 15 e 5 min antes do início
 * Sincroniza notificações pendentes com o app mobile via Local Notifications
 */

const pool = require('../database/conexao');
const axios = require('axios');
const fcmService = require('./fcmService');

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
   * Busca TODOS os próximos jogos (sem limite de tempo)
   * e agenda notificações em 60, 30, 15 e 5 minutos antes
   * Exibe log apenas dos 5 próximos jogos
   */
  async agendarNotificacoesJogos() {
    try {
      // Buscar TODOS os jogos futuros (agendados ou com status NULL)
      const [jogos] = await pool.query(
        `SELECT 
          j.id as jogo_id,
          j.partida_id,
          j.rodada,
          j.data,
          j.time_mandante,
          j.time_visitante,
          j.campeonato_id
         FROM jogos j
         WHERE (j.status = 'agendado' OR j.status IS NULL)
           AND j.data >= NOW()
         ORDER BY j.data ASC`
      );

      if (jogos.length === 0) {
        console.log('[NotificacoesAgendadasService] ℹ️ Nenhum jogo agendado para agendar notificações');
        return;
      }

      // Exibir log apenas dos 5 próximos jogos
      console.log(`[NotificacoesAgendadasService] 📋 Total de ${jogos.length} jogos encontrados. Próximos 5:`);
      const proximosCinco = jogos.slice(0, 5);
      const { DateTime } = require('luxon');
      proximosCinco.forEach((jogo, index) => {
        // MySQL retorna em UTC, mas o valor armazenado já está em Manaus
        // Usar keepLocalTime para manter os números sem conversão
        const dataManaus = DateTime.fromJSDate(new Date(jogo.data), { zone: 'utc' })
          .setZone('America/Manaus', { keepLocalTime: true });
        const dataFormatada = dataManaus.toFormat('dd/MM/yyyy, HH:mm:ss');
        console.log(`  ${index + 1}. ${jogo.time_mandante} vs ${jogo.time_visitante} - ${dataFormatada}`);
      });

      // Agendar notificações para TODOS os jogos
      let processados = 0;
      for (const jogo of jogos) {
        await this.agendarNotificacoesParaJogo(jogo);
        processados++;
        
        // Mostrar progresso a cada 20 jogos
        if (processados % 20 === 0 || processados === jogos.length) {
          console.log(`[NotificacoesAgendadasService] 📊 Progresso: ${processados}/${jogos.length} jogos processados`);
        }
      }

      console.log(`[NotificacoesAgendadasService] ✅ Agendamento concluído para ${jogos.length} jogos`);
    } catch (err) {
      console.error('[NotificacoesAgendadasService] Erro ao agendar notificações de jogos:', err.message);
    }
  }

  /**
   * Agenda as 4 notificações (60, 30, 15, 5 min) para um jogo específico
   */
  async agendarNotificacoesParaJogo(jogo) {
    const temposAlerta = [60, 30, 15, 5];
    const conexao = await pool.getConnection();

    try {
      await conexao.beginTransaction();

      for (const minutos of temposAlerta) {
        // Verificar se já existe notificação para este jogo e tempo
        const [existe] = await conexao.query(
          `SELECT id FROM notificacoes_enviadas_jogos 
           WHERE jogo_id = ? AND tempo_alerta = ?`,
          [jogo.jogo_id, minutos]
        );

        if (existe.length === 0) {
          // Calcular horário correto do alerta usando Luxon
          // jogo.data vem como string YYYY-MM-DD HH:mm:ss no fuso horário de Manaus (conforme a conexão MySQL)
          const { DateTime } = require('luxon');
          
          // Interpretar como data/hora em Manaus (sem conversão, mantendo os valores exatos)
          const dataJogo = DateTime.fromSQL(jogo.data, { zone: 'America/Manaus' });
          
          // Subtrair os minutos do alerta
          const dataDisparo = dataJogo.minus({ minutes: minutos });
          
          // Converter para o formato esperado pelo MySQL (string em Manaus)
          const dataDisparoFormatada = dataDisparo.toSQL();

          // ID único: jogo_id + minutos (ex: 33128 + 60 = 3312860)
          const notificationId = parseInt(`${jogo.jogo_id}${minutos}`.padEnd(10, '0'), 10);

          await conexao.query(
            `INSERT INTO notificacoes_enviadas_jogos 
             (jogo_id, partida_id, rodada, campeonato_id, tempo_alerta, notification_id, data_agendada, status, titulo, mensagem)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'agendada', ?, ?)`,
            [
              jogo.jogo_id,
              jogo.partida_id,
              jogo.rodada,
              jogo.campeonato_id,
              minutos,
              notificationId,
              dataDisparoFormatada,
              `${jogo.time_mandante} vs ${jogo.time_visitante}`,
              `Jogo começa em ${minutos} minutos`
            ]
          );

          // Log removido para não poluir saída com 788 mensagens
        }
      }

      await conexao.commit();
    } catch (err) {
      await conexao.rollback();
      console.error(
        `[NotificacoesAgendadasService] Erro ao agendar para jogo ${jogo.jogo_id}:`,
        err.message
      );
    } finally {
      conexao.release();
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
      // Buscar notificações de rodadas que devem disparar agora
      const [notificacoes] = await pool.query(
        `SELECT 
          n.id,
          n.rodada_id,
          n.campeonato_id,
          n.tempo_alerta,
          n.notification_id,
          r.numero,
          NULL as campeonato,
          'rodada' as tipo
         FROM notificacoes_enviadas n
         JOIN rodadas r ON n.rodada_id = r.id
         WHERE n.status = 'agendada'
           AND n.data_agendada <= NOW()
         ORDER BY n.data_agendada ASC
         LIMIT 10`
      );

      // Buscar notificações de jogos que devem disparar agora
      const [notificacoesJogos] = await pool.query(
        `SELECT 
          n.id,
          n.jogo_id,
          n.campeonato_id,
          n.tempo_alerta,
          n.notification_id,
          n.titulo,
          n.mensagem,
          'jogo' as tipo
         FROM notificacoes_enviadas_jogos n
         WHERE n.status = 'agendada'
           AND n.data_agendada <= NOW()
         ORDER BY n.data_agendada ASC
         LIMIT 10`
      );

      const todasNotificacoes = [...notificacoes, ...notificacoesJogos];

      if (todasNotificacoes.length === 0) {
        return;
      }

      console.log(
        `[NotificacoesAgendadasService] 🚀 Disparando ${todasNotificacoes.length} notificações...`
      );

      for (const notif of todasNotificacoes) {
        try {
          if (notif.tipo === 'rodada') {
            // Disparar via axios (o frontend receberá via Local Notifications)
            // Este é mais um registro de que a notificação foi processada
            await this.registrarNotificacaoEnviada(notif.id);

            console.log(
              `[NotificacoesAgendadasService] ✅ Notificação ${notif.notification_id} processada: ` +
              `Rodada ${notif.numero} ${notif.tempo_alerta}min antes`
            );
          } else if (notif.tipo === 'jogo') {
            // Registrar como enviada no banco de agendamento
            await this.registrarNotificacaoJogoEnviada(notif.id);

            // Enviar via Push Notifications (FCM)
            await this.enviarPushNotificacaoJogo(
              notif.titulo,
              notif.mensagem,
              notif.jogo_id,
              notif.tempo_alerta
            );

            // FALLBACK: Enviar notificação para todos os usuários (para aparecer no APP via polling)
            await this.enviarNotificacaoParaTodosUsuarios(
              notif.titulo,
              notif.mensagem,
              notif.jogo_id,
              notif.tempo_alerta
            );

            console.log(
              `[NotificacoesAgendadasService] ✅ Notificação ${notif.notification_id} processada: ` +
              `${notif.titulo} ${notif.tempo_alerta}min antes`
            );
          }
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
   * Marca notificação de jogo como enviada no banco
   */
  async registrarNotificacaoJogoEnviada(notificacao_id) {
    try {
      await pool.query(
        'UPDATE notificacoes_enviadas_jogos SET status = ?, data_enviada = NOW() WHERE id = ?',
        ['enviada', notificacao_id]
      );
    } catch (err) {
      console.error('[NotificacoesAgendadasService] Erro ao registrar envio de jogo:', err.message);
    }
  }

  /**
   * Envia Push Notification (FCM) para TODOS os usuários com tokens registrados
   */
  async enviarPushNotificacaoJogo(titulo, mensagem, jogo_id, tempo_alerta) {
    try {
      const conexao = await pool.getConnection();
      try {
        // Buscar todos os usuários com tokens FCM ativos
        const [usuarios] = await conexao.query(
          `SELECT DISTINCT usuario_id 
           FROM usuarios_fcm_tokens 
           WHERE ativo = 1 
             AND data_registro > DATE_SUB(NOW(), INTERVAL 90 DAY)`
        );

        if (usuarios.length === 0) {
          console.log('[NotificacoesAgendadasService] ℹ️ Nenhum usuário com FCM token ativo');
          return;
        }

        const usuarioIds = usuarios.map(u => u.usuario_id);
        
        // Enviar push notification via FCM
        const notificationData = {
          titulo: titulo,
          mensagem: mensagem,
          dadosExtras: {
            tipo: 'alerta_jogo',
            jogo_id: String(jogo_id),
            tempo_alerta: String(tempo_alerta)
          }
        };

        const totalEnviado = await fcmService.enviarPushEmLote(usuarioIds, notificationData);
        
        console.log(
          `[NotificacoesAgendadasService] 📲 Push FCM enviado para ${totalEnviado}/${usuarioIds.length} usuários`
        );
      } finally {
        conexao.release();
      }
    } catch (err) {
      console.error(
        '[NotificacoesAgendadasService] Erro ao enviar push FCM:',
        err.message
      );
    }
  }

  /**
   * Envia notificação para TODOS os usuários (para aparecer no APP)
   * Esta é a parte que integra com o sistema de notificações do usuário
   */
  async enviarNotificacaoParaTodosUsuarios(titulo, mensagem, jogo_id, tempo_alerta) {
    try {
      const conexao = await pool.getConnection();
      try {
        await conexao.beginTransaction();

        // Buscar TODOS os usuários ativos
        const [usuarios] = await conexao.query(
          `SELECT id FROM usuarios WHERE bloqueado = 0 LIMIT 10000`
        );

        if (usuarios.length === 0) {
          console.log('[NotificacoesAgendadasService] ℹ️  Nenhum usuário ativo para notificar');
          return;
        }

        // Inserir notificação para cada usuário na tabela notificacoes_usuarios
        // TIPOS permitidos em notificacoes_usuarios:
        // palpite_enviado, pagamento_pendente, pagamento_confirmado, inicio_rodada, resultado_publicado, premio_recebido, sistema
        // Usaremos 'sistema' para alerta de início de jogo
        const values = usuarios.map(u => [
          u.id,
          'sistema', // tipo permitido na enum
          titulo,
          mensagem,
          JSON.stringify({ jogo_id, tempo_alerta })
        ]);

        // Inserir em lotes para melhor performance
        const chunkSize = 100;
        for (let i = 0; i < values.length; i += chunkSize) {
          const chunk = values.slice(i, i + chunkSize);
          const placeholders = chunk.map(() => '(?, ?, ?, ?, ?)').join(',');
          const flatValues = chunk.flat();

          await conexao.query(
            `INSERT INTO notificacoes_usuarios (usuario_id, tipo, titulo, mensagem, dados_json) 
             VALUES ${placeholders}`,
            flatValues
          );
        }

        await conexao.commit();
        console.log(
          `[NotificacoesAgendadasService] 📢 Notificação enviada para ${usuarios.length} usuários: "${titulo}"`
        );

      } catch (err) {
        await conexao.rollback();
        throw err;
      } finally {
        conexao.release();
      }
    } catch (err) {
      console.error(
        '[NotificacoesAgendadasService] Erro ao enviar notificação para usuários:',
        err.message
      );
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
