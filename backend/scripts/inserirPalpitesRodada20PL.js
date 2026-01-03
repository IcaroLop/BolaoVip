// Inserir palpites para usuários 1-6 nos jogos da rodada 20 da Premier League
const pool = require('../database/conexao');
const { v4: uuidv4 } = require('uuid');
const saldoService = require('../services/saldoService');

async function inserirPalpites() {
  const conexao = await pool.getConnection();
  const campeonatoId = 69; // Premier League (confirmar antes de executar)
  const rodada = 20;
  const grupoId = 2; // BolaoPremier
  const valorPalpite = 15.00;

  try {
    console.log(`🎯 Inserindo palpites da Rodada ${rodada} (Premier League) para usuários 1-6...`);

    const [jogos] = await conexao.query(
      `SELECT id, time_mandante, time_visitante
       FROM jogos
       WHERE campeonato_id = ? AND rodada = ?
       ORDER BY id ASC`,
      [campeonatoId, rodada]
    );

    if (jogos.length === 0) {
      console.log(`⚠️ Nenhum jogo encontrado para a rodada ${rodada}. Abortando.`);
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
        const [existe] = await conexao.query(
          `SELECT id, status_pagamento FROM palpites
           WHERE id_usuario = ? AND campeonato_id = ? AND rodada = ? AND id_jogo = ?
           LIMIT 1`,
          [usuarioId, campeonatoId, rodada, jogo.id]
        );

        if (existe.length > 0) continue;

        const golsMandante = Math.floor(Math.random() * 4);
        const golsVisitante = Math.floor(Math.random() * 4);

        const [result] = await conexao.query(
          `INSERT INTO palpites 
           (id_usuario, rodada, campeonato_id, grupo_id, id_jogo, gols_casa, gols_fora, codigo_envio, status_pagamento, data_pagamento, observacao_pagamento)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pago', NOW(), 'Inserido via script: rodada 20 PL')`,
          [usuarioId, rodada, campeonatoId, grupoId, jogo.id, golsMandante, golsVisitante, codigoEnvio]
        );

        inseridos++;

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
          console.warn(`⚠️ Usuário ${usuarioId}: erro ao debitar. Marcando palpite ${result.insertId} como pendente e gerando cobrança.`);
          // Marcar palpite como pendente
          await conexao.query(
            `UPDATE palpites SET status_pagamento = 'pendente', data_pagamento = NULL, observacao_pagamento = CONCAT(IFNULL(observacao_pagamento,''), ' | débito falhou')
             WHERE id = ?`,
            [result.insertId]
          );
          // Inserir prêmio negativo para gerar cobrança
          const valorNegativo = -Math.abs(valorPalpite);
          const tipoPremio = 'outro';
          const [resPremio] = await conexao.query(
            `INSERT INTO premios (usuario_id, rodada, campeonato_id, grupo_id, tipo_premio, valor, status_pagamento) VALUES (?, ?, ?, ?, ?, ?, 'pendente')`,
            [usuarioId, rodada, campeonatoId, grupoId, tipoPremio, valorNegativo]
          );

          // Inserir cobrança PIX diretamente para este prêmio
          const codigo_envio = uuidv4().replace(/-/g, '').substring(0, 26);
          const insertData = {
            id_usuario: usuarioId,
            codigo_envio,
            txid: codigo_envio,
            status: 'ATIVA',
            status_pagamento: 'PENDENTE',
            valor_original: Number(Math.abs(valorNegativo)),
            chave_pix: process.env.EFI_PIX_KEY || '',
            solicitacao_pagador: `Cobrança palpite rodada ${rodada}`,
            loc_id: null,
            loc_location: null,
            loc_tipo: null,
            pix_copiaecola: null,
            calendario_criacao: new Date(),
            calendario_expiracao: 259200,
            payload_raw: JSON.stringify({ origem: 'premios', rodada: rodada, campeonato_id: campeonatoId, grupo_id: grupoId, premio_id: resPremio.insertId }),
            webhook_recebido: false,
            webhook_payload: null
          };

          await conexao.query('INSERT INTO pix_cobrancas SET ?', [insertData]);

          pendentesSaldo++;
        }
      }

      resumo.push({ usuarioId, inseridos, debitados, pendentesSaldo });
    }

    console.log('\n📈 RESUMO:');
    resumo.forEach(r => {
      console.log(`Usuário ${r.usuarioId}: Inseridos=${r.inseridos}, Debitados=${r.debitados}, PendentesSaldo=${r.pendentesSaldo}`);
    });

    console.log('\n✅ Concluído (script pronto). Execute somente com DB local disponível.');
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