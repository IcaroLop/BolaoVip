const { listarLogsSistema, listarLogsUsuarios } = require('../services/logService');

exports.listarSistema = async (req, res) => {
  try {
    const page = Number(req.query.page || req.query.pagina) || 1;
    const limit = Number(req.query.limit || req.query.limite) || 20;
    const filtros = {
      origem: req.query.origem || null,
      nivel: req.query.nivel || null,
    };
    const dados = await listarLogsSistema(page, limit, filtros);
    res.json(dados);
  } catch (err) {
    console.error('[logsController] Erro ao listar logs de sistema:', err.message);
    res.status(500).json({ erro: 'Falha ao listar logs de sistema.' });
  }
};

exports.listarUsuarios = async (req, res) => {
  try {
    const page = Number(req.query.page || req.query.pagina) || 1;
    const limit = Number(req.query.limit || req.query.limite) || 20;
    const filtros = {
      usuario_id: req.query.usuario_id ? Number(req.query.usuario_id) : null,
      tipo_evento: req.query.tipo_evento || null,
    };
    const dados = await listarLogsUsuarios(page, limit, filtros);
    res.json(dados);
  } catch (err) {
    console.error('[logsController] Erro ao listar logs de usuários:', err.message);
    res.status(500).json({ erro: 'Falha ao listar logs de usuários.' });
  }
};
