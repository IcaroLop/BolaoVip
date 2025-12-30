const pool = require('../database/conexao');
const bcrypt = require('bcrypt');

exports.criarUsuario = async (req, res) => {
  const { nome, email, senha, perfis } = req.body;

  if (!nome || !email || !senha) {
    return res.status(400).json({ erro: 'Nome, email e senha são obrigatórios.' });
  }

  const conexao = await pool.getConnection();
  try {
    await conexao.beginTransaction();

    // Verificar se email já existe
    const [usuariosExistentes] = await conexao.query(
      'SELECT * FROM usuarios WHERE email = ?',
      [email]
    );

    if (usuariosExistentes.length > 0) {
      await conexao.rollback();
      return res.status(400).json({ erro: 'Já existe um usuário com este email.' });
    }

    // Criar hash da senha (default 123456 se não fornecida)
    const senhaParaHash = senha || '123456';
    const hash = await bcrypt.hash(senhaParaHash, 10);

    // Inserir usuário com precisa_trocar_senha = TRUE
    const [result] = await conexao.query(
      'INSERT INTO usuarios (nome, email, senha_hash, precisa_trocar_senha) VALUES (?, ?, ?, 1)',
      [nome, email, hash]
    );

    const novoUsuarioId = result.insertId;

    // Adicionar perfis se fornecidos
    if (Array.isArray(perfis) && perfis.length > 0) {
      for (const perfilId of perfis) {
        await conexao.query(
          `INSERT INTO usuario_perfis (usuario_id, perfil_id) VALUES (?, ?)`,
          [novoUsuarioId, perfilId]
        );
      }
    }

    await conexao.commit();

    res.status(201).json({ 
      mensagem: 'Usuário criado com sucesso!', 
      id: novoUsuarioId, 
      nome, 
      email 
    });
  } catch (err) {
    await conexao.rollback();
    console.error('Erro ao criar usuário:', err.message);
    res.status(500).json({ erro: 'Erro ao criar usuário', detalhes: err.message });
  } finally {
    conexao.release();
  }
};

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
      `SELECT u.id, u.nome, u.email, u.bloqueado FROM usuarios u ORDER BY u.nome ASC`
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
      `SELECT id, nome, email, bloqueado FROM usuarios WHERE id = ? LIMIT 1`,
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

    const usuario = usuarios[0];

    // Buscar perfis do usuário
    const [perfis] = await pool.query(
      `SELECT p.id, p.nome, p.descricao FROM perfis p
       JOIN usuario_perfis up ON up.perfil_id = p.id
       WHERE up.usuario_id = ? ORDER BY p.nome ASC`,
      [usuarioId]
    );

    res.json({ 
      ...usuario, 
      perfis: perfis.map(p => ({ id: p.id, nome: p.nome }))
    });
  } catch (err) {
    console.error('Erro ao obter usuário autenticado:', err.message);
    res.status(500).json({ erro: 'Erro ao obter dados do usuário' });
  }
};

exports.bloquearUsuario = async (req, res) => {
  const { id } = req.params;

  console.log('🔒 Tentativa de alternar bloqueio do usuário ID:', id);

  if (!id) {
    return res.status(400).json({ erro: 'ID do usuário é obrigatório.' });
  }

  const conexao = await pool.getConnection();
  try {
    await conexao.beginTransaction();

    // Verificar se usuário existe e obter estado atual de bloqueio
    const [usuarios] = await conexao.query(
      'SELECT id, nome, bloqueado FROM usuarios WHERE id = ?',
      [id]
    );

    if (usuarios.length === 0) {
      await conexao.rollback();
      console.log('❌ Usuário não encontrado:', id);
      return res.status(404).json({ erro: 'Usuário não encontrado.' });
    }

    const usuario = usuarios[0];
    const estaBloqueado = usuario.bloqueado === 1;

    console.log('✅ Usuário encontrado:', usuario.nome, '- Bloqueado:', estaBloqueado);

    if (estaBloqueado) {
      // DESBLOQUEAR: senha padrão 123456 + precisa_trocar_senha = 1
      const senhaPadrao = '123456';
      const hash = await bcrypt.hash(senhaPadrao, 10);

      await conexao.query(
        'UPDATE usuarios SET senha_hash = ?, bloqueado = 0, precisa_trocar_senha = 1 WHERE id = ?',
        [hash, id]
      );

      await conexao.commit();
      console.log('🔓 Usuário desbloqueado:', usuario.nome);

      res.json({ 
        mensagem: `Usuário "${usuario.nome}" desbloqueado com sucesso! Senha padrão: 123456`,
        id: usuario.id,
        acao: 'desbloquear'
      });
    } else {
      // BLOQUEAR: senha 654321 + bloqueado = 1 (não altera precisa_trocar_senha)
      const senhaBloqueio = '654321';
      const hash = await bcrypt.hash(senhaBloqueio, 10);

      await conexao.query(
        'UPDATE usuarios SET senha_hash = ?, bloqueado = 1 WHERE id = ?',
        [hash, id]
      );

      await conexao.commit();
      console.log('🔒 Usuário bloqueado:', usuario.nome);

      res.json({ 
        mensagem: `Usuário "${usuario.nome}" bloqueado com sucesso!`,
        id: usuario.id,
        acao: 'bloquear'
      });
    }
  } catch (err) {
    await conexao.rollback();
    console.error('❌ Erro ao alternar bloqueio:', err.message);
    res.status(500).json({ erro: 'Erro ao alternar bloqueio do usuário', detalhes: err.message });
  } finally {
    conexao.release();
  }
};

