// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');

// Throttling de logs para evitar spam
let ultimoLogErro = 0;
const INTERVALO_LOG_MS = 5000; // 5 segundos entre logs

function autenticar(req, res, next) {
  const token = req.headers['authorization']?.replace('Bearer ', '');

  if (!token) return res.status(401).json({ erro: 'Token não fornecido' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = decoded;
    next();
  } catch (err) {
    // Throttling de logs para evitar spam no backend
    const agora = Date.now();
    if (agora - ultimoLogErro > INTERVALO_LOG_MS) {
      console.error('[AuthMiddleware] Erro ao verificar token:', err.message, '- URL:', req.originalUrl);
      ultimoLogErro = agora;
    }
    
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ erro: 'Token expirado. Faça login novamente.' });
    }
    res.status(403).json({ erro: 'Token inválido' });
  }
}

module.exports = autenticar;
