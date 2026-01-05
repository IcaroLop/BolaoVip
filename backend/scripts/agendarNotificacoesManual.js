const pool = require('../database/conexao');
const notificacoesAgendadasService = require('../services/notificacoesAgendadasService');

async function agendarNotificacoesManual() {
  try {
    console.log('🚀 Iniciando agendamento manual de notificações...\n');

    // Chamar o método que busca e agenda notificações para jogos
    await notificacoesAgendadasService.agendarNotificacoesJogos();

    console.log('\n✅ Agendamento concluído!');

    // Verificar notificações criadas
    const [notificacoes] = await pool.query(
      `SELECT 
        id,
        tempo_alerta,
        data_agendada,
        status,
        titulo,
        mensagem
       FROM notificacoes_enviadas_jogos
       WHERE jogo_id IN (SELECT id FROM jogos WHERE partida_id = 999999)
       ORDER BY tempo_alerta DESC`
    );

    if (notificacoes.length > 0) {
      console.log(`\n📢 ${notificacoes.length} notificações agendadas:\n`);
      notificacoes.forEach(n => {
        console.log(`  ⏱️  ${n.tempo_alerta}min antes`);
        console.log(`      Status: ${n.status}`);
        console.log(`      Agendada para: ${new Date(n.data_agendada).toLocaleString('pt-BR', { timeZone: 'America/Manaus' })}`);
        console.log(`      Mensagem: "${n.mensagem}"`);
        console.log();
      });
    }
  } catch (err) {
    console.error('❌ Erro:', err.message);
  } finally {
    process.exit(0);
  }
}

agendarNotificacoesManual();
