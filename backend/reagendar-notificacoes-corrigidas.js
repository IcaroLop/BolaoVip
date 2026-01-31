#!/usr/bin/env node
/**
 * Reagendar notificações com horários corrigidos
 * Limpa as notificações incorretas e recria com Luxon
 */

const pool = require('./database/conexao');
const { DateTime } = require('luxon');

async function reagendar() {
  const conexao = await pool.getConnection();
  
  try {
    console.log('🗑️ LIMPANDO NOTIFICAÇÕES COM HORÁRIOS ERRADOS...');
    const [result] = await conexao.query(
      'DELETE FROM notificacoes_enviadas_jogos WHERE status = ? AND data_agendada > NOW()',
      ['agendada']
    );
    console.log(`✅ Deletadas ${result.affectedRows} notificações com horários incorretos\n`);
    
    console.log('📋 REENVIANDO AGENDAMENTO COM HORÁRIOS CORRIGIDOS...\n');
    
    // Buscar TODOS os jogos futuros
    const [jogos] = await conexao.query(
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
      console.log('ℹ️ Nenhum jogo agendado para agendar notificações');
      conexao.release();
      process.exit(0);
    }

    console.log(`📋 Total de ${jogos.length} jogos encontrados. Próximos 5:`);
    const proximosCinco = jogos.slice(0, 5);
    proximosCinco.forEach((jogo, index) => {
      const dataManaus = DateTime.fromJSDate(new Date(jogo.data), { zone: 'utc' })
        .setZone('America/Manaus', { keepLocalTime: true });
      const dataFormatada = dataManaus.toFormat('dd/MM/yyyy, HH:mm:ss');
      console.log(`  ${index + 1}. ${jogo.time_mandante} vs ${jogo.time_visitante} - ${dataFormatada}`);
    });

    // Agendar notificações
    const temposAlerta = [60, 30, 15, 5];
    let totalAgendadas = 0;

    for (const jogo of jogos) {
      for (const minutos of temposAlerta) {
        // Interpretar data corretamente em Manaus
        // A data vem como string: "2026-02-04 18:00:00" já em Manaus
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
    
    console.log(`\n✅ Agendadas ${totalAgendadas} notificações com horários corrigidos!`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Erro:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    conexao.release();
  }
}

reagendar();
