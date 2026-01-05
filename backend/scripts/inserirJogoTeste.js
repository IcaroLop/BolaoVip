const { DateTime } = require('luxon');
const pool = require('../database/conexao');

/**
 * Insere um jogo de TESTE fictício no banco para validar o agendador
 * Jogo: daqui a 1h15min, Premier League (camp 69), times fictícios
 */
async function inserirJogoTeste() {
  try {
    // Calcula horário: agora + 1h15min em America/Manaus
    const agora = DateTime.now().setZone('America/Manaus');
    const horaJogo = agora.plus({ hours: 1, minutes: 15 });
    const horaJogoUTC = horaJogo.toUTC().toISO({ suppressMilliseconds: true });

    console.log('📅 Criando jogo de TESTE:');
    console.log(`   Hora servidor (Manaus): ${agora.toISO()}`);
    console.log(`   Hora do jogo (Manaus): ${horaJogo.toISO()}`);
    console.log(`   Hora do jogo (UTC): ${horaJogoUTC}`);

    // Partida fictícia com ID único de teste (999999)
    const partidaId = 999999;
    const campeonatoId = 69; // Premier League
    const rodada = 99; // Rodada fictícia de teste

    await pool.query(`
      INSERT INTO jogos (
        partida_id, campeonato_id, rodada, data, time_mandante, time_visitante,
        escudo_mandante, escudo_visitante, estadio, placar_mandante, placar_visitante, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        data = VALUES(data),
        status = VALUES(status)
    `, [
      partidaId,
      campeonatoId,
      rodada,
      horaJogoUTC,
      'Time Teste A',
      'Time Teste B',
      'https://via.placeholder.com/50',
      'https://via.placeholder.com/50',
      'Estádio Teste',
      null,
      null,
      'agendado'
    ]);

    console.log(`✅ Jogo de teste inserido com sucesso!`);
    console.log(`   partida_id: ${partidaId}`);
    console.log(`   rodada: ${rodada}`);
    console.log(`   campeonato_id: ${campeonatoId}`);
    console.log(`\n🔧 Próximos passos:`);
    console.log(`   1. Defina DRY_RUN=true no .env`);
    console.log(`   2. Rode: node helpers/checkProximoJogo.js ${partidaId}`);
    console.log(`   3. Reinicie o servidor para agendar o disparo`);
    console.log(`   4. Aguarde ${horaJogo.toFormat('HH:mm')} (Manaus) para ver os logs`);
    console.log(`   5. Após o teste, rode: node helpers/limparJogoTeste.js`);

  } catch (err) {
    console.error('❌ Erro ao inserir jogo de teste:', err.message);
  } finally {
    process.exit(0);
  }
}

inserirJogoTeste();
