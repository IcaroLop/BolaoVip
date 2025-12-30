const pool = require('../database/conexao');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

exports.login = async (req, res) => {
  const { email, senha } = req.body;

  try {
    const [usuarios] = await pool.query(
      'SELECT * FROM usuarios WHERE email = ?',
      [email]
    );

    if (!usuarios || usuarios.length === 0) {
      return res.status(401).json({ erro: 'Email ou senha inválidos' });
    }

    const usuario = usuarios[0];

    // Verificar se usuário está bloqueado
    if (usuario.bloqueado === 1) {
      return res.status(403).json({ 
        erro: 'Usuário bloqueado' 
      });
    }

    const senhaCorreta = await bcrypt.compare(senha, usuario.senha_hash);
    if (!senhaCorreta) {
      return res.status(401).json({ erro: 'Email ou senha inválidos' });
    }

    // Token curto (1 dia)
    const token = jwt.sign(
      { id: usuario.id, nome: usuario.nome },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    // Refresh token longo (30 dias)
    const refreshToken = jwt.sign(
      { id: usuario.id },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    // Salvar refresh token no banco
    await pool.query(
      'UPDATE usuarios SET refresh_token = ? WHERE id = ?',
      [refreshToken, usuario.id]
    );

    res.json({ 
      token, 
      refreshToken,
      nome: usuario.nome,
      precisa_trocar_senha: usuario.precisa_trocar_senha === 1 || usuario.precisa_trocar_senha === true,
      expiresIn: 86400 // 1 dia em segundos
    });
  } catch (err) {
    console.error('Erro no login:', err);
    res.status(500).json({ erro: 'Erro ao fazer login', detalhes: err.message });
  }
};

exports.cadastro = async (req, res) => {
  const { nome, email, senha } = req.body;
  console.log('➡️ Requisição recebida no cadastro:', req.body);

  try {
    const [usuariosExistentes] = await pool.query(
      'SELECT * FROM usuarios WHERE email = ?',
      [email]
    );

    if (usuariosExistentes.length > 0) {
      return res
        .status(400)
        .json({ erro: 'Já existe um usuário com este email.' });
    }

    const hash = await bcrypt.hash(senha, 10);

    await pool.query(
      'INSERT INTO usuarios (nome, email, senha_hash) VALUES (?, ?, ?)',
      [nome, email, hash]
    );

    res.status(201).json({ mensagem: 'Usuário cadastrado com sucesso!' });
  } catch (err) {
    console.error('Erro no cadastro:', err.message);
    res
      .status(500)
      .json({ erro: 'Erro ao cadastrar usuário', detalhes: err.message });
  }
};

// Renovar token usando refresh token
exports.refresh = async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ erro: 'Refresh token não fornecido' });
  }

  try {
    // Verificar refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    const usuarioId = decoded.id;

    // Buscar usuário e verificar se o refresh token salvo corresponde
    const [usuarios] = await pool.query(
      'SELECT id, nome, refresh_token FROM usuarios WHERE id = ?',
      [usuarioId]
    );

    if (!usuarios || usuarios.length === 0 || usuarios[0].refresh_token !== refreshToken) {
      return res.status(401).json({ erro: 'Refresh token inválido ou expirado' });
    }

    const usuario = usuarios[0];

    // Gerar novo token curto (1 dia)
    const novoToken = jwt.sign(
      { id: usuario.id, nome: usuario.nome },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({ 
      token: novoToken,
      expiresIn: 86400 // 1 dia em segundos
    });
  } catch (err) {
    console.error('Erro ao renovar token:', err.message);
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ erro: 'Refresh token expirado. Faça login novamente.' });
    }
    res.status(403).json({ erro: 'Refresh token inválido' });
  }
};

// Logout
exports.logout = async (req, res) => {
  try {
    const usuarioId = req.usuario?.id;
    
    if (usuarioId) {
      // Limpar refresh token do banco
      await pool.query(
        'UPDATE usuarios SET refresh_token = NULL WHERE id = ?',
        [usuarioId]
      );
    }

    res.json({ mensagem: 'Logout realizado com sucesso' });
  } catch (err) {
    console.error('Erro no logout:', err);
    res.status(500).json({ erro: 'Erro ao fazer logout', detalhes: err.message });
  }
};

// Trocar senha do usuário logado
exports.trocarSenha = async (req, res) => {
  const { senhaAtual, novaSenha } = req.body;
  const usuarioId = req.usuario.id;

  try {
    // Validar campos obrigatórios
    if (!senhaAtual || !novaSenha) {
      return res.status(400).json({ erro: 'Senha atual e nova senha são obrigatórias' });
    }

    // Validar complexidade da nova senha
    const senhaRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
    if (!senhaRegex.test(novaSenha)) {
      return res.status(400).json({ 
        erro: 'A nova senha deve conter pelo menos 8 caracteres, incluindo letras maiúsculas, minúsculas, números e caracteres especiais (@$!%*?&#)' 
      });
    }

    // Buscar usuário
    const [usuarios] = await pool.query(
      'SELECT id, senha_hash FROM usuarios WHERE id = ?',
      [usuarioId]
    );

    if (!usuarios || usuarios.length === 0) {
      return res.status(404).json({ erro: 'Usuário não encontrado' });
    }

    const usuario = usuarios[0];

    // Verificar senha atual
    const senhaCorreta = await bcrypt.compare(senhaAtual, usuario.senha_hash);
    if (!senhaCorreta) {
      return res.status(401).json({ erro: 'Senha atual incorreta' });
    }

    // Gerar hash da nova senha
    const novoHash = await bcrypt.hash(novaSenha, 10);

    // Atualizar senha e desmarcar flag de trocar senha
    await pool.query(
      'UPDATE usuarios SET senha_hash = ?, precisa_trocar_senha = FALSE WHERE id = ?',
      [novoHash, usuarioId]
    );

    res.json({ mensagem: 'Senha alterada com sucesso!' });
  } catch (err) {
    console.error('Erro ao trocar senha:', err);
    res.status(500).json({ erro: 'Erro ao trocar senha', detalhes: err.message });
  }
};

// Resetar própria senha para padrão (123456)
exports.resetarPropriaSenh = async (req, res) => {
  const usuarioId = req.usuario.id;

  try {
    // Hash da senha padrão 123456
    const senhaPadrao = '123456';
    const hashPadrao = await bcrypt.hash(senhaPadrao, 10);

    // Atualizar senha para padrão e marcar flag
    await pool.query(
      'UPDATE usuarios SET senha_hash = ?, precisa_trocar_senha = TRUE WHERE id = ?',
      [hashPadrao, usuarioId]
    );

    res.json({ 
      mensagem: 'Senha resetada para padrão (123456). Você precisará trocar a senha no próximo login.' 
    });
  } catch (err) {
    console.error('Erro ao resetar própria senha:', err);
    res.status(500).json({ erro: 'Erro ao resetar senha', detalhes: err.message });
  }
};

// Admin resetar senha de qualquer usuário
exports.adminResetarSenha = async (req, res) => {
  const { usuarioId } = req.params;
  const adminId = req.usuario.id;

  try {
    // Verificar se é admin
    const [perfisAdmin] = await pool.query(
      `SELECT p.nome FROM perfis p
       JOIN usuario_perfis up ON up.perfil_id = p.id
       WHERE up.usuario_id = ?`,
      [adminId]
    );

    const isAdmin = perfisAdmin.some(p => (p.nome || '').toLowerCase() === 'administrador');
    if (!isAdmin) {
      return res.status(403).json({ erro: 'Apenas administradores podem resetar senha de outros usuários' });
    }

    // Hash da senha padrão 123456
    const senhaPadrao = '123456';
    const hashPadrao = await bcrypt.hash(senhaPadrao, 10);

    // Atualizar senha do usuário alvo
    const [result] = await pool.query(
      'UPDATE usuarios SET senha_hash = ?, precisa_trocar_senha = TRUE WHERE id = ?',
      [hashPadrao, usuarioId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ erro: 'Usuário não encontrado' });
    }

    res.json({ 
      mensagem: 'Senha do usuário resetada para padrão (123456). Ele precisará trocar no próximo login.' 
    });
  } catch (err) {
    console.error('Erro ao resetar senha (admin):', err);
    res.status(500).json({ erro: 'Erro ao resetar senha', detalhes: err.message });
  }
};
