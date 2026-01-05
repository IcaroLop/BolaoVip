const { DateTime } = require('luxon');
const pool = require('../database/conexao');

/**
 * Atualiza APENAS o horário do jogo de teste para 69 minutos à frente
 * Para re-testar as notificações sem recriar o jogo
 */
async function atualizarHorarioJogoTeste() {
  try {
    // Calcular novo horário (69 minutos à frente em America/Manaus)
    const agoraUTC = DateTime.utc();
    const agora = agoraUTC.setZone('America/Manaus');
    const horaJogo = agora.plus({ minutes: 69 });
    const horaJogoUTC = horaJogo.toUTC();
    const horaJogoDate = horaJogoUTC.toJSDate();

    console.log('⏰ Atualizando horário do jogo de teste...');
    console.log(`   Hora atual (Manaus): ${agora.toFormat('dd/MM/yyyy HH:mm:ss')}`);
    console.log(`   Novo horário (Manaus): ${horaJogo.toFormat('dd/MM/yyyy HH:mm:ss')}`);
    console.log(`   Novo horário (UTC): ${horaJogoUTC.toFormat('dd/MM/yyyy HH:mm:ss')}`);

    const partidaId = 999999; // ID fixo do jogo de teste

    // Atualizar horário e resetar status
    const [result] = await pool.query(`
      UPDATE jogos 
      SET data = ?, status = 'agendado', placar_mandante = NULL, placar_visitante = NULL
      WHERE partida_id = ?
    `, [horaJogoDate, partidaId]);

    if (result.affectedRows === 0) {
      console.log('⚠️  Jogo de teste não encontrado! Execute primeiro: node scripts/inserirJogoTeste.js');
      process.exit(1);
    }

    // Limpar notificações antigas de AMBAS as tabelas
    // 1. notificacoes_enviadas_jogos (rastreamento de envios do servidor)
    await pool.query(`DELETE FROM notificacoes_enviadas_jogos WHERE jogo_id = ?`, [partidaId]);
    console.log('🗑️  Notificações de rastreamento removidas');

    // 2. notificacoes_usuarios (notificações já mostradas aos usuários)
    // Encontrar todas as notificações relacionadas ao jogo de teste e deletar
    const [notificacoes] = await pool.query(`
      SELECT id FROM notificacoes_usuarios 
      WHERE mensagem LIKE '%Time Teste A%' AND tipo = 'sistema'
    `);
    
    if (notificacoes.length > 0) {
      const ids = notificacoes.map(n => n.id).join(',');
      await pool.query(`DELETE FROM notificacoes_usuarios WHERE id IN (${ids})`);
      console.log(`🗑️  ${notificacoes.length} notificações de usuários removidas`);
    } else {
      console.log('ℹ️  Nenhuma notificação de usuários para remover');
    }

    console.log(`✅ Horário atualizado com sucesso!`);
    console.log(`\n🔧 Próximos passos:`);
    console.log(`   1. Aguarde o cron agendar as notificações (a cada 2 min)`);
    console.log(`   2. Verifique os logs do servidor`);
    console.log(`   3. Confira notificações em: ${horaJogo.minus({ minutes: 60 }).toFormat('HH:mm')}, ${horaJogo.minus({ minutes: 30 }).toFormat('HH:mm')}, ${horaJogo.minus({ minutes: 15 }).toFormat('HH:mm')}, ${horaJogo.minus({ minutes: 5 }).toFormat('HH:mm')}`);

  } catch (err) {
    console.error('❌ Erro ao atualizar horário:', err.message);
  } finally {
    process.exit(0);
  }
}

atualizarHorarioJogoTeste();
