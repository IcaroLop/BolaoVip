const pool = require('../database/conexao');
const saldoService = require('../services/saldoService');

(async () => {
  try {
    const usuarioId = parseInt(process.argv[2] || '7', 10);
    const valorFiltro = process.argv[3] ? parseFloat(process.argv[3]) : null;

    const params = [usuarioId];
    let sql = `SELECT id, valor, status, criado_em FROM extrato_movimentacao 
               WHERE usuario_id = ? AND tipo = 'deposito' AND status = 'pendente'`;
    if (valorFiltro) {
      sql += ' AND valor = ?';
      params.push(valorFiltro);
    }
    sql += ' ORDER BY id DESC LIMIT 1';

    const [rows] = await pool.query(sql, params);
    if (!rows.length) {
      console.log(JSON.stringify({ ok: false, message: 'Nenhum depósito pendente encontrado para confirmar.' }, null, 2));
      process.exit(0);
    }

    const mov = rows[0];
    const resultado = await saldoService.confirmarDeposito(usuarioId, mov.id);
    console.log(JSON.stringify({ ok: true, usuarioId, movimentacaoId: mov.id, valor: mov.valor, resultado }, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  } finally {
    try { pool.end(); } catch {}
  }
})();
