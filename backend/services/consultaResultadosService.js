const pool = require('../database/conexao');
const { calcularRankingRodada, gerarPremiacoesRodada } = require('../controllers/rankingController');
const { buscarResultadosComFallback } = require('./resultadosFallbackService');
const { registrarRequisicaoApiFutebol } = require('./apiFutebolHelper');

/**
 * Consulta os resultados reais de uma rodada e atualiza o banco de dados
 * AGORA COM SISTEMA DE FALLBACK - tenta múltiplas fontes automaticamente
 * @param {number} rodada - Número da rodada (1 a 38)
 */
async function consultarResultadosDaRodada(rodada) {
  try {
    console.log(`🔍 Consultando resultados da rodada ${rodada} com sistema de fallback...`);

    // Busca resultados usando estratégia de fallback
    const resultado = await buscarResultadosComFallback(rodada);

    if (!resultado.sucesso) {
      console.error(`❌ Falha ao buscar resultados da rodada ${rodada}:`, resultado.mensagem);
      console.error('Erros por fonte:', resultado.erros);
      return;
    }

    console.log(`📡 Usando fonte: ${resultado.descricaoFonte}`);
    
    const jogos = resultado.partidas;
    let atualizados = 0;
    let errosAtualizacao = 0;

    for (const jogo of jogos) {
      const placarMandante = jogo.placar_mandante;
      const placarVisitante = jogo.placar_visitante;
      const statusPartida = jogo.status;

      // Atualiza apenas jogos com placares definidos
      if (placarMandante !== null && placarVisitante !== null) {
        try {
          // Tenta atualizar por partida_id (chave externa da API)
          const [result] = await pool.query(`
            UPDATE jogos
            SET placar_mandante = ?, placar_visitante = ?, status = ?
            WHERE partida_id = ?
          `, [placarMandante, placarVisitante, statusPartida, jogo.partida_id]);

          if (result.affectedRows > 0) {
            atualizados++;
          } else {
            // Se não encontrou por partida_id, tenta por nomes dos times e rodada
            const [resultFallback] = await pool.query(`
              UPDATE jogos
              SET placar_mandante = ?, placar_visitante = ?, status = ?
              WHERE rodada = ? 
                AND time_mandante = ? 
                AND time_visitante = ?
            `, [
              placarMandante, 
              placarVisitante, 
              statusPartida, 
              rodada,
              jogo.time_mandante.nome_popular,
              jogo.time_visitante.nome_popular
            ]);

            if (resultFallback.affectedRows > 0) {
              atualizados++;
              console.log(`⚠️ Jogo atualizado por nomes: ${jogo.time_mandante.nome_popular} vs ${jogo.time_visitante.nome_popular}`);
            }
          }
        } catch (updateError) {
          console.error(`❌ Erro ao atualizar jogo ${jogo.partida_id}:`, updateError.message);
          errosAtualizacao++;
        }
      }
    }

    console.log(`✅ Rodada ${rodada} processada via ${resultado.fonte}.`);
    console.log(`   Jogos atualizados: ${atualizados}/${jogos.length}`);
    if (errosAtualizacao > 0) {
      console.log(`   Erros: ${errosAtualizacao}`);
    }
    if (resultado.tentativas > 1) {
      console.log(`   Tentativas necessárias: ${resultado.tentativas}`);
    }

  } catch (error) {
    console.error(`❌ Erro crítico ao consultar rodada ${rodada}:`, error.message);
  }

  // Atualiza ranking e premiações independentemente da fonte
  await calcularRankingRodada(rodada);
  await gerarPremiacoesRodada(rodada);
}

/**
 * Método legado mantido para compatibilidade
 * Usa diretamente a api-futebol.com.br original
 * @param {number} rodada - Número da rodada
 * @deprecated Use consultarResultadosDaRodada() que já tem fallback
 */
async function consultarResultadosDaRodadaLegado(rodada) {
  const axios = require('axios');
  const tokenConfig = require('../config/tokenConfig');
  const API_BASE_URL = 'https://api.api-futebol.com.br/v1';
  const CAMPEONATO_ID = 10;
  const TOKEN = tokenConfig.getToken();

  try {
    console.log(`🔍 [LEGADO] Consultando rodada ${rodada} na api-futebol.com...`);

    const response = await axios.get(`${API_BASE_URL}/campeonatos/${CAMPEONATO_ID}/rodadas/${rodada}`, {
      headers: {
        Authorization: `Bearer ${TOKEN}`
      },
      timeout: 10000
    });

    await registrarRequisicaoApiFutebol();

    const jogos = response.data.partidas;
    let atualizados = 0;

    for (const jogo of jogos) {
      if (jogo.placar_mandante !== null && jogo.placar_visitante !== null) {
        const [result] = await pool.query(`
          UPDATE jogos
          SET placar_mandante = ?, placar_visitante = ?, status = ?
          WHERE partida_id = ?
        `, [jogo.placar_mandante, jogo.placar_visitante, jogo.status, jogo.partida_id]);

        if (result.affectedRows > 0) atualizados++;
      }
    }

    console.log(`✅ [LEGADO] Rodada ${rodada} processada. Jogos atualizados: ${atualizados}`);
  } catch (error) {
    console.error(`❌ [LEGADO] Erro ao consultar rodada ${rodada}:`, error.response?.data || error.message);
    throw error;
  }

  await calcularRankingRodada(rodada);
  await gerarPremiacoesRodada(rodada);
}

module.exports = {
  consultarResultadosDaRodada,
  consultarResultadosDaRodadaLegado
};
