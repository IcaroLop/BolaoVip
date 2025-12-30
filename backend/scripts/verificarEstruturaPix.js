const pool = require('../database/conexao');

async function verificar() {
  const conn = await pool.getConnection();
  try {
    console.log('\n=== ESTRUTURA DA TABELA pix_cobrancas ===\n');

    const [cols] = await conn.query(
      `SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_COMMENT
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pix_cobrancas'
       ORDER BY ORDINAL_POSITION`
    );
    console.table(cols);

  } catch (err) {
    console.error('❌ Erro:', err);
  } finally {
    conn.release();
    process.exit(0);
  }
}

verificar();
