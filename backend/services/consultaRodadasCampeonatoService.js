const axios = require('axios');
const tokenConfig = require('../config/tokenConfig');
const { registrarRequisicaoApiFutebol } = require('./apiFutebolHelper');

const API_BASE_URL = 'https://api.api-futebol.com.br/v1';

/**
 * Busca status das rodadas de um campeonato na API-Futebol
 * @param {number} campeonatoId
 * @returns {Promise<Object>} Objeto com fases e rodadas
 */
async function buscarRodadasPorCampeonato(campeonatoId) {
  try {
    const API_TOKEN = tokenConfig.getToken();
    console.log(`[consultaRodadasCampeonatoService] Buscando rodadas do campeonato ${campeonatoId}...`);
    console.log(`[consultaRodadasCampeonatoService] Token utilizado: ${API_TOKEN?.substring(0, 10)}...`);

    const response = await axios.get(`${API_BASE_URL}/campeonatos/${campeonatoId}/rodadas`, {
      headers: {
        Authorization: `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    await registrarRequisicaoApiFutebol();

    if (response.status !== 200) {
      throw new Error(`API retornou status ${response.status}`);
    }

    console.log('[consultaRodadasCampeonatoService] Rodadas obtidas com sucesso');
    return response.data;
  } catch (error) {
    console.error('[consultaRodadasCampeonatoService] Erro ao buscar rodadas:', error.message);

    if (error.response) {
      throw new Error(`Erro na API-Futebol: ${error.response.status} - ${error.response.data?.message || 'Erro desconhecido'}`);
    } else if (error.request) {
      throw new Error('Sem resposta da API-Futebol. Verifique a conexão.');
    } else {
      throw new Error(`Erro ao configurar requisição: ${error.message}`);
    }
  }
}

module.exports = {
  buscarRodadasPorCampeonato
};
