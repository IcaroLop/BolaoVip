const pool = require('../database/conexao');

async function verificarNotificacoesUsuarios() {
  try {
    console.log('🔍 Verificando notificações em notificacoes_usuarios...\n');

    // 1. Total de notificações do jogo teste
    const [total] = await pool.query(`
      SELECT COUNT(*) as total
      FROM notificacoes_usuarios
      WHERE titulo = 'Time Teste A vs Time Teste B'
    `);

    console.log(`📊 Total de notificações: ${total[0].total}`);

    if (total[0].total === 0) {
      console.log('\n❌ PROBLEMA: Nenhuma notificação em notificacoes_usuarios!');
      console.log('Verificar: dispararNotificacoesPendentes() em notificacoesAgendadasService.js');
      process.exit(1);
    }

    // 2. Listar as últimas 5 por usuário
    const [notificacoes] = await pool.query(`
      SELECT 
        usuario_id,
        id,
        titulo,
        mensagem,
        tipo,
        lida,
        DATE_FORMAT(data_criacao, '%H:%i:%s') as hora
      FROM notificacoes_usuarios
      WHERE titulo = 'Time Teste A vs Time Teste B'
      ORDER BY usuario_id, data_criacao DESC
      LIMIT 20
    `);

    console.log('\n👥 Notificações por usuário:\n');
    
    let usuarioAtual = null;
    for (const notif of notificacoes) {
      if (notif.usuario_id !== usuarioAtual) {
        usuarioAtual = notif.usuario_id;
        console.log(`\n  Usuário ${notif.usuario_id}:`);
      }
      const lida = notif.lida ? '✓ lida' : '✗ não lida';
      console.log(`    - [${notif.tipo}] ${notif.mensagem} (${notif.hora}) ${lida}`);
    }

    // 3. Resumo
    const [resumo] = await pool.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN lida = 0 THEN 1 ELSE 0 END) as nao_lidas,
        COUNT(DISTINCT usuario_id) as usuarios
      FROM notificacoes_usuarios
      WHERE titulo = 'Time Teste A vs Time Teste B'
    `);

    console.log(`\n\n📈 Resumo:`);
    console.log(`   Total: ${resumo[0].total}`);
    console.log(`   Não lidas: ${resumo[0].nao_lidas}`);
    console.log(`   Usuários: ${resumo[0].usuarios}`);

  } catch (err) {
    console.error('❌ Erro:', err.message);
  } finally {
    process.exit(0);
  }
}

verificarNotificacoesUsuarios();
