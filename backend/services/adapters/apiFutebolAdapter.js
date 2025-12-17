/**
 * Adapter para API-Football (RapidAPI)
 * https://rapidapi.com/api-sports/api/api-football
 * Liga Brasileirão Série A: ID 71
 */

const axios = require('axios');

const API_BASE_URL = 'https://v3.football.api-sports.io';
const LEAGUE_ID = 71; // Brasileirão Série A
const SEASON = 2024; // Ajustar para 2025 quando o campeonato iniciar

/**
 * Busca partidas de uma rodada específica
 * @param {number} rodada - Número da rodada (1-38)
 * @returns {Promise<object>} Dados brutos da API
 */
async function buscarRodada(rodada) {
  const apiKey = process.env.API_FOOTBALL_KEY;
  const apiHost = process.env.API_FOOTBALL_HOST || 'v3.football.api-sports.io';

  if (!apiKey) {
    throw new Error('API_FOOTBALL_KEY não configurada no .env');
  }

  try {
    console.log(`🌐 [API-Football] Buscando rodada ${rodada}...`);

    const response = await axios.get(`${API_BASE_URL}/fixtures`, {
      params: {
        league: LEAGUE_ID,
        season: SEASON,
        round: `Regular Season - ${rodada}`
      },
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': apiHost
      },
      timeout: 10000
    });

    if (response.data && response.data.response) {
      console.log(`✅ [API-Football] ${response.data.response.length} partidas encontradas`);
      return response.data;
    }

    throw new Error('Resposta sem dados');
  } catch (error) {
    console.error(`❌ [API-Football] Erro:`, error.response?.data || error.message);
    throw error;
  }
}

/**
 * Busca partidas ao vivo do Brasileirão
 * @returns {Promise<object>} Dados brutos da API
 */
async function buscarPartidasAoVivo() {
  const apiKey = process.env.API_FOOTBALL_KEY;
  const apiHost = process.env.API_FOOTBALL_HOST || 'v3.football.api-sports.io';

  if (!apiKey) {
    throw new Error('API_FOOTBALL_KEY não configurada no .env');
  }

  try {
    console.log(`🌐 [API-Football] Buscando partidas ao vivo...`);

    const response = await axios.get(`${API_BASE_URL}/fixtures`, {
      params: {
        league: LEAGUE_ID,
        season: SEASON,
        live: 'all'
      },
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': apiHost
      },
      timeout: 10000
    });

    if (response.data && response.data.response) {
      console.log(`✅ [API-Football] ${response.data.response.length} partidas ao vivo`);
      return response.data;
    }

    return { response: [] };
  } catch (error) {
    console.error(`❌ [API-Football] Erro ao buscar ao vivo:`, error.response?.data || error.message);
    throw error;
  }
}

/**
 * Busca detalhes de uma partida específica por ID
 * @param {number} fixtureId - ID da partida na API-Football
 * @returns {Promise<object>} Dados da partida
 */
async function buscarPartidaPorId(fixtureId) {
  const apiKey = process.env.API_FOOTBALL_KEY;
  const apiHost = process.env.API_FOOTBALL_HOST || 'v3.football.api-sports.io';

  if (!apiKey) {
    throw new Error('API_FOOTBALL_KEY não configurada no .env');
  }

  try {
    console.log(`🌐 [API-Football] Buscando partida ${fixtureId}...`);

    const response = await axios.get(`${API_BASE_URL}/fixtures`, {
      params: {
        id: fixtureId
      },
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': apiHost
      },
      timeout: 10000
    });

    if (response.data && response.data.response && response.data.response.length > 0) {
      console.log(`✅ [API-Football] Partida encontrada`);
      return response.data.response[0];
    }

    throw new Error('Partida não encontrada');
  } catch (error) {
    console.error(`❌ [API-Football] Erro ao buscar partida:`, error.response?.data || error.message);
    throw error;
  }
}

/**
 * Verifica status da API (requests restantes)
 * @returns {Promise<object>} Informações sobre uso da API
 */
async function verificarStatusApi() {
  const apiKey = process.env.API_FOOTBALL_KEY;
  const apiHost = process.env.API_FOOTBALL_HOST || 'v3.football.api-sports.io';

  if (!apiKey) {
    throw new Error('API_FOOTBALL_KEY não configurada no .env');
  }

  try {
    const response = await axios.get(`${API_BASE_URL}/status`, {
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': apiHost
      },
      timeout: 5000
    });

    return response.data;
  } catch (error) {
    console.error(`❌ [API-Football] Erro ao verificar status:`, error.message);
    throw error;
  }
}

module.exports = {
  buscarRodada,
  buscarPartidasAoVivo,
  buscarPartidaPorId,
  verificarStatusApi,
  LEAGUE_ID,
  SEASON
};
