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

// POST - Criar depósito (modo produção)
router.post('/deposito', saldoController.criarDeposito);

// POST - Criar e confirmar depósito instantaneamente (modo desenvolvimento)
router.post('/deposito-dev', saldoController.criarDepositoDev);

// POST - Confirmar depósito manualmente (SANDBOX/DEV - simula recebimento PIX)
router.post('/deposito-pix-confirmar/:depositoId', saldoController.confirmarDepositoPix);

// POST - Verificar depósito PIX específico (consulta EFI imediatamente)
router.post('/verificar-deposito-pix/:depositoId', saldoController.verificarDepositoPix);

// POST - Confirmar depósito
router.post('/confirmar-deposito/:movimentacaoId', saldoController.confirmarDeposito);

// POST - Criar saque
router.post('/saque', saldoController.criarSaque);

// POST - Confirmar saque
router.post('/confirmar-saque/:movimentacaoId', saldoController.confirmarSaque);

// POST - Criar e confirmar saque instantaneamente (modo desenvolvimento)
router.post('/saque-dev', saldoController.criarSaqueDev);

module.exports = router;
