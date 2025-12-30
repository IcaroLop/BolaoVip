const pool = require('../database/conexao');
const { v4: uuidv4 } = require('uuid');

async function inserirPalpitesRodada17() {
  const conexao = await pool.getConnection();
  
  try {
    await conexao.beginTransaction();

    const usuarios = [1, 2, 3, 4, 5, 6]; // Todos exceto ID 7
    const campeonato_id = 69; // Premier League
    const rodada = 17;
    const grupo_id = 1; // Grupo padrão

    // Jogos da rodada 17
    const jogos = [
      { id: 1089, casa: 2, fora: 1 },
      { id: 1090, casa: 1, fora: 0 },
      { id: 1091, casa: 3, fora: 2 },
      { id: 1092, casa: 2, fora: 2 },
      { id: 1093, casa: 1, fora: 1 },
      { id: 1094, casa: 0, fora: 3 },
      { id: 1095, casa: 1, fora: 2 },
      { id: 1096, casa: 2, fora: 1 },
      { id: 1097, casa: 1, fora: 3 },
      { id: 1098, casa: 2, fora: 0 }
    ];

    for (const usuario_id of usuarios) {
      const codigo_envio = uuidv4().replace(/-/g, '').substring(0, 26);
      const txid = uuidv4().replace(/-/g, '').substring(0, 35);
      
      console.log(`\n📝 Criando palpites para usuário ${usuario_id}...`);

      // Inserir palpites
      for (const jogo of jogos) {
        await conexao.query(
          `INSERT INTO palpites (id_usuario, rodada, campeonato_id, grupo_id, id_jogo, gols_casa, gols_fora, codigo_envio, status_pagamento, data_pagamento)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PAGO', NOW())`,
          [usuario_id, rodada, campeonato_id, grupo_id, jogo.id, jogo.casa, jogo.fora, codigo_envio]
        );
      }
      console.log(`  ✅ ${jogos.length} palpites criados`);

      // Criar cobrança PIX paga
      const valorPalpite = 15.00;
      await conexao.query(
        `INSERT INTO pix_cobrancas (
          id_usuario, codigo_envio, txid, status, status_pagamento, 
          valor_original, chave_pix, pix_copiaecola, 
          calendario_criacao, calendario_expiracao,
          webhook_recebido, data_pagamento
        ) VALUES (?, ?, ?, 'CONCLUIDA', 'PAGO', ?, 'suporte@bolaovip.com', 'PIX_EXEMPLO', NOW(), DATE_ADD(NOW(), INTERVAL 1 DAY), TRUE, NOW())`,
        [usuario_id, codigo_envio, txid, valorPalpite]
      );
      console.log(`  💰 Cobrança PIX PAGA criada (R$ ${valorPalpite.toFixed(2)})`);

      // Debitar do saldo (registrar movimentação)
      await conexao.query(
        `INSERT INTO extrato_movimentacao (usuario_id, tipo, valor, saldo_anterior, saldo_novo, descricao, referencia_id, referencia_tipo, status, data_criacao)
         VALUES (?, 'debito', ?, 15.00, 0.00, 'Palpite rodada ${rodada} - PAGO', ?, 'palpite', 'confirmado', NOW())`,
        [usuario_id, valorPalpite, codigo_envio]
      );
      console.log(`  📊 Movimentação de saldo registrada`);
    }

    await conexao.commit();
    console.log('\n✅ Todos os palpites e cobranças foram criados com sucesso!');
    console.log(`\n📋 Resumo:`);
    console.log(`   - ${usuarios.length} usuários`);
    console.log(`   - ${jogos.length} jogos por usuário`);
    console.log(`   - Total: ${usuarios.length * jogos.length} palpites criados`);
    console.log(`   - ${usuarios.length} cobranças PIX PAGAS`);

  } catch (err) {
    await conexao.rollback();
    console.error('❌ Erro ao inserir palpites:', err);
  } finally {
    conexao.release();
    process.exit();
  }
}

inserirPalpitesRodada17();
