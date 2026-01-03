const pool = require('../database/conexao');
const { v4: uuidv4 } = require('uuid');
const saldoService = require('../services/saldoService');

function parseArgs() {
  const args = process.argv.slice(2);
  const result = {};
  args.forEach(arg => {
    const [k, v] = arg.split('=');
    const key = k.replace(/^-+/, '');
    result[key] = v === undefined ? true : v;
  });
  return result;
}

function printUsage() {
  console.log('\nUsage: node inserirPalpitesRodada.js [options]');
  console.log('\nOptions:');
  console.log("  --rodada=<number>\t\tRodada number (default: 20)");
  console.log("  --campeonato=<number>\tCampeonato id (default: 69)");
  console.log("  --grupo=<number>\t\tGrupo id (default: 2)");
  console.log("  --users=<1,2,3>\t\tCSV of user ids (default: '1,2,3,4,5,6')");
  console.log("  --valor=<number>\t\tValor do palpite (default: 15.00)");
  console.log("  --force=true|false\tForce recreate palpites (default: true)");
  console.log("  --noPremios=true|false\tDon't create premios (default: true)");
  console.log("  --help, -h\t\t\tShow this help\n");
}

async function inserirPalpites({ rodada = 20, campeonato_id = 69, grupo_id = 2, users = '1,2,3,4,5,6', valor = 15.00, noPremios = true, force = true }) {
  const conexao = await pool.getConnection();
  try {
    rodada = Number(rodada);
    campeonato_id = Number(campeonato_id);
    grupo_id = Number(grupo_id);
    valor = Number(valor);
    const usuarios = (typeof users === 'string') ? users.split(',').map(s => Number(s.trim())).filter(Boolean) : users;

    // Buscar jogos da rodada
    const [jogos] = await conexao.query(
      'SELECT id, time_mandante, time_visitante FROM jogos WHERE rodada = ? AND campeonato_id = ? ORDER BY id',
      [rodada, campeonato_id]
    );

    if (!jogos || jogos.length === 0) {
      console.log(`Nenhum jogo encontrado para rodada=${rodada} campeonato_id=${campeonato_id}`);
      return;
    }

    console.log(`Jogos encontrados: ${jogos.length} (rodada ${rodada} / campeonato ${campeonato_id})`);

    const resumo = [];

    for (const usuario_id of usuarios) {
      console.log(`\n🔁 Processando usuário ${usuario_id}...`);
      const codigo_envio = uuidv4().replace(/-/g, '').substring(0, 26);

      let inseridos = 0;
      let debitos = 0;
      let cobrancasCriadas = 0;

      // Se for force=true, remover palpites existentes e cobranças relacionadas para este usuário/rodada
      if (force) {
        try {
          const [delCobs] = await conexao.query(
            `DELETE FROM pix_cobrancas WHERE JSON_UNQUOTE(JSON_EXTRACT(payload_raw, '$.rodada')) = ? AND JSON_UNQUOTE(JSON_EXTRACT(payload_raw, '$.origem')) = 'palpites' AND JSON_UNQUOTE(JSON_EXTRACT(payload_raw, '$.usuario_id')) = ?`,
            [String(rodada), String(usuario_id)]
          );
          const [delPalpites] = await conexao.query(
            `DELETE FROM palpites WHERE id_usuario = ? AND rodada = ? AND campeonato_id = ?`,
            [usuario_id, rodada, campeonato_id]
          );

          console.log(`  ⚠️ force=true: removidos ${delPalpites.affectedRows} palpites e ${delCobs.affectedRows} cobrancas para usuario ${usuario_id}`);
        } catch (e) {
          console.error(`  Erro ao remover palpites/cobrancas para usuario ${usuario_id}:`, e.message || e);
          // continuar mesmo em caso de erro ao remover
        }
      }

      for (const jogo of jogos) {
        // Pular se já existe palpite para este usuário/jogo
        const [exist] = await conexao.query('SELECT id FROM palpites WHERE id_usuario = ? AND id_jogo = ?', [usuario_id, jogo.id]);
        if (exist && exist.length > 0) continue;

        // Geração simples de placares (random 0-3)
        const gols_casa = Math.floor(Math.random() * 4);
        const gols_fora = Math.floor(Math.random() * 4);

        const insertPalpite = await conexao.query(
          `INSERT INTO palpites (id_usuario, rodada, campeonato_id, grupo_id, id_jogo, gols_casa, gols_fora, codigo_envio)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [usuario_id, rodada, campeonato_id, grupo_id, jogo.id, gols_casa, gols_fora, codigo_envio]
        );

        const palpiteId = insertPalpite[0].insertId;
        inseridos++;

        // Tentar debitar o valor do palpite
        try {
          await saldoService.debitarSaldo(usuario_id, valor, `Palpite rodada ${rodada} (código: ${codigo_envio})`, palpiteId, 'palpite');

          // Marcar palpite pago
          await conexao.query('UPDATE palpites SET status_pagamento = ?, data_pagamento = NOW() WHERE id = ?', ['pago', palpiteId]);
          debitos++;
        } catch (err) {
          // Saldo insuficiente => criar cobrança PIX para este palpite (sem criar premio)
          const txid = uuidv4().replace(/-/g, '').substring(0, 35);
          const payload = {
            origem: 'palpites',
            rodada,
            campeonato_id,
            grupo_id,
            palpite_id: palpiteId,
            usuario_id
          };

          await conexao.query(
            `INSERT INTO pix_cobrancas (id_usuario, codigo_envio, txid, status, status_pagamento, valor_original, chave_pix, solicitacao_pagador, calendario_criacao, calendario_expiracao, payload_raw)
             VALUES (?, ?, ?, 'PENDENTE', 'PENDENTE', ?, ?, ?, NOW(), ?, ?)`,
            [usuario_id, codigo_envio, txid, valor, 'SIMULADO-CHAVE-PIX', `Cobrança palpite rodada ${rodada}`, 259200, JSON.stringify(payload)]
          );

          cobrancasCriadas++;
        }
      }

      resumo.push({ usuario_id, inseridos, debitos, cobrancasCriadas });
      console.log(`- Usuário ${usuario_id}: palpites inseridos=${inseridos}, debitos_sucedidos=${debitos}, cobrancas_criadas=${cobrancasCriadas}`);
    }

    console.log('\n✅ Execução concluída. Resumo por usuário:');
    for (const r of resumo) console.log(`  - Usuário ${r.usuario_id}: inseridos=${r.inseridos}, debitos=${r.debitos}, cobrancas=${r.cobrancasCriadas}`);

    console.log('\nObservação: o script NÃO cria registros em `premios` (flag noPremios=true).');
  } catch (err) {
    console.error('Erro ao inserir palpites:', err.message || err);
  } finally {
    conexao.release();
    await pool.end();
    process.exit(0);
  }
}

if (require.main === module) {
  const args = parseArgs();
  if (args.help || args.h) {
    printUsage();
    process.exit(0);
  }

  const params = {
    rodada: args.rodada || args.r || 20,
    campeonato_id: args.campeonato || args.c || 69,
    grupo_id: args.grupo || args.g || 2,
    users: args.users || args.u || '1,2,3,4,5,6',
    valor: args.valor || args.v || 15.00,
    noPremios: args.noPremios !== undefined ? (args.noPremios === 'false' ? false : true) : true,
    force: args.force === undefined ? true : (args.force === 'false' ? false : (args.force === 'true' || args.force === true))
  }; 

  // Basic validation
  if (!params.users || params.users.toString().trim() === '') {
    console.error('Error: --users must be a comma separated list of user ids');
    printUsage();
    process.exit(1);
  }

  // Normalize values
  params.rodada = Number(params.rodada);
  params.campeonato_id = Number(params.campeonato_id);
  params.grupo_id = Number(params.grupo_id);
  params.valor = Number(params.valor);

  console.log('\n📌 Running inserirPalpitesRodada with params:');
  console.log(`  rodada=${params.rodada}, campeonato_id=${params.campeonato_id}, grupo_id=${params.grupo_id}, users=${params.users}, valor=${params.valor.toFixed(2)}, force=${params.force}`);

  inserirPalpites(params);
}
