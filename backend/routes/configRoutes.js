/**
 * Rotas de Configuração de Tokens
 * Endpoints para alternar entre tokens dev/prod
 */

const express = require('express');
const router = express.Router();
const tokenConfig = require('../config/tokenConfig');
const authMiddleware = require('../middleware/authMiddleware');

/**
 * GET /api/config/token-status
 * Retorna o status atual dos tokens (requer autenticação)
 */
router.get('/token-status', authMiddleware, (req, res) => {
  try {
    // Verifica se é admin (você pode adaptar conforme sua lógica)
    // Por enquanto, qualquer usuário autenticado pode ver
    const status = tokenConfig.getStatus();
    const info = tokenConfig.getTokenInfo();

    res.json({
      sucesso: true,
      mensagem: 'Status de tokens',
      status: status,
      info: info,
      token: info.token // compatibilidade com clientes que buscam no root
    });
  } catch (erro) {
    console.error('[TokenConfig] Erro ao obter status:', erro);
    res.status(500).json({
      erro: 'Erro ao obter status de tokens',
      detalhes: erro.message
    });
  }
});

/**
 * POST /api/config/toggle-token
 * Alterna entre development e production
 */
router.post('/toggle-token', authMiddleware, (req, res) => {
  try {
    const novoAmbiente = tokenConfig.toggleEnvironment();
    const info = tokenConfig.getTokenInfo();

    res.json({
      sucesso: true,
      mensagem: `Token alterado para: ${novoAmbiente}`,
      ambiente: novoAmbiente,
      info: info
    });
  } catch (erro) {
    console.error('[TokenConfig] Erro ao alternar token:', erro);
    res.status(500).json({
      erro: 'Erro ao alternar token',
      detalhes: erro.message
    });
  }
});

/**
 * POST /api/config/set-environment
 * Define um ambiente específico
 * Body: { environment: 'development' | 'production' }
 */
router.post('/set-environment', authMiddleware, (req, res) => {
  try {
    const { environment } = req.body;

    if (!environment) {
      return res.status(400).json({
        erro: 'Campo "environment" é obrigatório'
      });
    }

    const sucesso = tokenConfig.setEnvironment(environment);

    if (!sucesso) {
      return res.status(400).json({
        erro: 'Ambiente inválido. Use "development" ou "production"'
      });
    }

    const info = tokenConfig.getTokenInfo();
    res.json({
      sucesso: true,
      mensagem: `Ambiente definido para: ${environment}`,
      info: info
    });
  } catch (erro) {
    console.error('[TokenConfig] Erro ao definir ambiente:', erro);
    res.status(500).json({
      erro: 'Erro ao definir ambiente',
      detalhes: erro.message
    });
  }
});

/**
 * POST /api/config/update-token
 * Atualiza um token personalizado
 * Body: { environment: 'development' | 'production', token: 'novo_token' }
 */
router.post('/update-token', authMiddleware, (req, res) => {
  try {
    const { environment, token } = req.body;

    if (!environment || !token) {
      return res.status(400).json({
        erro: 'Campos "environment" e "token" são obrigatórios'
      });
    }

    const sucesso = tokenConfig.setToken(environment, token);

    if (!sucesso) {
      return res.status(400).json({
        erro: 'Ambiente inválido. Use "development" ou "production"'
      });
    }

    res.json({
      sucesso: true,
      mensagem: `Token ${environment} atualizado com sucesso`,
      environment: environment,
      tokenPreview: token.substring(0, 10) + '...'
    });
  } catch (erro) {
    console.error('[TokenConfig] Erro ao atualizar token:', erro);
    res.status(500).json({
      erro: 'Erro ao atualizar token',
      detalhes: erro.message
    });
  }
});

module.exports = router;
