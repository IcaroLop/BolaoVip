/**
 * Script para testar os cron jobs manualmente
 * 
 * Uso:
 *   node backend/scripts/testarCronJobs.js [job]
 * 
 * Onde [job] pode ser:
 *   - zerar-contador
 *   - atualizar-rodadas
 *   - planejar-agendamentos
 *   - todos (padrão)
 */

require('dotenv').config();
const pool = require('../database/conexao');
const axios = require('axios');
const agendadorService = require('../services/agendadorService');

const args = process.argv.slice(2);
const jobSelecionado = args[0] || 'todos';

async function testarZerarContador() {
  console.log('\n📊 Testando Job 1: Zerar Contador de Requisições');
  console.log('='.repeat(60));
  
  try {
    // Mostra valor atual
    const [antes] = await pool.query('SELECT requisicoes_api_futebol FROM configuracoes WHERE id = 1');
    console.log('Valor antes:', antes[0]?.requisicoes_api_futebol || 0);
    
    // Zera
    await pool.query('UPDATE configuracoes SET requisicoes_api_futebol = 0 WHERE id = 1');
    
    // Mostra valor depois
    const [depois] = await pool.query('SELECT requisicoes_api_futebol FROM configuracoes WHERE id = 1');
    console.log('Valor depois:', depois[0]?.requisicoes_api_futebol || 0);
    
    console.log('✅ Job de zerar contador executado com sucesso!');
  } catch (err) {
    console.error('❌ Erro ao executar job de zerar contador:', err.message);
  }
}

async function testarAtualizarRodadas() {
  console.log('\n📊 Testando Job 2: Atualizar Status das Rodadas');
  console.log('='.repeat(60));
  
  const conexao = await pool.getConnection();
  try {
    // Busca campeonatos
    const [grupos] = await conexao.query(
      'SELECT DISTINCT campeonato_id FROM grupos WHERE campeonato_id IS NOT NULL'
    );
    
    console.log(`Campeonatos encontrados: ${grupos.length}`);
    
    if (grupos.length === 0) {
      console.log('⚠️ Nenhum campeonato encontrado.');
      return;
    }
    
    const tokenProd = process.env.API_FUTEBOL_TOKEN_PROD;
    const tokenDev = process.env.API_FUTEBOL_TOKEN_DEV;
    const token = tokenProd || tokenDev;
    
    if (!token) {
      console.error('❌ Token da API-Futebol não configurado.');
      return;
    }
    
    for (const grupo of grupos) {
      const campeonatoId = grupo.campeonato_id;
      console.log(`\n🔍 Campeonato ${campeonatoId}:`);
      
      try {
        const url = `https://api.api-futebol.com.br/v1/campeonatos/${campeonatoId}/rodadas`;
        const response = await axios.get(url, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        const rodadas = response.data;
        console.log(`  📥 ${rodadas.length} rodadas recebidas`);
        
        let inseridas = 0;
        let atualizadas = 0;
        
        for (const rodada of rodadas) {
          const { 
            rodada: numRodada, 
            status, 
            proxima_rodada,
            fase,
            nome,
            slug,
            link
          } = rodada;
          
          // Verifica se existe
          const [existe] = await conexao.query(
            'SELECT id FROM rodadas_status WHERE campeonato_id = ? AND fase = ? AND rodada = ?',
            [campeonatoId, fase || 'primeira-fase', numRodada]
          );
          
          await conexao.query(
            `INSERT INTO rodadas_status (
              campeonato_id, fase, rodada, nome, slug, status, proxima_rodada, link
             )
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
               status = VALUES(status),
               proxima_rodada = VALUES(proxima_rodada),
               nome = VALUES(nome),
               slug = VALUES(slug),
               link = VALUES(link),
               atualizado_em = CURRENT_TIMESTAMP`,
            [
              campeonatoId, 
              fase || 'primeira-fase', 
              numRodada, 
              nome || `Rodada ${numRodada}`, 
              slug || `rodada-${numRodada}`,
              status || 'agendada', 
              proxima_rodada || null,
              link || null
            ]
          );
          
          if (existe.length > 0) {
            atualizadas++;
          } else {
            inseridas++;
          }
        }
        
        console.log(`  ✅ Inseridas: ${inseridas} | Atualizadas: ${atualizadas}`);
      } catch (apiErr) {
        console.error(`  ❌ Erro ao buscar rodadas:`, apiErr.message);
      }
    }
    
    console.log('\n✅ Job de atualizar rodadas executado com sucesso!');
  } catch (err) {
    console.error('❌ Erro ao executar job de atualizar rodadas:', err.message);
  } finally {
    conexao.release();
  }
}

async function testarPlanejarAgendamentos() {
  console.log('\n📊 Testando Job 3: Planejar Agendamentos');
  console.log('='.repeat(60));
  
  try {
    const resultado = await agendadorService.planejarPersistirAgenda();
    
    console.log('Resultado do planejamento:');
    console.log(`  📝 ${resultado.mensagem}`);
    console.log(`  📊 Total de grupos: ${resultado.totalGrupos}`);
    console.log(`  📊 Total de requisições: ${resultado.totalRequests}`);
    
    console.log('\n✅ Job de planejar agendamentos executado com sucesso!');
  } catch (err) {
    console.error('❌ Erro ao executar job de planejar agendamentos:', err.message);
  }
}

async function executarTestes() {
  console.log('\n🧪 TESTE DE CRON JOBS');
  console.log('='.repeat(60));
  console.log(`Job selecionado: ${jobSelecionado}`);
  
  try {
    if (jobSelecionado === 'zerar-contador' || jobSelecionado === 'todos') {
      await testarZerarContador();
    }
    
    if (jobSelecionado === 'atualizar-rodadas' || jobSelecionado === 'todos') {
      await testarAtualizarRodadas();
    }
    
    if (jobSelecionado === 'planejar-agendamentos' || jobSelecionado === 'todos') {
      await testarPlanejarAgendamentos();
    }
    
    console.log('\n✅ Testes concluídos!');
  } catch (err) {
    console.error('\n❌ Erro durante os testes:', err);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

executarTestes();
