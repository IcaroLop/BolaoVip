const express = require('express');
const axios = require('axios');
const router = express.Router();

router.get('/:nome', async (req, res) => {
  const nomeArquivo = req.params.nome;
  const url = `https://cdn.api-futebol.com.br/times/escudos/${nomeArquivo}`;

  try {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    res.set('Content-Type', 'image/svg+xml');
    res.send(response.data);
  } catch (err) {
    console.error('Erro ao buscar escudo:', err.message);
    res.status(500).send('Erro ao buscar escudo');
  }
});

module.exports = router;
