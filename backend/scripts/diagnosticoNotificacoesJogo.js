#!/usr/bin/env node
/**
 * Diagnóstico de Notificações de Jogo
 * Verifica notificações agendadas/enviadas para jogos específicos
 */

const pool = require('../database/conexao');
const { DateTime } = require('luxon');

async function diagnosticar() {
  try {
    console.log('='.repeat(80));
    console.log('DIAGNÓSTICO DE NOTIFICAÇÕES - JOGOS DE HOJE');
    console.log('='.repeat(80));

    const agora = DateTime.now().setZone('America/Manaus');
    console.log(`\n⏰ Hora atual (Manaus): ${agora.toFormat('dd/MM/yyyy HH:mm:ss')}`);

    // Buscar jogos de hoje
    console.log('\n📅 JOGOS DE HOJE:');
    console.log('-'.repeat(80));
    
    const [jogos] = await pool.query(`
      SELECT 
        j.id as jogo_id,
        j.partida_id,
        j.rodada,
        j.data,
        j.time_mandante,
        j.time_visitante,
        j.campeonato_id,
        j.status,
        TIMESTAMPDIFF(MINUTE, NOW(), j.data) as minutos_ate_jogo
      FROM jogos j
      WHERE DATE(j.data) = CURDATE()
      ORDER BY j.data ASC
    `);

    if (jogos.length === 0) {
      console.log('❌ Nenhum jogo encontrado para hoje');
      await pool.end();
      return;
    }

    for (const jogo of jogos) {
      const dataJogo = DateTime.fromJSDate(new Date(jogo.data)).setZone('America/Manaus');
      
      console.log(`\n🏆 Jogo #${jogo.jogo_id} (Partida ${jogo.partida_id})`);
      console.log(`   ${jogo.time_mandante} vs ${jogo.time_visitante}`);
      console.log(`   📍 Campeonato: ${jogo.campeonato_id} | Rodada: ${jogo.rodada}`);
      console.log(`   ⏰ Horário: ${dataJogo.toFormat('dd/MM/yyyy HH:mm:ss')}`);
      console.log(`   📊 Status: ${jogo.status}`);
      console.log(`   ⌛ Tempo até o jogo: ${jogo.minutos_ate_jogo} minutos`);

      // Buscar notificações agendadas para este jogo
      const [notificacoes] = await pool.query(`
        SELECT 
          id,
          tempo_alerta,
          notification_id,
          data_agendada,
          data_enviada,
          status,
          titulo,
          mensagem,
          created_at
        FROM notificacoes_enviadas_jogos
        WHERE jogo_id = ?
        ORDER BY tempo_alerta DESC
      `, [jogo.jogo_id]);

      if (notificacoes.length > 0) {
        console.log(`\n   🔔 NOTIFICAÇÕES (${notificacoes.length}):`);
        
        for (const notif of notificacoes) {
          const dataAgendada = DateTime.fromJSDate(new Date(notif.data_agendada)).setZone('America/Manaus');
          const dataEnviada = notif.data_enviada 
            ? DateTime.fromJSDate(new Date(notif.data_enviada)).setZone('America/Manaus')
            : null;
          const dataCriacao = DateTime.fromJSDate(new Date(notif.created_at)).setZone('America/Manaus');
          
          const minutosAteDisparo = dataAgendada.diff(agora, 'minutes').minutes;
          const horaEsperada = dataJogo.minus({ minutes: notif.tempo_alerta });
          const diferencaTempo = dataAgendada.diff(horaEsperada, 'minutes').minutes;
          
          console.log(`\n   ${notif.tempo_alerta} min antes:`);
          console.log(`      🆔 ID: ${notif.id} | NotifID: ${notif.notification_id}`);
          console.log(`      📝 Status: ${notif.status}`);
          console.log(`      📅 Criado em: ${dataCriacao.toFormat('dd/MM/yyyy HH:mm:ss')}`);
          console.log(`      ⏰ Agendado para: ${dataAgendada.toFormat('dd/MM/yyyy HH:mm:ss')}`);
          console.log(`      🎯 Hora esperada: ${horaEsperada.toFormat('dd/MM/yyyy HH:mm:ss')}`);
          
          if (diferencaTempo !== 0) {
            console.log(`      ⚠️  DIFERENÇA: ${Math.abs(diferencaTempo).toFixed(0)} minutos ${diferencaTempo > 0 ? 'DEPOIS' : 'ANTES'} do esperado`);
          } else {
            console.log(`      ✅ Horário correto!`);
          }
          
          if (notif.status === 'enviada' && dataEnviada) {
            console.log(`      📤 Enviado em: ${dataEnviada.toFormat('dd/MM/yyyy HH:mm:ss')}`);
            const minutosAntesDojogo = dataJogo.diff(dataEnviada, 'minutes').minutes;
            console.log(`      ⏱️  Enviado ${minutosAntesDojogo.toFixed(0)} minutos ANTES do jogo`);
            
            if (Math.abs(minutosAntesDojogo - notif.tempo_alerta) > 2) {
              console.log(`      ❌ ERRO: Deveria ter sido enviado ${notif.tempo_alerta} min antes, mas foi ${minutosAntesDojogo.toFixed(0)} min antes`);
            }
          } else if (notif.status === 'agendada') {
            console.log(`      ⏳ Aguardando disparo (em ${minutosAteDisparo.toFixed(0)} minutos)`);
          }
        }

        // Verificar se foram enviadas para usuários
        const [enviadas] = await pool.query(`
          SELECT COUNT(*) as total
          FROM notificacoes_usuarios
          WHERE JSON_EXTRACT(dados_json, '$.jogo_id') = ?
        `, [jogo.jogo_id]);

        if (enviadas[0].total > 0) {
          console.log(`\n   📨 Enviadas para ${enviadas[0].total} usuários`);
        }

      } else {
        console.log(`\n   ⚠️  NENHUMA NOTIFICAÇÃO AGENDADA PARA ESTE JOGO`);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('DIAGNÓSTICO CONCLUÍDO');
    console.log('='.repeat(80));

    await pool.end();
  } catch (err) {
    console.error('❌ Erro no diagnóstico:', err);
    await pool.end();
    process.exit(1);
  }
}

diagnosticar();
