const { buscarTabelaClassificacao, salvarClassificacaoNoBanco } = require('../services/consultaTabelaClassificacao');


const CAMPEONATO_ID = 10;

let isAtualizandoClassificacao = false;

async function atualizarClassificacaoAutomatico() {
  if (isAtualizandoClassificacao) {
    console.log(`⚠️ Ignorando atualização duplicada da classificação, já está em andamento.`);
    return;
  }
  isAtualizandoClassificacao = true;

  try {
    console.log(`🔄 Atualizando tabela de classificação...`);
    const tabelaData = await buscarTabelaClassificacao(CAMPEONATO_ID);
    await salvarClassificacaoNoBanco(CAMPEONATO_ID, tabelaData);
    console.log(`✅ Classificação atualizada com sucesso.`);
  } catch (err) {
    console.error(`❌ Erro ao atualizar classificação:`, err.response?.data || err.message);
  } finally {
    isAtualizandoClassificacao = false;
  }
}
atualizarClassificacaoAutomatico();