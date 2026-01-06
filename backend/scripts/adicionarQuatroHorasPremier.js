#!/usr/bin/env node
/**
 * Adiciona 4 horas aos horários dos jogos da Premier League
 * Correção rápida para timezone UTC → America/Manaus
 */

const pool = require('../database/conexao');
const { DateTime } = require('luxon');

async function corrigir() {
  const conexao = await pool.getConnection();
  try {
    console.log('='.repeat(80));
    console.log('ADICIONAR +4H AOS HORÁRIOS - PREMIER LEAGUE (Campeonato 69)');
    console.log('='.repeat(80));
    
    await conexao.beginTransaction();
    
    // Buscar jogos
    const [jogos] = await conexao.query(`
      SELECT partida_id, time_mandante, time_visitante, data, rodada
      FROM jogos
      WHERE campeonato_id = 69
      ORDER BY data ASC
    `);
    
    console.log(`\n📋 Jogos encontrados: ${jogos.length}\n`);
    
    if (jogos.length === 0) {
      console.log('⚠️  Nenhum jogo encontrado.\n');
      await conexao.rollback();
      await pool.end();
      return;
    }
    
    let corrigidos = 0;
    
    for (const jogo of jogos) {
      // Pega a data atual como está no banco (naive, sem timezone)
      const dataAtual = DateTime.fromJSDate(new Date(jogo.data), { zone: 'America/Manaus' });
      const dataCorrigida = dataAtual.plus({ hours: 4 });
      
      await conexao.query(`
        UPDATE jogos
        SET data = ?
        WHERE partida_id = ?
      `, [dataCorrigida.toSQL({ includeOffset: false }), jogo.partida_id]);
      
      if (corrigidos < 5) {
        console.log(`✅ ${jogo.time_mandante} vs ${jogo.time_visitante}`);
        console.log(`   ${dataAtual.toFormat('dd/MM/yyyy HH:mm')} → ${dataCorrigida.toFormat('dd/MM/yyyy HH:mm')} (+4h)\n`);
      }
      
      corrigidos++;
    }
    
    await conexao.commit();
    
    console.log(`\n✅ Total corrigido: ${corrigidos} jogos (+4 horas)`);
    console.log('\n⚠️  PRÓXIMOS PASSOS:`);
    console.log('   1. node scripts/testarPlanejamento.js');
    console.log('   2. pm2 restart bolaovip-backend');
    console.log('   3. node scripts/verificarAgendamentosAmanha.js\n');
    console.log('='.repeat(80));
    
    await pool.end();
  } catch (err) {
    await conexao.rollback();
    console.error('❌ Erro:', err);
    await pool.end();
    process.exit(1);
  }
}

corrigir();
