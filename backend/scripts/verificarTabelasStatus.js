const pool = require('../database/conexao');

async function verificar() {
  try {
    const [tabelas] = await pool.query("SHOW TABLES");
    const nomesTabelas = tabelas.map(t => Object.values(t)[0]);
    
    const tabelasRodadas = nomesTabelas.filter(t => t.toLowerCase().includes('rodada'));
    console.log('Tabelas relacionadas a rodadas:', tabelasRodadas);

    // Verificar se rodadas_status ou rodada_status existe
    const temRodadasStatus = tabelasRodadas.includes('rodadas_status');
    const temRodadaStatus = tabelasRodadas.includes('rodada_status');
    
    console.log(`\nrodadas_status existe: ${temRodadasStatus}`);
    console.log(`rodada_status existe: ${temRodadaStatus}`);

    if (temRodadasStatus) {
      const [dados] = await pool.query('SELECT campeonato_id, rodada, status FROM rodadas_status ORDER BY campeonato_id, rodada DESC LIMIT 10');
      console.log('\nÚltimos registros em rodadas_status:');
      dados.forEach(d => console.log(`  - Campeonato ${d.campeonato_id}, Rodada ${d.rodada}: ${d.status}`));
    }

    if (temRodadaStatus) {
      const [dados] = await pool.query('SELECT campeonato_id, rodada, status FROM rodada_status ORDER BY campeonato_id, rodada DESC LIMIT 10');
      console.log('\nÚltimos registros em rodada_status:');
      dados.forEach(d => console.log(`  - Campeonato ${d.campeonato_id}, Rodada ${d.rodada}: ${d.status}`));
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

verificar();
