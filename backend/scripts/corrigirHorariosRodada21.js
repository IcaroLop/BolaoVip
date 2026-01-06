#!/usr/bin/env node
/**
 * Atualiza horários dos jogos da rodada 21 para os valores corretos
 */

const pool = require('../database/conexao');
const { DateTime } = require('luxon');

async function corrigirHorarios() {
  try {
    console.log('Corrigindo horários da rodada 21...\n');
    console.log('='.repeat(80));

    // Mapeamento: partida_id → horário correto em Manaus
    const horariosCorretos = {
      26862: '2026-01-06 16:00:00', // West Ham vs Nottingham Forest
      26854: '2026-01-07 15:30:00', // Bournemouth vs Tottenham
      26855: '2026-01-07 15:30:00', // Brentford vs Sunderland
      26857: '2026-01-07 15:30:00', // Crystal Palace vs Aston Villa
      26858: '2026-01-07 15:30:00', // Everton vs Wolverhampton
      26859: '2026-01-07 15:30:00', // Fulham vs Chelsea
      26860: '2026-01-07 15:30:00', // Manchester City vs Brighton
      26856: '2026-01-07 16:15:00', // Burnley vs Manchester United
      26861: '2026-01-07 16:15:00', // Newcastle vs Leeds United
      26853: '2026-01-08 16:00:00'  // Arsenal vs Liverpool
    };

    for (const [partidaId, horarioCorreto] of Object.entries(horariosCorretos)) {
      // Buscar jogo atual
      const [jogos] = await pool.query(
        'SELECT id, time_mandante, time_visitante, data FROM jogos WHERE partida_id = ?',
        [partidaId]
      );

      if (jogos.length === 0) {
        console.log(`⚠️  Partida ${partidaId} não encontrada`);
        continue;
      }

      const jogo = jogos[0];
      const dataAtual = DateTime.fromJSDate(new Date(jogo.data)).setZone('America/Manaus');
      const dataNova = DateTime.fromFormat(horarioCorreto, 'yyyy-MM-dd HH:mm:ss', { zone: 'America/Manaus' });

      console.log(`\n📍 ${jogo.time_mandante} vs ${jogo.time_visitante} (ID: ${jogo.id})`);
      console.log(`   Atual: ${dataAtual.toFormat('dd/MM/yyyy HH:mm:ss')}`);
      console.log(`   Novo:  ${dataNova.toFormat('dd/MM/yyyy HH:mm:ss')}`);

      if (dataAtual.toFormat('yyyy-MM-dd HH:mm:ss') === horarioCorreto) {
        console.log(`   ✅ Já está correto`);
      } else {
        // Atualizar
        await pool.query(
          'UPDATE jogos SET data = ? WHERE id = ?',
          [horarioCorreto, jogo.id]
        );
        console.log(`   🔄 ATUALIZADO`);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ Correção concluída!\n');

    // Verificar resultado
    console.log('Verificando jogos de hoje após correção...\n');
    const [jogosHoje] = await pool.query(`
      SELECT id, time_mandante, time_visitante, data, status
      FROM jogos
      WHERE DATE(data) = CURDATE()
      ORDER BY data ASC
    `);

    if (jogosHoje.length > 0) {
      jogosHoje.forEach(j => {
        const data = DateTime.fromJSDate(new Date(j.data)).setZone('America/Manaus');
        console.log(`${j.time_mandante} vs ${j.time_visitante}`);
        console.log(`   ⏰ ${data.toFormat('dd/MM/yyyy HH:mm:ss')} (${j.status})\n`);
      });
    } else {
      console.log('Nenhum jogo encontrado para hoje\n');
    }

    await pool.end();
  } catch (err) {
    console.error('❌ Erro:', err);
    await pool.end();
    process.exit(1);
  }
}

corrigirHorarios();
