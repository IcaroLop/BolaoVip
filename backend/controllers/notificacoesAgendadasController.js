/**
 * Controller para Notificações
 * 
 * Gerencia o agendamento e envio de notificações para o app mobile
 * Quando uma rodada está próxima de começar, dispara notificações em 60, 30, 15 e 5 min antes
 */

const pool = require('../database/conexao');

exports.agendarNotificacoesRodada = async (req, res) => {
  const { rodada_id, campeonato_id, data_inicio } = req.body;

  if (!rodada_id || !data_inicio) {
    return res.status(400).json({ erro: 'rodada_id e data_inicio são obrigatórios' });
  }

  const conexao = await pool.getConnection();

  try {
    await conexao.beginTransaction();

    const temposAlerta = [60, 30, 15, 5]; // minutos
    const agendadas = [];

    for (const minutos of temposAlerta) {
      // Gerar ID único para notificação (rodada + minutos)
      const notificationId = parseInt(`${rodada_id}${minutos}`.padEnd(10, '0'), 10);

      // Calcular data de disparo
      const dataEvento = new Date(data_inicio);
      const dataDisparo = new Date(dataEvento.getTime() - minutos * 60 * 1000);

      // Verificar se já existe
      const [existe] = await conexao.query(
        'SELECT id FROM notificacoes_enviadas WHERE rodada_id = ? AND tempo_alerta = ?',
        [rodada_id, minutos]
      );

      if (existe.length === 0) {
        // Inserir nova notificação
        await conexao.query(
          `INSERT INTO notificacoes_enviadas 
           (rodada_id, campeonato_id, tempo_alerta, notification_id, data_agendada, status)
           VALUES (?, ?, ?, ?, ?, 'agendada')`,
          [rodada_id, campeonato_id || null, minutos, notificationId, dataDisparo]
        );

        agendadas.push({
          minutos,
          notificationId,
          dataDisparo: dataDisparo.toISOString(),
        });

        console.log(
          `[NotificacoesController] ✅ Notificação agendada: Rodada ${rodada_id}, ${minutos}min antes`
        );
      }
    }

    await conexao.commit();

    res.json({
      sucesso: true,
      rodada_id,
      agendadas: agendadas.length,
      detalhes: agendadas,
    });
  } catch (err) {
    await conexao.rollback();
    console.error('[NotificacoesController] Erro ao agendar notificações:', err);
    res.status(500).json({ erro: 'Erro ao agendar notificações' });
  } finally {
    conexao.release();
  }
};

/**
 * Busca notificações pendentes de envio
 * Usado pelo cron job para saber quais notificações devem disparar agora
 */
exports.obterNotificacoesPendentes = async (req, res) => {
  try {
    const [notificacoes] = await pool.query(
      `SELECT 
        id,
        rodada_id,
        campeonato_id,
        tempo_alerta,
        notification_id,
        data_agendada,
        status
       FROM notificacoes_enviadas
       WHERE status = 'agendada'
         AND data_agendada <= NOW()
       ORDER BY data_agendada ASC
       LIMIT 50`
    );

    res.json({
      sucesso: true,
      pendentes: notificacoes.length,
      notificacoes,
    });
  } catch (err) {
    console.error('[NotificacoesController] Erro ao buscar pendentes:', err);
    res.status(500).json({ erro: 'Erro ao buscar notificações' });
  }
};

/**
 * Marca notificação como enviada
 */
exports.marcarComoEnviada = async (req, res) => {
  const { notificacao_id } = req.body;

  if (!notificacao_id) {
    return res.status(400).json({ erro: 'notificacao_id é obrigatório' });
  }

  try {
    await pool.query(
      'UPDATE notificacoes_enviadas SET status = ?, data_envio = NOW() WHERE id = ?',
      ['enviada', notificacao_id]
    );

    res.json({ sucesso: true });
  } catch (err) {
    console.error('[NotificacoesController] Erro ao marcar como enviada:', err);
    res.status(500).json({ erro: 'Erro ao atualizar notificação' });
  }
};

/**
 * Cancela notificações de uma rodada
 */
exports.cancelarNotificacoesRodada = async (req, res) => {
  const { rodada_id } = req.params;

  if (!rodada_id) {
    return res.status(400).json({ erro: 'rodada_id é obrigatório' });
  }

  try {
    const [resultado] = await pool.query(
      'UPDATE notificacoes_enviadas SET status = ? WHERE rodada_id = ? AND status IN (?, ?)',
      ['cancelada', rodada_id, 'agendada', 'enviada']
    );

    res.json({
      sucesso: true,
      linhasAtualizadas: resultado.affectedRows,
    });
  } catch (err) {
    console.error('[NotificacoesController] Erro ao cancelar notificações:', err);
    res.status(500).json({ erro: 'Erro ao cancelar notificações' });
  }
};

/**
 * Lista histórico de notificações
 */
exports.listarHistorico = async (req, res) => {
  const { rodada_id, status } = req.query;

  try {
    let query = 'SELECT * FROM notificacoes_enviadas WHERE 1=1';
    const params = [];

    if (rodada_id) {
      query += ' AND rodada_id = ?';
      params.push(rodada_id);
    }

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY data_agendada DESC LIMIT 100';

    const [notificacoes] = await pool.query(query, params);

    res.json({
      sucesso: true,
      total: notificacoes.length,
      notificacoes,
    });
  } catch (err) {
    console.error('[NotificacoesController] Erro ao listar histórico:', err);
    res.status(500).json({ erro: 'Erro ao listar notificações' });
  }
};
