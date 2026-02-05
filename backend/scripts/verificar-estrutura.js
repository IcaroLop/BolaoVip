const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'localhost',
  port: 3307,
  user: 'root',
  password: 'fBVhh6w2KW',
  database: 'bolaovip'
});

(async () => {
  try {
    const connection = await pool.getConnection();
    
    // Verificar estrutura da tabela palpites
    const [structure] = await connection.query('DESCRIBE palpites');
    console.log('📋 Estrutura da tabela palpites:\n');
    console.log(JSON.stringify(structure, null, 2));
    
    // Mostrar um palpite existente
    const [exemplo] = await connection.query('SELECT * FROM palpites LIMIT 1');
    console.log('\n📍 Exemplo de palpite existente:\n');
    console.log(JSON.stringify(exemplo, null, 2));
    
    connection.release();
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
})();
