// Inserir palpites para usuários 1-6 nos jogos restantes da rodada 18 da Premier League
const pool = require('../database/conexao');
const { v4: uuidv4 } = require('uuid');
const saldoService = require('../services/saldoService');

async function inserirPalpites() {
  const conexao = await pool.getConnection();
  const campeonatoId = 69; // Premier League
  const rodada = 18;
  const grupoId = 2; // BolaoPremier
  const valorPalpite = 15.00;

  try {
    console.log('🎯 Inserindo palpites faltantes da Rodada 18 (Premier League) para usuários 1-6...');

    // Buscar jogos da rodada 18
    const [jogos] = await conexao.query(
      `SELECT id, time_mandante, time_visitante
       FROM jogos
       WHERE campeonato_id = ? AND rodada = ?
       ORDER BY id ASC`,
      [campeonatoId, rodada]
    );

    if (jogos.length === 0) {
      console.log('⚠️ Nenhum jogo encontrado para a rodada 18. Abortando.');
      return;
    }

    console.log(`📋 Encontrados ${jogos.length} jogos na rodada ${rodada}.`);

    const resumo = [];

    for (let usuarioId = 1; usuarioId <= 6; usuarioId++) {
      const codigoEnvio = uuidv4().replace(/-/g, '').substring(0, 26);
      let inseridos = 0;
      let debitados = 0;
      let pendentesSaldo = 0;

      for (const jogo of jogos) {
        // Checar se já existe palpite para este jogo
        const [existe] = await conexao.query(
          `SELECT id, status_pagamento FROM palpites
           WHERE id_usuario = ? AND campeonato_id = ? AND rodada = ? AND id_jogo = ?
           LIMIT 1`,
          [usuarioId, campeonatoId, rodada, jogo.id]
        );

        if (existe.length > 0) {
          // Palpite já existe - não alterar
          continue;
        }

        // Gols aleatórios leves (0-3)
        const golsMandante = Math.floor(Math.random() * 4);
        const golsVisitante = Math.floor(Math.random() * 4);

        // Inserir palpite como pago
        const [result] = await conexao.query(
          `INSERT INTO palpites 
           (id_usuario, rodada, campeonato_id, grupo_id, id_jogo, gols_casa, gols_fora, codigo_envio, status_pagamento, data_pagamento, observacao_pagamento)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pago', NOW(), 'Inserido via script: rodada 18 PL')`,
          [usuarioId, rodada, campeonatoId, grupoId, jogo.id, golsMandante, golsVisitante, codigoEnvio]
        );

        inseridos++;

        // Debitar saldo do usuário
        try {
          await saldoService.debitarSaldo(
            usuarioId,
            valorPalpite,
            `Débito palpite rod ${rodada} - jogo ${jogo.id} (${jogo.time_mandante} x ${jogo.time_visitante})`,
            result.insertId,
            'palpite'
          );
          debitados++;
        } catch (err) {
          // Falha no débito: marcar palpite como pendente
          console.warn(`⚠️ Usuário ${usuarioId}: saldo insuficiente ou erro ao debitar. Marcando palpite ${result.insertId} como pendente.`);
          await conexao.query(
            `UPDATE palpites SET status_pagamento = 'pendente', data_pagamento = NULL, observacao_pagamento = CONCAT(IFNULL(observacao_pagamento,''), ' | débito falhou')
             WHERE id = ?`,
            [result.insertId]
          );
          pendentesSaldo++;
        }
      }

      resumo.push({ usuarioId, inseridos, debitados, pendentesSaldo });
    }

    console.log('\n📈 RESUMO:');
    resumo.forEach(r => {
      console.log(`Usuário ${r.usuarioId}: Inseridos=${r.inseridos}, Debitados=${r.debitados}, PendentesSaldo=${r.pendentesSaldo}`);
    });

    console.log('\n✅ Concluído.');
  } catch (err) {
    console.error('❌ Erro ao inserir palpites:', err.message);
    throw err;
  } finally {
    conexao.release();
    await pool.end();
  }
}

inserirPalpites()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
