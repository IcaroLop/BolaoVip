#!/usr/bin/env node
/**
 * Lista TODOS os jogos de hoje, independente de status
 */

const pool = require('../database/conexao');
const { DateTime } = require('luxon');

async function listar() {
  try {
    const agora = DateTime.now().setZone('America/Manaus');
    console.log(`⏰ Hora atual (Manaus): ${agora.toFormat('dd/MM/yyyy HH:mm:ss')}\n`);

    // Buscar TODOS os jogos de hoje
    const [jogos] = await pool.query(`
      SELECT 
        j.id,
        j.partida_id,
        j.campeonato_id,
        j.rodada,
        j.data,
        j.time_mandante,
        j.time_visitante,
        j.status,
        j.placar_mandante,
        j.placar_visitante,
        TIMESTAMPDIFF(MINUTE, NOW(), j.data) as minutos_ate
      FROM jogos j
      WHERE DATE(j.data) = CURDATE()
      ORDER BY j.data ASC
    `);

    console.log(`📅 JOGOS DE HOJE (${jogos.length} encontrados):\n`);

    if (jogos.length === 0) {
      console.log('❌ Nenhum jogo encontrado para hoje\n');
      
      // Verificar próximos jogos
      const [proximos] = await pool.query(`
        SELECT 
          DATE(data) as dia,
          COUNT(*) as total
        FROM jogos
        WHERE data > NOW()
        GROUP BY DATE(data)
        ORDER BY dia
        LIMIT 5
      `);
      
      console.log('📆 Próximos dias com jogos:');
      proximos.forEach(p => {
        const dia = DateTime.fromJSDate(new Date(p.dia)).setZone('America/Manaus');
        console.log(`   ${dia.toFormat('dd/MM/yyyy')} - ${p.total} jogos`);
      });
    } else {
      jogos.forEach((jogo, idx) => {
        const dataJogo = DateTime.fromJSDate(new Date(jogo.data)).setZone('America/Manaus');
        const statusEmoji = jogo.status === 'agendado' ? '⏳' : jogo.status === 'encerrado' ? '✅' : '⚽';
        
        console.log(`${idx + 1}. [ID: ${jogo.id}] ${jogo.time_mandante} vs ${jogo.time_visitante}`);
        console.log(`   ${statusEmoji} Status: ${jogo.status}`);
        console.log(`   🏆 Campeonato: ${jogo.campeonato_id} | Rodada: ${jogo.rodada}`);
        console.log(`   ⏰ Horário: ${dataJogo.toFormat('dd/MM/yyyy HH:mm:ss')}`);
        console.log(`   ⌛ ${jogo.minutos_ate > 0 ? `Falta ${jogo.minutos_ate} min` : `Passou ${Math.abs(jogo.minutos_ate)} min`}`);
        
        if (jogo.placar_mandante !== null) {
          console.log(`   📊 Placar: ${jogo.placar_mandante} x ${jogo.placar_visitante}`);
        }
        console.log('');
      });
    }

    // Verificar se há jogos da Premier League hoje
    const [premier] = await pool.query(`
      SELECT COUNT(*) as total
      FROM jogos
      WHERE campeonato_id = 69
        AND DATE(data) = CURDATE()
    `);

    console.log(`🏴󠁧󠁢󠁥󠁮󠁧󠁿 Premier League hoje: ${premier[0].total} jogos`);

    await pool.end();
  } catch (err) {
    console.error('❌ Erro:', err);
    await pool.end();
    process.exit(1);
  }
}

listar();
