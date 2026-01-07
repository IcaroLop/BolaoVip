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
  timezone: 'Z',
  supportBigNumbers: true,
  bigNumberStrings: true
});

// Função helper para garantir time_zone de Manaus em cada conexão
async function setManausTimeZone(conn) {
  try {
    await conn.query("SET time_zone = '-04:00'");
  } catch (err) {
    console.error('Aviso: Não foi possível setar time_zone:', err.message);
  }
}

module.exports = pool;
module.exports.setManausTimeZone = setManausTimeZone;
