const pool = require('../database/conexao');

async function testarConexao() {
  try {
    const [rows] = await pool.query('SELECT 1 + 1 AS resultado');
    console.log('✅ Conexão bem-sucedida:', rows);
  } catch (err) {
    console.error('❌ Erro de conexão:', err.message);
  }
}

testarConexao();
