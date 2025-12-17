// Temporariamente desabilitado: não realizar chamadas ao endpoint ao-vivo da API-Futebol
// Mantemos a assinatura das funções para não quebrar rotas/controladores.
// Quando quiser reativar, restaure a chamada HTTP e o contador.
const axios = null;
const { obterTokenApiFutebol, registrarRequisicaoApiFutebol } = require('./apiFutebolHelper');

async function buscarJogosAoVivo() {
  // Versão temporária: não faz requisição externa e retorna lista vazia
  console.log('[SCRAPER] buscarJogosAoVivo desabilitado temporariamente. Retornando lista vazia.');
  return [];
}

async function buscarJogosAoVivoComFallback() {
  // Mantém comportamento consistente enquanto desabilitado
  return await buscarJogosAoVivo();
}

module.exports = { buscarJogosAoVivo, buscarJogosAoVivoComFallback };
