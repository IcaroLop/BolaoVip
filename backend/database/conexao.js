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
  enableKeepAlive: true
});

// Garante que todas as sessões MySQL usem o fuso de Manaus para NOW()/DATETIME
pool.on('connection', (conn) => {
  conn.query("SET time_zone = '-04:00'").catch(() => {});
});

module.exports = pool;
