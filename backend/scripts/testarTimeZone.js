const pool = require('../database/conexao');

async function testarTimeZone() {
  const conn = await pool.getConnection();
  try {
    console.log('✅ Conexão obtida');
    
    // Verificar o timezone da sessão
    const [[result]] = await conn.query("SELECT @@session.time_zone as tz");
    console.log(`📍 Timezone da sessão: ${result.tz}`);
    
    // Verificar NOW()
    const [[now]] = await conn.query("SELECT NOW() as agora");
    console.log(`⏰ NOW() no MySQL: ${now.agora}`);
    
    // Inserir um valor de teste
    await conn.query(`
      CREATE TABLE IF NOT EXISTS teste_tz (
        id INT AUTO_INCREMENT PRIMARY KEY,
        data_teste DATETIME
      )
    `);
    
    await conn.query("DELETE FROM teste_tz");
    await conn.query("INSERT INTO teste_tz (data_teste) VALUES ('2026-01-07 11:30:00')");
    
    const [[teste]] = await conn.query("SELECT data_teste FROM teste_tz LIMIT 1");
    console.log(`📊 Valor lido de volta: ${teste.data_teste}`);
    console.log(`📊 Como Date object: ${teste.data_teste instanceof Date ? 'SIM - ' + teste.data_teste.toISOString() : 'NÃO'}`);
    
  } catch (err) {
    console.error('❌ Erro:', err.message);
  } finally {
    conn.release();
  }
}

testarTimeZone();
