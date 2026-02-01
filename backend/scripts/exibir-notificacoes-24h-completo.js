const mysql = require('mysql2/promise');
const { DateTime } = require('luxon');

(async () => {
  const conn = await mysql.createConnection({
    host: 'localhost',
    port: 3307,
    user: 'root',
    password: 'fBVhh6w2KW',
    database: 'bolaovip'
  });
  
  console.log('\n' + '='.repeat(80));
  console.log('📢 NOTIFICAÇÕES 24h AGENDADAS - DETALHES COMPLETOS');
  console.log('='.repeat(80) + '\n');
  
  // 1. Próximas notificações a disparar
  const [proximasNotif] = await conn.query(`
    SELECT 
      ne.id,
      ne.rodada,
      j.time_mandante,
      j.time_visitante,
      ne.data_agendada,
      ne.titulo,
      ne.status,
      TIMESTAMPDIFF(MINUTE, NOW(), ne.data_agendada) as minutos_faltando
    FROM notificacoes_enviadas_jogos ne
    JOIN jogos j ON j.id = ne.jogo_id
    WHERE ne.tempo_alerta = 1440
      AND ne.status = 'agendada'
      AND ne.data_agendada > NOW()
    ORDER BY ne.data_agendada ASC
    LIMIT 10
  `);
  
  console.log('📅 PRÓXIMAS 10 NOTIFICAÇÕES A DISPARAR:\n');
  if (proximasNotif.length === 0) {
    console.log('❌ Nenhuma notificação agendada para o futuro\n');
  } else {
    proximasNotif.forEach((n, idx) => {
      const dataManaus = DateTime.fromJSDate(new Date(n.data_agendada), { zone: 'utc' })
        .setZone('America/Manaus', { keepLocalTime: true });
      const dataFormatada = dataManaus.toFormat('dd/MM/yyyy HH:mm:ss');
      const horas = Math.floor(n.minutos_faltando / 60);
      const mins = n.minutos_faltando % 60;
      
      console.log(`${idx + 1}. [Rodada ${n.rodada}] ${n.time_mandante} vs ${n.time_visitante}`);
      console.log(`   📌 ${dataFormatada}`);
      console.log(`   ⏱️ Faltam: ${horas}h ${mins}min`);
      console.log(`   📝 "${n.titulo}"\n`);
    });
  }
  
  // 2. Notificações já disparadas
  const [jaDispares] = await conn.query(`
    SELECT 
      COUNT(*) as total
    FROM notificacoes_enviadas_jogos 
    WHERE tempo_alerta = 1440 
      AND data_agendada <= NOW()
  `);
  
  console.log('✅ NOTIFICAÇÕES JÁ DISPARADAS:\n');
  console.log(`   Total: ${jaDispares[0].total}\n`);
  
  // 3. Estatísticas
  const [stats] = await conn.query(`
    SELECT 
      status,
      COUNT(*) as total,
      MIN(data_agendada) as primeira,
      MAX(data_agendada) as ultima
    FROM notificacoes_enviadas_jogos
    WHERE tempo_alerta = 1440
    GROUP BY status
  `);
  
  console.log('📊 ESTATÍSTICAS POR STATUS:\n');
  console.table(stats);
  
  // 4. Resumo por rodada
  const [porRodada] = await conn.query(`
    SELECT 
      rodada,
      COUNT(*) as total_notif_24h,
      MIN(data_agendada) as primeira_notif,
      j.time_mandante,
      j.time_visitante,
      j.data as primeiro_jogo
    FROM notificacoes_enviadas_jogos ne
    JOIN jogos j ON j.id = ne.jogo_id
    WHERE ne.tempo_alerta = 1440
    GROUP BY ne.rodada
    ORDER BY ne.data_agendada ASC
    LIMIT 15
  `);
  
  console.log('\n🏆 RESUMO POR RODADA:\n');
  porRodada.forEach((r, idx) => {
    const dataNotif = DateTime.fromJSDate(new Date(r.primeira_notif), { zone: 'utc' })
      .setZone('America/Manaus', { keepLocalTime: true });
    const dataJogo = DateTime.fromJSDate(new Date(r.primeiro_jogo), { zone: 'utc' })
      .setZone('America/Manaus', { keepLocalTime: true });
    
    console.log(`Rodada ${r.rodada}:`);
    console.log(`  Primeiro jogo: ${r.time_mandante} vs ${r.time_visitante}`);
    console.log(`  Jogo em: ${dataJogo.toFormat('dd/MM HH:mm')}`);
    console.log(`  Notif 24h em: ${dataNotif.toFormat('dd/MM HH:mm')}`);
    console.log();
  });
  
  // 5. Total geral
  const [total] = await conn.query(`
    SELECT COUNT(*) as total_24h FROM notificacoes_enviadas_jogos WHERE tempo_alerta = 1440
  `);
  
  console.log('='.repeat(80));
  console.log(`📈 TOTAL DE NOTIFICAÇÕES 24h: ${total[0].total_24h}`);
  console.log('='.repeat(80) + '\n');
  
  conn.end();
})().catch(err => {
  console.error('❌ Erro:', err.message);
  process.exit(1);
});
