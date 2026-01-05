const pool = require('../database/conexao');
const { DateTime } = require('luxon');

async function verificarNotificacoesEnviadas() {
  try {
    console.log('📊 Verificando notificações enviadas do jogo de teste...\n');

    // 1. Buscar todas as notificações do jogo de teste
    const [notificacoesEnviadas] = await pool.query(`
      SELECT 
        n.id,
        n.tempo_alerta,
        n.status,
        n.data_agendada,
        n.titulo,
        n.mensagem,
        COUNT(DISTINCT nu.usuario_id) as usuarios_receberam
      FROM notificacoes_enviadas_jogos n
      LEFT JOIN notificacoes_usuarios nu ON nu.mensagem LIKE CONCAT('%', n.titulo, '%')
      WHERE n.jogo_id = 33134
      GROUP BY n.id
      ORDER BY n.tempo_alerta DESC
    `);

    console.log(`✅ Total de notificações agendadas: ${notificacoesEnviadas.length}\n`);
    
    for (const notif of notificacoesEnviadas) {
      const dataManaus = DateTime.fromJSDate(notif.data_agendada, { zone: 'UTC' }).setZone('America/Manaus');
      console.log(`🔔 ${notif.tempo_alerta} min antes`);
      console.log(`   Status: ${notif.status}`);
      console.log(`   Hora: ${dataManaus.toFormat('HH:mm:ss')} (Manaus)`);
      console.log(`   Usuários que receberam: ${notif.usuarios_receberam || 0}`);
      console.log(`   Mensagem: "${notif.mensagem}"\n`);
    }

    // 2. Verificar notificações na tabela notificacoes_usuarios
    const [notificacoesUsuarios] = await pool.query(`
      SELECT 
        u.id as usuario_id,
        u.nome,
        COUNT(n.id) as total_notificacoes,
        GROUP_CONCAT(n.tipo) as tipos
      FROM usuarios u
      LEFT JOIN notificacoes_usuarios n ON n.usuario_id = u.id AND n.mensagem LIKE '%Time Teste A%'
      WHERE u.bloqueado = 0
      GROUP BY u.id
      HAVING total_notificacoes > 0
      LIMIT 10
    `);

    console.log(`\n👥 Usuários que receberam notificações: ${notificacoesUsuarios.length}`);
    for (const user of notificacoesUsuarios) {
      console.log(`   - ${user.nome} (ID: ${user.usuario_id}): ${user.total_notificacoes} notificações`);
    }

    // 3. Total de usuários ativos
    const [totalUsuarios] = await pool.query(`
      SELECT COUNT(*) as total FROM usuarios WHERE bloqueado = 0
    `);

    console.log(`\n📈 Total de usuários ativos: ${totalUsuarios[0].total}`);

  } catch (err) {
    console.error('❌ Erro:', err.message);
  } finally {
    process.exit(0);
  }
}

verificarNotificacoesEnviadas();
