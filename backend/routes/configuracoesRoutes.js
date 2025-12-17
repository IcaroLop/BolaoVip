const express = require('express');
const router = express.Router();
const configuracoesController = require('../controllers/configuracoesController');
const autenticar = require('../middleware/authMiddleware');
const agendadorController = require('../controllers/agendadorController');
const logsController = require('../controllers/logsController');

router.get('/', configuracoesController.getConfiguracoes);

// Consulta rodada específica da API Futebol e armazena em jogos
router.post('/api-futebol/campeonatos/:campeonatoId/rodadas/:rodada', autenticar, configuracoesController.consultarRodadaApiFutebol);
router.post('/api-futebol/rodada', autenticar, configuracoesController.consultarRodadaApiFutebol); // aceita via query params
// Novo endpoint: salvar payload vindo do frontend
router.post('/api-futebol/rodada/save', autenticar, configuracoesController.salvarRodadaApiFutebol);

// Agendador de requisições
router.get('/agendador/agenda', autenticar, agendadorController.listarAgendaCalculada);
router.post('/agendador/planejar', autenticar, agendadorController.planejarAgenda);
router.post('/agendador/executar-devidos', autenticar, agendadorController.executarGruposDevidos);

// Classificação
router.post('/api-futebol/classificacao', autenticar, configuracoesController.importarClassificacao);
router.get('/api-futebol/classificacao', autenticar, configuracoesController.obterClassificacao);

// Logs (Sistema e Usuários)
router.get('/logs/sistema', autenticar, logsController.listarSistema);
router.get('/logs/usuarios', autenticar, logsController.listarUsuarios);

// Limite de requisições diárias
router.post('/limite-requisicoes-dia', autenticar, configuracoesController.atualizarLimiteRequisicoesDia);

module.exports = router;
