const express = require('express');
const router = express.Router();
const axios = require('axios');
const { obterCampeonatoPreferido, obterTokenApiFutebol } = require('../services/apiFutebolHelper');

router.get('/rodada', async (req, res) => {
  try {
    const numeroRodada = parseInt(req.query.rodada || req.query.numeroRodada || '10', 10);
    const token = obterTokenApiFutebol();
    const { urlBase } = await obterCampeonatoPreferido();

    const response = await axios.get(`${urlBase}/rodadas/${numeroRodada}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const jogos = response.data.partidas.map(jogo => ({
      fixture: {
        id: jogo.partida_id,
        date: jogo.data_realizacao
      },
      teams: {
        home: { name: jogo.time_mandante.nome_popular },
        away: { name: jogo.time_visitante.nome_popular }
      }
    }));

    res.json(jogos);
  } catch (err) {
    console.error('Erro ao buscar jogos da rodada:', err.message);
    res.status(500).json({ erro: 'Erro ao buscar jogos da rodada' });
  }
});

module.exports = router;
