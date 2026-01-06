#!/usr/bin/env node
/**
 * Verifica agendamentos na tabela agendador_requisicoes
 */

const pool = require('../database/conexao');
const { DateTime } = require('luxon');

async function verificar() {
  try {
    console.log('='.repeat(80));
    console.log('AGENDAMENTOS NA TABELA agendador_requisicoes');
    console.log('='.repeat(80));

    const agora = DateTime.now().setZone('America/Manaus');
    console.log(`\n⏰ Hora atual (Manaus): ${agora.toFormat('dd/MM/yyyy HH:mm:ss')}\n`);

    // Buscar todos os agendamentos da Premier League (campeonato 69)
    const [rows] = await pool.query(`
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
      ORDER BY data_hora DESC
      LIMIT 50
    `);

    if (rows.length === 0) {
      console.log('❌ Nenhum agendamento encontrado para campeonato 69 (Premier League)\n');
    } else {
      console.log(`📋 Total: ${rows.length} agendamentos\n`);

      const porStatus = {};
      rows.forEach(r => {
        if (!porStatus[r.status]) porStatus[r.status] = 0;
        porStatus[r.status]++;
      });

      console.log('📊 Por status:');
      Object.entries(porStatus).forEach(([status, count]) => {
        console.log(`   ${status}: ${count}`);
      });
      console.log('');

      // Mostrar os próximos 10
      console.log('🔔 Próximos 10 agendamentos:');
      console.log('-'.repeat(80));
      rows.slice(0, 10).forEach((r, idx) => {
        const dataHora = DateTime.fromJSDate(new Date(r.data_hora)).setZone('America/Manaus');
        const diff = dataHora.diff(agora, 'minutes').minutes;
        const diffStr = diff > 0 ? `em ${Math.floor(diff)} min` : `há ${Math.abs(Math.floor(diff))} min`;
        
        console.log(`\n${idx + 1}. [ID: ${r.id}] ${r.tipo} - Rodada ${r.rodada}`);
        console.log(`   Agendado para: ${dataHora.toFormat('dd/MM/yyyy HH:mm:ss')} (${diffStr})`);
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
