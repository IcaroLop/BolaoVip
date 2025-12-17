const pool = require('../database/conexao');

async function verificarRodadas() {
  // Primeiro verificar estrutura
  const [estrutura] = await pool.query('DESCRIBE rodadas');
  console.log('Colunas da tabela rodadas:');
  estrutura.forEach(e => console.log(`  - ${e.Field} (${e.Type})`));
  
  const [rodadas] = await pool.query('SELECT * FROM rodadas ORDER BY id LIMIT 10');
  console.log(`\nRodadas encontradas: ${rodadas.length}\n`);
  if (rodadas.length > 0) {
    rodadas.forEach(r => console.log(JSON.stringify(r, null, 2)));
  } else {
    console.log('⚠️  Nenhuma rodada cadastrada para campeonato_id = 69!');
  }
  process.exit();
}

verificarRodadas().catch(e => { console.error(e); process.exit(1); });
