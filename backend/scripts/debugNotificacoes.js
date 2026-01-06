const pool = require('../database/conexao');

async function debugNotificacoes() {
  try {
    const now = new Date();
    const futuro = new Date(now.getTime() + 70 * 60 * 1000);

    console.log('Verificação de tempo:');
    console.log(`NOW:     ${now.toISOString()}`);
    console.log(`NOW+70m: ${futuro.toISOString()}`);

    const [jogos] = await pool.query(
      `SELECT 
        id,
        jogo_id,
        partida_id,
        rodada,
        campeonato_id,
        data,
        time_mandante,
        time_visitante,
        status
       FROM (
         SELECT 
          j.id,
          j.id as jogo_id,
          j.partida_id,
          j.rodada,
          j.campeonato_id,
          j.data,
          j.time_mandante,
          j.time_visitante,
          j.status
         FROM jogos j
         WHERE j.status = 'agendado'
       ) t
       WHERE t.data BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 70 MINUTE)
       ORDER BY t.data ASC`
    );

    console.log(`\n✅ Jogos encontrados nos próximos 70 minutos: ${jogos.length}`);
    jogos.forEach(j => {
      console.log(`  - ${j.partida_id}: ${j.time_mandante} vs ${j.time_visitante} (${j.data})`);
    });

    // Verificar especificamente o jogo de teste
    console.log('\n🔍 Verificando jogo de teste:');
    const [teste] = await pool.query(
      `SELECT id, partida_id, data, NOW() as agora FROM jogos WHERE partida_id = 999999`
    );

    if (teste.length > 0) {
      const jogo = teste[0];
      const dataJogo = new Date(jogo.data);
      const dataNow = new Date(jogo.agora);
      const diffMinutos = (dataJogo - dataNow) / 60000;

      console.log(`   ID: ${jogo.id}`);
      console.log(`   Data jogo: ${jogo.data}`);
      console.log(`   Data NOW:  ${jogo.agora}`);
      console.log(`   Diferença: ${diffMinutos.toFixed(2)} minutos`);
      console.log(`   Entra nos próximos 70 min? ${diffMinutos > 0 && diffMinutos <= 70 ? '✅ SIM' : '❌ NÃO'}`);
    }

  } catch (err) {
    console.error('Erro:', err.message);
  } finally {
    process.exit(0);
  }
}

debugNotificacoes();
