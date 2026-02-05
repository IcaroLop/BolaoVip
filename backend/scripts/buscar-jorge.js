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
  try {
    const connection = await pool.getConnection();

    // Buscar usuário Jorge Artur
    const [usuarios] = await connection.query(
      'SELECT id, nome FROM usuarios WHERE nome LIKE ?',
      ['%Jorge%']
    );
    
    console.log('👤 Usuários encontrados:');
    console.log(JSON.stringify(usuarios, null, 2));

    connection.release();
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
})();
