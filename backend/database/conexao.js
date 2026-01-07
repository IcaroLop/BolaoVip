const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'bolaovip',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  supportBigNumbers: true,
  bigNumberStrings: true
});

// Wrapper para getConnection que configura timezone automaticamente
const originalGetConnection = pool.getConnection.bind(pool);
pool.getConnection = async function() {
  const conn = await originalGetConnection();
  try {
    await conn.query("SET time_zone = '-04:00'");
  } catch (err) {
    console.error('[DB] Aviso: Não foi possível setar time_zone:', err.message);
    // Continua mesmo se falhar, para não bloquear
  }
  return conn;
};

module.exports = pool;
