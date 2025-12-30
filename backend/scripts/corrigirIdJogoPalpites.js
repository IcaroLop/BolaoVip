const pool = require('../database/conexao');

async function corrigirIdJogo() {
  console.log('🔧 Iniciando correção dos id_jogo nos palpites...\n');
  
  try {
    const conexao = await pool.getConnection();
    
    try {
      // Mapeamento de partida_id → jogos.id para rodada 17
      const mapeamento = [
        { partida_id: 26813, id_jogo: 1097 },
        { partida_id: 26814, id_jogo: 1090 },
        { partida_id: 26815, id_jogo: 1091 },
        { partida_id: 26816, id_jogo: 1095 },
        { partida_id: 26817, id_jogo: 1098 },
        { partida_id: 26818, id_jogo: 1096 },
        { partida_id: 26819, id_jogo: 1092 },
        { partida_id: 26820, id_jogo: 1089 },
        { partida_id: 26821, id_jogo: 1094 },
        { partida_id: 26822, id_jogo: 1093 }
      ];
      
      let totalCorrigidos = 0;
      
      for (const item of mapeamento) {
        const [result] = await conexao.execute(
          'UPDATE palpites SET id_jogo = ? WHERE id_jogo = ? AND rodada = 17 AND campeonato_id = 69',
          [item.id_jogo, item.partida_id]
        );
        
        if (result.affectedRows > 0) {
          console.log(`✅ partida_id ${item.partida_id} → id_jogo ${item.id_jogo} (${result.affectedRows} palpites)`);
          totalCorrigidos += result.affectedRows;
        }
      }
      
      console.log(`\n✅ Total de ${totalCorrigidos} palpites corrigidos!`);
      
      conexao.release();
      
    } catch (err) {
      console.error('❌ Erro na correção:', err.message);
      conexao.release();
      throw err;
    }
    
  } catch (err) {
    console.error('❌ Erro de conexão:', err.message);
    process.exit(1);
  }
}

corrigirIdJogo().then(() => {
  console.log('\n🎉 Correção concluída! Agora vou recalcular o ranking...\n');
  
  // Chamar o script de recalcular ranking
  require('./recalcularRankingRodada17.js');
});
