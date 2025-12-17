const agendadorService = require('../services/agendadorService');

exports.listarAgendaCalculada = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const resultado = await agendadorService.calcularAgendaTodosGrupos(page, limit);
    res.json(resultado);
  } catch (err) {
    console.error('Erro ao listar agenda calculada:', err);
    res.status(500).json({ erro: 'Falha ao calcular agenda.' });
  }
};

exports.planejarAgenda = async (req, res) => {
  try {
    const resultado = await agendadorService.planejarPersistirAgenda();
    res.json({ mensagem: 'Agenda planejada com sucesso', ...resultado });
  } catch (err) {
    console.error('Erro ao planejar agenda:', err);
    res.status(500).json({ erro: 'Falha ao planejar agenda.' });
  }
};

exports.executarGruposDevidos = async (req, res) => {
  try {
    const resultado = await agendadorService.executarDevidos();
    res.json({ mensagem: 'Execução disparada', ...resultado });
  } catch (err) {
    console.error('Erro ao executar grupos devidos:', err);
    res.status(500).json({ erro: 'Falha ao executar grupos devidos.' });
  }
};
