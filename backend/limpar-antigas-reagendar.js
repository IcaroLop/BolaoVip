const pool = require('./database/conexao');

(async () => {
  try {
    console.log('🗑️  DELETANDO NOTIFICAÇÕES ANTIGAS (criadas antes de hoje)...\n');
    
    const [result] = await pool.query(
      'DELETE FROM notificacoes_enviadas_jogos WHERE DATE(created_at) < CURDATE()'
    );
    console.log(`✅ Deletadas ${result.affectedRows} notificações antigas\n`);
    
    console.log('📋 REENVIANDO AGENDAMENTO COM LUXON CORRETO...\n');
    
    // Buscar TODOS os jogos futuros
    const [jogos] = await pool.query(
      `SELECT 
        j.id as jogo_id,
        j.partida_id,
        j.rodada,
        j.data,
        j.time_mandante,
        j.time_visitante,
        j.campeonato_id
       FROM jogos j
       WHERE (j.status = 'agendado' OR j.status IS NULL)
         AND j.data >= NOW()
       ORDER BY j.data ASC`
    );

    if (jogos.length === 0) {
      console.log('ℹ️ Nenhum jogo agendado');
      process.exit(0);
    }

    console.log(`📊 Total de ${jogos.length} jogos para agendar\n`);

    // Agendar notificações
    const { DateTime } = require('luxon');
    const temposAlerta = [60, 30, 15, 5];
    let totalAgendadas = 0;
    const conexao = await pool.getConnection();

    for (const jogo of jogos) {
      for (const minutos of temposAlerta) {
        // Interpretar data corretamente em Manaus
        const dataJogo = DateTime.fromISO(jogo.data.toISOString(), { zone: 'America/Manaus' })
          .setZone('America/Manaus');
        const dataDisparo = dataJogo.minus({ minutes: minutos });
        const dataDisparoFormatada = dataDisparo.toFormat('yyyy-MM-dd HH:mm:ss');

        // ID único
        const notificationId = parseInt(`${jogo.jogo_id}${minutos}`.padEnd(10, '0'), 10);

        await conexao.query(
          `INSERT INTO notificacoes_enviadas_jogos 
           (jogo_id, partida_id, rodada, campeonato_id, tempo_alerta, notification_id, data_agendada, status, titulo, mensagem)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'agendada', ?, ?)`,
          [
            jogo.jogo_id,
            jogo.partida_id,
            jogo.rodada,
            jogo.campeonato_id,
            minutos,
            notificationId,
            dataDisparoFormatada,
            `${jogo.time_mandante} vs ${jogo.time_visitante}`,
            `Jogo começa em ${minutos} minutos`
          ]
        );
        
        totalAgendadas++;
      }
    }
    
    conexao.release();
    console.log(`✅ Agendadas ${totalAgendadas} notificações NOVAS com Luxon correto!\n`);
    
    console.log('✨ Próximo passo: Validar com node validar-alertas-jogos.js');
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Erro:', err.message);
    process.exit(1);
  }
})();
