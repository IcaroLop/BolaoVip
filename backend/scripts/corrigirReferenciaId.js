const pool = require('../database/conexao');

async function corrigirCampo() {
  const conn = await pool.getConnection();
  
  try {
    console.log('🔄 Alterando campo referencia_id para VARCHAR(50)...');
    await conn.query('ALTER TABLE extrato_movimentacao MODIFY COLUMN referencia_id VARCHAR(50) NULL');
    console.log('✅ Campo alterado com sucesso!');
  } catch (err) {
    console.error('❌ Erro:', err.message);
  }
  
  conn.release();
  process.exit(0);
}

corrigirCampo();
