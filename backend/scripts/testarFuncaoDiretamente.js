const pool = require('../database/conexao');

async function testarDiretamente() {
  const conn = await pool.getConnection();
  try {
    console.log('\n=== TESTE DIRETO DA FUNÇÃO ===\n');
    
    // Simular a função obterRodadaAtual
    const campeonatoId = 69;
    
    console.log('1️⃣  Buscando rodada com jogos PENDENTES...');
    const [pendentes] = await conn.query(
      `SELECT rodada FROM jogos 
       WHERE campeonato_id = ? AND placar_mandante IS NULL
       ORDER BY rodada ASC LIMIT 1`,
      [campeonatoId]
    );
    console.log('Resultado:', pendentes);
    
    if (pendentes.length) {
      console.log(`✅ ENCONTRADA: Rodada ${pendentes[0].rodada}`);
      console.log(`\nEssa é a rodada que o endpoint deveria retornar!`);
      process.exit(0);
    }
    
    console.log('❌ Nenhuma rodada com jogos pendentes encontrada');
    process.exit(1);
    
  } catch (err) {
    console.error('Erro:', err);
    process.exit(1);
  } finally {
    conn.release();
  }
}

testarDiretamente();
