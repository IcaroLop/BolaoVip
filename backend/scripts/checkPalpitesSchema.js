const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'isl050382',
  database: 'bolaovip'
});

(async () => {
  try {
    const conn = await pool.getConnection();
    const [columns] = await conn.query('DESCRIBE palpites');
    
    console.log('Colunas da tabela palpites:');
    columns.forEach(col => {
      console.log(`  - ${col.Field}: ${col.Type}`);
    });
    
    conn.release();
    process.exit(0);
  } catch (err) {
    console.error('Erro:', err.message);
    process.exit(1);
  }
})();
