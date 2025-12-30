/**
 * Diagnóstico: Verificar status dos jogos da Rodada 18 PL (27/12/2025 13:30h)
 * Especialmente Chelsea x Aston Villa
 */

const pool = require('../database/conexao');

async function diagnosticar() {
  try {
    console.log('🔍 Buscando jogos da Rodada 18 da Premier League...\n');

    // Rodada 18 do calendário 2024/25 é geralmente final de dezembro
    const sql = `
      SELECT 
        id,
        partida_id,
        data,
        time_mandante,
        time_visitante,
        status,
        placar_mandante,
        placar_visitante,
        rodada,
        campeonato_id
      FROM jogos
      WHERE rodada = 18
        AND (time_mandante LIKE '%Chelsea%' OR time_visitante LIKE '%Chelsea%')
      LIMIT 10
    `;

    const [jogos] = await pool.query(sql);

    if (jogos.length === 0) {
      console.log('❌ Nenhum jogo de Chelsea encontrado na rodada 18\n');
      
      // Tenta buscar todos os jogos da rodada 18
      console.log('📋 Listando todos os jogos da rodada 18:\n');
      const [todos] = await pool.query('SELECT id, time_mandante, time_visitante, status, data, rodada FROM jogos WHERE rodada = 18 LIMIT 20');
      
      todos.forEach((j, idx) => {
        console.log(`${idx + 1}. ${j.time_mandante} x ${j.time_visitante}`);
        console.log(`   Status: "${j.status}" (tipo: ${typeof j.status})`);
        console.log(`   Data: ${j.data}`);
        console.log(`   Rodada: ${j.rodada}\n`);
      });
    } else {
      console.log(`✅ Encontrados ${jogos.length} jogo(s):\n`);
      jogos.forEach((jogo, idx) => {
        const dataObj = new Date(jogo.data);
        const dataFormatada = dataObj.toLocaleString('pt-BR', { 
          day: '2-digit', 
          month: '2-digit', 
          year: 'numeric', 
          hour: '2-digit', 
          minute: '2-digit',
          timeZone: 'America/Sao_Paulo'
        });

        console.log(`${idx + 1}. ${jogo.time_mandante} x ${jogo.time_visitante}`);
        console.log(`   ID: ${jogo.id}, Partida ID: ${jogo.partida_id}`);
        console.log(`   Data: ${dataFormatada}`);
        console.log(`   Status: "${jogo.status}"`);
        console.log(`   Placar: ${jogo.placar_mandante} x ${jogo.placar_visitante}`);
        console.log(`   Rodada: ${jogo.rodada}, Campeonato ID: ${jogo.campeonato_id}\n`);

        // Validação do status
        const statusLower = (jogo.status || '').toLowerCase();
        const isAgendado = statusLower === 'agendado' || statusLower === 'programado' || statusLower === 'agendada';
        console.log(`   ✓ Passaria no filtro 'agendado'? ${isAgendado ? 'SIM' : 'NÃO'}`);
        
        // Mostra todos os valores possíveis que seriam comparados
        const filtrosTestados = [
          { nome: 'agendado', match: statusLower === 'agendado' },
          { nome: 'programado', match: statusLower === 'programado' },
          { nome: 'agendada', match: statusLower === 'agendada' },
          { nome: 'encerrado', match: statusLower === 'encerrado' },
          { nome: 'finalizado', match: statusLower === 'finalizado' },
          { nome: 'andamento', match: statusLower === 'andamento' },
        ];
        
        console.log(`   Testes de status:\n`);
        filtrosTestados.forEach(f => {
          console.log(`     - ${f.nome}: ${f.match ? '✓' : '✗'}`);
        });
        console.log('');
      });
    }

    // Testa também para jogos próximos de 13:30
    console.log('\n📅 Jogos agendados para hoje (27/12/2025) próximo a 13:30h:\n');
    const [jogosTempo] = await pool.query(`
      SELECT id, time_mandante, time_visitante, status, data, rodada
      FROM jogos
      WHERE DATE(data) = '2025-12-27'
        AND HOUR(data) BETWEEN 12 AND 15
      LIMIT 10
    `);

    jogosTempo.forEach((j, idx) => {
      const dataObj = new Date(j.data);
      const hora = dataObj.getHours().toString().padStart(2, '0');
      const min = dataObj.getMinutes().toString().padStart(2, '0');
      console.log(`${idx + 1}. ${j.time_mandante} x ${j.time_visitante}`);
      console.log(`   Hora: ${hora}:${min} | Status: "${j.status}" (rodada ${j.rodada})\n`);
    });

  } catch (err) {
    console.error('❌ Erro:', err.message);
  } finally {
    process.exit(0);
  }
}

diagnosticar();
