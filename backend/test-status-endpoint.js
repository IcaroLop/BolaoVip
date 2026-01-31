const mysql = require('mysql2/promise');

/**
 * Simula o endpoint GET /ranking/rodada/:rodada/status do frontend
 * Verifica se o botão "Gerar Pagamentos" deve aparecer
 */

(async () => {
  try {
    const conn = await mysql.createConnection({
      host: '127.0.0.1',
      port: 3307,
      user: 'root',
      password: 'fBVhh6w2KW',
      database: 'bolaovip'
    });

    const rodada = 1;
    const campeonatoId = 10;

    console.log('🔍 Simulando endpoint: GET /ranking/rodada/1/status?campeonatoId=10\n');

    // 1. Verificar se todos os jogos estão finalizados
    const [jogos] = await conn.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status IN ('finalizado', 'encerrado', 'Finalizado', 'Encerrado') THEN 1 ELSE 0 END) as finalizados,
        SUM(CASE WHEN placar_mandante IS NOT NULL AND placar_visitante IS NOT NULL THEN 1 ELSE 0 END) as com_placar
      FROM jogos 
      WHERE rodada = ? AND campeonato_id = ?
    `, [rodada, campeonatoId]);

    const jogo = jogos[0];
    const todosFinalizados = jogo.total > 0 && jogo.total == jogo.finalizados && jogo.total == jogo.com_placar;

    console.log('📊 Status dos jogos:');
    console.log(`  Total: ${jogo.total}`);
    console.log(`  Finalizados: ${jogo.finalizados}`);
    console.log(`  Com placar: ${jogo.com_placar}`);
    console.log(`  ✅ Rodada finalizada: ${todosFinalizados}\n`);

    // 2. Verificar se pagamentos foram gerados
    const [rodadas] = await conn.query(`
      SELECT pagamentos_gerados, pagamentos_gerados_em 
      FROM rodadas 
      WHERE numero = ? AND campeonato_id = ?
    `, [rodada, campeonatoId]);

    const pagamentosGerados = rodadas.length > 0 && rodadas[0].pagamentos_gerados;

    console.log('💳 Status dos pagamentos:');
    console.log(`  Pagamentos gerados: ${pagamentosGerados}`);
    if (rodadas[0]?.pagamentos_gerados_em) {
      console.log(`  Data de geração: ${new Date(rodadas[0].pagamentos_gerados_em).toLocaleString('pt-BR')}`);
    }

    // 3. Resposta que o frontend receberá
    const response = {
      rodadaFinalizada: todosFinalizados,
      pagamentosGerados: pagamentosGerados,
      ultimoStatus: 'finalizado',
      pagamentosGeradosEm: rodadas[0]?.pagamentos_gerados_em || null
    };

    console.log('\n📤 Resposta JSON:');
    console.log(JSON.stringify(response, null, 2));

    // 4. Verificar se botão deve aparecer
    console.log('\n🔘 Lógica do botão "Gerar Pagamentos":');
    const deveAparecerBotao = response.rodadaFinalizada && !response.pagamentosGerados;
    console.log(`  rodadaFinalizada: ${response.rodadaFinalizada}`);
    console.log(`  !pagamentosGerados: ${!response.pagamentosGerados}`);
    console.log(`  ➜ Botão deve aparecer: ${deveAparecerBotao ? '✅ SIM' : '❌ NÃO'}`);

    if (deveAparecerBotao) {
      console.log('\n✨ SUCCESS! O botão "Gerar Pagamentos" aparecerá no frontend!');
    } else {
      console.log('\n⚠️  O botão NÃO aparecerá. Motivo:');
      if (!response.rodadaFinalizada) {
        console.log('   - Rodada ainda não foi finalizada');
      }
      if (response.pagamentosGerados) {
        console.log('   - Pagamentos já foram gerados em ' + new Date(response.pagamentosGeradosEm).toLocaleString('pt-BR'));
      }
    }

    await conn.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ ERRO:', err.message);
    process.exit(1);
  }
})();
