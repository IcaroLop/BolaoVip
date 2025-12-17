// Arquivo: index.js
import express from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const db = await mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
});

const JWT_SECRET = process.env.JWT_SECRET || 'segredo_super_secreto';

// Middleware para autenticação
function autenticarToken(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ erro: 'Token ausente' });
  jwt.verify(token, JWT_SECRET, (err, usuario) => {
    if (err) return res.status(403).json({ erro: 'Token inválido' });
    req.usuario = usuario;
    next();
  });
}

// Teste de conexão
app.get('/', (req, res) => {
  res.send('Bolão Vip API online!');
});

// Criar novo usuário
app.post('/usuarios', async (req, res) => {
  const { nome, email, senha } = req.body;
  try {
    const hash = await bcrypt.hash(senha, 10);
    const [result] = await db.execute(
      'INSERT INTO usuarios (nome, email, senha_hash) VALUES (?, ?, ?)',
      [nome, email, hash]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// Login de usuário
app.post('/login', async (req, res) => {
  const { email, senha } = req.body;
  try {
    const [usuarios] = await db.execute('SELECT * FROM usuarios WHERE email = ?', [email]);
    if (usuarios.length === 0) return res.status(404).json({ erro: 'Usuário não encontrado' });

    const usuario = usuarios[0];
    const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);
    if (!senhaValida) return res.status(401).json({ erro: 'Senha incorreta' });

    const token = jwt.sign({ id: usuario.id, nome: usuario.nome }, JWT_SECRET, { expiresIn: '1d' });
    res.json({ token });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// Listar jogos por rodada (público)
app.get('/jogos/:rodada', async (req, res) => {
  const rodada = req.params.rodada;
  try {
    const [rows] = await db.execute('SELECT * FROM jogos WHERE rodada = ?', [rodada]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// Enviar palpite (autenticado)
app.post('/palpites', autenticarToken, async (req, res) => {
  const { id_jogo, gols_casa, gols_fora } = req.body;
  const id_usuario = req.usuario.id;
  try {
    await db.execute(
      'INSERT INTO palpites (id_usuario, id_jogo, gols_casa, gols_fora) VALUES (?, ?, ?, ?)',
      [id_usuario, id_jogo, gols_casa, gols_fora]
    );
    res.status(201).json({ mensagem: 'Palpite registrado' });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// Buscar ranking por rodada (público)
app.get('/ranking/:rodada', async (req, res) => {
  const rodada = req.params.rodada;
  try {
    const [ranking] = await db.execute(
      `SELECT u.nome, r.pontos_totais, r.posicao 
       FROM ranking_rodada r 
       JOIN usuarios u ON u.id = r.id_usuario 
       WHERE r.id_rodada = ? ORDER BY r.posicao ASC`,
      [rodada]
    );
    res.json(ranking);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// Registrar pagamento (autenticado)
app.post('/pagamentos', autenticarToken, async (req, res) => {
  const { tipo, valor, descricao } = req.body;
  const id_usuario = req.usuario.id;
  try {
    await db.execute(
      'INSERT INTO pagamentos (id_usuario, tipo, valor, descricao, status) VALUES (?, ?, ?, ?, ?)',
      [id_usuario, tipo, valor, descricao, 'confirmado']
    );
    res.status(201).json({ mensagem: 'Pagamento registrado' });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
