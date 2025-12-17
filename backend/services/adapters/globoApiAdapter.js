/**
 * Adapter para API Globo (não oficial)
 * Fonte: api.api-one.globo.com e ge.globo.com
 * ATENÇÃO: Esta é uma API não documentada e pode mudar sem aviso
 */

const axios = require('axios');

const GLOBO_API_BASE = 'https://api.api-one.globo.com';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/**
 * Busca fixtures do Brasileirão de uma data específica
 * @param {string} data - Data no formato YYYY-MM-DD
 * @returns {Promise<object>} Dados brutos
 */
async function buscarPorData(data) {
  try {
    console.log(`🌐 [Globo API] Buscando partidas de ${data}...`);

    const response = await axios.get(`${GLOBO_API_BASE}/fixtures`, {
      params: {
        date: data,
        league: 'brasileiro-serie-a'
      },
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/json'
      },
      timeout: 10000
    });

    if (response.data) {
      const fixtures = Array.isArray(response.data) ? response.data : [response.data];
      console.log(`✅ [Globo API] ${fixtures.length} partidas encontradas`);
      return fixtures;
    }

    return [];
  } catch (error) {
    console.error(`❌ [Globo API] Erro ao buscar por data:`, error.response?.status || error.message);
    throw error;
  }
}

/**
 * Busca partidas de uma rodada específica
 * @param {number} rodada - Número da rodada (1-38)
 * @returns {Promise<array>} Array de partidas
 */
async function buscarRodada(rodada) {
  try {
    console.log(`🌐 [Globo API] Buscando rodada ${rodada}...`);

    // A API da Globo usa endpoint diferente para rodadas
    const response = await axios.get(`${GLOBO_API_BASE}/fixtures`, {
      params: {
        league: 'brasileiro-serie-a',
        round: rodada,
        season: 2024
      },
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/json'
      },
      timeout: 10000
    });

    if (response.data) {
      const fixtures = Array.isArray(response.data) ? response.data : [response.data];
      console.log(`✅ [Globo API] ${fixtures.length} partidas encontradas`);
      return fixtures;
    }

    return [];
  } catch (error) {
    console.error(`❌ [Globo API] Erro ao buscar rodada:`, error.response?.status || error.message);
    throw error;
  }
}

/**
 * Busca partidas ao vivo
 * @returns {Promise<array>} Array de partidas ao vivo
 */
async function buscarPartidasAoVivo() {
  try {
    console.log(`🌐 [Globo API] Buscando partidas ao vivo...`);

    const response = await axios.get(`${GLOBO_API_BASE}/fixtures`, {
      params: {
        league: 'brasileiro-serie-a',
        status: 'live'
      },
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/json'
      },
      timeout: 10000
    });

    if (response.data) {
      const fixtures = Array.isArray(response.data) ? response.data : [response.data];
      console.log(`✅ [Globo API] ${fixtures.length} partidas ao vivo`);
      return fixtures;
    }

    return [];
  } catch (error) {
    console.error(`❌ [Globo API] Erro ao buscar ao vivo:`, error.message);
    throw error;
  }
}

/**
 * Método alternativo: scraping do GE.com
 * @param {number} rodada - Número da rodada
 * @returns {Promise<array>} Array de partidas
 */
async function buscarRodadaGE(rodada) {
  try {
    console.log(`🌐 [GE Scraper] Buscando rodada ${rodada}...`);

    // URL do GE para rodada específica
    const url = `https://ge.globo.com/futebol/brasileirao-serie-a/`;
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html'
      },
      timeout: 15000
    });

    // Aqui seria necessário parsing HTML com cheerio
    // Por enquanto, retorna vazio como fallback
    console.warn(`⚠️ [GE Scraper] Scraping HTML não implementado nesta versão`);
    return [];
  } catch (error) {
    console.error(`❌ [GE Scraper] Erro:`, error.message);
    throw error;
  }
}

/**
 * Busca classificação do Brasileirão
 * @returns {Promise<object>} Dados da classificação
 */
async function buscarClassificacao() {
  try {
    console.log(`🌐 [Globo API] Buscando classificação...`);

    const response = await axios.get(`${GLOBO_API_BASE}/standings`, {
      params: {
        league: 'brasileiro-serie-a',
        season: 2024
      },
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/json'
      },
      timeout: 10000
    });

    if (response.data) {
      console.log(`✅ [Globo API] Classificação obtida`);
      return response.data;
    }

    return null;
  } catch (error) {
    console.error(`❌ [Globo API] Erro ao buscar classificação:`, error.message);
    throw error;
  }
}

/**
 * Tenta múltiplos endpoints da Globo como fallback
 * @param {number} rodada - Número da rodada
 * @returns {Promise<array>} Array de partidas
 */
async function buscarRodadaComFallback(rodada) {
  // Tenta primeiro o endpoint principal
  try {
    const dados = await buscarRodada(rodada);
    if (dados && dados.length > 0) return dados;
  } catch (err) {
    console.warn(`⚠️ [Globo API] Endpoint principal falhou, tentando alternativas...`);
  }

  // Fallback: busca por data estimada (rodadas normalmente são aos finais de semana)
  try {
    const hoje = new Date();
    const dataFormatada = hoje.toISOString().split('T')[0];
    return await buscarPorData(dataFormatada);
  } catch (err) {
    console.warn(`⚠️ [Globo API] Fallback por data falhou`);
  }

  // Última tentativa: scraping
  try {
    return await buscarRodadaGE(rodada);
  } catch (err) {
    console.error(`❌ [Globo API] Todos os métodos falharam`);
    throw new Error('Não foi possível buscar dados da API Globo');
  }
}

module.exports = {
  buscarRodada,
  buscarPorData,
  buscarPartidasAoVivo,
  buscarClassificacao,
  buscarRodadaComFallback,
  buscarRodadaGE
};
