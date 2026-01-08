/**
 * Diagnóstico de pagamentos/saldo por rodada
 *
 * Uso:
 *   node scripts/diagnosticarPagamentos.js <rodada> <usuarioIdOpcional>
 * Exemplo:
 *   node scripts/diagnosticarPagamentos.js 21 7
 */

const pool = require('../database/conexao');

async function main() {
  const rodada = Number(process.argv[2]);
  const usuarioId = process.argv[3] ? Number(process.argv[3]) : null;

  if (!rodada) {
    console.error('Informe a rodada: node scripts/diagnosticarPagamentos.js <rodada> <usuarioIdOpcional>');
    process.exit(1);
  }

  try {
    console.log(`\n===== Diagnóstico Pagamentos - Rodada ${rodada} =====\n`);

    // 1) Pagamentos gerados para a rodada
    const [premios] = await pool.query(
      `SELECT p.id, p.usuario_id, u.nome, p.tipo_premio, p.valor, p.status_pagamento, p.data_pagamento
       FROM premios p
       JOIN usuarios u ON u.id = p.usuario_id
       WHERE p.rodada = ?
       ORDER BY p.valor DESC`,
      [rodada]
    );
    console.log('Premios gerados (status / valor):');
    console.table(premios);

    // 2) Status da rodada
    const [rodadaInfo] = await pool.query(
      `SELECT numero, status, pagamentos_gerados, pagamentos_gerados_em
       FROM rodadas WHERE numero = ?`,
      [rodada]
    );
    console.log('\nRodada:');
    console.table(rodadaInfo);

    // 3) Ranking top 10
    const [ranking] = await pool.query(
      `SELECT rr.id_usuario, u.nome, rr.pontos_totais, rr.posicao
       FROM ranking_rodada rr
       JOIN usuarios u ON u.id = rr.id_usuario
       WHERE rr.rodada = ?
       ORDER BY rr.pontos_totais DESC
       LIMIT 10`,
      [rodada]
    );
    console.log('\nRanking (top 10):');
    console.table(ranking);

    if (usuarioId) {
      // 4) Saldo do usuário
      const [saldo] = await pool.query(
        `SELECT usuario_id, saldo_atual, saldo_disponivel, saldo_bloqueado, ultima_atualizacao
         FROM saldo_usuario WHERE usuario_id = ?`,
        [usuarioId]
      );
      console.log(`\nSaldo do usuário ${usuarioId}:`);
      console.table(saldo);

      // 5) Movimentações recentes do usuário
      const [movs] = await pool.query(
        `SELECT id, tipo_movimento, valor, descricao, saldo_anterior, saldo_posterior, data_movimento
         FROM saldo_movimentacoes
         WHERE usuario_id = ?
         ORDER BY data_movimento DESC
         LIMIT 10`,
        [usuarioId]
      );
      console.log(`\nÚltimas movimentações do usuário ${usuarioId}:`);
      console.table(movs);
    } else {
      console.log('\nDica: passe o usuarioId como segundo argumento para ver saldo e movimentações.');
    }
  } catch (err) {
    console.error('Erro no diagnóstico:', err.message);
  } finally {
    pool.end();
  }
}

main();
