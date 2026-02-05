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

    // Buscar usuário Cassiano Fortes
    const [usuarios] = await connection.query(
      'SELECT id, nome FROM usuarios WHERE nome LIKE ?',
      ['%Cassiano%']
    );
    
    console.log('\n👤 Usuários encontrados:');
    console.log(JSON.stringify(usuarios, null, 2));

    // Buscar grupo BolaoBrasileiraoA
    const [grupos] = await connection.query(
      'SELECT id, nome FROM grupos WHERE nome LIKE ?',
      ['%BolaoBrasileiraoA%']
    );
    
    console.log('\n🏆 Grupos encontrados:');
    console.log(JSON.stringify(grupos, null, 2));

    connection.release();
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
})();
