const pool = require('../database/conexao');
const notificacoesAgendadasService = require('../services/notificacoesAgendadasService');

/**
 * Força o agendamento e disparo de notificações
 * Simula o que os cron jobs deveriam fazer
 */
async function forcarAgendamentoEDisparo() {
  try {
    console.log('🔧 Forçando agendamento e disparo de notificações...\n');

    // 1. Agendar notificações de RODADAS
    console.log('1️⃣  Agendando notificações de RODADAS...');
    await notificacoesAgendadasService.agendarNotificacoesRodadas();

    // 2. Agendar notificações de JOGOS
    console.log('\n2️⃣  Agendando notificações de JOGOS...');
    await notificacoesAgendadasService.agendarNotificacoesJogos();

    // 3. Disparar notificações vencidas
    console.log('\n3️⃣  Disparando notificações vencidas...');
    await notificacoesAgendadasService.dispararNotificacoesPendentes();

    // 4. Mostrar status
    console.log('\n📊 Status das Notificações:');
    
    const [notificacoes] = await pool.query(`
      SELECT 
        id,
        jogo_id,
        tempo_alerta,
        data_agendada,
        status,
        DATE_FORMAT(data_agendada, '%d/%m/%Y %H:%i:%s') as agendada_br
      FROM notificacoes_enviadas_jogos
      WHERE jogo_id IN (SELECT id FROM jogos WHERE partida_id = 999999)
      ORDER BY tempo_alerta DESC
    `);

    if (notificacoes.length === 0) {
      console.log('❌ Nenhuma notificação encontrada!');
    } else {
      console.log(`✅ ${notificacoes.length} notificações:\n`);
      notificacoes.forEach(n => {
        const diff = new Date(n.data_agendada) - new Date();
        const minutos = Math.floor(diff / 60000);
        const segundos = Math.floor((diff % 60000) / 1000);
        
        const tempoRestante = diff > 0 
          ? `faltam ${minutos}m${segundos}s` 
          : `expirada há ${Math.abs(minutos)}m${Math.abs(segundos)}s`;

        console.log(`  ⏱️  ${n.tempo_alerta}min antes`);
        console.log(`      Status: ${n.status}`);
        console.log(`      Agendada: ${n.agendada_br}`);
        console.log(`      ${tempoRestante}\n`);
      });
    }

    console.log('✅ Operação concluída!');
    console.log('\n💡 Próximos passos:');
    console.log('   1. Aguarde até 09:59 (Manaus) para ver notificações dispararem');
    console.log('   2. Monitore: pm2 logs | grep -i notificacao');
    console.log('   3. Limpe: node scripts/limparTudoTeste.js');

  } catch (err) {
    console.error('❌ Erro:', err.message);
    console.error(err.stack);
  } finally {
    process.exit(0);
  }
}

forcarAgendamentoEDisparo();
