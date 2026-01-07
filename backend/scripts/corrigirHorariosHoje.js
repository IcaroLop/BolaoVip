/**
 * Script: Corrigir horários de hoje
 * Adiciona 3 horas aos jogos de hoje que estão com timezone errado
 */

const pool = require('../database/conexao');
const { DateTime } = require('luxon');

async function corrigirHorariosHoje() {
  const conexao = await pool.getConnection();
  try {
    const agora = DateTime.now().setZone('America/Manaus');
    const hojeKey = agora.toFormat('yyyy-LL-dd');

    console.log(`📅 Corrigindo horários dos jogos de hoje: ${hojeKey}\n`);

    // Buscar todos os jogos de hoje da Premier League
    const [jogos] = await conexao.query(`
      SELECT id, time_mandante, time_visitante, data, rodada
      FROM jogos
      WHERE DATE(data) = ?
      AND campeonato_id = 69
      ORDER BY data ASC
    `, [hojeKey]);

    if (jogos.length === 0) {
      console.log('ℹ️ Nenhum jogo encontrado para hoje.');
      return;
    }

    console.log(`Encontrados ${jogos.length} jogos:\n`);

    await conexao.beginTransaction();

    for (const jogo of jogos) {
      // Ler horário atual
      const dataAtual = new Date(jogo.data);
      const dtAtual = DateTime.fromJSDate(dataAtual, { zone: 'America/Manaus' });

      // Adicionar 3 horas
      const dtNova = dtAtual.plus({ hours: 3 });

      // Converter para formato MySQL
      const dataNova = new Date(dtNova.toUTC().toString());

      console.log(`${jogo.time_mandante} vs ${jogo.time_visitante}`);
      console.log(`  De:  ${dtAtual.toFormat('HH:mm:ss')} → Para: ${dtNova.toFormat('HH:mm:ss')}`);

      await conexao.query(
        'UPDATE jogos SET data = ? WHERE id = ?',
        [dataNova, jogo.id]
      );
    }

    await conexao.commit();
    console.log(`\n✅ ${jogos.length} jogos corrigidos com sucesso!`);

    // Verificar resultado
    const [verificacao] = await conexao.query(`
      SELECT time_mandante, time_visitante, data
      FROM jogos
      WHERE DATE(data) = ?
      AND campeonato_id = 69
      ORDER BY data ASC
    `, [hojeKey]);

    console.log('\n📊 Horários corrigidos:');
    for (const jogo of verificacao) {
      const dt = DateTime.fromJSDate(new Date(jogo.data), { zone: 'America/Manaus' });
      console.log(`${jogo.time_mandante} vs ${jogo.time_visitante} - ${dt.toFormat('HH:mm:ss')}`);
    }

  } catch (err) {
    await conexao.rollback();
    console.error('❌ Erro ao corrigir horários:', err.message);
    throw err;
  } finally {
    conexao.release();
  }
}

corrigirHorariosHoje().catch(err => {
  console.error('Erro fatal:', err);
  process.exit(1);
});
