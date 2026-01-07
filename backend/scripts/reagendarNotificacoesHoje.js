/**
 * Script para forçar reagendamento de notificações APENAS para os jogos de hoje
 * Mais rápido que processar todos os 197 jogos
 */

const pool = require('../database/conexao');
const notificacoesService = require('../services/notificacoesAgendadasService');
const { DateTime } = require('luxon');

async function reagendarHoje() {
  console.log('🔄 Reagendando notificações apenas para os jogos de hoje...\n');
  
  try {
    const hoje = DateTime.now().setZone('America/Manaus').toFormat('yyyy-MM-dd');
    
    // 1. Buscar jogos de hoje
    const [jogos] = await pool.query(
      `SELECT 
        id as jogo_id,
        partida_id,
        time_mandante,
        time_visitante,
        data
       FROM jogos 
       WHERE DATE(data) = ? 
         AND status = 'agendado'
       ORDER BY data`,
      [hoje]
    );
    
    console.log(`📋 Encontrados ${jogos.length} jogos hoje (${hoje})\n`);
    
    if (jogos.length === 0) {
      console.log('ℹ️ Nenhum jogo agendado para hoje.');
      process.exit(0);
    }
    
    // 2. Deletar notificações existentes desses jogos
    const jogoIds = jogos.map(j => j.jogo_id);
    const [result] = await pool.query(
      `DELETE FROM notificacoes_enviadas_jogos 
       WHERE jogo_id IN (${jogoIds.join(',')})` 
    );
    
    console.log(`🗑️ Removidas ${result.affectedRows} notificações antigas\n`);
    
    // 3. Reagendar para cada jogo
    console.log('⏱️ Criando novas notificações...\n');
    for (const jogo of jogos) {
      await notificacoesService.agendarNotificacoesParaJogo(jogo);
    }
    
    // 4. Verificar resultado
    const [criadas] = await pool.query(
      `SELECT COUNT(*) as total 
       FROM notificacoes_enviadas_jogos 
       WHERE jogo_id IN (${jogoIds.join(',')})`
    );
    
    console.log(`\n✅ Criadas ${criadas[0].total} notificações para ${jogos.length} jogos`);
    console.log(`   (4 notificações por jogo: 60, 30, 15, 5 minutos antes)\n`);
    
  } catch (err) {
    console.error('❌ Erro:', err.message);
  }
  
  process.exit(0);
}

reagendarHoje();
