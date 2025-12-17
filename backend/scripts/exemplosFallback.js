/**
 * EXEMPLOS PRÁTICOS - Sistema de Fallback
 * Como usar o sistema no dia a dia
 */

// ============================================================================
// EXEMPLO 1: Uso Básico - Buscar Resultados de Uma Rodada
// ============================================================================

const { buscarResultadosComFallback } = require('./services/resultadosFallbackService');

async function exemplo1_buscarRodada() {
  console.log('EXEMPLO 1: Buscar resultados da rodada 22\n');
  
  const resultado = await buscarResultadosComFallback(22);
  
  if (resultado.sucesso) {
    console.log(`✅ Sucesso! Fonte: ${resultado.descricaoFonte}`);
    console.log(`Partidas encontradas: ${resultado.partidas.length}`);
    console.log(`Tentativas necessárias: ${resultado.tentativas}`);
    
    // Mostrar primeira partida como exemplo
    if (resultado.partidas.length > 0) {
      const partida = resultado.partidas[0];
      console.log('\nExemplo de partida:');
      console.log(`${partida.time_mandante.nome_popular} ${partida.placar_mandante || 0} x ${partida.placar_visitante || 0} ${partida.time_visitante.nome_popular}`);
      console.log(`Status: ${partida.status}`);
      console.log(`Estádio: ${partida.estadio.nome_popular}`);
    }
  } else {
    console.log(`❌ Falha! Todas as fontes falharam.`);
    console.log(`Mensagem: ${resultado.mensagem}`);
    resultado.erros.forEach(erro => {
      console.log(`- ${erro.fonte}: ${erro.erro}`);
    });
  }
}

// ============================================================================
// EXEMPLO 2: Integração com Banco de Dados
// ============================================================================

const pool = require('./database/conexao');

async function exemplo2_atualizarBanco() {
  console.log('EXEMPLO 2: Atualizar banco de dados com fallback\n');
  
  const rodada = 22;
  const resultado = await buscarResultadosComFallback(rodada);
  
  if (!resultado.sucesso) {
    console.error('Erro: Não foi possível obter resultados');
    return;
  }
  
  console.log(`Usando fonte: ${resultado.fonte}`);
  
  let atualizados = 0;
  
  for (const jogo of resultado.partidas) {
    // Atualiza apenas jogos com placares definidos
    if (jogo.placar_mandante !== null && jogo.placar_visitante !== null) {
      try {
        const [result] = await pool.query(`
          UPDATE jogos
          SET placar_mandante = ?, placar_visitante = ?, status = ?
          WHERE partida_id = ?
        `, [jogo.placar_mandante, jogo.placar_visitante, jogo.status, jogo.partida_id]);
        
        if (result.affectedRows > 0) {
          atualizados++;
        } else {
          // Fallback: busca por nomes dos times
          const [resultFallback] = await pool.query(`
            UPDATE jogos
            SET placar_mandante = ?, placar_visitante = ?, status = ?
            WHERE rodada = ? AND time_mandante = ? AND time_visitante = ?
          `, [
            jogo.placar_mandante, 
            jogo.placar_visitante, 
            jogo.status,
            rodada,
            jogo.time_mandante.nome_popular,
            jogo.time_visitante.nome_popular
          ]);
          
          if (resultFallback.affectedRows > 0) {
            atualizados++;
            console.log(`⚠️ Atualizado por nome: ${jogo.time_mandante.nome_popular} vs ${jogo.time_visitante.nome_popular}`);
          }
        }
      } catch (error) {
        console.error(`Erro ao atualizar jogo ${jogo.partida_id}:`, error.message);
      }
    }
  }
  
  console.log(`\n✅ Rodada ${rodada} processada via ${resultado.fonte}`);
  console.log(`Jogos atualizados: ${atualizados}/${resultado.partidas.length}`);
}

// ============================================================================
// EXEMPLO 3: Buscar Partidas ao Vivo
// ============================================================================

const { buscarPartidasAoVivoComFallback } = require('./services/resultadosFallbackService');

async function exemplo3_partidasAoVivo() {
  console.log('EXEMPLO 3: Buscar partidas ao vivo\n');
  
  const partidasAoVivo = await buscarPartidasAoVivoComFallback();
  
  if (partidasAoVivo.length > 0) {
    console.log(`🔴 ${partidasAoVivo.length} partidas ao vivo:`);
    
    partidasAoVivo.forEach(partida => {
      console.log(`\n${partida.time_mandante.nome_popular} ${partida.placar_mandante || 0} x ${partida.placar_visitante || 0} ${partida.time_visitante.nome_popular}`);
      console.log(`Status: ${partida.status} | Rodada: ${partida.rodada}`);
    });
  } else {
    console.log('ℹ️ Nenhuma partida ao vivo no momento');
  }
}

// ============================================================================
// EXEMPLO 4: Testar Conectividade de Fontes
// ============================================================================

const { testarTodasAsFontes, listarFontes } = require('./services/resultadosFallbackService');

async function exemplo4_testarFontes() {
  console.log('EXEMPLO 4: Testar conectividade de todas as fontes\n');
  
  // Listar fontes disponíveis
  console.log('📋 Fontes configuradas:');
  const fontes = listarFontes();
  fontes.forEach(f => {
    const emoji = f.ativa ? '✅' : '❌';
    console.log(`${emoji} ${f.descricao} (prioridade ${f.prioridade})`);
  });
  
  console.log('\n🧪 Testando conectividade...\n');
  
  // Testar todas
  const resultados = await testarTodasAsFontes();
  
  // Resumo
  console.log('\n📊 Resumo:');
  resultados.forEach(r => {
    const emoji = r.status === 'funcionando' ? '✅' : 
                  r.status === 'desativada' ? '⏸️' : 
                  r.status === 'dados inválidos' ? '⚠️' : '❌';
    
    console.log(`${emoji} ${r.descricao}: ${r.status}`);
    if (r.tempoResposta) {
      console.log(`   ⏱️ Tempo: ${r.tempoResposta}ms | 📦 Partidas: ${r.partidasEncontradas}`);
    }
    if (r.erro) {
      console.log(`   ❌ Erro: ${r.erro}`);
    }
  });
  
  const funcionando = resultados.filter(r => r.status === 'funcionando').length;
  console.log(`\n${funcionando > 0 ? '✅' : '⚠️'} ${funcionando} fonte(s) funcionando`);
}

// ============================================================================
// EXEMPLO 5: Configurar Fontes Dinamicamente
// ============================================================================

const { configurarFontes } = require('./services/resultadosFallbackService');

async function exemplo5_configurarFontes() {
  console.log('EXEMPLO 5: Configurar fontes dinamicamente\n');
  
  // Desativar API Futebol original (token expirado)
  // Ativar apenas API-Football
  configurarFontes({
    'api-futebol': false,
    'api-football': true,
    'globo': false,
    'football-data': false
  });
  
  console.log('✅ Configuração aplicada!');
  console.log('Apenas API-Football está ativa agora.\n');
  
  // Listar configuração atual
  const fontes = listarFontes();
  console.log('📋 Estado atual das fontes:');
  fontes.forEach(f => {
    console.log(`${f.ativa ? '✅ ATIVA' : '❌ INATIVA'} - ${f.descricao}`);
  });
}

// ============================================================================
// EXEMPLO 6: Criar Job Agendado (Cron)
// ============================================================================

const cron = require('node-cron');

function exemplo6_jobAgendado() {
  console.log('EXEMPLO 6: Job agendado para atualizar resultados\n');
  
  // Atualiza resultados a cada 15 minutos
  cron.schedule('*/15 * * * *', async () => {
    console.log('🔄 [CRON] Executando atualização agendada...');
    
    try {
      // Buscar rodada vigente do banco
      const [[config]] = await pool.query('SELECT rodada_vigente FROM configuracoes LIMIT 1');
      const rodada = config.rodada_vigente;
      
      console.log(`📍 Rodada vigente: ${rodada}`);
      
      // Buscar resultados com fallback
      const resultado = await buscarResultadosComFallback(rodada);
      
      if (resultado.sucesso) {
        console.log(`✅ Dados obtidos de ${resultado.fonte}`);
        // Atualizar banco aqui...
      } else {
        console.error('❌ Falha ao obter resultados');
      }
    } catch (error) {
      console.error('❌ Erro no job:', error.message);
    }
  });
  
  console.log('⏰ Job agendado! Executará a cada 15 minutos.');
}

// ============================================================================
// EXEMPLO 7: Adicionar Nova Fonte
// ============================================================================

async function exemplo7_adicionarNovaFonte() {
  console.log('EXEMPLO 7: Como adicionar uma nova fonte\n');
  
  console.log('Passo 1: Criar adapter em services/adapters/novaFonteAdapter.js');
  console.log(`
  // novaFonteAdapter.js
  const axios = require('axios');
  
  async function buscarRodada(rodada) {
    const response = await axios.get(\`https://nova-api.com/rodada/\${rodada}\`);
    return response.data;
  }
  
  module.exports = { buscarRodada };
  `);
  
  console.log('\nPasso 2: Adicionar normalização em normalizadorDados.js');
  console.log(`
  function normalizarNovaFonte(dados) {
    return dados.partidas.map(jogo => ({
      partida_id: jogo.id,
      rodada: jogo.round,
      // ... mapear campos
    }));
  }
  `);
  
  console.log('\nPasso 3: Registrar em FONTES_DISPONIVEIS (resultadosFallbackService.js)');
  console.log(`
  {
    nome: 'nova-fonte',
    descricao: 'Nova API',
    ativa: true,
    prioridade: 2,
    buscar: async (rodada) => {
      const novaFonteAdapter = require('./adapters/novaFonteAdapter');
      return await novaFonteAdapter.buscarRodada(rodada);
    }
  }
  `);
  
  console.log('\nPasso 4: Testar');
  console.log('node scripts/testarFallback.js');
}

// ============================================================================
// EXEMPLO 8: Tratamento de Erros Avançado
// ============================================================================

async function exemplo8_tratamentoErros() {
  console.log('EXEMPLO 8: Tratamento avançado de erros\n');
  
  const rodada = 22;
  
  try {
    const resultado = await buscarResultadosComFallback(rodada);
    
    if (!resultado.sucesso) {
      // Log estruturado de erro
      const logErro = {
        timestamp: new Date().toISOString(),
        rodada: rodada,
        tentativas: resultado.erros.length,
        erros: resultado.erros,
        mensagem: resultado.mensagem
      };
      
      // Salvar em arquivo de log
      const fs = require('fs');
      fs.appendFileSync(
        'logs/fallback-errors.log',
        JSON.stringify(logErro) + '\n'
      );
      
      // Enviar alerta (exemplo com Slack/Discord)
      /*
      await axios.post(process.env.WEBHOOK_ALERTAS, {
        text: `⚠️ Todas as fontes falharam para rodada ${rodada}`,
        details: logErro
      });
      */
      
      console.error('❌ Erro registrado e alerta enviado');
      return;
    }
    
    // Sucesso - log de métrica
    console.log(`✅ Sucesso em ${resultado.tentativas} tentativa(s)`);
    console.log(`Fonte: ${resultado.fonte} (${resultado.partidas.length} partidas)`);
    
  } catch (error) {
    console.error('💥 Erro crítico:', error);
    // Fallback final: usar dados em cache
    console.log('🔄 Tentando usar cache local...');
  }
}

// ============================================================================
// EXEMPLO 9: Cache de Resultados
// ============================================================================

const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 900 }); // 15 minutos

async function exemplo9_comCache() {
  console.log('EXEMPLO 9: Usar cache para reduzir requisições\n');
  
  const rodada = 22;
  const cacheKey = `rodada_${rodada}`;
  
  // Tentar buscar no cache
  let resultado = cache.get(cacheKey);
  
  if (resultado) {
    console.log('✅ Dados obtidos do CACHE');
    console.log(`Partidas: ${resultado.partidas.length}`);
    return resultado;
  }
  
  console.log('🌐 Buscando da API (cache expirou)...');
  
  // Buscar da API com fallback
  resultado = await buscarResultadosComFallback(rodada);
  
  if (resultado.sucesso) {
    // Salvar no cache
    cache.set(cacheKey, resultado);
    console.log('✅ Dados salvos no cache por 15 minutos');
  }
  
  return resultado;
}

// ============================================================================
// EXEMPLO 10: Endpoint Express para Status das Fontes
// ============================================================================

const express = require('express');
const router = express.Router();

router.get('/api/fontes/status', async (req, res) => {
  try {
    const status = await testarTodasAsFontes();
    
    const resumo = {
      timestamp: new Date().toISOString(),
      total: status.length,
      funcionando: status.filter(s => s.status === 'funcionando').length,
      com_erro: status.filter(s => s.status === 'erro').length,
      desativadas: status.filter(s => s.status === 'desativada').length,
      fontes: status
    };
    
    res.json(resumo);
  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
});

router.post('/api/fontes/configurar', async (req, res) => {
  try {
    const config = req.body; // { 'api-football': true, 'globo': false, ... }
    configurarFontes(config);
    
    res.json({ 
      sucesso: true, 
      mensagem: 'Fontes configuradas com sucesso',
      config: listarFontes()
    });
  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
});

// ============================================================================
// EXECUTAR EXEMPLOS
// ============================================================================

async function executarTodosExemplos() {
  console.log('=' . repeat(70));
  console.log('EXEMPLOS PRÁTICOS - Sistema de Fallback');
  console.log('=' . repeat(70));
  console.log('\n');
  
  // Descomente o exemplo que deseja executar:
  
  // await exemplo1_buscarRodada();
  // await exemplo2_atualizarBanco();
  // await exemplo3_partidasAoVivo();
  // await exemplo4_testarFontes();
  // await exemplo5_configurarFontes();
  // exemplo6_jobAgendado();
  // exemplo7_adicionarNovaFonte();
  // await exemplo8_tratamentoErros();
  // await exemplo9_comCache();
  
  console.log('\n✅ Para executar um exemplo, descomente a linha correspondente em executarTodosExemplos()');
}

// Se executado diretamente
if (require.main === module) {
  executarTodosExemplos()
    .then(() => {
      console.log('\n✅ Exemplos concluídos!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Erro:', error);
      process.exit(1);
    });
}

module.exports = {
  exemplo1_buscarRodada,
  exemplo2_atualizarBanco,
  exemplo3_partidasAoVivo,
  exemplo4_testarFontes,
  exemplo5_configurarFontes,
  exemplo6_jobAgendado,
  exemplo7_adicionarNovaFonte,
  exemplo8_tratamentoErros,
  exemplo9_comCache
};
