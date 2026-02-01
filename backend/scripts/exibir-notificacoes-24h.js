const mysql = require('mysql2/promise');

(async () => {
  const conn = await mysql.createConnection({
    host: 'localhost',
    port: 3307,
    user: 'root',
    password: 'fBVhh6w2KW',
    database: 'bolaovip'
  });
  
  console.log('\n📢 NOTIFICAÇÕES AGENDADAS - TODOS OS TEMPOS\n');
  
  // Primeiro, verifica quais tempos de alerta existem
  const [tempos] = await conn.query(`
    SELECT DISTINCT tempo_alerta FROM notificacoes_enviadas ORDER BY tempo_alerta
  `);
  
  console.log('⏱️ Tempos de alerta disponíveis:', tempos.map(t => t.tempo_alerta + 'h').join(', '));
  console.log('\n');
  
  const [rows] = await conn.query(`
    SELECT 
      id,
      rodada_id,
      campeonato_id,
      tempo_alerta,
      notification_id,
      data_envio,
      data_agendada,
      status,
      created_at
    FROM notificacoes_enviadas 
    WHERE tempo_alerta = 24
    ORDER BY data_agendada DESC
    LIMIT 50
  `);
  
  if (rows.length === 0) {
    console.log('❌ Nenhuma notificação de 24h encontrada');
    console.log('\n📋 Buscando TODAS as notificações agendadas:\n');
    
    const [todasNotif] = await conn.query(`
      SELECT 
        id,
        rodada_id,
        campeonato_id,
        tempo_alerta,
        notification_id,
        data_agendada,
        status,
        created_at
      FROM notificacoes_enviadas 
      ORDER BY data_agendada DESC
      LIMIT 50
    `);
    
    if (todasNotif.length > 0) {
      console.table(todasNotif);
    } else {
      console.log('❌ Nenhuma notificação encontrada no banco de dados');
    }
  } else {
    console.log(`✅ Total: ${rows.length} notificações de 24h\n`);
    console.table(rows);
    
    // Resumo por status
    const [statusGroup] = await conn.query(`
      SELECT status, COUNT(*) as total FROM notificacoes_enviadas 
      WHERE tempo_alerta = 24
      GROUP BY status
    `);
    
    console.log('\n📊 RESUMO POR STATUS:\n');
    console.table(statusGroup);
  }
  
  conn.end();
})().catch(err => {
  console.error('❌ Erro:', err.message);
  process.exit(1);
});
