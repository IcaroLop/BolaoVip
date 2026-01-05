const { DateTime } = require('luxon');
const pool = require('../database/conexao');

/**
 * Limpa COMPLETAMENTE todas as notificações do jogo e força reagendamento
 */
async function limparEReagendar() {
  const conexao = await pool.getConnection();
  try {
    console.log('🔄 Limpando e re-agendando notificações...\n');

    const jogoId = 33134;

    // 1. Deletar TODAS as notificações de rastreamento
    const [result1] = await conexao.query(
      `DELETE FROM notificacoes_enviadas_jogos WHERE jogo_id = ?`,
      [jogoId]
    );
    console.log(`🗑️  Deletadas ${result1.affectedRows} notificações de rastreamento`);

    // 2. Deletar TODAS as notificações de usuários relacionadas
    const [result2] = await conexao.query(
      `DELETE FROM notificacoes_usuarios WHERE titulo = 'Time Teste A vs Time Teste B'`
    );
    console.log(`🗑️  Deletadas ${result2.affectedRows} notificações de usuários`);

    // 3. Buscar o jogo
    const [jogos] = await conexao.query(
      `SELECT id, partida_id, rodada, data, time_mandante, time_visitante, campeonato_id 
       FROM jogos WHERE id = ?`,
      [jogoId]
    );

    if (jogos.length === 0) {
      console.log('❌ Jogo não encontrado!');
      process.exit(1);
    }

    const jogo = jogos[0];
    const temposAlerta = [60, 30, 15, 5];

    // 4. Re-agendar as 4 notificações com horários CORRETOS
    console.log(`\n📅 Re-agendando notificações para o jogo:`);
    console.log(`   Horário do jogo (UTC): ${jogo.data}`);

    const dataJogoUTC = DateTime.fromJSDate(jogo.data, { zone: 'UTC' });
    const dataJogoManaus = dataJogoUTC.setZone('America/Manaus');
    console.log(`   Horário do jogo (Manaus): ${dataJogoManaus.toFormat('dd/MM/yyyy HH:mm:ss')}\n`);

    for (const minutos of temposAlerta) {
      const dataEvento = jogo.data;
      const dataDisparo = new Date(dataEvento.getTime() - minutos * 60 * 1000);
      const notificationId = parseInt(`${jogo.id}${minutos}`.padEnd(10, '0'), 10);

      const datadisparoManaus = DateTime.fromJSDate(dataDisparo, { zone: 'UTC' }).setZone('America/Manaus');

      await conexao.query(
        `INSERT INTO notificacoes_enviadas_jogos 
         (jogo_id, partida_id, rodada, campeonato_id, tempo_alerta, notification_id, data_agendada, status, titulo, mensagem)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'agendada', ?, ?)`,
        [
          jogo.id,
          jogo.partida_id,
          jogo.rodada,
          jogo.campeonato_id,
          minutos,
          notificationId,
          dataDisparo,
          `${jogo.time_mandante} vs ${jogo.time_visitante}`,
          `Jogo começa em ${minutos} minutos`
        ]
      );

      console.log(`   ✅ ${minutos}min antes → ${datadisparoManaus.toFormat('HH:mm:ss')} (Manaus)`);
    }

    console.log(`\n✅ Operação concluída com sucesso!`);
    console.log(`\n🔧 Próximos passos:`);
    console.log(`   1. Aguarde o cron (a cada 2 min) detectar e despachar`);
    console.log(`   2. Monitore: pm2 logs | grep -i notificacao`);
    console.log(`   3. Verifique: node scripts/debugJogoTeste.js`);

  } catch (err) {
    console.error('❌ Erro:', err.message);
  } finally {
    conexao.release();
    process.exit(0);
  }
}

limparEReagendar();
