const pool = require('../database/conexao');

// Listar todos os times disponíveis
exports.listarTimes = async (req, res) => {
  try {
    const [times] = await pool.query(`
      SELECT id, nome, escudo_url 
      FROM times 
      ORDER BY nome ASC
    `);
    
    res.json(times);
  } catch (erro) {
    console.error('Erro ao listar times:', erro);
    res.status(500).json({ erro: 'Erro ao buscar times' });
  }
};

// Buscar time favorito do usuário autenticado
exports.buscarTimeFavorito = async (req, res) => {
  try {
    const id_usuario = req.usuario.id;
    
    const [resultado] = await pool.query(`
      SELECT t.id, t.nome, t.escudo_url
      FROM usuarios u
      LEFT JOIN times t ON u.time_favorito_id = t.id
      WHERE u.id = ?
    `, [id_usuario]);
    
    if (resultado.length === 0) {
      return res.status(404).json({ erro: 'Usuário não encontrado' });
    }
    
    // Se não tiver time favorito, retorna null
    const timeFavorito = resultado[0].id ? {
      id: resultado[0].id,
      nome: resultado[0].nome,
      escudo_url: resultado[0].escudo_url
    } : null;
    
    res.json({ timeFavorito });
  } catch (erro) {
    console.error('Erro ao buscar time favorito:', erro);
    res.status(500).json({ erro: 'Erro ao buscar time favorito' });
  }
};

// Atualizar time favorito do usuário autenticado
exports.atualizarTimeFavorito = async (req, res) => {
  try {
    const id_usuario = req.usuario.id;
    const { time_id } = req.body;
    
    // Validar que o time existe (se não for null)
    if (time_id !== null && time_id !== undefined) {
      const [timeExiste] = await pool.query(
        'SELECT id FROM times WHERE id = ?',
        [time_id]
      );
      
      if (timeExiste.length === 0) {
        return res.status(400).json({ erro: 'Time não encontrado' });
      }
    }
    
    // Atualizar time favorito do usuário
    await pool.query(
      'UPDATE usuarios SET time_favorito_id = ? WHERE id = ?',
      [time_id || null, id_usuario]
    );
    
    // Buscar dados atualizados do time
    let timeFavorito = null;
    if (time_id) {
      const [time] = await pool.query(
        'SELECT id, nome, escudo_url FROM times WHERE id = ?',
        [time_id]
      );
      timeFavorito = time[0];
    }
    
    res.json({ 
      mensagem: 'Time favorito atualizado com sucesso',
      timeFavorito 
    });
  } catch (erro) {
    console.error('Erro ao atualizar time favorito:', erro);
    res.status(500).json({ erro: 'Erro ao atualizar time favorito' });
  }
};
