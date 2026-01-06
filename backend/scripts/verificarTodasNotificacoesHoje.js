#!/usr/bin/env node
/**
 * Verifica TODAS as notificações enviadas hoje
 */

const pool = require('../database/conexao');
const { DateTime } = require('luxon');

async function verificar() {
  try {
    const agora = DateTime.now().setZone('America/Manaus');
    console.log(`⏰ Hora atual (Manaus): ${agora.toFormat('dd/MM/yyyy HH:mm:ss')}\n`);

    console.log('='.repeat(80));
    console.log('TODAS AS NOTIFICAÇÕES ENVIADAS HOJE');
    console.log('='.repeat(80));

    // Buscar todas as notificações enviadas hoje
    const [notificacoes] = await pool.query(`
      SELECT 
        n.id,
        n.jogo_id,
        n.partida_id,
        n.tempo_alerta,
        n.data_agendada,
        n.data_enviada,
        n.titulo,
        n.mensagem,
        n.status,
        j.data as data_jogo,
        j.time_mandante,
        j.time_visitante,
        j.status as status_jogo
      FROM notificacoes_enviadas_jogos n
      LEFT JOIN jogos j ON n.jogo_id = j.id
      WHERE DATE(n.data_enviada) = CURDATE()
         OR DATE(n.data_agendada) = CURDATE()
      ORDER BY n.data_enviada DESC, n.data_agendada DESC
    `);

    if (notificacoes.length === 0) {
      console.log('❌ Nenhuma notificação encontrada para hoje\n');
    } else {
      console.log(`📨 Total: ${notificacoes.length} notificações\n`);

      const porJogo = {};
      notificacoes.forEach(n => {
        if (!porJogo[n.jogo_id]) {
          porJogo[n.jogo_id] = [];
        }
        porJogo[n.jogo_id].push(n);
      });

      for (const [jogoId, notifs] of Object.entries(porJogo)) {
        const primeira = notifs[0];
        
        if (primeira.data_jogo) {
          const dataJogo = DateTime.fromJSDate(new Date(primeira.data_jogo)).setZone('America/Manaus');
          console.log(`🏆 Jogo #${jogoId}: ${primeira.time_mandante} vs ${primeira.time_visitante}`);
          console.log(`   ⏰ Horário do jogo: ${dataJogo.toFormat('dd/MM/yyyy HH:mm:ss')}`);
          console.log(`   📊 Status: ${primeira.status_jogo}`);
        } else {
          console.log(`⚠️  Jogo #${jogoId}: JOGO NÃO ENCONTRADO NO BANCO`);
        }
        
        console.log(`   🔔 Notificações (${notifs.length}):\n`);

        notifs.forEach(n => {
          const dataAgendada = DateTime.fromJSDate(new Date(n.data_agendada)).setZone('America/Manaus');
          const dataEnviada = n.data_enviada 
            ? DateTime.fromJSDate(new Date(n.data_enviada)).setZone('America/Manaus')
            : null;

          console.log(`      ${n.tempo_alerta} min antes - Status: ${n.status}`);
          console.log(`         Agendado para: ${dataAgendada.toFormat('dd/MM/yyyy HH:mm:ss')}`);
          
          if (dataEnviada) {
            console.log(`         Enviado em: ${dataEnviada.toFormat('dd/MM/yyyy HH:mm:ss')}`);
            
            if (primeira.data_jogo) {
              const dataJogo = DateTime.fromJSDate(new Date(primeira.data_jogo)).setZone('America/Manaus');
              const minutosAntes = dataJogo.diff(dataEnviada, 'minutes').minutes;
              console.log(`         ⏱️  ${minutosAntes.toFixed(0)} minutos ANTES do jogo`);
              
              if (Math.abs(minutosAntes - n.tempo_alerta) > 2) {
                console.log(`         ❌ ERRO: Esperava ${n.tempo_alerta} min, mas foi ${minutosAntes.toFixed(0)} min`);
              }
            }
          }
          console.log('');
        });
      }
    }

    // Verificar se há jogos às 16:00 em qualquer dia
    console.log('='.repeat(80));
    console.log('JOGOS ÀS 16:00 (qualquer dia):');
    console.log('='.repeat(80));

    const [jogos16h] = await pool.query(`
      SELECT 
        id,
        partida_id,
        DATE(data) as dia,
        TIME(data) as hora,
        data,
        time_mandante,
        time_visitante,
        campeonato_id,
        status
      FROM jogos
      WHERE TIME(data) BETWEEN '15:55:00' AND '16:05:00'
      ORDER BY data DESC
      LIMIT 10
    `);

    if (jogos16h.length > 0) {
      console.log(`\n📅 ${jogos16h.length} jogos encontrados às ~16:00:\n`);
      jogos16h.forEach(j => {
        const dataJogo = DateTime.fromJSDate(new Date(j.data)).setZone('America/Manaus');
        console.log(`   [ID: ${j.id}] ${j.time_mandante} vs ${j.time_visitante}`);
        console.log(`      📅 ${dataJogo.toFormat('dd/MM/yyyy HH:mm:ss')} | Status: ${j.status}`);
        console.log('');
      });
    } else {
      console.log('\n❌ Nenhum jogo encontrado às 16:00\n');
    }

    await pool.end();
  } catch (err) {
    console.error('❌ Erro:', err);
    await pool.end();
    process.exit(1);
  }
}

verificar();
