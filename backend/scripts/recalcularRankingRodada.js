/**
 * Recalcular ranking da rodada 21 após inserção de novos palpites
 * 
 * Uso: node scripts/recalcularRankingRodada.js 21
 */

const pool = require('../database/conexao');
const rankingController = require('../controllers/rankingController');

async function main() {
  const rodada = Number(process.argv[2]);
  const campeonatoId = process.argv[3] ? Number(process.argv[3]) : 69; // Premier League padrão
  const grupoId = process.argv[4] ? Number(process.argv[4]) : 2;       // Grupo 2 padrão

  if (!rodada) {
    console.error('Uso: node scripts/recalcularRankingRodada.js <rodada> [campeonatoId] [grupoId]');
    process.exit(1);
  }

  try {
    console.log(`\n===== Recalculando Ranking - Rodada ${rodada} =====\n`);

    // 1) Deletar ranking existente
    console.log(`🗑️ Limpando ranking anterior...`);
    const [deleteResult] = await pool.query(
      `DELETE FROM ranking_rodada WHERE rodada = ? AND campeonato_id = ? AND (grupo_id IS NULL OR grupo_id = ?)`,
      [rodada, campeonatoId, grupoId]
    );
    console.log(`✅ ${deleteResult.affectedRows} linhas de ranking deletadas`);

    // 2) Recalcular ranking (usando função do rankingController)
    console.log(`📊 Recalculando ranking...`);
    // Acessar função interna
    const { calcularRankingRodada } = rankingController;
    
    if (typeof calcularRankingRodada !== 'function') {
      console.error('❌ Erro: calcularRankingRodada não está exportada');
      // Fallback: executar manualmente via pool
      console.log('💡 Usando fallback: query SQL direto...');
      
      // Cálculo manual do ranking
      const [palpites] = await pool.query(`
        SELECT 
          p.id_usuario,
          p.rodada,
          p.campeonato_id,
          p.grupo_id,
          COUNT(*) AS total_palpites,
          SUM(CASE 
            WHEN p.gols_casa = j.placar_mandante AND p.gols_fora = j.placar_visitante THEN 4.0
            WHEN p.gols_casa = j.placar_mandante OR p.gols_fora = j.placar_visitante THEN 1.5
            WHEN (p.gols_casa > p.gols_fora AND j.placar_mandante > j.placar_visitante) OR (p.gols_casa < p.gols_fora AND j.placar_mandante < j.placar_visitante) THEN 1.5
            WHEN (p.gols_casa = j.placar_mandante AND p.gols_fora != j.placar_visitante) OR (p.gols_casa != j.placar_mandante AND p.gols_fora = j.placar_visitante) THEN 0.5
            ELSE 0.0
          END) AS pontos_totais
        FROM palpites p
        LEFT JOIN jogos j ON p.id_jogo = j.id
        WHERE p.rodada = ? AND p.campeonato_id = ? AND (p.grupo_id IS NULL OR p.grupo_id = ?)
        GROUP BY p.id_usuario, p.rodada, p.campeonato_id, p.grupo_id
        ORDER BY pontos_totais DESC
      `, [rodada, campeonatoId, grupoId]);

      // Inserir ranking recalculado
      console.log(`\n📈 Inserindo novo ranking (${palpites.length} usuários)...`);
      let posicao = 1;
      for (const p of palpites) {
        await pool.query(`
          INSERT INTO ranking_rodada (id_usuario, rodada, campeonato_id, grupo_id, pontos_totais, posicao)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [p.id_usuario, p.rodada, p.campeonato_id, p.grupo_id || null, p.pontos_totais, posicao]);
        posicao++;
      }
      console.log(`✅ Ranking recalculado com ${palpites.length} usuários`);
    } else {
      // Se função exportada existir
      await calcularRankingRodada(rodada, campeonatoId, grupoId);
      console.log(`✅ Ranking recalculado via rankingController`);
    }

    // 3) Verificar novo ranking
    const [novoRanking] = await pool.query(`
      SELECT rr.id_usuario, u.nome, rr.pontos_totais, rr.posicao
      FROM ranking_rodada rr
      JOIN usuarios u ON u.id = rr.id_usuario
      WHERE rr.rodada = ? AND rr.campeonato_id = ? AND (rr.grupo_id IS NULL OR rr.grupo_id = ?)
      ORDER BY rr.posicao ASC
    `, [rodada, campeonatoId, grupoId]);

    console.log(`\n📊 Novo Ranking (${novoRanking.length} usuários):\n`);
    console.table(novoRanking);

    console.log(`\n✅ Recálculo concluído!`);
  } catch (err) {
    console.error('❌ Erro ao recalcular ranking:', err.message);
  } finally {
    pool.end();
  }
}

main();
