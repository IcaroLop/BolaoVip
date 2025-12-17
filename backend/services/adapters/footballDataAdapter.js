/**
 * Adapter para Football-Data.org API
 * https://www.football-data.org/
 * Competition Code Brasileirão: BSA
 */

const axios = require('axios');

const API_BASE_URL = 'https://api.football-data.org/v4';
const COMPETITION_CODE = 'BSA'; // Brasileirão Série A
const SEASON = 2024;

/**
 * Busca partidas de uma rodada específica
 * @param {number} rodada - Número da rodada (1-38)
 * @returns {Promise<object>} Dados brutos da API
 */
async function buscarRodada(rodada) {
  const apiToken = process.env.FOOTBALL_DATA_TOKEN;

  if (!apiToken) {
    throw new Error('FOOTBALL_DATA_TOKEN não configurada no .env');
  }

  try {
    console.log(`🌐 [Football-Data] Buscando rodada ${rodada}...`);

    const response = await axios.get(`${API_BASE_URL}/competitions/${COMPETITION_CODE}/matches`, {
      params: {
        season: SEASON,
        matchday: rodada
      },
      headers: {
        'X-Auth-Token': apiToken
      },
      timeout: 10000
    });

    if (response.data && response.data.matches) {
      console.log(`✅ [Football-Data] ${response.data.matches.length} partidas encontradas`);
      return response.data;
    }

    throw new Error('Resposta sem dados');
  } catch (error) {
    // Se erro 404, pode ser que o Brasileirão não esteja disponível nesta API
    if (error.response?.status === 404) {
      console.warn(`⚠️ [Football-Data] Brasileirão pode não estar disponível (404)`);
    } else {
      console.error(`❌ [Football-Data] Erro:`, error.response?.data || error.message);
    }
    throw error;
  }
}

/**
 * Busca todas as partidas da temporada
 * @returns {Promise<object>} Dados brutos da API
 */
async function buscarTodasPartidas() {
  const apiToken = process.env.FOOTBALL_DATA_TOKEN;

  if (!apiToken) {
    throw new Error('FOOTBALL_DATA_TOKEN não configurada no .env');
  }

  try {
    console.log(`🌐 [Football-Data] Buscando todas as partidas...`);

    const response = await axios.get(`${API_BASE_URL}/competitions/${COMPETITION_CODE}/matches`, {
      params: {
        season: SEASON
      },
      headers: {
        'X-Auth-Token': apiToken
      },
      timeout: 15000
    });

    if (response.data && response.data.matches) {
      console.log(`✅ [Football-Data] ${response.data.matches.length} partidas encontradas`);
      return response.data;
    }

    throw new Error('Resposta sem dados');
  } catch (error) {
    console.error(`❌ [Football-Data] Erro:`, error.response?.data || error.message);
    throw error;
  }
}

/**
 * Busca partidas por status
 * @param {string} status - Status: SCHEDULED, LIVE, IN_PLAY, PAUSED, FINISHED
 * @returns {Promise<object>} Dados das partidas
 */
async function buscarPorStatus(status) {
  const apiToken = process.env.FOOTBALL_DATA_TOKEN;

  if (!apiToken) {
    throw new Error('FOOTBALL_DATA_TOKEN não configurada no .env');
  }

  try {
    console.log(`🌐 [Football-Data] Buscando partidas com status ${status}...`);

    const response = await axios.get(`${API_BASE_URL}/competitions/${COMPETITION_CODE}/matches`, {
      params: {
        season: SEASON,
        status: status
      },
      headers: {
        'X-Auth-Token': apiToken
      },
      timeout: 10000
    });

    if (response.data && response.data.matches) {
      console.log(`✅ [Football-Data] ${response.data.matches.length} partidas encontradas`);
      return response.data;
    }

    return { matches: [] };
  } catch (error) {
    console.error(`❌ [Football-Data] Erro:`, error.response?.data || error.message);
    throw error;
  }
}

/**
 * Busca informações sobre a competição
 * @returns {Promise<object>} Dados da competição
 */
async function buscarInfoCompeticao() {
  const apiToken = process.env.FOOTBALL_DATA_TOKEN;

  if (!apiToken) {
    throw new Error('FOOTBALL_DATA_TOKEN não configurada no .env');
  }

  try {
    console.log(`🌐 [Football-Data] Buscando informações da competição...`);

    const response = await axios.get(`${API_BASE_URL}/competitions/${COMPETITION_CODE}`, {
      headers: {
        'X-Auth-Token': apiToken
      },
      timeout: 10000
    });

    return response.data;
  } catch (error) {
    console.error(`❌ [Football-Data] Erro ao buscar competição:`, error.message);
    throw error;
  }
}

module.exports = {
  buscarRodada,
  buscarTodasPartidas,
  buscarPorStatus,
  buscarInfoCompeticao,
  COMPETITION_CODE,
  SEASON
};
