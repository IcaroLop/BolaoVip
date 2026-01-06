#!/usr/bin/env node
/**
 * Verifica agendamentos que JÁ PASSARAM (sendo executados agora)
 */

const pool = require('../database/conexao');
const { DateTime } = require('luxon');

async function verificar() {
  try {
    const agora = DateTime.now().setZone('America/Manaus');
    console.log(`⏰ Hora atual (Manaus): ${agora.toFormat('dd/MM/yyyy HH:mm:ss')}\n`);

    console.log('='.repeat(80));
    console.log('AGENDAMENTOS QUE JÁ PASSARAM (sendo executados agora)');
    console.log('='.repeat(80));

    const [vencidos] = await pool.query(`
      SELECT 
        id,
        tipo,
        campeonato_id,
        rodada,
        data_hora,
        status,
        executados,
        created_at
      FROM agendador_requisicoes
      WHERE campeonato_id = 69
        AND data_hora <= NOW()
      ORDER BY data_hora DESC
      LIMIT 20
    `);

    if (vencidos.length === 0) {
      console.log('\n✅ Nenhum agendamento vencido (todos no futuro)\n');
    } else {
      console.log(`\n⚠️  Total: ${vencidos.length} agendamentos vencidos\n`);

      const porStatus = {};
      vencidos.forEach(r => {
        if (!porStatus[r.status]) porStatus[r.status] = 0;
        porStatus[r.status]++;
      });

      console.log('📊 Por status:');
      Object.entries(porStatus).forEach(([status, count]) => {
        console.log(`   ${status}: ${count}`);
      });
      console.log('');

      console.log('🔥 Últimos 20 vencidos:');
      console.log('-'.repeat(80));
      vencidos.forEach((r, idx) => {
        const dataHora = DateTime.fromJSDate(new Date(r.data_hora)).setZone('America/Manaus');
        const diff = agora.diff(dataHora, 'minutes').minutes;
        
        console.log(`\n${idx + 1}. [ID: ${r.id}] ${r.tipo} - Rodada ${r.rodada}`);
        console.log(`   Agendado para: ${dataHora.toFormat('dd/MM/yyyy HH:mm:ss')} (há ${Math.floor(diff)} min)`);
        console.log(`   Status: ${r.status} | Executados: ${r.executados}`);
      });
    }

    console.log('\n' + '='.repeat(80));
    
    await pool.end();
  } catch (err) {
    console.error('❌ Erro:', err);
    await pool.end();
    process.exit(1);
  }
}

verificar();
