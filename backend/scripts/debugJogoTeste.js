const { DateTime } = require('luxon');
const pool = require('../database/conexao');

async function debugJogoTeste() {
  try {
    console.log('🔍 Debugando jogo de teste...\n');

    // 1. Verificar jogo no banco
    const [jogos] = await pool.query(`
      SELECT id, partida_id, rodada, data, time_mandante, time_visitante, status
      FROM jogos 
      WHERE partida_id = 999999
    `);

    if (jogos.length === 0) {
      console.log('❌ Jogo de teste NÃO encontrado no banco!');
      console.log('Execute primeiro: node backend/scripts/inserirJogoTeste.js');
      process.exit(1);
    }

    const jogo = jogos[0];
    console.log('✅ Jogo encontrado:');
    console.log(`   ID: ${jogo.id}`);
    console.log(`   Partida ID: ${jogo.partida_id}`);
    console.log(`   Rodada: ${jogo.rodada}`);
    console.log(`   Status: ${jogo.status}`);
    console.log(`   Data (UTC): ${jogo.data}`);

    // 2. Converter para Manaus para visualização
    const dataJogoUTC = DateTime.fromJSDate(jogo.data, { zone: 'UTC' });
    const dataJogoManaus = dataJogoUTC.setZone('America/Manaus');
    console.log(`   Data (Manaus): ${dataJogoManaus.toFormat('dd/MM/yyyy HH:mm:ss')}`);

    // 3. Verificar se está na janela de 70 minutos
    const agoraUTC = DateTime.utc();
    const agoraManaus = agoraUTC.setZone('America/Manaus');
    const em70MinUTC = agoraUTC.plus({ minutes: 70 });

    console.log(`\n⏰ Horário atual (Manaus): ${agoraManaus.toFormat('dd/MM/yyyy HH:mm:ss')}`);
    console.log(`⏰ Janela até (Manaus): ${em70MinUTC.setZone('America/Manaus').toFormat('dd/MM/yyyy HH:mm:ss')}`);

    const estaProximo = jogo.data >= agoraUTC.toJSDate() && jogo.data <= em70MinUTC.toJSDate();
    console.log(`📍 Jogo está na janela de 70 min? ${estaProximo ? '✅ SIM' : '❌ NÃO'}`);

    // 4. Verificar notificações já agendadas
    const [notificacoes] = await pool.query(`
      SELECT id, tempo_alerta, status, data_agendada
      FROM notificacoes_enviadas_jogos
      WHERE jogo_id = ?
      ORDER BY tempo_alerta DESC
    `, [jogo.id]);

    console.log(`\n📨 Notificações agendadas: ${notificacoes.length}`);
    for (const notif of notificacoes) {
      const dataAgendadaManaus = DateTime.fromJSDate(notif.data_agendada, { zone: 'UTC' }).setZone('America/Manaus');
      console.log(`   - ${notif.tempo_alerta} min antes (${notif.status}): ${dataAgendadaManaus.toFormat('HH:mm:ss')}`);
    }

    // 5. Verificar notificações de usuários
    const [notificacoesUsuarios] = await pool.query(`
      SELECT id, titulo, tipo, data_criacao
      FROM notificacoes_usuarios
      WHERE mensagem LIKE '%Time Teste A%'
      ORDER BY data_criacao DESC
      LIMIT 10
    `);

    console.log(`\n👥 Notificações de usuários: ${notificacoesUsuarios.length}`);
    for (const notif of notificacoesUsuarios) {
      const dataCriacaoManaus = DateTime.fromJSDate(notif.data_criacao, { zone: 'UTC' }).setZone('America/Manaus');
      console.log(`   - [${notif.tipo}] ${notif.titulo} (${dataCriacaoManaus.toFormat('HH:mm:ss')})`);
    }

    console.log('\n✅ Debug concluído!');

  } catch (err) {
    console.error('❌ Erro:', err.message);
  } finally {
    process.exit(0);
  }
}

debugJogoTeste();
