/**
 * Script: Verificar Agendamentos de Hoje
 * Mostra todos os jogos, notificações e requisições agendadas para hoje
 */

const pool = require('../database/conexao');
const { DateTime } = require('luxon');

// Função auxiliar para ler datas em Manaus sem conversão dupla
function parseDataManaus(dateValue) {
  if (!dateValue) return null;
  
  // Driver retorna datas 4h antes quando time_zone = '-04:00'
  // Adicionar 4h para compensar o bug
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

async function verificarAgendamentosHoje() {
  const conexao = await pool.getConnection();
  try {
    const agora = DateTime.now().setZone('America/Manaus');
    const hojeKey = agora.toFormat('yyyy-LL-dd');
    console.log(`⏰ Hora atual (Manaus): ${agora.toFormat('dd/LL/yyyy HH:mm:ss')}`);
    console.log(` Verificando agendamentos para: ${hojeKey}\n`);

    // Buscar todos os jogos de hoje
    const [jogos] = await conexao.query(`
      SELECT j.*, n.id as notif_id
      FROM jogos j
      LEFT JOIN notificacoes_enviadas_jogos n ON j.id = n.partida_id
      WHERE DATE(j.data) = ?
      AND j.campeonato_id = 69
      ORDER BY j.data ASC
    `, [hojeKey]);

    if (jogos.length === 0) {
      console.log('ℹ️ Nenhum jogo encontrado para hoje.');
      return;
    }

    console.log('='.repeat(80));
    console.log('JOGOS DA PREMIER LEAGUE HOJE (Campeonato 69)');
    console.log('='.repeat(80));
    console.log(`\n Total: ${jogos.length} jogos encontrados\n`);

    // Agrupar por horário
    const porHorario = new Map();
    for (const jogo of jogos) {
      const dt = parseDataManaus(jogo.data);
      const horario = dt.toFormat('HH:mm');
      if (!porHorario.has(horario)) {
        porHorario.set(horario, []);
      }
      porHorario.get(horario).push({ ...jogo, dataObj: dt });
    }

    // Processar cada grupo de horário
    for (const [horario, jogosGrupo] of porHorario.entries()) {
      console.log('-'.repeat(80));
      console.log(` GRUPO: ${horario} (${jogosGrupo.length} jogos)`);
      console.log('-'.repeat(80));

      // Listar jogos
      for (let i = 0; i < jogosGrupo.length; i++) {
        const jogo = jogosGrupo[i];
        console.log(`   ${i + 1}. ${jogo.time_mandante} vs ${jogo.time_visitante}`);
        console.log(`      Horário: ${jogo.dataObj.toFormat('dd/LL/yyyy HH:mm:ss')}`);
        console.log(`      Rodada: ${jogo.rodada} | Status: ${jogo.status}`);
      }

      // Buscar agendamentos de placar
      const primeiroJogo = jogosGrupo[0];
      const dataBase = primeiroJogo.dataObj;
      const dataFim = dataBase.plus({ minutes: 130 });

      console.log(`\n   ⏱  Janela de requisições esperada:`);
      console.log(`      Início: ${dataBase.toFormat('dd/LL/yyyy HH:mm:ss')}`);
      console.log(`      Fim: ${dataFim.toFormat('dd/LL/yyyy HH:mm:ss')} (+130min)\n`);

      // Agendamentos de placar
      const [agendamentos] = await conexao.query(`
        SELECT * FROM agendador_requisicoes
        WHERE tipo = 'placar'
        AND grupo_chave LIKE ?
        ORDER BY data_hora ASC
      `, [`${dataBase.toFormat('yyyy-LL-dd HH:mm')}-placar%`]);

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

      // Notificações
      console.log(`\n    NOTIFICAÇÕES AGENDADAS:`);
      const [notificacoes] = await conexao.query(`
        SELECT n.*, j.time_mandante, j.time_visitante
        FROM notificacoes_enviadas_jogos n
        JOIN jogos j ON n.partida_id = j.id
        WHERE DATE(j.data) = ?
        AND j.campeonato_id = 69
        AND n.tempo_alerta IN (60, 30, 15, 5)
        ORDER BY n.tempo_alerta DESC, n.data_agendada ASC
      `, [hojeKey]);

      if (notificacoes.length === 0) {
        console.log(`      Total: 0 notificações agendadas`);
      } else {
        const porTempo = new Map();
        for (const notif of notificacoes) {
          if (!porTempo.has(notif.tempo_alerta)) {
            porTempo.set(notif.tempo_alerta, []);
          }
          porTempo.get(notif.tempo_alerta).push(notif);
        }

        console.log(`      Total: ${notificacoes.length} notificações agendadas\n`);

        const tempos = [60, 30, 15, 5];
        for (const tempo of tempos) {
          const notifs = porTempo.get(tempo) || [];
          const emoji = notifs.length > 0 ? '✅' : '⚠️';
          console.log(`      ${emoji} Notificações ${tempo} min antes: ${notifs.length} agendadas`);
          
          if (notifs.length > 0 && notifs.length <= 3) {
            for (const n of notifs) {
              const data = parseDataManaus(n.data_agendada);
              console.log(`         - ${data.toFormat('HH:mm:ss')} | ${n.time_mandante} vs ${n.time_visitante} | ⏳ ${n.status}`);
            }
          } else if (notifs.length > 3) {
            const primeiros = notifs.slice(0, 2);
            for (const n of primeiros) {
              const data = parseDataManaus(n.data_agendada);
              console.log(`         - ${data.toFormat('HH:mm:ss')} | ${n.time_mandante} vs ${n.time_visitante} | ⏳ ${n.status}`);
            }
            console.log(`         ... e mais ${notifs.length - 2} notificações`);
          }
        }
      }

      console.log();
    }

    console.log('='.repeat(80));

  } catch (err) {
    console.error('Erro ao verificar agendamentos:', err.message);
  } finally {
    conexao.release();
  }
}

verificarAgendamentosHoje();
