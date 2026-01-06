#!/usr/bin/env node
/**
 * Verifica duplicação de jogos da rodada 21
 */

const pool = require('../database/conexao');
const { DateTime } = require('luxon');

async function verificar() {
  try {
    console.log('Verificando jogos da rodada 21...\n');

    const [jogos] = await pool.query(`
      SELECT 
        id,
        partida_id,
        campeonato_id,
        rodada,
        data,
        time_mandante,
        time_visitante,
        status
      FROM jogos
      WHERE campeonato_id = 69 AND rodada = 21
      ORDER BY data ASC, id ASC
    `);

    console.log(`Total: ${jogos.length} jogos\n`);
    console.log('='.repeat(80));

    const porPartidaId = {};
    
    jogos.forEach(jogo => {
      if (!porPartidaId[jogo.partida_id]) {
        porPartidaId[jogo.partida_id] = [];
      }
      porPartidaId[jogo.partida_id].push(jogo);
    });

    let duplicados = 0;
    
    for (const [partidaId, lista] of Object.entries(porPartidaId)) {
      if (lista.length > 1) {
        duplicados++;
        console.log(`\n❌ DUPLICADO - Partida ${partidaId}:`);
        lista.forEach(j => {
          const data = DateTime.fromJSDate(new Date(j.data)).setZone('America/Manaus');
          console.log(`   ID: ${j.id} | ${j.time_mandante} vs ${j.time_visitante}`);
          console.log(`   Data: ${data.toFormat('dd/MM/yyyy HH:mm:ss')} | Status: ${j.status}`);
        });
      } else {
        const j = lista[0];
        const data = DateTime.fromJSDate(new Date(j.data)).setZone('America/Manaus');
        console.log(`\n✅ ID: ${j.id} (Partida ${j.partida_id})`);
        console.log(`   ${j.time_mandante} vs ${j.time_visitante}`);
        console.log(`   ${data.toFormat('dd/MM/yyyy HH:mm:ss')}`);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log(`Total de partidas duplicadas: ${duplicados}`);
    
    if (duplicados > 0) {
      console.log('\n⚠️  AÇÃO NECESSÁRIA: Deletar registros antigos (IDs menores) e manter os novos');
    }

    await pool.end();
  } catch (err) {
    console.error('❌ Erro:', err);
    await pool.end();
    process.exit(1);
  }
}

verificar();
