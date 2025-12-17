const pool = require('../database/conexao');

exports.listarCampeonatos = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT campeonato_id AS id, nome, nome_popular AS nomePopular, tipo, status, logo, regiao, temporada
       FROM campeonatos
       ORDER BY nome_popular IS NULL, nome_popular, nome`
    );
    res.json(rows);
  } catch (err) {
    console.error('Erro ao listar campeonatos:', err.message);
    res.status(500).json({ erro: 'Erro ao listar campeonatos' });
  }
};
