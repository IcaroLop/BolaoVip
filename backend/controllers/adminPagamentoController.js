// src/controllers/adminPagamentoController.js
const express = require('express');
const router = express.Router();
const db = require('../database/conexao');
const autenticar = require('../middleware/authMiddleware');
const saldoService = require('../services/saldoService');

router.use(autenticar);

async function obterPerfisUsuario(usuarioId) {
  const [perfis] = await db.query(
    `SELECT p.nome FROM perfis p
       JOIN usuario_perfis up ON up.perfil_id = p.id
      WHERE up.usuario_id = ?`,
    [usuarioId]
  );
  return perfis.map((p) => (p.nome || '').toLowerCase());
}

async function isAdminOuFinanceiro(usuarioId) {
  const perfis = await obterPerfisUsuario(usuarioId);
  return perfis.includes('administrador') || perfis.includes('financeiro');
}

async function isDesenvolvedor(usuarioId) {
  const perfis = await obterPerfisUsuario(usuarioId);
  return perfis.includes('desenvolvedor');
}

async function getUserGroupId(usuarioId) {
  const [rows] = await db.query(
    'SELECT grupo_id FROM usuarios WHERE id = ?',
    [usuarioId]
  );
  return rows && rows.length > 0 ? rows[0].grupo_id : null;
}

function buildGroupFilterClause(isDev, actingGroupId, tableAlias = 'u') {
  const filtros = [];
  const params = [];

  if (!isDev && actingGroupId) {
    filtros.push(`${tableAlias}.grupo_id = ?`);
    params.push(actingGroupId);
  }

  return { filtros, params };
}

// GET cobranças pendentes (campo status)
router.get('/pagamentos/cobrancas', async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const isPrivilegiado = await isAdminOuFinanceiro(usuarioId);
    const filtros = ["c.status = 'pendente'"];
    const params = [];

    if (!isPrivilegiado) {
      filtros.push('c.id_usuario = ?');
      params.push(usuarioId);
    }

    const [rows] = await db.query(
      `SELECT c.id, c.codigo_envio, c.id_usuario, u.nome AS nome_usuario,
              (SELECT p.rodada FROM palpites p WHERE p.codigo_envio = c.codigo_envio LIMIT 1) AS rodada,
              c.valor, c.status, c.expiracao
         FROM pix_cobrancas c
         JOIN usuarios u ON c.id_usuario = u.id
        WHERE ${filtros.join(' AND ')}
        ORDER BY c.expiracao DESC`,
      params
    );
    res.json(rows);
  } catch (error) {
    console.error('Erro ao buscar cobranças pendentes:', error);
    res.status(500).json({ message: 'Erro ao buscar cobranças pendentes.' });
  }
});

// GET cobranças pendentes (status_pagamento)
router.get('/pagamentos/cobrancas/pendentes', async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const isPrivilegiado = await isAdminOuFinanceiro(usuarioId);
    const isDev = await isDesenvolvedor(usuarioId);
    const filtros = ["c.status_pagamento = 'PENDENTE'"];
    const params = [];

    if (!isPrivilegiado && !isDev) {
      // Apostador: apenas suas próprias cobranças
      filtros.push('c.id_usuario = ?');
      params.push(usuarioId);
    } else if (isPrivilegiado && !isDev) {
      // Admin/Financeiro: apenas do mesmo grupo
      const grupoId = await getUserGroupId(usuarioId);
      if (grupoId) {
        filtros.push('u.grupo_id = ?');
        params.push(grupoId);
      }
    }
    // Desenvolvedor: sem filtro (vê todos os grupos)

    const [rows] = await db.query(
      `SELECT c.id, c.codigo_envio, c.id_usuario, u.nome AS nome_usuario,
              c.valor_original AS valor,
              DATE_ADD(c.calendario_criacao, INTERVAL c.calendario_expiracao SECOND) AS data_expiracao,
              c.calendario_criacao,
              c.calendario_expiracao,
              c.status_pagamento,
              c.status,
              c.pix_copiaecola,
              c.txid
         FROM pix_cobrancas c
         JOIN usuarios u ON c.id_usuario = u.id
        WHERE ${filtros.join(' AND ')}
        ORDER BY c.calendario_criacao DESC`,
      params
    );

    // Adicionar informações de status do PIX para cada cobrança
    const agora = new Date();
    const cobrancasComStatus = rows.map(cob => {
      let pix_status = 'sem_pix';
      let pode_gerar_pix = true;
      let segundos_restantes = 0;
      let proximo_pix_em = null;
      
      if (cob.status_pagamento && cob.status_pagamento.toUpperCase() === 'PAGO') {
        pix_status = 'pago';
        pode_gerar_pix = false;
      } else if (cob.pix_copiaecola && cob.calendario_criacao && cob.calendario_expiracao) {
        // Calcular data de expiração real
        const criacao = new Date(cob.calendario_criacao);
        const expiracao = new Date(criacao.getTime() + (cob.calendario_expiracao * 1000));
        
        if (agora < expiracao) {
          pix_status = 'valido';
          pode_gerar_pix = false;
          segundos_restantes = Math.floor((expiracao - agora) / 1000);
          proximo_pix_em = expiracao;
        } else {
          pix_status = 'expirado';
          pode_gerar_pix = true;
        }
      }
      
      return {
        ...cob,
        pix_status,
        pode_gerar_pix,
        segundos_restantes,
        proximo_pix_em
      };
    });

    res.json(cobrancasComStatus);
  } catch (error) {
    console.error('Erro ao buscar cobranças pendentes:', error);
    res.status(500).json({ message: 'Erro ao buscar cobranças pendentes.' });
  }
});

// POST marcar cobrança como paga (ROTA REMOVIDA - Fallback automático substitui)
// Mantida apenas para compatibilidade, mas retorna erro 410 Gone
router.post('/pagamentos/cobrancas/:codigo_envio/pagar', async (req, res) => {
  return res.status(410).json({ 
    message: 'Esta funcionalidade foi removida. O sistema de fallback automático verifica pagamentos a cada 5 minutos.' 
  });
});

// GET prêmios pendentes (com filtros opcionais por campeonato/grupo)
router.get('/pagamentos/premios', async (req, res) => {
  const { campeonatoId, campeonato_id, grupoId, grupo_id } = req.query;
  const usuarioId = req.usuario.id;
  const isPrivilegiado = await isAdminOuFinanceiro(usuarioId);
  const isDev = await isDesenvolvedor(usuarioId);

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

  if (!isPrivilegiado && !isDev) {
    // Apostador: apenas seus prêmios
    filtros.push('usuario_id = ?');
    params.push(usuarioId);
  } else if (isPrivilegiado && !isDev) {
    // Admin/Financeiro: apenas do mesmo grupo
    const grupoId = await getUserGroupId(usuarioId);
    if (grupoId) {
      filtros.push('(grupo_id = ? OR grupo_id IS NULL)');
      params.push(grupoId);
    }
  }
  // Desenvolvedor: sem filtro adicional

  try {
    const [rows] = await db.query(
      `SELECT * FROM premios WHERE ${filtros.join(' AND ')}`,
      params
    );
    res.json(rows);
  } catch (error) {
    console.error('Erro ao buscar prêmios:', error);
    res.status(500).json({ message: 'Erro ao buscar prêmios.' });
  }
});

// POST marcar prêmio como pago
router.post('/pagamentos/premios/:id/pagar', async (req, res) => {
  const { id } = req.params;
  const { observacao } = req.body;
  const usuarioId = req.usuario.id;

  try {
    const isPrivilegiado = await isAdminOuFinanceiro(usuarioId);
    const [premios] = await db.query(
      `SELECT usuario_id FROM premios WHERE id = ? LIMIT 1`,
      [id]
    );

    if (premios.length === 0) {
      return res.status(404).json({ message: 'Prêmio não encontrado.' });
    }

    if (!isPrivilegiado && premios[0].usuario_id !== usuarioId) {
      return res.status(403).json({ message: 'Sem permissão para alterar este prêmio.' });
    }

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

// GET histórico de prêmios pagos
router.get('/pagamentos/premios/historico', async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const isPrivilegiado = await isAdminOuFinanceiro(usuarioId);
    const isDev = await isDesenvolvedor(usuarioId);
    const filtros = ["p.status_pagamento = 'pago'"];
    const params = [];

    if (!isPrivilegiado && !isDev) {
      // Apostador: apenas seus prêmios
      filtros.push('p.usuario_id = ?');
      params.push(usuarioId);
    } else if (isPrivilegiado && !isDev) {
      // Admin/Financeiro: apenas do mesmo grupo
      const grupoId = await getUserGroupId(usuarioId);
      if (grupoId) {
        filtros.push('u.grupo_id = ?');
        params.push(grupoId);
      }
    }
    // Desenvolvedor: sem filtro

    const [rows] = await db.query(
      `SELECT p.id, p.usuario_id, u.nome AS nome_usuario,
              ABS(p.valor) AS valor,
              p.status_pagamento,
              p.data_pagamento,
              rd.numero AS rodada,
              p.tipo_premio,
              p.observacao_pagamento,
              CASE WHEN p.valor > 0 THEN 'Premiação' ELSE 'Cobrança' END AS tipo_operacao
         FROM premios p
         JOIN usuarios u ON p.usuario_id = u.id
         LEFT JOIN rodadas rd ON p.rodada = rd.id
        WHERE ${filtros.join(' AND ')}
        ORDER BY p.data_pagamento DESC`,
      params
    );

    res.json(rows);
  } catch (error) {
    console.error('Erro ao buscar histórico de prêmios:', error);
    res.status(500).json({ message: 'Erro ao buscar histórico de prêmios.' });
  }
});

router.get('/pagamentos/cobrancas/historico', async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const isPrivilegiado = await isAdminOuFinanceiro(usuarioId);
    const isDev = await isDesenvolvedor(usuarioId);
    const filtros = [];
    const params = [];

    if (!isPrivilegiado && !isDev) {
      // Apostador: apenas suas cobranças
      filtros.push('c.id_usuario = ?');
      params.push(usuarioId);
    } else if (isPrivilegiado && !isDev) {
      // Admin/Financeiro: apenas do mesmo grupo
      const grupoId = await getUserGroupId(usuarioId);
      if (grupoId) {
        filtros.push('u.grupo_id = ?');
        params.push(grupoId);
      }
    }
    // Desenvolvedor: sem filtro

    const where = filtros.length ? `WHERE ${filtros.join(' AND ')}` : '';

    const [rows] = await db.query(
      `SELECT c.id, c.codigo_envio, c.id_usuario, u.nome AS nome_usuario,
              c.valor_original AS valor,
              DATE_ADD(c.calendario_criacao, INTERVAL c.calendario_expiracao SECOND) AS data_expiracao,
              c.status_pagamento,
              c.status,
              c.calendario_criacao,
              (SELECT p.rodada FROM palpites p WHERE p.codigo_envio = c.codigo_envio LIMIT 1) AS rodada
         FROM pix_cobrancas c
         JOIN usuarios u ON c.id_usuario = u.id
        ${where}
        ORDER BY c.calendario_criacao DESC`,
      params
    );

    res.json(rows);
  } catch (error) {
    console.error('Erro ao buscar histórico de cobranças:', error);
    res.status(500).json({ message: 'Erro ao buscar histórico de cobranças.' });
  }
});

// Gerar PIX real para uma cobrança que não tem código copia e cola
router.post('/pagamentos/cobrancas/:codigo_envio/gerar-pix', async (req, res) => {
  const { codigo_envio } = req.params;
  const usuarioId = req.usuario.id;
  
  try {
    const isPrivilegiado = await isAdminOuFinanceiro(usuarioId);
    const pixService = require('../services/pixService');
    const { criarNotificacao } = require('../services/notificacoesService');
    
    const params = [codigo_envio];
    const filtros = ['c.codigo_envio = ?'];
    if (!isPrivilegiado) {
      filtros.push('c.id_usuario = ?');
      params.push(usuarioId);
    }
    
    const [cobrancas] = await db.query(
      `SELECT c.*, u.nome AS nome_usuario 
         FROM pix_cobrancas c 
         JOIN usuarios u ON c.id_usuario = u.id
        WHERE ${filtros.join(' AND ')}`,
      params
    );
    
    if (cobrancas.length === 0) {
      return res.status(404).json({ erro: 'Cobrança não encontrada.' });
    }
    
    const cobranca = cobrancas[0];
    
    // VALIDAÇÃO 1: Se cobrança já foi paga, não permite gerar PIX
    if (cobranca.status_pagamento && cobranca.status_pagamento.toUpperCase() === 'PAGO') {
      return res.status(400).json({ erro: 'Esta cobrança já foi paga. Não é possível gerar novo PIX.' });
    }
    
    // VALIDAÇÃO 2: Se já tem PIX válido (não expirado), não permite gerar novo
    if (cobranca.pix_copiaecola && cobranca.calendario_expiracao) {
      const agora = new Date();
      const expiracao = new Date(cobranca.calendario_expiracao);
      
      if (agora < expiracao) {
        // PIX ainda válido - retornar informações
        const segundosRestantes = Math.floor((expiracao - agora) / 1000);
        
        return res.status(400).json({
          erro: 'PIX ainda válido',
          pix_valido: true,
          pix_copiaecola: cobranca.pix_copiaecola,
          calendario_expiracao: cobranca.calendario_expiracao,
          segundos_restantes: segundosRestantes,
          mensagem: `PIX válido até ${expiracao.toLocaleString('pt-BR')}. Novo PIX poderá ser gerado após a expiração.`
        });
      }
    }
    
    let sanitizedTxid = codigo_envio.replace(/[^a-zA-Z0-9]/g, '');
    if (sanitizedTxid.length < 26) {
      sanitizedTxid = sanitizedTxid.padEnd(26, '0');
    } else if (sanitizedTxid.length > 35) {
      sanitizedTxid = sanitizedTxid.substring(0, 35);
    }
    
    const descricao = `Pagamento Bolão VIP - ${codigo_envio}`;
    
    const cobrancaPix = await pixService.criarCobranca(
      sanitizedTxid,
      Number(cobranca.valor_original),
      cobranca.nome_usuario,
      descricao
    );
    
    const pixCopiaECola = cobrancaPix.pixCopiaECola;
    const calendarioCriacao = new Date(cobrancaPix.calendario.criacao);
    const calendarioExpiracao = cobrancaPix.calendario.expiracao;
    const locId = cobrancaPix.loc?.id || null;
    const locLocation = cobrancaPix.loc?.location || null;
    
    await db.query(
      `UPDATE pix_cobrancas 
          SET pix_copiaecola = ?, 
              txid = ?,
              loc_id = ?,
              loc_location = ?,
              calendario_criacao = ?,
              calendario_expiracao = ?,
              payload_raw = ?
        WHERE codigo_envio = ?`,
      [pixCopiaECola, cobrancaPix.txid, locId, locLocation, calendarioCriacao, calendarioExpiracao, JSON.stringify(cobrancaPix), codigo_envio]
    );
    
    try {
      await criarNotificacao(cobranca.id_usuario, 'pix_pendente', {
        txid: cobrancaPix.txid,
        codigo_envio,
        valor: cobranca.valor_original,
        pix_copiaecola: pixCopiaECola,
        calendario_expiracao: calendarioExpiracao,
        loc_location: locLocation
      });
    } catch (err) {
      console.error('Erro ao criar notificação:', err);
    }
    
    res.json({ 
      message: 'PIX gerado com sucesso!', 
      pix_copiaecola: pixCopiaECola,
      txid: cobrancaPix.txid
    });
  } catch (error) {
    console.error('Erro ao gerar PIX:', error);
    res.status(500).json({ erro: 'Erro ao gerar PIX para a cobrança.' });
  }
});

// =============================
// Solicitações de Saque (Financeiro/Admin/Dev)
// =============================

// Listar solicitações de saque (pendentes/confirmadas/canceladas) visíveis para finance/admin do mesmo grupo ou dev
router.get('/saques/solicitacoes', async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const isPrivilegiado = await isAdminOuFinanceiro(usuarioId);
    const isDev = await isDesenvolvedor(usuarioId);

    if (!isPrivilegiado && !isDev) {
      return res.status(403).json({ erro: 'Acesso restrito a Financeiro/Administrador ou Desenvolvedor.' });
    }

    const grupoId = await getUserGroupId(usuarioId);
    const { filtros, params } = buildGroupFilterClause(isDev, grupoId, 'u');
    const whereClauses = ["em.tipo = 'saque'", "em.status IN ('pendente','confirmado','cancelado')", ...filtros];

    const [rows] = await db.query(
      `SELECT em.id,
              em.usuario_id,
              u.nome AS nome_usuario,
              u.grupo_id,
              em.valor,
              em.status,
              em.descricao,
              em.criado_em,
              em.saldo_anterior,
              em.saldo_novo
         FROM extrato_movimentacao em
         JOIN usuarios u ON u.id = em.usuario_id
        WHERE ${whereClauses.join(' AND ')}
        ORDER BY em.criado_em DESC`,
      params
    );

    res.json(rows);
  } catch (err) {
    console.error('[adminPagamentoController] Erro ao listar solicitações de saque:', err);
    res.status(500).json({ erro: 'Erro ao listar solicitações de saque' });
  }
});

// Cancelar solicitação de saque
router.post('/saques/:id/cancelar', async (req, res) => {
  let conexao;
  try {
    const usuarioId = req.usuario.id;
    const { id } = req.params;
    const isPrivilegiado = await isAdminOuFinanceiro(usuarioId);
    const isDev = await isDesenvolvedor(usuarioId);

    if (!isPrivilegiado && !isDev) {
      return res.status(403).json({ erro: 'Acesso restrito a Financeiro/Administrador ou Desenvolvedor.' });
    }

    const grupoId = await getUserGroupId(usuarioId);
    conexao = await db.getConnection();
    await conexao.beginTransaction();

    const [rows] = await conexao.query(
      `SELECT em.id, em.usuario_id, u.grupo_id, em.valor, em.status
         FROM extrato_movimentacao em
         JOIN usuarios u ON u.id = em.usuario_id
        WHERE em.id = ? AND em.tipo = 'saque' AND em.status = 'pendente'`,
      [id]
    );

    if (!rows || rows.length === 0) {
      await conexao.rollback();
      return res.status(404).json({ erro: 'Solicitação de saque não encontrada ou já processada.' });
    }

    const registro = rows[0];
    if (!isDev && grupoId && registro.grupo_id !== grupoId) {
      await conexao.rollback();
      return res.status(403).json({ erro: 'Saque pertence a outro grupo.' });
    }

    await conexao.query('UPDATE extrato_movimentacao SET status = "cancelado" WHERE id = ?', [id]);

    await conexao.commit();
    res.json({ sucesso: true, mensagem: 'Solicitação de saque cancelada', saque_id: id });
  } catch (err) {
    if (conexao) await conexao.rollback();
    console.error('[adminPagamentoController] Erro ao cancelar saque:', err);
    res.status(500).json({ erro: 'Erro ao cancelar saque' });
  } finally {
    if (conexao) conexao.release();
  }
});

// Liberar (confirmar) saque: debita saldo do solicitante
router.post('/saques/:id/liberar', async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const { id } = req.params;
    const isPrivilegiado = await isAdminOuFinanceiro(usuarioId);
    const isDev = await isDesenvolvedor(usuarioId);

    if (!isPrivilegiado && !isDev) {
      return res.status(403).json({ erro: 'Acesso restrito a Financeiro/Administrador ou Desenvolvedor.' });
    }

    const grupoId = await getUserGroupId(usuarioId);

    // Buscar solicitante e validar grupo/status
    const [rows] = await db.query(
      `SELECT em.id, em.usuario_id, u.grupo_id
         FROM extrato_movimentacao em
         JOIN usuarios u ON u.id = em.usuario_id
        WHERE em.id = ? AND em.tipo = 'saque' AND em.status = 'pendente'`,
      [id]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ erro: 'Solicitação de saque não encontrada ou já processada.' });
    }

    const registro = rows[0];
    if (!isDev && grupoId && registro.grupo_id !== grupoId) {
      return res.status(403).json({ erro: 'Saque pertence a outro grupo.' });
    }

    // Debitar saldo e marcar movimentação como confirmada
    const resultado = await saldoService.confirmarSaque(registro.usuario_id, parseInt(id));
    res.json({ sucesso: true, mensagem: 'Saque liberado e debitado do saldo.', saque_id: id, saldo_novo: resultado.saldoNovo });
  } catch (err) {
    console.error('[adminPagamentoController] Erro ao liberar saque:', err);
    res.status(500).json({ erro: err.message || 'Erro ao liberar saque' });
  }
});


module.exports = router;
