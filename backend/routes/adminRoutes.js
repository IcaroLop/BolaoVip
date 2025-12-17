// src/routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const adminPagamentoController = require('../controllers/adminPagamentoController');

// As rotas já estão montadas no adminPagamentoController, só importamos aqui.
router.use('/admin', adminPagamentoController);

module.exports = router;
