// Crédito automático para cobrir palpites pendentes da rodada 18 (Premier League) e efetivar débitos por palpite
const pool = require('../database/conexao');
const saldoService = require('../services/saldoService');

async function processarCreditosEDebitos() {
  const conexao = await pool.getConnection();
  const campeonatoId = 69; // Premier League
  const rodada = 18;
  const usuarios = [1,2,3,4,5,6];
  const valorPalpite = 15.00;

  try {
    console.log('💳 Iniciando crédito automático + débitos por palpite (rodada 18 PL) para usuários 1-6...');

    const resumo = [];

    for (const usuarioId of usuarios) {
      // Buscar palpites pendentes do usuário
      const [pendentes] = await conexao.query(
        `SELECT id, id_jogo FROM palpites
         WHERE id_usuario = ? AND campeonato_id = ? AND rodada = ? AND status_pagamento = 'pendente'`,
        [usuarioId, campeonatoId, rodada]
      );

      const qtdPendentes = pendentes.length;
      if (qtdPendentes === 0) {
        console.log(`Usuário ${usuarioId}: nenhum palpite pendente.`);
        resumo.push({ usuarioId, creditado: 0, debitado: 0, pagosAtualizados: 0 });
        continue;
      }

      const totalCredito = qtdPendentes * valorPalpite;
      console.log(`Usuário ${usuarioId}: pendentes=${qtdPendentes}, crédito necessário=R$ ${totalCredito.toFixed(2)}`);

      // Creditar saldo suficiente
      try {
        await saldoService.creditarSaldo(
          usuarioId,
          totalCredito,
          `Crédito extraordinário para palpites pendentes (rodada ${rodada}, PL)`,
          null,
          'palpite'
        );
        console.log(`   ✅ Crédito de R$ ${totalCredito.toFixed(2)} efetuado.`);
      } catch (err) {
        console.error(`   ❌ Falha ao creditar saldo para usuário ${usuarioId}:`, err.message);
        resumo.push({ usuarioId, creditado: 0, debitado: 0, pagosAtualizados: 0, erro: 'credito' });
        continue;
      }

      let debitado = 0;
      let pagosAtualizados = 0;

      // Debitar por palpite e marcar como pago
      for (const p of pendentes) {
        try {
          await saldoService.debitarSaldo(
            usuarioId,
            valorPalpite,
            `Débito palpite rod ${rodada} - jogo ${p.id_jogo}`,
            p.id,
            'palpite'
          );
          debitado++;

          // Atualizar palpite para pago
          await conexao.query(
            `UPDATE palpites SET status_pagamento = 'pago', data_pagamento = NOW(), observacao_pagamento = CONCAT(IFNULL(observacao_pagamento,''), ' | crédito+débito automático')
             WHERE id = ?`,
            [p.id]
          );
          pagosAtualizados++;
        } catch (err) {
          console.error(`   ❌ Falha ao debitar palpite ${p.id} do usuário ${usuarioId}:`, err.message);
        }
      }

      resumo.push({ usuarioId, creditado: totalCredito, debitado, pagosAtualizados });
    }

    console.log('\n📈 RESUMO FINAL:');
    resumo.forEach(r => {
      console.log(`Usuário ${r.usuarioId}: creditado=R$ ${Number(r.creditado || 0).toFixed(2)}, debitado=${r.debitado}, pagosAtualizados=${r.pagosAtualizados}`);
    });

    console.log('\n✅ Processo concluído.');
  } catch (err) {
    console.error('❌ Erro geral no processamento:', err.message);
    throw err;
  } finally {
    conexao.release();
    await pool.end();
  }
}

processarCreditosEDebitos()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
