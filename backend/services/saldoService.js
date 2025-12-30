const pool = require('../database/conexao');

/**
 * Obtém o saldo atual do usuário
 */
async function obterSaldoUsuario(usuarioId) {
  try {
    const [resultado] = await pool.query(
      'SELECT saldo_atual, saldo_bloqueado FROM saldo_usuario WHERE usuario_id = ?',
      [usuarioId]
    );
    
    if (resultado.length === 0) {
      // Se não existir, criar registro com saldo 0
      await pool.query(
        'INSERT INTO saldo_usuario (usuario_id, saldo_atual, saldo_bloqueado) VALUES (?, 0.00, 0.00)',
        [usuarioId]
      );
      return { saldo_atual: 0.00, saldo_bloqueado: 0.00, saldo_disponivel: 0.00 };
    }

    const { saldo_atual, saldo_bloqueado } = resultado[0];
    return {
      saldo_atual,
      saldo_bloqueado,
      saldo_disponivel: saldo_atual - saldo_bloqueado
    };
  } catch (err) {
    console.error('Erro ao obter saldo do usuário:', err);
    throw err;
  }
}

/**
 * Registra uma movimentação no extrato
 */
async function registrarMovimentacao(usuarioId, tipo, valor, descricao, referenciaId = null, referenciaTipo = null, status = 'confirmado') {
  let conexao;
  try {
    conexao = await pool.getConnection();
    
    // Obter saldo anterior
    const [saldoAnterior] = await conexao.query(
      'SELECT saldo_atual FROM saldo_usuario WHERE usuario_id = ?',
      [usuarioId]
    );

    if (saldoAnterior.length === 0) {
      throw new Error('Usuário não possui registro de saldo');
    }
    const saldoAnt = parseFloat(saldoAnterior[0].saldo_atual);
    const valorNum = parseFloat(valor);
    
    // Registrar movimentação
    const [resultado] = await conexao.query(
      `INSERT INTO extrato_movimentacao 
       (usuario_id, tipo, valor, saldo_anterior, saldo_novo, descricao, referencia_id, referencia_tipo, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [usuarioId, tipo, valorNum, saldoAnt, saldoAnt + valorNum, descricao, referenciaId, referenciaTipo, status]
    );

    return resultado;
  } catch (err) {
    console.error('Erro ao registrar movimentação:', err);
    throw err;
  } finally {
    if (conexao) conexao.release();
  }
}

/**
 * Debita saldo do usuário (para palpites)
 */
async function debitarSaldo(usuarioId, valor, descricao, referenciaId, referenciaTipo = 'palpite') {
  let conexao;
  try {
    conexao = await pool.getConnection();
    await conexao.beginTransaction();

    // Verificar saldo disponível
    const [saldo] = await conexao.query(
      'SELECT saldo_atual, saldo_bloqueado FROM saldo_usuario WHERE usuario_id = ?',
      [usuarioId]
    );

    if (saldo.length === 0) {
      throw new Error('Usuário não possui registro de saldo');
    }

    const saldoDisponivel = saldo[0].saldo_atual - saldo[0].saldo_bloqueado;
    if (saldoDisponivel < valor) {
      throw new Error(`Saldo insuficiente. Disponível: R$ ${saldoDisponivel.toFixed(2)}`);
    }

    // Atualizar saldo
    await conexao.query(
      'UPDATE saldo_usuario SET saldo_atual = saldo_atual - ? WHERE usuario_id = ?',
      [valor, usuarioId]
    );

    // Registrar movimentação
    await conexao.query(
      `INSERT INTO extrato_movimentacao 
       (usuario_id, tipo, valor, saldo_anterior, saldo_novo, descricao, referencia_id, referencia_tipo, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [usuarioId, 'palpite_debitado', valor, saldo[0].saldo_atual, saldo[0].saldo_atual - valor, descricao, referenciaId, referenciaTipo, 'confirmado']
    );

    await conexao.commit();
    return { sucesso: true, saldoNovo: saldo[0].saldo_atual - valor };
  } catch (err) {
    if (conexao) await conexao.rollback();
    console.error('Erro ao debitar saldo:', err);
    throw err;
  } finally {
    if (conexao) conexao.release();
  }
}

/**
 * Credita saldo do usuário (para premiações)
 */
async function creditarSaldo(usuarioId, valor, descricao, referenciaId, referenciaTipo = 'premiacao') {
  let conexao;
  try {
    conexao = await pool.getConnection();
    await conexao.beginTransaction();

    // Obter saldo anterior
    const [saldo] = await conexao.query(
      'SELECT saldo_atual FROM saldo_usuario WHERE usuario_id = ?',
      [usuarioId]
    );

    if (saldo.length === 0) {
      // Criar registro se não existir
      await conexao.query(
        'INSERT INTO saldo_usuario (usuario_id, saldo_atual, saldo_bloqueado) VALUES (?, ?, 0.00)',
        [usuarioId, valor]
      );
    } else {
      // Atualizar saldo
      await conexao.query(
        'UPDATE saldo_usuario SET saldo_atual = saldo_atual + ? WHERE usuario_id = ?',
        [valor, usuarioId]
      );
    }

    // Registrar movimentação
    const saldoAnt = parseFloat(saldo && saldo.length > 0 ? saldo[0].saldo_atual : 0);
    const valorNum = parseFloat(valor);
    await conexao.query(
      `INSERT INTO extrato_movimentacao 
       (usuario_id, tipo, valor, saldo_anterior, saldo_novo, descricao, referencia_id, referencia_tipo, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [usuarioId, 'premiacao_creditada', valorNum, saldoAnt, saldoAnt + valorNum, descricao, referenciaId, referenciaTipo, 'confirmado']
    );

    await conexao.commit();
    return { sucesso: true, saldoNovo: saldoAnt + valor };
  } catch (err) {
    if (conexao) await conexao.rollback();
    console.error('Erro ao creditar saldo:', err);
    throw err;
  } finally {
    if (conexao) conexao.release();
  }
}

/**
 * Obter extrato de movimentações do usuário
 */
async function obterExtrato(usuarioId, filtros = {}) {
  try {
    let query = 'SELECT * FROM extrato_movimentacao WHERE usuario_id = ?';
    const params = [usuarioId];

    if (filtros.tipo) {
      query += ' AND tipo = ?';
      params.push(filtros.tipo);
    }

    if (filtros.status) {
      query += ' AND status = ?';
      params.push(filtros.status);
    }

    if (filtros.dataInicio) {
      query += ' AND criado_em >= ?';
      params.push(filtros.dataInicio);
    }

    if (filtros.dataFim) {
      query += ' AND criado_em <= ?';
      params.push(filtros.dataFim);
    }

    query += ' ORDER BY criado_em DESC LIMIT ? OFFSET ?';
    const limite = filtros.limite || 50;
    const pagina = filtros.pagina || 1;
    const offset = (pagina - 1) * limite;
    params.push(limite, offset);

    const [resultado] = await pool.query(query, params);
    return resultado;
  } catch (err) {
    console.error('Erro ao obter extrato:', err);
    throw err;
  }
}

/**
 * Criar/atualizar depósito pendente
 */
async function criarDeposito(usuarioId, valor, descricao = 'Depósito via PIX') {
  try {
    // Registrar como pendente
    const [resultado] = await pool.query(
      `INSERT INTO extrato_movimentacao 
       (usuario_id, tipo, valor, saldo_anterior, saldo_novo, descricao, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [usuarioId, 'deposito', valor, 0, 0, descricao, 'pendente']
    );

    return { sucesso: true, movimentacao_id: resultado.insertId };
  } catch (err) {
    console.error('Erro ao criar depósito:', err);
    throw err;
  }
}

/**
 * Confirmar depósito (após PIX recebido)
 */
async function confirmarDeposito(usuarioId, movimentacaoId) {
  let conexao;
  try {
    conexao = await pool.getConnection();
    await conexao.beginTransaction();

    // Obter dados da movimentação
    const [movimentacao] = await conexao.query(
      'SELECT valor FROM extrato_movimentacao WHERE id = ? AND usuario_id = ? AND tipo = "deposito"',
      [movimentacaoId, usuarioId]
    );

    if (movimentacao.length === 0) {
      throw new Error('Movimentação não encontrada');
    }

    const valor = parseFloat(movimentacao[0].valor);

    // Obter saldo anterior
    const [saldo] = await conexao.query(
      'SELECT saldo_atual FROM saldo_usuario WHERE usuario_id = ?',
      [usuarioId]
    );

    const saldoAnt = parseFloat(saldo[0].saldo_atual);

    // Atualizar saldo
    await conexao.query(
      'UPDATE saldo_usuario SET saldo_atual = saldo_atual + ? WHERE usuario_id = ?',
      [valor, usuarioId]
    );

    // Atualizar movimentação para confirmada
    await conexao.query(
      'UPDATE extrato_movimentacao SET status = "confirmado", saldo_anterior = ?, saldo_novo = ? WHERE id = ?',
      [saldoAnt, saldoAnt + valor, movimentacaoId]
    );

    await conexao.commit();
    return { sucesso: true, saldoNovo: saldoAnt + valor };
  } catch (err) {
    if (conexao) await conexao.rollback();
    console.error('Erro ao confirmar depósito:', err);
    throw err;
  } finally {
    if (conexao) conexao.release();
  }
}

/**
 * Criar/solicitar saque
 */
async function criarSaque(usuarioId, valor, descricao = 'Saque solicitado') {
  try {
    // Obter saldo
    const [saldo] = await pool.query(
      'SELECT saldo_atual FROM saldo_usuario WHERE usuario_id = ?',
      [usuarioId]
    );

    if (saldo.length === 0 || saldo[0].saldo_atual < valor) {
      throw new Error('Saldo insuficiente para saque');
    }

    // Registrar como pendente (não debita ainda)
    const [resultado] = await pool.query(
      `INSERT INTO extrato_movimentacao 
       (usuario_id, tipo, valor, saldo_anterior, saldo_novo, descricao, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [usuarioId, 'saque', valor, saldo[0].saldo_atual, saldo[0].saldo_atual - valor, descricao, 'pendente']
    );

    return { sucesso: true, movimentacao_id: resultado.insertId };
  } catch (err) {
    console.error('Erro ao criar saque:', err);
    throw err;
  }
}

/**
 * Confirmar saque (débito efetivo do saldo)
 */
async function confirmarSaque(usuarioId, movimentacaoId) {
  let conexao;
  try {
    conexao = await pool.getConnection();
    await conexao.beginTransaction();

    // Obter dados da movimentação
    const [movimentacao] = await conexao.query(
      'SELECT valor FROM extrato_movimentacao WHERE id = ? AND usuario_id = ? AND tipo = "saque" AND status = "pendente"',
      [movimentacaoId, usuarioId]
    );

    if (movimentacao.length === 0) {
      throw new Error('Movimentação de saque não encontrada ou já processada');
    }

    const valor = movimentacao[0].valor;

    // Obter saldo anterior
    const [saldo] = await pool.query(
      'SELECT saldo_atual FROM saldo_usuario WHERE usuario_id = ?',
      [usuarioId]
    );

    const saldoAnt = saldo[0].saldo_atual;

    // Debitar saldo
    await conexao.query(
      'UPDATE saldo_usuario SET saldo_atual = saldo_atual - ? WHERE usuario_id = ?',
      [valor, usuarioId]
    );

    // Atualizar movimentação para confirmada
    await conexao.query(
      'UPDATE extrato_movimentacao SET status = "confirmado", saldo_anterior = ?, saldo_novo = ? WHERE id = ?',
      [saldoAnt, saldoAnt - valor, movimentacaoId]
    );

    await conexao.commit();
    return { sucesso: true, saldoNovo: saldoAnt - valor };
  } catch (err) {
    if (conexao) await conexao.rollback();
    console.error('Erro ao confirmar saque:', err);
    throw err;
  } finally {
    if (conexao) conexao.release();
  }
}

module.exports = {
  obterSaldoUsuario,
  registrarMovimentacao,
  debitarSaldo,
  creditarSaldo,
  obterExtrato,
  criarDeposito,
  confirmarDeposito,
  criarSaque,
  confirmarSaque
};
