// backend/services/notificacoesService.js
const pool = require('../database/conexao');

/**
 * Cria uma notificação para um usuário
 * @param {number} usuarioId 
 * @param {string} tipo - palpite_enviado, pagamento_confirmado, inicio_rodada, resultado_publicado, premio_recebido, sistema
 * @param {string} titulo 
 * @param {string} mensagem 
 * @param {object} dadosJson - Dados adicionais (opcional)
 */
async function criarNotificacao(usuarioId, tipo, titulo, mensagem, dadosJson = null) {
  const conexao = await pool.getConnection();
  try {
    const dados = dadosJson ? JSON.stringify(dadosJson) : null;
    
    const [result] = await conexao.query(
      `INSERT INTO notificacoes_usuarios (usuario_id, tipo, titulo, mensagem, dados_json)
       VALUES (?, ?, ?, ?, ?)`,
      [usuarioId, tipo, titulo, mensagem, dados]
    );
    
    console.log(`[NotificacoesService] ✅ Notificação criada - ID: ${result.insertId}, Usuário: ${usuarioId}, Tipo: ${tipo}`);
    return result.insertId;
  } catch (err) {
    console.error('[NotificacoesService] ❌ Erro ao criar notificação:', err);
    throw err;
  } finally {
    conexao.release();
  }
}

/**
 * Busca notificações de um usuário
 * @param {number} usuarioId 
 * @param {boolean} apenasNaoLidas 
 * @param {number} limite 
 */
async function buscarNotificacoes(usuarioId, apenasNaoLidas = false, limite = 50) {
  const conexao = await pool.getConnection();
  try {
    let query = `
      SELECT 
        id,
        tipo,
        titulo,
        mensagem,
        dados_json,
        lida,
        data_criacao,
        data_leitura
      FROM notificacoes_usuarios
      WHERE usuario_id = ?
    `;
    
    if (apenasNaoLidas) {
      query += ` AND lida = FALSE`;
    }
    
    query += ` ORDER BY data_criacao DESC LIMIT ?`;
    
    const [notificacoes] = await conexao.query(query, [usuarioId, limite]);
    
    // Parse JSON data (dados_json já vem como objeto do MySQL JSON type)
    const notificacoesFormatadas = notificacoes.map(n => ({
      ...n,
      dados_json: n.dados_json && typeof n.dados_json === 'string' ? JSON.parse(n.dados_json) : (n.dados_json || null)
    }));
    
    return notificacoesFormatadas;
  } catch (err) {
    console.error('[NotificacoesService] ❌ Erro ao buscar notificações:', err);
    throw err;
  } finally {
    conexao.release();
  }
}

/**
 * Conta notificações não lidas de um usuário
 * @param {number} usuarioId 
 */
async function contarNaoLidas(usuarioId) {
  const conexao = await pool.getConnection();
  try {
    const [rows] = await conexao.query(
      `SELECT COUNT(*) as total FROM notificacoes_usuarios WHERE usuario_id = ? AND lida = FALSE`,
      [usuarioId]
    );
    return rows[0].total || 0;
  } catch (err) {
    console.error('[NotificacoesService] ❌ Erro ao contar não lidas:', err);
    throw err;
  } finally {
    conexao.release();
  }
}

/**
 * Marca uma notificação como lida
 * @param {number} notificacaoId 
 * @param {number} usuarioId 
 */
async function marcarComoLida(notificacaoId, usuarioId) {
  const conexao = await pool.getConnection();
  try {
    const [result] = await conexao.query(
      `UPDATE notificacoes_usuarios 
       SET lida = TRUE, data_leitura = NOW() 
       WHERE id = ? AND usuario_id = ?`,
      [notificacaoId, usuarioId]
    );
    
    return result.affectedRows > 0;
  } catch (err) {
    console.error('[NotificacoesService] ❌ Erro ao marcar como lida:', err);
    throw err;
  } finally {
    conexao.release();
  }
}

/**
 * Marca todas as notificações como lidas
 * @param {number} usuarioId 
 */
async function marcarTodasComoLidas(usuarioId) {
  const conexao = await pool.getConnection();
  try {
    const [result] = await conexao.query(
      `UPDATE notificacoes_usuarios 
       SET lida = TRUE, data_leitura = NOW() 
       WHERE usuario_id = ? AND lida = FALSE`,
      [usuarioId]
    );
    
    return result.affectedRows;
  } catch (err) {
    console.error('[NotificacoesService] ❌ Erro ao marcar todas como lidas:', err);
    throw err;
  } finally {
    conexao.release();
  }
}

/**
 * Deleta uma notificação
 * @param {number} notificacaoId 
 * @param {number} usuarioId 
 */
async function deletarNotificacao(notificacaoId, usuarioId) {
  const conexao = await pool.getConnection();
  try {
    const [result] = await conexao.query(
      `DELETE FROM notificacoes_usuarios WHERE id = ? AND usuario_id = ?`,
      [notificacaoId, usuarioId]
    );
    
    return result.affectedRows > 0;
  } catch (err) {
    console.error('[NotificacoesService] ❌ Erro ao deletar notificação:', err);
    throw err;
  } finally {
    conexao.release();
  }
}

/**
 * Deleta todas as notificações lidas de um usuário
 * @param {number} usuarioId 
 */
async function limparLidas(usuarioId) {
  const conexao = await pool.getConnection();
  try {
    // Mantém as 10 notificações lidas mais recentes e remove apenas o excedente
    const [result] = await conexao.query(
      `DELETE FROM notificacoes_usuarios 
       WHERE usuario_id = ? 
         AND lida = TRUE 
         AND id NOT IN (
           SELECT id FROM (
             SELECT id 
             FROM notificacoes_usuarios 
             WHERE usuario_id = ? AND lida = TRUE 
             ORDER BY data_criacao DESC 
             LIMIT 10
           ) AS ultimas_lidas
         )`,
      [usuarioId, usuarioId]
    );
    
    return result.affectedRows;
  } catch (err) {
    console.error('[NotificacoesService] ❌ Erro ao limpar lidas:', err);
    throw err;
  } finally {
    conexao.release();
  }
}

module.exports = {
  criarNotificacao,
  buscarNotificacoes,
  contarNaoLidas,
  marcarComoLida,
  marcarTodasComoLidas,
  deletarNotificacao,
  limparLidas
};
