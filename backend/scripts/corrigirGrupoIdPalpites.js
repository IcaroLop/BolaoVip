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
    
    console.log('🔄 Atualizando grupo_id dos palpites do BolaoPremier...\n');
    
    const [result] = await conn.query(`
      UPDATE palpites 
      SET grupo_id = 2 
      WHERE campeonato_id = 69 AND grupo_id IS NULL
    `);
    
    console.log(`✅ ${result.affectedRows} palpites atualizados com sucesso!`);
    
    console.log('\n📊 Verificação final:');
    const [verificacao] = await conn.query(`
      SELECT COUNT(*) as total, grupo_id 
      FROM palpites 
      WHERE campeonato_id = 69 
      GROUP BY grupo_id
    `);
    
    verificacao.forEach(row => {
      console.log(`  Grupo ID ${row.grupo_id}: ${row.total} palpites`);
    });
    
    conn.release();
    process.exit(0);
  } catch (err) {
    console.error('❌ Erro:', err.message);
    process.exit(1);
  }
})();
