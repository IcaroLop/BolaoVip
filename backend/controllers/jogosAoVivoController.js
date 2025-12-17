const { buscarJogosAoVivo } = require('../services/jogosAoVivoScraper');

async function listarJogosAoVivo(req, res) {
  try {
    console.log('[DEBUG] listarJogosAoVivo chamado');
    const jogos = await buscarJogosAoVivo();
    console.log('[DEBUG] jogos retornados:', jogos.length);
    res.json(jogos);
  } catch (error) {
    console.error('[ERROR] listarJogosAoVivo error:', error.message);
    console.error(error);
    res.status(500).json({ erro: 'Erro ao buscar jogos ao vivo' });
  }
}

module.exports = { listarJogosAoVivo };
