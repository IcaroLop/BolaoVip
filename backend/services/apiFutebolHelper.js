const axios = require('axios');
const pool = require('../database/conexao');
const tokenConfig = require('../config/tokenConfig');

const API_BASE = 'https://api.api-futebol.com.br/v1';
// Ordem de preferência de campeonatos para chamadas genéricas
// 69 = Premier League (ajuste de fuso necessário)
// 10 = Série A, 14 = Série B
const PREFERENCIAS_CAMPEONATO = [69, 10, 14];
let cacheCampeonato = null;
let cacheMomento = 0;
const CACHE_MS = 15 * 60 * 1000;

function obterTokenApiFutebol() {
  const token = process.env.API_FUTEBOL_TOKEN || process.env.API_FUTEBOL_DEV_TOKEN || 'test_e96621e3083f00ec1f644199091a46';
  return token;
}

async function registrarRequisicaoApiFutebol() {
  try {
    if (tokenConfig.currentEnvironment !== 'production') return; // Conta apenas em produção
    await pool.query(
      'UPDATE configuracoes SET requisicoes_api_futebol = COALESCE(requisicoes_api_futebol, 0) + 1 LIMIT 1'
    );
  } catch (err) {
    console.warn('[apiFutebolHelper] Não foi possível registrar requisição da API-Futebol:', err.message);
  }
}

async function listarCampeonatos(token) {
  const res = await axios.get(`${API_BASE}/campeonatos`, {
    headers: { Authorization: `Bearer ${token}` },
    timeout: 8000,
  });
  return res.data || [];
}

function escolherCampeonatoDisponivel(lista) {
  for (const idPreferido of PREFERENCIAS_CAMPEONATO) {
    const encontrado = lista.find((c) => c.campeonato_id === idPreferido || c.id === idPreferido);
    if (encontrado) return encontrado;
  }
  return lista[0] || null;
}

async function obterCampeonatoPreferido() {
  const agora = Date.now();
  if (cacheCampeonato && agora - cacheMomento < CACHE_MS) {
    return cacheCampeonato;
  }

  const token = obterTokenApiFutebol();
  try {
    await registrarRequisicaoApiFutebol();
    const campeonatos = await listarCampeonatos(token);
    const escolhido = escolherCampeonatoDisponivel(campeonatos);
    if (escolhido) {
      cacheCampeonato = {
        id: escolhido.campeonato_id || escolhido.id,
        nome: escolhido.nome_popular || escolhido.nome || 'Campeonato',
        urlBase: `${API_BASE}/campeonatos/${escolhido.campeonato_id || escolhido.id}`,
      };
      cacheMomento = agora;
      console.info(`ℹ️  Campeonato selecionado: ${cacheCampeonato.nome} (id ${cacheCampeonato.id})`);
      return cacheCampeonato;
    }
  } catch (err) {
    console.warn('⚠️  Falha ao listar campeonatos (api-futebol):', err.response?.status || err.code || err.message);
  }

  const fallbackId = PREFERENCIAS_CAMPEONATO[0];
  cacheCampeonato = {
    id: fallbackId,
    nome: 'Campeonato (fallback) 10',
    urlBase: `${API_BASE}/campeonatos/${fallbackId}`,
  };
  cacheMomento = agora;
  return cacheCampeonato;
}

module.exports = {
  obterTokenApiFutebol,
  obterCampeonatoPreferido,
  registrarRequisicaoApiFutebol,
};
