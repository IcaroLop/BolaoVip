/**
 * Script: Verificar Agendamentos - Premier League Rodada 22
 * Datas alvo: 17/01/2026 e 18/01/2026
 * Objetivo: Somente diagnosticar agendamentos de placar (260) e notificações (4) por jogo
 */

const pool = require('../database/conexao');
const { DateTime } = require('luxon');

function parseDataManaus(dateValue) {
  if (!dateValue) return null;
  if (dateValue instanceof Date) {
    const dtUTC = DateTime.fromJSDate(dateValue, { zone: 'utc' }).plus({ hours: 4 });
    return dtUTC.setZone('America/Manaus');
  }
  if (typeof dateValue === 'string') {
    return DateTime.fromISO(dateValue, { zone: 'America/Manaus', setZone: true });
  }
  const dtUTC = DateTime.fromJSDate(dateValue, { zone: 'utc' }).plus({ hours: 4 });
  return dtUTC.setZone('America/Manaus');
}

async function verificar() {
  const conexao = await pool.getConnection();
  try {
    const alvo = {
      campeonatoId: 69,
      rodada: 22,
      datas: ['2026-01-17', '2026-01-18'],
    };

    const agora = DateTime.now().setZone('America/Manaus');
    console.log(`⏰ Hora atual (Manaus): ${agora.toFormat('dd/LL/yyyy HH:mm:ss')}`);
    console.log(` Verificando agendamentos para Rodada ${alvo.rodada} (Campeonato ${alvo.campeonatoId})`);
    console.log(` Datas: ${alvo.datas.join(', ')}\n`);

    // Buscar jogos da rodada e datas alvo (Premier League)
    const [jogos] = await conexao.query(
      `SELECT j.*
       FROM jogos j
       WHERE j.campeonato_id = ?
         AND j.rodada = ?
         AND DATE(j.data) IN (?)
       ORDER BY j.data ASC`,
      [alvo.campeonatoId, alvo.rodada, alvo.datas]
    );

    if (jogos.length === 0) {
      console.log('ℹ️ Nenhum jogo encontrado para os critérios informados.');
      return;
    }

    console.log('='.repeat(80));
    console.log(`JOGOS ENCONTRADOS - Rodada ${alvo.rodada} (Premier League)`);
    console.log('='.repeat(80));
    console.log(`\n Total: ${jogos.length} jogos encontrados\n`);

    // Agrupar por data e horário (Manaus)
    const grupos = new Map(); // chave: yyyy-LL-dd HH:mm
    for (const jogo of jogos) {
      const dt = parseDataManaus(jogo.data);
      const chave = `${dt.toFormat('yyyy-LL-dd HH:mm')}`;
      if (!grupos.has(chave)) grupos.set(chave, []);
      grupos.get(chave).push({ ...jogo, dataObj: dt });
    }

    // Ordenar chaves
    const chavesOrdenadas = Array.from(grupos.keys()).sort();

    for (const chave of chavesOrdenadas) {
      const jogosGrupo = grupos.get(chave);
      const primeiro = jogosGrupo[0];
      const dataBase = primeiro.dataObj; // horário do grupo
      const dataFim = dataBase.plus({ minutes: 130 });

      console.log('-'.repeat(80));
      console.log(` ${dataBase.toFormat('dd/LL/yyyy')} | GRUPO: ${dataBase.toFormat('HH:mm')} (${jogosGrupo.length} jogos)`);
      console.log('-'.repeat(80));
      jogosGrupo.forEach((j, idx) => {
        console.log(`   ${idx + 1}. ${j.time_mandante} vs ${j.time_visitante}`);
        console.log(`      Horário: ${j.dataObj.toFormat('dd/LL/yyyy HH:mm:ss')}`);
        console.log(`      Rodada: ${j.rodada} | Status: ${j.status}`);
      });

      console.log(`\n   ⏱  Janela de requisições esperada:`);
      console.log(`      Início: ${dataBase.toFormat('dd/LL/yyyy HH:mm:ss')}`);
      console.log(`      Fim: ${dataFim.toFormat('dd/LL/yyyy HH:mm:ss')} (+130min)\n`);

      // Verificar agendamentos de placar
      const [agendamentos] = await conexao.query(
        `SELECT * FROM agendador_requisicoes
         WHERE tipo = 'placar'
           AND grupo_chave LIKE ?
         ORDER BY data_hora ASC`,
        [`${dataBase.toFormat('yyyy-LL-dd HH:mm')}-placar%`]
      );

      if (agendamentos.length === 0) {
        console.log('    ❌ NENHUM agendamento de placar encontrado!');
      } else {
        const ultimoAgendamento = agendamentos[agendamentos.length - 1];
        const ultimoData = parseDataManaus(ultimoAgendamento.data_hora);
        const diferencaMinutos = ultimoData.diff(dataBase, 'minutes').minutes;
        const isCorreto = diferencaMinutos >= 129 && diferencaMinutos <= 131;
        const status = isCorreto ? '✅ Agendamentos corretos!' : '❌ Agendamentos INCORRETOS:';

        console.log(`    AGENDAMENTOS DE PLACAR (agendador_requisicoes):`);
        console.log(`      Total agendado: ${agendamentos.length} requisições`);
        console.log(`      Primeira: ${parseDataManaus(agendamentos[0].data_hora).toFormat('dd/LL/yyyy HH:mm:ss')}`);
        console.log(`      Última: ${ultimoData.toFormat('dd/LL/yyyy HH:mm:ss')}`);
        console.log(`      ${status}`);

        if (!isCorreto) {
          console.log(`         - Última deveria ser ~${dataFim.toFormat('HH:mm:ss')}, mas é ${ultimoData.toFormat('HH:mm:ss')}`);
        }

        if (agendamentos.length > 0) {
          console.log(`\n      Primeiros 5 agendamentos:`);
          for (let i = 0; i < Math.min(5, agendamentos.length); i++) {
            const data = parseDataManaus(agendamentos[i].data_hora);
            console.log(`         ${i + 1}. ${data.toFormat('HH:mm:ss')} - ${agendamentos[i].status} - ${agendamentos[i].grupo_chave}`);
          }
          if (agendamentos.length > 10) {
            console.log(`      ... (${agendamentos.length - 10} agendamentos intermediários)\n`);
            console.log(`      Últimos 5 agendamentos:`);
            for (let i = Math.max(0, agendamentos.length - 5); i < agendamentos.length; i++) {
              const data = parseDataManaus(agendamentos[i].data_hora);
              console.log(`         ${i - agendamentos.length + 6}. ${data.toFormat('HH:mm:ss')} - ${agendamentos[i].status} - ${agendamentos[i].grupo_chave}`);
            }
          }
        }
      }

      // Verificar notificações
      console.log(`\n    NOTIFICAÇÕES AGENDADAS:`);
      const [notificacoes] = await conexao.query(
        `SELECT n.*, j.time_mandante, j.time_visitante
         FROM notificacoes_enviadas_jogos n
         JOIN jogos j ON n.jogo_id = j.id
         WHERE DATE(j.data) = ?
           AND j.campeonato_id = ?
           AND j.rodada = ?
           AND n.tempo_alerta IN (60, 30, 15, 5)
         ORDER BY n.tempo_alerta DESC, n.data_agendada ASC`,
        [dataBase.toFormat('yyyy-LL-dd'), alvo.campeonatoId, alvo.rodada]
      );

      if (notificacoes.length === 0) {
        console.log(`      Total: 0 notificações agendadas`);
      } else {
        const porTempo = new Map();
        for (const notif of notificacoes) {
          if (!porTempo.has(notif.tempo_alerta)) porTempo.set(notif.tempo_alerta, []);
          porTempo.get(notif.tempo_alerta).push(notif);
        }

        console.log(`      Total: ${notificacoes.length} notificações agendadas\n`);
        for (const tempo of [60, 30, 15, 5]) {
          const notifs = porTempo.get(tempo) || [];
          const emoji = notifs.length > 0 ? '✅' : '⚠️';
          console.log(`      ${emoji} Notificações ${tempo} min antes: ${notifs.length} agendadas`);
          if (notifs.length > 0 && notifs.length <= 3) {
            for (const n of notifs) {
              const d = parseDataManaus(n.data_agendada);
              console.log(`         - ${d.toFormat('HH:mm:ss')} | ${n.time_mandante} vs ${n.time_visitante} | ⏳ ${n.status}`);
            }
          } else if (notifs.length > 3) {
            const primeiros = notifs.slice(0, 2);
            for (const n of primeiros) {
              const d = parseDataManaus(n.data_agendada);
              console.log(`         - ${d.toFormat('HH:mm:ss')} | ${n.time_mandante} vs ${n.time_visitante} | ⏳ ${n.status}`);
            }
            console.log(`         ... e mais ${notifs.length - 2} notificações`);
          }
        }
      }

      console.log();
    }

    console.log('='.repeat(80));
    console.log(' Diagnóstico concluído.');
    console.log('='.repeat(80));
  } catch (err) {
    console.error('Erro ao verificar agendamentos:', err.message);
  } finally {
    conexao.release();
  }
}

verificar();
