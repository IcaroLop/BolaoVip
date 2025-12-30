const express = require('express');
const router = express.Router();
const pool = require('../database/conexao');

// GET /palpites/jogo/:jogoId/grupo - Retorna todos os palpites do grupo para um jogo específico
router.get('/jogo/:jogoId/grupo', async (req, res) => {
  try {
    const partidaId = Number(req.params.jogoId); // Na verdade é partida_id do jogo
    const grupoId = req.query.grupoId || req.query.grupo_id;
    const campeonatoId = req.query.campeonatoId || req.query.campeonato_id;

    if (!grupoId) {
      return res.status(400).json({ erro: 'grupoId é obrigatório' });
    }

    // Primeiro, encontrar o id interno do jogo pela partida_id
    const [jogoRows] = await pool.query(`
      SELECT id, partida_id, campeonato_id, rodada
      FROM jogos 
      WHERE partida_id = ?
      LIMIT 1
    `, [partidaId]);

    if (jogoRows.length === 0) {
      return res.json([]);
    }

    const jogo = jogoRows[0];

    const where = ['p.id_jogo = ?', 'p.grupo_id = ?'];
    const params = [jogo.id, Number(grupoId)];

    if (campeonatoId) {
      where.push('p.campeonato_id = ?');
      params.push(Number(campeonatoId));
    }

    // Buscar palpites do grupo + pontos da tabela ranking_pontos_partida
    const [rows] = await pool.query(`
      SELECT 
        p.id_usuario,
        u.nome,
        p.gols_casa AS palpite_casa,
        p.gols_fora AS palpite_fora,
        p.id_jogo,
        p.rodada,
        j.partida_id,
        COALESCE(rpp.pontos, 0) AS pontos
      FROM palpites p
      JOIN usuarios u ON u.id = p.id_usuario
      LEFT JOIN jogos j ON j.id = p.id_jogo
      LEFT JOIN ranking_pontos_partida rpp ON rpp.usuario_id = p.id_usuario 
        AND rpp.partida_id = j.partida_id 
        AND rpp.rodada = p.rodada
        AND rpp.grupo_id = p.grupo_id
      WHERE ${where.join(' AND ')}
      ORDER BY COALESCE(rpp.pontos, 0) DESC, u.nome ASC
    `, params);

    res.json(rows);
  } catch (err) {
    console.error('❌ Erro ao buscar palpites do grupo para o jogo:', err.message);
    res.status(500).json({ erro: 'Erro ao buscar palpites do jogo' });
  }
});

module.exports = router;
