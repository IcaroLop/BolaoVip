/**
 * Script: Limpar notificações incorretas da rodada 2 (campeonato 10) e reagendar corretamente
 * Conexão: Banco de PRODUÇÃO via SSH tunnel (porta 3307)
 */

const mysql = require('mysql2/promise');
const { DateTime } = require('luxon');

const conexaoProd = mysql.createPool({
  host: '127.0.0.1',
  port: 3307,
  user: 'root',
  password: 'fBVhh6w2KW',
  database: 'bolaovip',
  waitForConnections: true,
  connectionLimit: 5
});

async function limparEReagendarNotificacoes() {
  console.log('🔧 LIMPANDO E REAGENDANDO NOTIFICAÇÕES - RODADA 2 (Campeonato 10)');
  console.log('📡 Banco de Produção: 127.0.0.1:3307 (SSH Tunnel)\n');
  console.log('='.repeat(100));

  const conn = await conexaoProd.getConnection();

  try {
    await conn.beginTransaction();

    // 1. Buscar todos os jogos da rodada 2
    const [jogos] = await conn.query(`
      SELECT 
        id,
        partida_id,
        campeonato_id,
        rodada,
        data,
        time_mandante,
        time_visitante
      FROM jogos
      WHERE campeonato_id = 10 AND rodada = 2
      ORDER BY data
    `);

    console.log(`\n📊 ENCONTRADOS ${jogos.length} JOGOS PARA LIMPAR E REAGENDAR:\n`);

    let totalDeletados = 0;
    let totalAgendados = 0;

    for (const jogo of jogos) {
      console.log(`\n⚽ ${jogo.time_mandante} x ${jogo.time_visitante}`);
      console.log(`   Data: ${DateTime.fromJSDate(new Date(jogo.data)).setZone('America/Manaus').toFormat('dd/MM/yyyy HH:mm')}`);
      
      // 2. Deletar notificações antigas incorretas
      const [deleteResult] = await conn.query(
        `DELETE FROM notificacoes_enviadas_jogos 
         WHERE jogo_id = ?`,
        [jogo.id]
      );
      
      console.log(`   🗑️  Deletadas ${deleteResult.affectedRows} notificações antigas`);
      totalDeletados += deleteResult.affectedRows;

      // 3. Reagendar com horários corretos
      const temposAlerta = [60, 30, 15, 5];
      const dataJogo = new Date(jogo.data);

      for (const minutos of temposAlerta) {
        const dataDisparo = new Date(dataJogo.getTime() - minutos * 60 * 1000);
        const notificationId = parseInt(`${jogo.id}${minutos}`.padStart(10, '0'), 10);

        const dataDisparoFormatada = DateTime.fromJSDate(dataDisparo).setZone('America/Manaus').toFormat('dd/MM/yyyy HH:mm');

        await conn.query(
          `INSERT INTO notificacoes_enviadas_jogos 
           (jogo_id, partida_id, rodada, campeonato_id, tempo_alerta, notification_id, data_agendada, status, titulo, mensagem)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'agendada', ?, ?)`,
          [
            jogo.id,
            jogo.partida_id,
            jogo.rodada,
            jogo.campeonato_id,
            minutos,
            notificationId,
            dataDisparo,
            `${jogo.time_mandante} vs ${jogo.time_visitante}`,
            `Jogo começa em ${minutos} minutos`
          ]
        );

        console.log(`   ✅ Alerta de ${minutos}min: ${dataDisparoFormatada}`);
        totalAgendados++;
      }
    }

    await conn.commit();

    console.log('\n' + '='.repeat(100));
    console.log(`\n✅ SUCESSO!`);
    console.log(`   Deletadas: ${totalDeletados} notificações antigas`);
    console.log(`   Agendadas: ${totalAgendados} notificações CORRETAS`);

    // 4. Validar resultado
    console.log('\n' + '='.repeat(100));
    console.log('\n🔍 VALIDANDO ALERTAS REAGENDADOS:\n');

    const [validacao] = await conn.query(`
      SELECT 
        j.time_mandante,
        j.time_visitante,
        DATE_FORMAT(j.data, '%d/%m/%Y %H:%i') as horario_jogo,
        ne.tempo_alerta,
        DATE_FORMAT(ne.data_agendada, '%d/%m/%Y %H:%i') as horario_alerta
      FROM jogos j
      INNER JOIN notificacoes_enviadas_jogos ne ON j.id = ne.jogo_id
      WHERE j.campeonato_id = 10 AND j.rodada = 2
      ORDER BY j.data, ne.tempo_alerta DESC
      LIMIT 20
    `);

    let jogoAtual = '';
    for (const item of validacao) {
      const chave = `${item.time_mandante} x ${item.time_visitante}`;
      
      if (jogoAtual !== chave) {
        console.log(`\n⚽ ${chave} (Jogo: ${item.horario_jogo})`);
        jogoAtual = chave;
      }

      // Calcular esperado
      const [hJogo, mJogo] = item.horario_jogo.split(':').map(Number);
      const minutosJogo = hJogo * 60 + mJogo;
      const minutosEsperados = minutosJogo - item.tempo_alerta;
      const horaEsperada = String(Math.floor(minutosEsperados / 60)).padStart(2, '0') + 
                          ':' + 
                          String(minutosEsperados % 60).padStart(2, '0');

      const status = item.horario_alerta === horaEsperada ? '✅' : '❌';
      console.log(`   ${status} ${item.tempo_alerta}min: ${item.horario_alerta} (esperado: ${horaEsperada})`);
    }

    console.log('\n' + '='.repeat(100));
    console.log('\n✅ LIMPEZA E REAGENDAMENTO CONCLUÍDO!\n');

  } catch (err) {
    await conn.rollback();
    console.error('❌ ERRO:', err.message);
    console.error(err);
  } finally {
    conn.release();
    await conexaoProd.end();
  }
}

limparEReagendarNotificacoes();
