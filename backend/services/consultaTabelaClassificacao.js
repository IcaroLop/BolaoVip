const axios = require('axios');
const db = require('../database/conexao'); // ajuste conforme seu projeto
const tokenConfig = require('../config/tokenConfig');
const { registrarRequisicaoApiFutebol } = require('./apiFutebolHelper');

async function buscarTabelaClassificacao(campeonatoId) {
    const API_URL = `https://api.api-futebol.com.br/v1/campeonatos/${campeonatoId}/tabela`;
    const TOKEN = tokenConfig.getToken();

    const response = await axios.get(API_URL, {
        headers: { Authorization: `Bearer ${TOKEN}` }
    });

    await registrarRequisicaoApiFutebol();

    return response.data;
}

async function salvarClassificacaoNoBanco(campeonatoId, tabelaData) {
    const fase = Object.keys(tabelaData)[0];
    //const grupoPrincipal = tabelaData[fase]['grupo-principal'];
    const grupoPrincipal = tabelaData;

    for (const item of grupoPrincipal) {
        const ultimosJogosStr = item.ultimos_jogos.join('');

        await db.query(`
    INSERT INTO classificacao (
        campeonato_id, fase, grupo, posicao, pontos, time_id, nome_popular, sigla, escudo,
        jogos, vitorias, empates, derrotas, gols_pro, gols_contra, saldo_gols,
        aproveitamento, variacao_posicao, ultimos_jogos
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
        posicao = VALUES(posicao),
        pontos = VALUES(pontos),
        jogos = VALUES(jogos),
        vitorias = VALUES(vitorias),
        empates = VALUES(empates),
        derrotas = VALUES(derrotas),
        gols_pro = VALUES(gols_pro),
        gols_contra = VALUES(gols_contra),
        saldo_gols = VALUES(saldo_gols),
        aproveitamento = VALUES(aproveitamento),
        variacao_posicao = VALUES(variacao_posicao),
        ultimos_jogos = VALUES(ultimos_jogos)
`, [
    campeonatoId,
    fase,
    'grupo-principal',
    item.posicao,
    item.pontos,
    item.time.time_id,
    item.time.nome_popular,
    item.time.sigla,
    item.time.escudo,
    item.jogos,
    item.vitorias,
    item.empates,
    item.derrotas,
    item.gols_pro,
    item.gols_contra,
    item.saldo_gols,
    item.aproveitamento,
    item.variacao_posicao,
    ultimosJogosStr
]);

    }
}

module.exports = {
    buscarTabelaClassificacao,
    salvarClassificacaoNoBanco
};
