const pool = require('../database/conexao');

async function verificarNotificacoes() {
  try {
    console.log('🔍 Verificando notificações agendadas...\n');

    // Verificar total de notificações por status
    const [stats] = await pool.query(`
      SELECT 
        n.status,
        COUNT(*) as total,
        GROUP_CONCAT(CONCAT('Rodada ', r.numero, ' (', n.tempo_alerta, 'min)') SEPARATOR ', ') as rodadas
      FROM notificacoes_enviadas n
      JOIN rodadas r ON n.rodada_id = r.id
      GROUP BY n.status
    `);

    console.log('📊 Estatísticas por Status:');
    stats.forEach(row => {
      console.log(`  ${row.status}: ${row.total} notificações`);
      if (row.rodadas) {
        console.log(`    - ${row.rodadas}`);
      }
    });

    // Listar próximas notificações a disparar
    console.log('\n⏰ Próximas Notificações a Disparar:');
    const [proximas] = await pool.query(`
      SELECT 
        n.id,
        r.numero as rodada,
        n.tempo_alerta,
        n.data_agendada,
        n.status,
        NULL as campeonato
      FROM notificacoes_enviadas n
      JOIN rodadas r ON n.rodada_id = r.id
      WHERE n.status = 'agendada'
      ORDER BY n.data_agendada ASC
      LIMIT 10
    `);

    if (proximas.length === 0) {
      console.log('  Nenhuma notificação agendada');
    } else {
      proximas.forEach(n => {
        console.log(`  - Rodada ${n.rodada} (${n.campeonato}): ${n.tempo_alerta}min antes`);
        console.log(`    Agendada para: ${n.data_agendada}`);
      });
    }

    // Verificar se há rodadas dentro de 70 minutos
    console.log('\n🎮 Rodadas Próximas (próximos 70 minutos):');
    const [rodadas] = await pool.query(`
      SELECT 
        id,
        numero,
        data_inicio,
        status
      FROM rodadas
      WHERE status = 'agendada'
        AND data_inicio BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 70 MINUTE)
      ORDER BY data_inicio ASC
    `);

    if (rodadas.length === 0) {
      console.log('  Nenhuma rodada próxima nos próximos 70 minutos');
    } else {
      rodadas.forEach(r => {
        console.log(`  - Rodada ${r.numero}: ${r.data_inicio}`);
      });
    }

  } catch (err) {
    console.error('❌ Erro ao verificar notificações:', err.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

verificarNotificacoes();
