// src/controllers/adminPagamentoController.js
const express = require('express');
const router = express.Router();
const db = require('../database/conexao'); // conexão MySQL

// GET cobranças pendentes (do pix_cobrancas)
router.get('/pagamentos/cobrancas', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT c.id, c.codigo_envio, c.id_usuario, u.nome AS nome_usuario, 
             (SELECT p.rodada FROM palpites p WHERE p.codigo_envio = c.codigo_envio LIMIT 1) AS rodada,
             c.valor, c.status, c.expiracao
      FROM pix_cobrancas c
      JOIN usuarios u ON c.id_usuario = u.id
      WHERE c.status = 'pendente'
    `);
    res.json(rows);
  } catch (error) {
    console.error('Erro ao buscar cobranças pendentes:', error);
    res.status(500).json({ message: 'Erro ao buscar cobranças pendentes.' });
  }
});

router.get('/pagamentos/cobrancas/pendentes', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT c.id, c.codigo_envio, c.id_usuario, u.nome AS nome_usuario,
             c.valor_original AS valor,
             DATE_ADD(c.calendario_criacao, INTERVAL c.calendario_expiracao SECOND) AS data_expiracao,
             c.status_pagamento,
             c.status
      FROM pix_cobrancas c
      JOIN usuarios u ON c.id_usuario = u.id
      WHERE c.status_pagamento = 'PENDENTE'
    `);

    res.json(rows);
  } catch (error) {
    console.error('Erro ao buscar cobranças pendentes:', error);
    res.status(500).json({ message: 'Erro ao buscar cobranças pendentes.' });
  }
});

// POST marcar cobrança como paga
router.post('/pagamentos/cobrancas/:codigo_envio/pagar', async (req, res) => {
  const { codigo_envio } = req.params;
  try {
    // Em desenvolvimento (EFI_PIX_SANDBOX), registra a data de pagamento
    // Em produção, data_pagamento será registrada pelo webhook da EFI
    const isProd = process.env.EFI_PIX_SANDBOX !== 'true';
    const updateQuery = isProd
      ? 'UPDATE pix_cobrancas SET status_pagamento = ?, status = ? WHERE codigo_envio = ?'
      : 'UPDATE pix_cobrancas SET status_pagamento = ?, status = ?, data_pagamento = NOW() WHERE codigo_envio = ?';
    
    const params = isProd
      ? ['PAGO', 'pago', codigo_envio]
      : ['PAGO', 'pago', codigo_envio];

    await db.query(updateQuery, params);
    res.json({ message: 'Cobrança marcada como paga.' });
  } catch (error) {
    console.error('Erro ao marcar cobrança como paga:', error);
    res.status(500).json({ message: 'Erro ao marcar cobrança como paga.' });
  }
});

// GET prêmios pendentes (com filtros opcionais por campeonato/grupo)
router.get('/pagamentos/premios', async (req, res) => {
  const { campeonatoId, campeonato_id, grupoId, grupo_id } = req.query;
  const filtros = ['status_pagamento = ?'];
  const params = ['pendente'];

  if (campeonatoId || campeonato_id) {
    filtros.push('(campeonato_id = ? OR campeonato_id IS NULL)');
    params.push(Number(campeonatoId || campeonato_id));
  }

  if (grupoId || grupo_id) {
    filtros.push('(grupo_id = ? OR grupo_id IS NULL)');
    params.push(Number(grupoId || grupo_id));
  }

  const [rows] = await db.query(
    `SELECT * FROM premios WHERE ${filtros.join(' AND ')}`,
    params
  );
  res.json(rows);
});

// POST marcar prêmio como pago
router.post('/pagamentos/premios/:id/pagar', async (req, res) => {
  const { id } = req.params;
  const { observacao } = req.body;
  try {
    await db.query(
      'UPDATE premios SET status_pagamento = ?, data_pagamento = NOW(), observacao_pagamento = ? WHERE id = ?',
      ['pago', observacao, id]
    );
    res.json({ message: 'Prêmio marcado como pago.' });
  } catch (error) {
    console.error('Erro ao marcar prêmio como pago:', error);
    res.status(500).json({ message: 'Erro ao marcar prêmio como pago.' });
  }
});

router.get('/pagamentos/cobrancas/historico', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT c.id, c.codigo_envio, c.id_usuario, u.nome AS nome_usuario,
             c.valor_original AS valor,
             DATE_ADD(c.calendario_criacao, INTERVAL c.calendario_expiracao SECOND) AS data_expiracao,
             c.status_pagamento,
             c.status,
             c.calendario_criacao
      FROM pix_cobrancas c
      JOIN usuarios u ON c.id_usuario = u.id
      ORDER BY c.calendario_criacao DESC
    `);

    res.json(rows);
  } catch (error) {
    console.error('Erro ao buscar histórico de cobranças:', error);
    res.status(500).json({ message: 'Erro ao buscar histórico de cobranças.' });
  }
});


module.exports = router;
