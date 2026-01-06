#!/usr/bin/env node
/**
 * Verifica agendamentos de placar e notificações para jogos de amanhã da Premier League
 */

const pool = require('../database/conexao');
const { DateTime } = require('luxon');

async function verificar() {
  try {
    const agora = DateTime.now().setZone('America/Manaus');
    const amanha = agora.plus({ days: 1 }).toFormat('yyyy-MM-dd');
    
    console.log(`⏰ Hora atual (Manaus): ${agora.toFormat('dd/MM/yyyy HH:mm:ss')}`);
    console.log(`📅 Verificando agendamentos para: ${amanha}\n`);
    
    console.log('='.repeat(80));
    console.log('JOGOS DA PREMIER LEAGUE AMANHÃ (Campeonato 69)');
    console.log('='.repeat(80));
    
    // Buscar jogos da Premier League de amanhã
    const [jogos] = await pool.query(`
      SELECT 
        partida_id,
        time_mandante,
        time_visitante,
        data,
        status,
        rodada
      FROM jogos
      WHERE campeonato_id = 69
        AND DATE(data) = ?
      ORDER BY data ASC
    `, [amanha]);
    
    if (jogos.length === 0) {
      console.log('\n⚠️  Nenhum jogo da Premier League encontrado para amanhã\n');
      await pool.end();
      return;
    }
    
    console.log(`\n📋 Total: ${jogos.length} jogos encontrados\n`);
    
    // Agrupar por horário
    const gruposPorHorario = new Map();
    jogos.forEach(j => {
      const dt = DateTime.fromJSDate(new Date(j.data), { zone: 'America/Manaus' });
      const horario = dt.toFormat('HH:mm');
      if (!gruposPorHorario.has(horario)) {
        gruposPorHorario.set(horario, []);
      }
      gruposPorHorario.get(horario).push({ ...j, dataHora: dt });
    });
    
    // Processar cada grupo de horário
    for (const [horario, jogosGrupo] of gruposPorHorario.entries()) {
      console.log('-'.repeat(80));
      console.log(`🕐 GRUPO: ${horario} (${jogosGrupo.length} jogos)`);
      console.log('-'.repeat(80));
      
      // Listar jogos do grupo
      jogosGrupo.forEach((j, idx) => {
        console.log(`   ${idx + 1}. ${j.time_mandante} vs ${j.time_visitante}`);
        console.log(`      Horário: ${j.dataHora.toFormat('dd/MM/yyyy HH:mm:ss')}`);
        console.log(`      Rodada: ${j.rodada} | Status: ${j.status || 'N/A'}`);
      });
      
      const primeiroJogo = jogosGrupo[0];
      const inicioGrupo = primeiroJogo.dataHora;
      const fimJanela = inicioGrupo.plus({ minutes: 130 });
      
      console.log(`\n   ⏱️  Janela de requisições esperada:`);
      console.log(`      Início: ${inicioGrupo.toFormat('dd/MM/yyyy HH:mm:ss')}`);
      console.log(`      Fim: ${fimJanela.toFormat('dd/MM/yyyy HH:mm:ss')} (+130min)`);
      
      // Verificar agendamentos de placar
      console.log(`\n   📡 AGENDAMENTOS DE PLACAR (agendador_requisicoes):`);
      
      const [placares] = await pool.query(`
        SELECT 
          id,
          data_hora,
          tipo,
          status,
          grupo_chave,
          executados
        FROM agendador_requisicoes
        WHERE campeonato_id = 69
          AND rodada = ?
          AND tipo = 'placar'
          AND grupo_chave LIKE ?
        ORDER BY data_hora ASC
      `, [primeiroJogo.rodada, `${inicioGrupo.toFormat('yyyy-MM-dd HH:mm')}%`]);
      
      if (placares.length === 0) {
        console.log(`      ⚠️  Nenhum agendamento de placar encontrado`);
      } else {
        const primeiro = DateTime.fromJSDate(new Date(placares[0].data_hora), { zone: 'America/Manaus' });
        const ultimo = DateTime.fromJSDate(new Date(placares[placares.length - 1].data_hora), { zone: 'America/Manaus' });
        
        console.log(`      Total agendado: ${placares.length} requisições`);
        console.log(`      Primeira: ${primeiro.toFormat('dd/MM/yyyy HH:mm:ss')}`);
        console.log(`      Última: ${ultimo.toFormat('dd/MM/yyyy HH:mm:ss')}`);
        
        // Verificar se está correto
        const primeiraCorreta = primeiro.toMillis() === inicioGrupo.toMillis();
        const ultimaCorreta = Math.abs(ultimo.diff(fimJanela, 'minutes').minutes) <= 1; // margem de 1min
        
        if (primeiraCorreta && ultimaCorreta) {
          console.log(`      ✅ Agendamentos corretos!`);
        } else {
          console.log(`      ❌ Agendamentos INCORRETOS:`);
          if (!primeiraCorreta) {
            console.log(`         - Primeira deveria ser ${inicioGrupo.toFormat('HH:mm:ss')}, mas é ${primeiro.toFormat('HH:mm:ss')}`);
          }
          if (!ultimaCorreta) {
            console.log(`         - Última deveria ser ~${fimJanela.toFormat('HH:mm:ss')}, mas é ${ultimo.toFormat('HH:mm:ss')}`);
          }
        }
        
        // Mostrar primeiros 5 e últimos 5
        console.log(`\n      Primeiros 5 agendamentos:`);
        placares.slice(0, 5).forEach((p, idx) => {
          const dt = DateTime.fromJSDate(new Date(p.data_hora), { zone: 'America/Manaus' });
          console.log(`         ${idx + 1}. ${dt.toFormat('HH:mm:ss')} - ${p.status} - ${p.grupo_chave}`);
        });
        
        if (placares.length > 10) {
          console.log(`      ... (${placares.length - 10} agendamentos intermediários)`);
        }
        
        console.log(`\n      Últimos 5 agendamentos:`);
        placares.slice(-5).forEach((p, idx) => {
          const dt = DateTime.fromJSDate(new Date(p.data_hora), { zone: 'America/Manaus' });
          console.log(`         ${idx + 1}. ${dt.toFormat('HH:mm:ss')} - ${p.status} - ${p.grupo_chave}`);
        });
      }
      
      // Verificar notificações agendadas
      console.log(`\n   🔔 NOTIFICAÇÕES AGENDADAS:`);
      
      const idsJogos = jogosGrupo.map(j => j.partida_id);
      
      const [notificacoes] = await pool.query(`
        SELECT 
          n.id,
          n.partida_id,
          n.tempo_alerta,
          n.data_agendada,
          n.status,
          n.data_enviada,
          j.time_mandante,
          j.time_visitante
        FROM notificacoes_enviadas_jogos n
        JOIN jogos j ON n.partida_id = j.partida_id
        WHERE n.partida_id IN (?)
        ORDER BY n.data_agendada ASC
      `, [idsJogos]);
      
      if (notificacoes.length === 0) {
        console.log(`      ⚠️  Nenhuma notificação agendada para estes jogos`);
      } else {
        console.log(`      Total: ${notificacoes.length} notificações agendadas`);
        
        // Agrupar por tempo_alerta
        const porMinutos = new Map();
        notificacoes.forEach(n => {
          const key = n.tempo_alerta;
          if (!porMinutos.has(key)) porMinutos.set(key, []);
          porMinutos.get(key).push(n);
        });
        
        const minutosEsperados = [60, 30, 15, 5];
        
        minutosEsperados.forEach(min => {
          const notifs = porMinutos.get(min) || [];
          const esperado = inicioGrupo.minus({ minutes: min });
          
          if (notifs.length === 0) {
            console.log(`\n      ❌ Notificações ${min} min antes: FALTANDO (esperado ${esperado.toFormat('HH:mm:ss')})`);
          } else {
            console.log(`\n      ✅ Notificações ${min} min antes: ${notifs.length} agendadas`);
            notifs.slice(0, 3).forEach(n => {
              const dt = DateTime.fromJSDate(new Date(n.data_agendada), { zone: 'America/Manaus' });
              const statusEmoji = n.status === 'enviada' ? '✅' : (n.status === 'cancelada' ? '❌' : '⏳');
              console.log(`         - ${dt.toFormat('HH:mm:ss')} | ${n.time_mandante} vs ${n.time_visitante} | ${statusEmoji} ${n.status}`);
            });
            if (notifs.length > 3) {
              console.log(`         ... e mais ${notifs.length - 3} notificações`);
            }
          }
        });
      }
      
      console.log('');
    }
    
    console.log('='.repeat(80));
    
    await pool.end();
  } catch (err) {
    console.error('❌ Erro:', err);
    await pool.end();
    process.exit(1);
  }
}

verificar();
