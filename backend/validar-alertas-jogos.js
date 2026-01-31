/**
 * Script: Validar se os alertas batem com os horários dos jogos
 * Conexão: Banco de PRODUÇÃO via SSH tunnel (porta 3307)
 */

const mysql = require('mysql2/promise');

const conexaoProd = mysql.createPool({
  host: '127.0.0.1',
  port: 3307,
  user: 'root',
  password: 'fBVhh6w2KW',
  database: 'bolaovip',
  waitForConnections: true,
  connectionLimit: 5
});

async function validarAlertas() {
  console.log('🔍 VALIDANDO ALERTAS vs HORÁRIOS DOS JOGOS');
  console.log('📡 Banco de Produção: 127.0.0.1:3307 (SSH Tunnel)\n');
  console.log('='.repeat(120));

  try {
    // Buscar todos os jogos e suas notificações
    // Usar CONVERT_TZ para converter UTC (armazenado) para Manaus (-04:00)
    const [dados] = await conexaoProd.query(`
      SELECT 
        j.id as jogo_id,
        j.partida_id,
        j.time_mandante,
        j.time_visitante,
        DATE_FORMAT(j.data, '%d/%m/%Y') as data_jogo,
        DATE_FORMAT(j.data, '%H:%i') as horario_jogo,
        ne.id as notif_id,
        ne.tempo_alerta,
        DATE_FORMAT(CONVERT_TZ(ne.data_agendada, '+00:00', '-04:00'), '%H:%i') as horario_alerta,
        ne.status
      FROM jogos j
      LEFT JOIN notificacoes_enviadas_jogos ne ON j.id = ne.jogo_id
      WHERE j.campeonato_id = 10 AND j.rodada = 2
      ORDER BY j.data, j.id, ne.tempo_alerta DESC
    `);

    if (dados.length === 0) {
      console.log('❌ Nenhum dado encontrado!');
      return;
    }

    // Agrupar por jogo
    const jogoMap = {};
    for (const row of dados) {
      const chave = `${row.jogo_id}`;
      if (!jogoMap[chave]) {
        jogoMap[chave] = {
          jogo_id: row.jogo_id,
          partida_id: row.partida_id,
          time_mandante: row.time_mandante,
          time_visitante: row.time_visitante,
          data_jogo: row.data_jogo,
          horario_jogo: row.horario_jogo,
          notificacoes: []
        };
      }
      if (row.notif_id) {
        jogoMap[chave].notificacoes.push({
          id: row.notif_id,
          tempo_alerta: row.tempo_alerta,
          horario_alerta: row.horario_alerta,
          status: row.status
        });
      }
    }

    // Validar cada jogo
    let totalErros = 0;
    const erros = [];

    for (const [key, jogo] of Object.entries(jogoMap)) {
      console.log(`\n⚽ ${jogo.time_mandante} x ${jogo.time_visitante}`);
      console.log(`   Jogo: ${jogo.data_jogo} às ${jogo.horario_jogo}`);
      console.log(`   ${'-'.repeat(115)}`);

      if (jogo.notificacoes.length === 0) {
        console.log(`   ⚠️  NENHUMA NOTIFICAÇÃO!`);
        totalErros++;
        erros.push({
          jogo: `${jogo.time_mandante} x ${jogo.time_visitante}`,
          problema: 'Nenhuma notificação agendada'
        });
      } else {
        // Converter horário do jogo para minutos
        const [hJogo, mJogo] = jogo.horario_jogo.split(':').map(Number);
        const minutosJogo = hJogo * 60 + mJogo;

        // Validar cada alerta
        let jogoComErro = false;
        for (const notif of jogo.notificacoes) {
          const [hAlerta, mAlerta] = notif.horario_alerta.split(':').map(Number);
          const minutosAlerta = hAlerta * 60 + mAlerta;

          // Calcular diferença esperada
          const minutosEsperados = minutosJogo - notif.tempo_alerta;

          if (minutosAlerta !== minutosEsperados) {
            console.log(`   ❌ Alerta de ${notif.tempo_alerta} min:`);
            console.log(`      Esperado: ${String(Math.floor(minutosEsperados / 60)).padStart(2, '0')}:${String(minutosEsperados % 60).padStart(2, '0')}`);
            console.log(`      Atual:    ${notif.horario_alerta}`);
            console.log(`      Diferença: ${minutosAlerta - minutosEsperados} minutos`);
            jogoComErro = true;
            totalErros++;
            erros.push({
              jogo: `${jogo.time_mandante} x ${jogo.time_visitante}`,
              horario_jogo: jogo.horario_jogo,
              alerta_minutos: notif.tempo_alerta,
              horario_esperado: String(Math.floor(minutosEsperados / 60)).padStart(2, '0') + ':' + String(minutosEsperados % 60).padStart(2, '0'),
              horario_atual: notif.horario_alerta,
              diferenca_minutos: minutosAlerta - minutosEsperados
            });
          } else {
            console.log(`   ✅ Alerta de ${notif.tempo_alerta} min: ${notif.horario_alerta} (correto)`);
          }
        }
      }
    }

    // Resumo
    console.log('\n' + '='.repeat(120));
    console.log('\n📊 RESUMO DA VALIDAÇÃO:\n');

    if (totalErros === 0) {
      console.log('✅ TODOS OS ALERTAS ESTÃO CORRETOS!');
    } else {
      console.log(`❌ ENCONTRADOS ${totalErros} ERROS:\n`);
      console.table(erros);

      console.log('\n📋 DETALHES DOS ERROS:');
      console.log('-'.repeat(120));

      for (const erro of erros) {
        if (erro.problema) {
          console.log(`\n⚽ ${erro.jogo}`);
          console.log(`   Problema: ${erro.problema}`);
        } else {
          console.log(`\n⚽ ${erro.jogo}`);
          console.log(`   Horário do jogo: ${erro.horario_jogo}`);
          console.log(`   Alerta: ${erro.alerta_minutos} minutos antes`);
          console.log(`   Esperado em: ${erro.horario_esperado}`);
          console.log(`   Agendado em: ${erro.horario_atual}`);
          console.log(`   ERRO: ${Math.abs(erro.diferenca_minutos)} minutos de diferença!`);
        }
      }
    }

    console.log('\n' + '='.repeat(120));
    console.log('\n✅ VALIDAÇÃO CONCLUÍDA!\n');

  } catch (err) {
    console.error('❌ ERRO:', err.message);
    console.error(err);
  } finally {
    await conexaoProd.end();
  }
}

validarAlertas();
