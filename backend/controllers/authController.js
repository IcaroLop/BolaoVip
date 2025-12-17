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

    const senhaCorreta = await bcrypt.compare(senha, usuario.senha_hash);
    if (!senhaCorreta) {
      return res.status(401).json({ erro: 'Email ou senha inválidos' });
    }

    const token = jwt.sign(
      { id: usuario.id, nome: usuario.nome },
      process.env.JWT_SECRET,
      { expiresIn: '12h' }
    );

    res.json({ token, nome: usuario.nome });
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
