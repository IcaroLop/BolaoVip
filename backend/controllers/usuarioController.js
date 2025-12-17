const pool = require('../database/conexao');

exports.listarUsuarios = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, nome, email FROM usuarios ORDER BY nome ASC`
    );
    res.json(rows);
  } catch (err) {
    console.error('Erro ao listar usuários:', err.message);
    res.status(500).json({ erro: 'Erro ao listar usuários' });
  }
};

exports.listarUsuariosComPerfis = async (req, res) => {
  try {
    const [usuarios] = await pool.query(
      `SELECT u.id, u.nome, u.email FROM usuarios u ORDER BY u.nome ASC`
    );

    const usuariosComPerfis = await Promise.all(
      usuarios.map(async (u) => {
        const [perfis] = await pool.query(
          `SELECT p.id, p.nome, p.descricao FROM perfis p
           JOIN usuario_perfis up ON up.perfil_id = p.id
           WHERE up.usuario_id = ? ORDER BY p.nome ASC`,
          [u.id]
        );
        return { ...u, perfis };
      })
    );

    res.json(usuariosComPerfis);
  } catch (err) {
    console.error('Erro ao listar usuários com perfis:', err.message);
    res.status(500).json({ erro: 'Erro ao listar usuários com perfis' });
  }
};

exports.obterUsuario = async (req, res) => {
  const { id } = req.params;
  try {
    const [usuarios] = await pool.query(
      `SELECT id, nome, email FROM usuarios WHERE id = ? LIMIT 1`,
      [id]
    );

    if (usuarios.length === 0) {
      return res.status(404).json({ erro: 'Usuário não encontrado.' });
    }

    const usuario = usuarios[0];

    const [perfis] = await pool.query(
      `SELECT p.id, p.nome, p.descricao FROM perfis p
       JOIN usuario_perfis up ON up.perfil_id = p.id
       WHERE up.usuario_id = ? ORDER BY p.nome ASC`,
      [id]
    );

    res.json({ ...usuario, perfis });
  } catch (err) {
    console.error('Erro ao obter usuário:', err.message);
    res.status(500).json({ erro: 'Erro ao obter usuário' });
  }
};

exports.atualizarUsuario = async (req, res) => {
  const { id } = req.params;
  const { nome, email, perfis } = req.body;

  if (!nome && !email && !perfis) {
    return res.status(400).json({ erro: 'Envie "nome", "email" ou "perfis" para atualizar.' });
  }

  const conexao = await pool.getConnection();
  try {
    await conexao.beginTransaction();

    if (nome || email) {
      const campos = [];
      const valores = [];
      if (nome) {
        campos.push('nome = ?');
        valores.push(nome);
      }
      if (email) {
        campos.push('email = ?');
        valores.push(email);
      }
      valores.push(id);

      const sql = `UPDATE usuarios SET ${campos.join(', ')} WHERE id = ?`;
      await conexao.query(sql, valores);
    }

    if (Array.isArray(perfis) && perfis.length > 0) {
      // Remove perfis antigos
      await conexao.query(`DELETE FROM usuario_perfis WHERE usuario_id = ?`, [id]);

      // Adiciona novos perfis
      for (const perfilId of perfis) {
        await conexao.query(
          `INSERT INTO usuario_perfis (usuario_id, perfil_id) VALUES (?, ?)`,
          [id, perfilId]
        );
      }
    }

    await conexao.commit();

    res.json({ mensagem: 'Usuário atualizado com sucesso.', id, nome, email, perfis });
  } catch (err) {
    await conexao.rollback();
    console.error('Erro ao atualizar usuário:', err.message);
    res.status(500).json({ erro: 'Erro ao atualizar usuário', detalhes: err.message });
  } finally {
    conexao.release();
  }
};

exports.listarPerfis = async (req, res) => {
  try {
    const [perfis] = await pool.query(
      `SELECT id, nome, descricao FROM perfis ORDER BY nome ASC`
    );
    res.json(perfis);
  } catch (err) {
    console.error('Erro ao listar perfis:', err.message);
    res.status(500).json({ erro: 'Erro ao listar perfis' });
  }
};

exports.obterUsuarioAutenticado = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    
    const [usuarios] = await pool.query(
      `SELECT id, nome, email, chave_pix FROM usuarios WHERE id = ? LIMIT 1`,
      [usuarioId]
    );

    if (usuarios.length === 0) {
      return res.status(404).json({ erro: 'Usuário não encontrado.' });
    }

    res.json(usuarios[0]);
  } catch (err) {
    console.error('Erro ao obter usuário autenticado:', err.message);
    res.status(500).json({ erro: 'Erro ao obter dados do usuário' });
  }
};
