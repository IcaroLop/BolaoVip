const { DateTime } = require('luxon');
const pool = require('../database/conexao');

/**
 * Insere um jogo de TESTE fictício no banco para validar o agendador
 * Jogo: daqui a 40 minutos em America/Manaus, usa rodada vigente atual, times fictícios
 * 
 * IMPORTANTE: Este script SEMPRE calcula em America/Manaus, independentemente do timezone do servidor
 */
async function inserirJogoTeste() {
  try {
    // Busca rodada vigente no banco
    const [[config]] = await pool.query(`SELECT rodada_vigente FROM configuracoes ORDER BY id DESC LIMIT 1`);
    const rodadaVigente = config?.rodada_vigente || 21;

    // Calcula horário em America/Manaus (força timezone explicitamente)
    // 1. Pega UTC agora
    const agoraUTC = DateTime.utc();
    // 2. Converte para Manaus
    const agora = agoraUTC.setZone('America/Manaus');
    // 3. Adiciona 65 minutos (cobre as 4 notificações 60/30/15/5 dentro da janela de 70min)
    const horaJogo = agora.plus({ minutes: 65 });
    // 4. Converte de volta para UTC para armazenar no MySQL
    const horaJogoUTC = horaJogo.toUTC();
    const horaJogoDate = horaJogoUTC.toJSDate(); // MySQL precisa de Date object

    console.log('📅 Criando jogo de TESTE (65 min à frente):');
    console.log(`   Hora servidor (UTC): ${agoraUTC.toISO()}`);
    console.log(`   Hora servidor (Manaus): ${agora.toISO()}`);
    console.log(`   Hora do jogo (Manaus): ${horaJogo.toISO()}`);
    console.log(`   Hora do jogo (UTC): ${horaJogoUTC.toISO()}`);
    console.log(`   Formato MySQL (UTC): ${horaJogoDate}`);

    // Partida fictícia com ID único de teste (999999)
    const partidaId = 999999;
    const campeonatoId = 10; // Brasileirão (mesmo da rodada vigente)
    const rodada = rodadaVigente; // Usa rodada vigente para o agendador processar

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
      horaJogoDate,
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
