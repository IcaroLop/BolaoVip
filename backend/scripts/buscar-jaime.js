const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'localhost',
  port: 3307,
  user: 'root',
  password: 'fBVhh6w2KW',
  database: 'bolaovip',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

(async () => {
  const connection = await pool.getConnection();
  
  try {
    const [usuarios] = await connection.query(
      `SELECT id, nome FROM usuarios WHERE nome LIKE '%Jaime%'`
    );
    
    console.log(JSON.stringify(usuarios, null, 2));
    
  } catch (error) {
    console.error('Erro:', error.message);
  } finally {
    connection.release();
    await pool.end();
  }
})();
