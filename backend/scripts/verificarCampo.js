const pool = require('../database/conexao');

async function verificar() {
  const conn = await pool.getConnection();
  const [rows] = await conn.query('DESCRIBE extrato_movimentacao');
  const ref = rows.find(f => f.Field === 'referencia_id');
  console.log('Campo referencia_id:', JSON.stringify(ref, null, 2));
  conn.release();
  process.exit(0);
}

verificar();
