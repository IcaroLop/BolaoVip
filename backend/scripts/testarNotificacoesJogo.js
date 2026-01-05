const pool = require('../database/conexao');

async function testarNotificacoesJogo() {
  try {
    // Buscar o jogo de teste
    const [jogos] = await pool.query(
      `SELECT id, partida_id, data, time_mandante, time_visitante 
       FROM jogos WHERE partida_id = 999999 LIMIT 1`
    );

    if (jogos.length === 0) {
      console.log('❌ Jogo de teste (partida_id=999999) não encontrado');
      process.exit(1);
    }

    const jogo = jogos[0];
    console.log(`✅ Jogo de teste encontrado:
      Partida ID: ${jogo.partida_id}
      Data: ${jogo.data}
      Jogo: ${jogo.time_mandante} vs ${jogo.time_visitante}`);

    // Listar notificações agendadas para o jogo
    const [notificacoes] = await pool.query(
      `SELECT 
        id,
        tempo_alerta,
        data_agendada,
        status,
        titulo,
        mensagem
       FROM notificacoes_enviadas_jogos
       WHERE jogo_id = ?
       ORDER BY tempo_alerta DESC`,
      [jogo.id]
    );

    if (notificacoes.length === 0) {
      console.log('❌ Nenhuma notificação agendada para este jogo');
    } else {
      console.log(`\n✅ ${notificacoes.length} notificações agendadas:\n`);
      notificacoes.forEach(n => {
        const tempoRestante = new Date(n.data_agendada) - new Date();
        const minutos = Math.floor(tempoRestante / 60000);
        const segundos = Math.floor((tempoRestante % 60000) / 1000);
        
        console.log(`  ⏱️  ${n.tempo_alerta}min antes`);
        console.log(`      Status: ${n.status}`);
        console.log(`      Agendada para: ${new Date(n.data_agendada).toLocaleString('pt-BR', { timeZone: 'America/Manaus' })}`);
        if (tempoRestante > 0) {
          console.log(`      Faltam: ${minutos}m${segundos}s`);
        } else {
          console.log(`      ⚠️  EXPIRADA (${Math.abs(minutos)}m${Math.abs(segundos)}s atrás)`);
        }
        console.log();
      });
    }

  } catch (err) {
    console.error('❌ Erro:', err.message);
  } finally {
    process.exit(0);
  }
}

testarNotificacoesJogo();
