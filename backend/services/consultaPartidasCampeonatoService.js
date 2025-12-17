const axios = require('axios');
const tokenConfig = require('../config/tokenConfig');
const { registrarRequisicaoApiFutebol } = require('./apiFutebolHelper');

const API_BASE_URL = 'https://api.api-futebol.com.br/v1';

/**
 * Busca todas as partidas de um campeonato na API-Futebol
 * @param {number} campeonatoId - ID do campeonato (ex: 10 = Brasileiro, 20 = Champions League)
 * @returns {Promise<Object>} Objeto com estrutura { campeonato, partidas }
 */
async function buscarPartidasPorCampeonato(campeonatoId) {
  try {
    // Ler o token dinamicamente via TokenConfig
    const API_TOKEN = tokenConfig.getToken();
    
    console.log(`[consultaPartidasCampeonatoService] Buscando partidas do campeonato ${campeonatoId}...`);
    console.log(`[consultaPartidasCampeonatoService] Token utilizado: ${API_TOKEN?.substring(0, 10)}...`);
    
    const response = await axios.get(`${API_BASE_URL}/campeonatos/${campeonatoId}/partidas`, {
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30 segundos
    });

    await registrarRequisicaoApiFutebol();

    if (response.status !== 200) {
      throw new Error(`API retornou status ${response.status}`);
    }

    console.log(`[consultaPartidasCampeonatoService] Partidas obtidas com sucesso`);
    return response.data;

  } catch (error) {
    console.error('[consultaPartidasCampeonatoService] Erro ao buscar partidas:', error.message);
    
    if (error.response) {
      // Erro de resposta da API
      throw new Error(`Erro na API-Futebol: ${error.response.status} - ${error.response.data?.message || 'Erro desconhecido'}`);
    } else if (error.request) {
      // Requisição foi feita mas não houve resposta
      throw new Error('Sem resposta da API-Futebol. Verifique a conexão.');
    } else {
      // Erro na configuração da requisição
      throw new Error(`Erro ao configurar requisição: ${error.message}`);
    }
  }
}

module.exports = {
  buscarPartidasPorCampeonato
};
