// Script para debugar pontuação específica
// Rodada 16, usuario_id=7, campeonato_id=69, Burnley vs Fulham

const pool = require('../database/conexao');
const { calcularPontuacao } = require('../services/pontuacaoService');

async function main() {
  const conexao = await pool.getConnection();
  
  try {
    console.log('🔍 Verificando pontuação específica...\n');

    // Buscar o jogo Burnley vs Fulham na rodada 16
    const [jogos] = await conexao.query(`
      SELECT 
        id,
        partida_id,
        time_mandante,
        time_visitante,
        placar_mandante,
        placar_visitante,
        rodada
      FROM jogos 
      WHERE campeonato_id = 69 
        AND rodada = 16
        AND (time_mandante LIKE '%Burnley%' OR time_visitante LIKE '%Fulham%')
      LIMIT 1
    `);

    if (jogos.length === 0) {
      console.log('❌ Jogo não encontrado');
      return;
    }

    const jogo = jogos[0];
    console.log('📊 JOGO ENCONTRADO:');
    console.log(`   ${jogo.time_mandante} ${jogo.placar_mandante} × ${jogo.placar_visitante} ${jogo.time_visitante}`);
    console.log(`   Jogo ID: ${jogo.id} | Partida ID: ${jogo.partida_id}`);
    console.log(`   Rodada: ${jogo.rodada}\n`);

    // Buscar o palpite do usuário 7 (palpites.id_jogo = jogos.partida_id)
    const [palpites] = await conexao.query(`
      SELECT 
        id as palpite_id,
        id_usuario,
        gols_casa as placar_casa,
        gols_fora as placar_fora,
        grupo_id
      FROM palpites 
      WHERE id_jogo = ?
        AND id_usuario = 7
      LIMIT 1
    `, [jogo.partida_id]);

    if (palpites.length === 0) {
      console.log('❌ Palpite não encontrado para usuário 7');
      console.log(`   Verificado com partida_id: ${jogo.partida_id}`);
      return;
    }

    const palpite = palpites[0];
    console.log('🎯 PALPITE ENCONTRADO:');
    console.log(`   Palpite: ${palpite.placar_casa} × ${palpite.placar_fora}`);
    console.log(`   Palpite ID: ${palpite.palpite_id}`);
    console.log(`   Usuário ID: ${palpite.id_usuario}`);
    console.log(`   Grupo ID: ${palpite.grupo_id}\n`);

    // Calcular pontuação usando a função atual
    const resultado = {
      placar_mandante: jogo.placar_mandante,
      placar_visitante: jogo.placar_visitante
    };

    const palpiteData = {
      placar_casa: palpite.placar_casa,
      placar_fora: palpite.placar_fora
    };

    const pontosCalculados = calcularPontuacao(palpiteData, resultado);

    console.log('🧮 CÁLCULO:');
    console.log(`   Pontos calculados pela função: ${pontosCalculados}`);
    
    console.log('\n📋 ANÁLISE DETALHADA:');
    
    // Análise detalhada
    const pCasa = palpiteData.placar_casa;
    const pFora = palpiteData.placar_fora;
    const rCasa = resultado.placar_mandante;
    const rFora = resultado.placar_visitante;
    
    console.log(`   Placar exato? ${pCasa === rCasa && pFora === rFora ? 'SIM' : 'NÃO'}`);
    console.log(`   Empate real? ${rCasa === rFora ? 'SIM' : 'NÃO'}`);
    console.log(`   Empate palpite? ${pCasa === pFora ? 'SIM' : 'NÃO'}`);
    
    const vencedorPalpite = pCasa > pFora ? 'mandante' : pCasa < pFora ? 'visitante' : 'empate';
    const vencedorReal = rCasa > rFora ? 'mandante' : rCasa < rFora ? 'visitante' : 'empate';
    console.log(`   Vencedor palpite: ${vencedorPalpite}`);
    console.log(`   Vencedor real: ${vencedorReal}`);
    console.log(`   Acertou vencedor? ${vencedorPalpite === vencedorReal ? 'SIM' : 'NÃO'}`);
    console.log(`   Acertou gols casa? ${pCasa === rCasa ? 'SIM' : 'NÃO'}`);
    console.log(`   Acertou gols fora? ${pFora === rFora ? 'SIM' : 'NÃO'}`);
    
    console.log('\n💡 EXPLICAÇÃO DA PONTUAÇÃO:');
    if (vencedorPalpite === vencedorReal && vencedorReal !== 'empate') {
      console.log(`   Base: 1.5 (vencedor correto)`);
      if (pCasa === rCasa || pFora === rFora) {
        console.log(`   Bônus: +0.5 (acertou gols de um lado)`);
        console.log(`   TOTAL: 2.0 pontos`);
      } else {
        console.log(`   TOTAL: 1.5 pontos`);
      }
    }
    
    console.log('\n✅ Análise concluída!');
    console.log(`\n📌 CONCLUSÃO: A pontuação deveria ser ${pontosCalculados} pontos`);
    console.log('   Execute o script de recálculo para atualizar o ranking se necessário:');
    console.log('   node backend/scripts/recalcularPontuacoes.js');

  } catch (err) {
    console.error('❌ Erro:', err);
  } finally {
    conexao.release();
    process.exit(0);
  }
}

main();
