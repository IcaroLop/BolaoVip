const pool = require('../database/conexao');

async function verificarEstrutura() {
  const [estrutura] = await pool.query('DESCRIBE premios');
  console.log('Estrutura da tabela premios:\n');
  estrutura.forEach(row => {
    console.log(`${row.Field}: ${row.Type} | Null: ${row.Null} | Key: ${row.Key} | Default: ${row.Default || 'NULL'}`);
  });
  process.exit();
}

verificarEstrutura().catch(e => { console.error(e); process.exit(1); });
