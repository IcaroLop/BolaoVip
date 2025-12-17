const classificacaoService = require('../services/consultaTabelaClassificacao');
const pool = require('../database/conexao');

async function atualizarClassificacao(req, res) {
    const campeonatoId = req.params.campeonato_id;

    try {
        const tabelaData = await classificacaoService.buscarTabelaClassificacao(campeonatoId);
        await classificacaoService.salvarClassificacaoNoBanco(campeonatoId, tabelaData);
        res.json({ message: 'Classificação atualizada com sucesso.' });
    } catch (error) {
        console.error('Erro ao atualizar classificação:', error.response?.data || error.message);
        res.status(500).json({ message: 'Erro ao atualizar classificação.' });
    }
}

async function obterClassificacao(req, res) {
  const campeonatoId = req.params.campeonato_id;

  try {
    const [rows] = await pool.query(`
      SELECT posicao, pontos, time_id, nome_popular, sigla, escudo,
             jogos, vitorias, empates, derrotas, gols_pro, gols_contra,
             saldo_gols, aproveitamento, variacao_posicao, ultimos_jogos
      FROM classificacao
      WHERE campeonato_id = ?
      ORDER BY posicao ASC
    `, [campeonatoId]);

    res.json(rows);
  } catch (error) {
    console.error('❌ Erro ao obter classificação:', error.message);
    res.status(500).json({ message: 'Erro ao obter classificação' });
  }
}

module.exports = {
    atualizarClassificacao,
    obterClassificacao
};
