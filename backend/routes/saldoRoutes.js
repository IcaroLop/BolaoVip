const express = require('express');
const router = express.Router();
const autenticar = require('../middleware/authMiddleware');
const saldoController = require('../controllers/saldoController');

// Todas as rotas requerem autenticação
router.use(autenticar);

// GET - Obter saldo do usuário
router.get('/usuario', saldoController.obterSaldo);

// GET - Obter extrato de movimentações
router.get('/extrato', saldoController.obterExtrato);

// POST - Criar depósito
router.post('/deposito', saldoController.criarDeposito);

// POST - Confirmar depósito
router.post('/confirmar-deposito/:movimentacaoId', saldoController.confirmarDeposito);

// POST - Criar saque
router.post('/saque', saldoController.criarSaque);

// POST - Confirmar saque
router.post('/confirmar-saque/:movimentacaoId', saldoController.confirmarSaque);

module.exports = router;
