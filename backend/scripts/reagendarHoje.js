/**
 * Script: Reagendar Jogos de Hoje
 * Força criação de agendamentos para jogos que ainda vão acontecer hoje
 */

const pool = require('../database/conexao');
const { DateTime } = require('luxon');

async function reagendarHoje() {
  const conexao = await pool.getConnection();
  try {
    const agora = DateTime.now().setZone('America/Manaus');
    const hojeKey = agora.toFormat('yyyy-LL-dd');

    console.log(`📅 Reagendando jogos de hoje: ${hojeKey}\n`);

    // Buscar todos os jogos de hoje da Premier League que ainda não aconteceram
    const [jogos] = await conexao.query(`
      SELECT DISTINCT 
        j.id,
        j.data,
        j.time_mandante,
        j.time_visitante,
        j.rodada,
        j.campeonato_id
      FROM jogos j
      WHERE DATE(j.data) = ?
      AND j.campeonato_id = 69
      AND j.data > NOW()
      ORDER BY j.data ASC
    `, [hojeKey]);

    if (jogos.length === 0) {
      console.log('ℹ️ Nenhum jogo encontrado para hoje que ainda não aconteceu.');
      return;
    }

    console.log(`✅ Encontrados ${jogos.length} jogos para reagendar:\n`);

    // Apaga qualquer agendamento de placar de hoje (evita duplicar ao rodar mais de uma vez)
    await conexao.query(
      `DELETE FROM agendador_requisicoes 
       WHERE tipo = 'placar' 
         AND DATE(data_hora) = ?
         AND campeonato_id = 69`,
      [hojeKey]
    );

    // Agrupar por horário (hora de Manaus)
    const porHorario = new Map();
    const parseDataManaus = (dateValue) => {
      if (!dateValue) return null;
      if (dateValue instanceof Date) {
        // MySQL entrega Date assumindo UTC; subtrai 3h para alinhar ao horário salvo
        const iso = dateValue.toISOString();
        return DateTime.fromISO(iso).minus({ hours: 3 });
      }
      return DateTime.fromISO(dateValue, { setZone: true }).setZone('America/Manaus');
    };

    for (const jogo of jogos) {
      const dtManaus = parseDataManaus(jogo.data);
      const chaveHorario = dtManaus.toFormat('yyyy-LL-dd HH:mm');
      if (!porHorario.has(chaveHorario)) {
        porHorario.set(chaveHorario, []);
      }
      porHorario.get(chaveHorario).push({ ...jogo, dtManaus, chaveHorario });
    }

    await conexao.beginTransaction();

    let planejados = 0;

    // Para cada grupo de horário
    for (const [chaveHorario, jogosGrupo] of porHorario.entries()) {
      const dataBaseStr = chaveHorario; // "2026-01-07 15:30" em Manaus
      const dt = jogosGrupo[0].dtManaus;

      console.log(`Grupo ${dt.toFormat('HH:mm')} (${jogosGrupo.length} jogos):`);
      console.log(`  ${jogosGrupo.map(j => `${j.time_mandante} vs ${j.time_visitante}`).join(', ')}`);

      // Deletar agendamentos antigos deste grupo (se houver)
      await conexao.query(
        `DELETE FROM agendador_requisicoes 
         WHERE tipo = 'placar'
         AND grupo_chave LIKE ?
         AND data_hora > NOW()`,
        [`${dataBaseStr}-placar%`]
      );

      // Criar 260 requisições distribuídas em 130 minutos
      const MAX_REQ = 260;
      const intervaloMin = 130 / MAX_REQ; // 0.5 min = 30 segundos

      for (let k = 0; k < MAX_REQ; k++) {
        const offset = k * intervaloMin;
        const dtExec = dt.plus({ minutes: offset });
        const grupoChave = `${dataBaseStr}-placar-${k + 1}/${MAX_REQ}`;

        await conexao.query(
          `INSERT INTO agendador_requisicoes 
           (data_hora, campeonato_id, rodada, grupo_chave, requests_previstos, tipo, status)
           VALUES (?, ?, ?, ?, 1, 'placar', 'planejado')
           ON DUPLICATE KEY UPDATE 
           data_hora = VALUES(data_hora), status = 'planejado', updated_at = CURRENT_TIMESTAMP`,
          [
            dtExec.toUTC().toSQL({ includeOffset: false }),
            jogosGrupo[0].campeonato_id,
            jogosGrupo[0].rodada,
            grupoChave
          ]
        );
        planejados++;
      }

      console.log(`  ✅ ${MAX_REQ} requisições criadas (${dt.toFormat('HH:mm')} até ${dt.plus({ minutes: 130 }).toFormat('HH:mm')})\n`);
    }

    await conexao.commit();
    console.log(`✅ Total: ${planejados} requisições criadas para hoje!\n`);

    // Verificar resultado
    const [verificacao] = await conexao.query(`
      SELECT COUNT(*) as total, MIN(data_hora) as primeira, MAX(data_hora) as ultima
      FROM agendador_requisicoes
      WHERE tipo = 'placar'
      AND DATE(data_hora) = ?
    `, [hojeKey]);

    console.log('📊 Estatísticas de agendamentos para hoje:');
    console.log(`   Total: ${verificacao[0].total}`);
    console.log(`   Primeira: ${verificacao[0].primeira}`);
    console.log(`   Última: ${verificacao[0].ultima}`);

  } catch (err) {
    await conexao.rollback();
    console.error('❌ Erro ao reagendar:', err.message);
    throw err;
  } finally {
    conexao.release();
  }
}

reagendarHoje().catch(err => {
  console.error('Erro fatal:', err);
  process.exit(1);
});
