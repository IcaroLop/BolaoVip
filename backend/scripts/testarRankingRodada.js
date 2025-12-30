const pool = require('../database/conexao');

async function testarRanking() {
  try {
    console.log('🔍 Testando obtenção de ranking da rodada 18...\n');
    
    // Teste 1: Sem filtro de grupo (ranking geral)
    const [ranking1] = await pool.query(`
      SELECT r.id_usuario, u.nome, r.pontos_totais, r.posicao, r.grupo_id, r.campeonato_id
      FROM ranking_rodada r
      JOIN usuarios u ON u.id = r.id_usuario
      WHERE r.rodada = 18
        AND r.campeonato_id = 69
        AND r.grupo_id IS NULL
      ORDER BY r.posicao ASC
      LIMIT 20
    `);
    
    console.log('📊 Resultado (grupo_id IS NULL):');
    console.log(`Total de registros: ${ranking1.length}`);
    if (ranking1.length > 0) {
      console.table(ranking1);
    } else {
      console.log('❌ Nenhum resultado encontrado!');
    }
    
    // Teste 2: Com filtro de grupo 2
    console.log('\n');
    const [ranking2] = await pool.query(`
      SELECT r.id_usuario, u.nome, r.pontos_totais, r.posicao, r.grupo_id, r.campeonato_id
      FROM ranking_rodada r
      JOIN usuarios u ON u.id = r.id_usuario
      WHERE r.rodada = 18
        AND r.campeonato_id = 69
        AND r.grupo_id = 2
      ORDER BY r.posicao ASC
      LIMIT 20
    `);
    
    console.log('📊 Resultado (grupo_id = 2):');
    console.log(`Total de registros: ${ranking2.length}`);
    if (ranking2.length > 0) {
      console.table(ranking2);
    } else {
      console.log('❌ Nenhum resultado encontrado!');
    }
    
    // Teste 3: Ver todos os registros da rodada 18
    console.log('\n');
    const [ranking3] = await pool.query(`
      SELECT r.id_usuario, u.nome, r.pontos_totais, r.posicao, r.grupo_id, r.campeonato_id
      FROM ranking_rodada r
      JOIN usuarios u ON u.id = r.id_usuario
      WHERE r.rodada = 18
      ORDER BY r.campeonato_id, r.grupo_id, r.posicao ASC
    `);
    
    console.log('📊 Todos os registros da rodada 18:');
    console.log(`Total: ${ranking3.length}`);
    if (ranking3.length > 0) {
      console.table(ranking3);
    }
    
  } catch (err) {
    console.error('❌ Erro:', err.message);
  } finally {
    process.exit(0);
  }
}

testarRanking();
