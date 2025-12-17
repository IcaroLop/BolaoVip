const pool = require('../database/conexao');

async function verificarRodadaVigente() {
  try {
    const campeonatoId = 69;
    const grupoId = 2;

    console.log('🔍 Verificando qual rodada está sendo retornada como vigente...\n');

    // Simular a query do endpoint
    const [resultado] = await pool.query(`
      SELECT rodada, rodada_vigente FROM (
        SELECT MAX(rodada) as rodada FROM ranking_rodada 
        WHERE campeonato_id = ? AND grupo_id = ?
      ) as t1,
      (SELECT MAX(numero) as rodada_vigente FROM rodadas) as t2
    `, [campeonatoId, grupoId]);

    console.log('Resultado da query de rodada vigente:', resultado);

    // Verificar o endpoint exato
    console.log('\n📋 Verificando ranking_rodada para rodadas 17 e 18:');
    const [ranking17e18] = await pool.query(`
      SELECT id_usuario, rodada, posicao, pontos_totais 
      FROM ranking_rodada
      WHERE rodada IN (17, 18) AND campeonato_id = ? AND grupo_id = ?
      ORDER BY rodada, posicao
    `, [campeonatoId, grupoId]);

    console.log(`\nRanking encontrado: ${ranking17e18.length} registros`);
    ranking17e18.forEach(r => {
      console.log(`  - Rodada ${r.rodada}, Posição ${r.posicao}: usuário ${r.id_usuario} com ${r.pontos_totais} pontos`);
    });

    // Verificar como chegou esse ranking lá
    console.log('\n📊 Verificando palpites que geraram esse ranking:');
    const [palpitesRod17] = await pool.query(`
      SELECT p.id_usuario, COUNT(*) as total_palpites, SUM(j.placar_mandante IS NOT NULL) as com_resultado
      FROM palpites p
      LEFT JOIN jogos j ON p.id_jogo = j.partida_id
      WHERE p.rodada = 17 AND p.campeonato_id = ? AND p.grupo_id = ?
      GROUP BY p.id_usuario
    `, [campeonatoId, grupoId]);

    console.log(`\nPalpites da rodada 17: ${palpitesRod17.length} usuários`);
    palpitesRod17.forEach(p => {
      console.log(`  - Usuário ${p.id_usuario}: ${p.total_palpites} palpites, ${p.com_resultado} jogos com resultado`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

verificarRodadaVigente();
