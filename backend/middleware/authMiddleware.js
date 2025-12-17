// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');

function autenticar(req, res, next) {
  const token = req.headers['authorization']?.replace('Bearer ', '');


  if (!token) return res.status(401).json({ erro: 'Token não fornecido' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    //console.log('Token recebido:', token);
    req.usuario = decoded;
    next();
  } catch (err) {
    console.error('Erro ao verificar token:', err.message);
    res.status(403).json({ erro: 'Token inválido' });
  }
}

module.exports = autenticar;
