const pool = require('../database/conexao');
const { DateTime } = require('luxon');

async function verificarNotificacoesEnviadas() {
  try {
    console.log('📊 Verificando notificações enviadas do jogo de teste...\n');

    // 1. Buscar todas as notificações do jogo de teste
    const [notificacoesEnviadas] = await pool.query(`
      SELECT 
        id,
        tempo_alerta,
        status,
        data_agendada,
        titulo,
        mensagem
      FROM notificacoes_enviadas_jogos
      WHERE jogo_id = 33134
      ORDER BY tempo_alerta DESC
    `);

    console.log(`✅ Total de notificações agendadas: ${notificacoesEnviadas.length}\n`);
    
    for (const notif of notificacoesEnviadas) {
      const dataManaus = DateTime.fromJSDate(notif.data_agendada, { zone: 'UTC' }).setZone('America/Manaus');
      console.log(`🔔 ${notif.tempo_alerta} min antes`);
      console.log(`   Status: ${notif.status}`);
      console.log(`   Hora: ${dataManaus.toFormat('HH:mm:ss')} (Manaus)`);
      console.log(`   Mensagem: "${notif.mensagem}"\n`);
    }

    // 2. Verificar quantas notificações de usuários existem para este jogo
    const [notificacoesUsuarios] = await pool.query(`
      SELECT COUNT(*) as total
      FROM notificacoes_usuarios
      WHERE titulo = 'Time Teste A vs Time Teste B'
    `);

    console.log(`\n👥 Notificações criadas na tabela notificacoes_usuarios: ${notificacoesUsuarios[0].total}`);

    // 3. Total de usuários ativos
    const [totalUsuarios] = await pool.query(`
      SELECT COUNT(*) as total FROM usuarios WHERE bloqueado = 0
    `);

    console.log(`📈 Total de usuários ativos: ${totalUsuarios[0].total}`);

    // 4. Resumo
    if (notificacoesUsuarios[0].total > 0) {
      const esperado = notificacoesEnviadas.length * totalUsuarios[0].total;
      console.log(`\n✅ Notificações foram despachadas! (${notificacoesUsuarios[0].total}/${esperado} esperadas)`);
    } else {
      console.log(`\n❌ PROBLEMA: Nenhuma notificação foi criada em notificacoes_usuarios!`);
      console.log(`Verificar: dispararNotificacoesPendentes() em notificacoesAgendadasService.js`);
    }

  } catch (err) {
    console.error('❌ Erro:', err.message);
  } finally {
    process.exit(0);
  }
}

verificarNotificacoesEnviadas();
