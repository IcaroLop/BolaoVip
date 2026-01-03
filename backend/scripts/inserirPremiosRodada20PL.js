// Insere prêmios negativos (cobranças) na rodada 20 para usuários 1-6 do campeonato 69 (Premier League)
const pool = require('../database/conexao');

async function inserirPremios() {
  const conexao = await pool.getConnection();
  const campeonatoId = 69;
  const rodada = 20;
  const grupoId = 2;

  try {
    console.log(`➕ Inserindo prêmios negativos para rodada ${rodada} (usuários 1..6)...`);

    for (let usuarioId = 1; usuarioId <= 6; usuarioId++) {
      // Verificar se já existe prêmio negativo pendente
      const [existe] = await conexao.query(
        `SELECT id FROM premios WHERE usuario_id = ? AND rodada = ? AND campeonato_id = ? AND valor < 0 AND status_pagamento = 'pendente' LIMIT 1`,
        [usuarioId, rodada, campeonatoId]
      );

      if (existe.length > 0) {
        console.log(`Usuário ${usuarioId}: já existe prêmio negativo pendente (id=${existe[0].id}), pulando.`);
        continue;
      }

      const valor = -10.00; // valor de cobrança (exemplo)
      const tipo = 'outro';

      const [res] = await conexao.query(
        `INSERT INTO premios (usuario_id, rodada, campeonato_id, grupo_id, tipo_premio, valor, status_pagamento) VALUES (?, ?, ?, ?, ?, ?, 'pendente')`,
        [usuarioId, rodada, campeonatoId, grupoId, tipo, valor]
      );

      console.log(`Usuário ${usuarioId}: inserido prêmio id=${res.insertId} valor=${valor}`);
    }

    console.log('\n✅ Prêmios negativos inseridos. Agora execute gerarCobrancasDaRodada.js 20 69 2 para gerar cobranças.');
  } catch (err) {
    console.error('Erro ao inserir prêmios:', err.message);
    throw err;
  } finally {
    conexao.release();
    await pool.end();
  }
}

inserirPremios()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));