const notificacoesService = require('../services/notificacoesAgendadasService');

async function forcarAgendamento() {
  console.log('🔄 Forçando reagendamento de notificações...\n');
  
  try {
    await notificacoesService.agendarNotificacoesJogos();
    console.log('\n✅ Agendamento forçado concluído!');
  } catch (err) {
    console.error('❌ Erro:', err.message);
  }
  
  process.exit(0);
}

forcarAgendamento();
