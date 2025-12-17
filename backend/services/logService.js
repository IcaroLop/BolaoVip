const pool = require('../database/conexao');
const { DateTime } = require('luxon');

const ensureSQLSistema = `
CREATE TABLE IF NOT EXISTS logs_sistema (
  id INT AUTO_INCREMENT PRIMARY KEY,
  data_hora DATETIME NOT NULL,
  origem VARCHAR(64) NULL,
  nivel ENUM('info','warn','error') NOT NULL DEFAULT 'info',
  descricao TEXT NOT NULL,
  contexto_json JSON NULL,
  INDEX idx_data_hora (data_hora),
  INDEX idx_origem (origem),
  INDEX idx_nivel (nivel)
)`;

const ensureSQLUsuarios = `
CREATE TABLE IF NOT EXISTS logs_usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  data_hora DATETIME NOT NULL,
  usuario_id INT NULL,
  usuario_nome VARCHAR(128) NULL,
  tipo_evento VARCHAR(64) NOT NULL,
  descricao TEXT NOT NULL,
  contexto_json JSON NULL,
  INDEX idx_data_hora (data_hora),
  INDEX idx_usuario (usuario_id),
  INDEX idx_tipo (tipo_evento)
)`;

async function ensureTables() {
  let conn;
  try {
    conn = await pool.getConnection();
    await conn.query(ensureSQLSistema);
    await conn.query(ensureSQLUsuarios);
  } catch (e) {
    // Silencioso: evita quebrar fluxo se DB não estiver pronto
  } finally {
    if (conn) conn.release();
  }
}

async function logSistema({ origem, nivel = 'info', descricao, contexto = null, when = DateTime.now().setZone('America/Manaus') }) {
  try {
    await ensureTables();
    const conn = await pool.getConnection();
    try {
      await conn.query(
        `INSERT INTO logs_sistema (data_hora, origem, nivel, descricao, contexto_json)
         VALUES (?, ?, ?, ?, ?)`,
        [when.toSQL({ includeOffset: false }), origem || null, nivel, descricao, contexto ? JSON.stringify(contexto) : null]
      );
    } finally {
      conn.release();
    }
  } catch (e) {
    // Evita lançar erro; logging nunca deve quebrar fluxo
  }
}

async function logUsuario({ usuarioId = null, usuarioNome = null, tipoEvento, descricao, contexto = null, when = DateTime.now().setZone('America/Manaus') }) {
  try {
    await ensureTables();
    const conn = await pool.getConnection();
    try {
      await conn.query(
        `INSERT INTO logs_usuarios (data_hora, usuario_id, usuario_nome, tipo_evento, descricao, contexto_json)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [when.toSQL({ includeOffset: false }), usuarioId, usuarioNome, tipoEvento, descricao, contexto ? JSON.stringify(contexto) : null]
      );
    } finally {
      conn.release();
    }
  } catch (e) {
    // Silenciar erros de logging
  }
}

function safeLogSistema(payload) {
  try { return logSistema(payload); } catch { /* noop */ }
}

function safeLogUsuario(payload) {
  try { return logUsuario(payload); } catch { /* noop */ }
}

async function listarLogsSistema(page = 1, limit = 20, filtros = {}) {
  await ensureTables();
  const conn = await pool.getConnection();
  try {
    const offset = (page - 1) * limit;
    const where = [];
    const params = [];
    if (filtros.origem) { where.push('origem = ?'); params.push(filtros.origem); }
    if (filtros.nivel) { where.push('nivel = ?'); params.push(filtros.nivel); }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const [[{ total }]] = await conn.query(`SELECT COUNT(*) AS total FROM logs_sistema ${whereSql}`, params);
    const [rows] = await conn.query(
      `SELECT * FROM logs_sistema ${whereSql} ORDER BY data_hora DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    return { total, page, limit, totalPages: Math.ceil(total / limit), logs: rows };
  } finally {
    conn.release();
  }
}

async function listarLogsUsuarios(page = 1, limit = 20, filtros = {}) {
  await ensureTables();
  const conn = await pool.getConnection();
  try {
    const offset = (page - 1) * limit;
    const where = [];
    const params = [];
    if (filtros.usuario_id) { where.push('usuario_id = ?'); params.push(filtros.usuario_id); }
    if (filtros.tipo_evento) { where.push('tipo_evento = ?'); params.push(filtros.tipo_evento); }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const [[{ total }]] = await conn.query(`SELECT COUNT(*) AS total FROM logs_usuarios ${whereSql}`, params);
    const [rows] = await conn.query(
      `SELECT * FROM logs_usuarios ${whereSql} ORDER BY data_hora DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    return { total, page, limit, totalPages: Math.ceil(total / limit), logs: rows };
  } finally {
    conn.release();
  }
}

module.exports = {
  ensureTables,
  logSistema,
  logUsuario,
  safeLogSistema,
  safeLogUsuario,
  listarLogsSistema,
  listarLogsUsuarios,
};
