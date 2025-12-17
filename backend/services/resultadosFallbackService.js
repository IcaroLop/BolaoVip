/**
 * Serviço de Fallback para Busca de Resultados
 * Tenta múltiplas fontes em sequência até obter dados válidos
 */

const apiFutebolOriginal = require('./consultaResultadosService');
const apiFutebolAdapter = require('./adapters/apiFutebolAdapter');
const footballDataAdapter = require('./adapters/footballDataAdapter');
const globoApiAdapter = require('./adapters/globoApiAdapter');
const { normalizarDados, validarDadosNormalizados } = require('./adapters/normalizadorDados');
const { obterCampeonatoPreferido, obterTokenApiFutebol, registrarRequisicaoApiFutebol } = require('./apiFutebolHelper');

// Configuração de prioridade das fontes
const FONTES_DISPONIVEIS = [
  {
    nome: 'api-futebol',
    descricao: 'API Futebol (api-futebol.com.br)',
    ativa: true,
    prioridade: 1,
    buscar: async (rodada) => {
      const axios = require('axios');
      const token = obterTokenApiFutebol();
      const { urlBase, id } = await obterCampeonatoPreferido();
      const response = await axios.get(`${urlBase}/rodadas/${rodada}`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000
      });
      await registrarRequisicaoApiFutebol();
      console.info(`ℹ️  Fonte api-futebol usando campeonato ${id} para rodada ${rodada}`);
      return response.data;
    }
  },
  // Demais fontes removidas por decisão: usaremos somente api-futebol
];

/**
 * Busca resultados de uma rodada usando estratégia de fallback
 * @param {number} rodada - Número da rodada (1-38)
 * @returns {Promise<object>} Objeto com dados normalizados e fonte utilizada
 */
async function buscarResultadosComFallback(rodada) {
  console.log(`\n🔍 Iniciando busca de resultados para rodada ${rodada} com fallback...`);

  // Filtra e ordena fontes ativas por prioridade
  const fontesAtivas = FONTES_DISPONIVEIS
    .filter(f => f.ativa)
    .sort((a, b) => a.prioridade - b.prioridade);

  const erros = [];

  for (const fonte of fontesAtivas) {
    try {
      console.log(`📡 Tentando fonte: ${fonte.descricao} (prioridade ${fonte.prioridade})...`);

      // Busca dados brutos da fonte
      const dadosBrutos = await fonte.buscar(rodada);

      // Normaliza para formato interno
      const dadosNormalizados = normalizarDados(dadosBrutos, fonte.nome);

      // Valida se os dados são consistentes
      if (validarDadosNormalizados(dadosNormalizados)) {
        console.log(`✅ Sucesso com ${fonte.descricao}! ${dadosNormalizados.length} partidas encontradas.`);
        
        return {
          sucesso: true,
          fonte: fonte.nome,
          descricaoFonte: fonte.descricao,
          rodada: rodada,
          partidas: dadosNormalizados,
          tentativas: erros.length + 1
        };
      } else {
        const erro = `Dados inválidos ou incompletos de ${fonte.descricao}`;
        console.warn(`⚠️ ${erro}`);
        erros.push({ fonte: fonte.nome, erro });
      }
    } catch (error) {
      const mensagemErro = error.response?.data?.message || error.message;
      console.error(`❌ Erro em ${fonte.descricao}: ${mensagemErro}`);
      erros.push({ fonte: fonte.nome, erro: mensagemErro });
    }
  }

  // Se chegou aqui, todas as fontes falharam
  console.error(`\n💥 FALHA COMPLETA: Todas as ${fontesAtivas.length} fontes falharam!`);
  
  return {
    sucesso: false,
    fonte: null,
    rodada: rodada,
    partidas: [],
    erros: erros,
    mensagem: 'Todas as fontes de dados falharam ou retornaram dados inválidos'
  };
}

/**
 * Busca partidas ao vivo de múltiplas fontes
 * @returns {Promise<array>} Array de partidas ao vivo normalizadas
 */
async function buscarPartidasAoVivoComFallback() {
  console.log(`\n🔴 Buscando partidas ao vivo com fallback...`);

  const fontes = [
    {
      nome: 'api-football',
      buscar: () => apiFutebolAdapter.buscarPartidasAoVivo()
    },
    {
      nome: 'globo',
      buscar: () => globoApiAdapter.buscarPartidasAoVivo()
    }
  ];

  for (const fonte of fontes) {
    try {
      const dados = await fonte.buscar();
      const normalizados = normalizarDados(dados, fonte.nome);
      
      if (normalizados.length > 0) {
        console.log(`✅ ${normalizados.length} partidas ao vivo encontradas em ${fonte.nome}`);
        return normalizados;
      }
    } catch (error) {
      console.error(`❌ Erro ao buscar ao vivo em ${fonte.nome}:`, error.message);
    }
  }

  console.log(`ℹ️ Nenhuma partida ao vivo encontrada`);
  return [];
}

/**
 * Testa conectividade de todas as fontes
 * @returns {Promise<object>} Status de cada fonte
 */
async function testarTodasAsFontes() {
  console.log(`\n🧪 Testando conectividade de todas as fontes...\n`);

  const resultados = [];

  for (const fonte of FONTES_DISPONIVEIS) {
    const resultado = {
      nome: fonte.nome,
      descricao: fonte.descricao,
      ativa: fonte.ativa,
      prioridade: fonte.prioridade,
      status: 'não testada',
      tempoResposta: null,
      erro: null
    };

    if (!fonte.ativa) {
      resultado.status = 'desativada';
      resultados.push(resultado);
      continue;
    }

    try {
      const inicio = Date.now();
      
      // Testa com rodada 1 como exemplo
      const dados = await fonte.buscar(1);
      const normalizados = normalizarDados(dados, fonte.nome);
      
      resultado.tempoResposta = Date.now() - inicio;
      resultado.partidasEncontradas = normalizados.length;
      resultado.status = validarDadosNormalizados(normalizados) ? 'funcionando' : 'dados inválidos';
      
      console.log(`✅ ${fonte.descricao}: ${resultado.status} (${resultado.tempoResposta}ms, ${resultado.partidasEncontradas} partidas)`);
    } catch (error) {
      resultado.status = 'erro';
      resultado.erro = error.message;
      console.error(`❌ ${fonte.descricao}: ${error.message}`);
    }

    resultados.push(resultado);
  }

  console.log(`\n📊 Resumo: ${resultados.filter(r => r.status === 'funcionando').length}/${FONTES_DISPONIVEIS.filter(f => f.ativa).length} fontes funcionando`);

  return resultados;
}

/**
 * Configura quais fontes estão ativas
 * @param {object} config - Objeto com nomes das fontes e valores booleanos
 */
function configurarFontes(config) {
  for (const fonte of FONTES_DISPONIVEIS) {
    if (config[fonte.nome] !== undefined) {
      fonte.ativa = config[fonte.nome];
      console.log(`⚙️ Fonte ${fonte.nome} ${fonte.ativa ? 'ativada' : 'desativada'}`);
    }
  }
}

/**
 * Obtém lista de fontes disponíveis e seu status
 * @returns {array} Array com informações das fontes
 */
function listarFontes() {
  return FONTES_DISPONIVEIS.map(f => ({
    nome: f.nome,
    descricao: f.descricao,
    ativa: f.ativa,
    prioridade: f.prioridade
  }));
}

module.exports = {
  buscarResultadosComFallback,
  buscarPartidasAoVivoComFallback,
  testarTodasAsFontes,
  configurarFontes,
  listarFontes
};
