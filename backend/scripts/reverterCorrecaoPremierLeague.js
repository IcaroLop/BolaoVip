// Script para reverter a correção incorreta de -4h aplicada aos jogos da Premier League
// Agora vamos ADICIONAR +4h para voltar aos horários corretos

const pool = require('../database/conexao');
const { DateTime } = require('luxon');

async function reverterCorrecao() {
  const conn = await pool.getConnection();
  try {
    console.log('🔧 Revertendo correção incorreta de horários da Premier League...\n');
    
    // Buscar todos os jogos da Premier League
    const [jogos] = await conn.query(
      `SELECT id, partida_id, campeonato_id, rodada, time_mandante, time_visitante, data 
       FROM jogos 
       WHERE campeonato_id = 69 
       ORDER BY rodada, data`
    );
    
    if (jogos.length === 0) {
      console.log('⚠️ Nenhum jogo da Premier League encontrado.');
      return;
    }
    
    console.log(`📊 Encontrados ${jogos.length} jogos da Premier League\n`);
    
    await conn.beginTransaction();
    
    let corrigidos = 0;
    for (const jogo of jogos) {
      // Pega a data atual armazenada (que está com -4h incorreto)
      const dtAtual = DateTime.fromJSDate(jogo.data, { zone: 'utc' });
      
      // ADICIONA +4h para reverter a correção incorreta
      const dtCorrigido = dtAtual.plus({ hours: 4 });
      
      // Atualiza no banco
      await conn.query(
        'UPDATE jogos SET data = ? WHERE id = ?',
        [dtCorrigido.toFormat('yyyy-LL-dd HH:mm:ss'), jogo.id]
      );
      
      console.log(`✅ Rodada ${jogo.rodada} | Partida ${jogo.partida_id} | ${jogo.time_mandante} vs ${jogo.time_visitante}`);
      console.log(`   ${dtAtual.toFormat('yyyy-LL-dd HH:mm:ss')} → ${dtCorrigido.toFormat('yyyy-LL-dd HH:mm:ss')}\n`);
      
      corrigidos++;
    }
    
    await conn.commit();
    console.log(`\n✅ Reversão concluída! ${corrigidos} jogos atualizados.`);
    console.log('\n📝 Agora os horários estão corretos (apenas conversão SP→Manaus = -1h)');
    
  } catch (error) {
    await conn.rollback();
    console.error('❌ Erro ao reverter correção:', error);
  } finally {
    conn.release();
    process.exit(0);
  }
}

reverterCorrecao();
