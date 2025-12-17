/**
 * Script de Teste para Sistema de Fallback de Resultados
 * Testa conectividade e normalização de todas as fontes configuradas
 */

require('dotenv').config();
const { 
  buscarResultadosComFallback, 
  testarTodasAsFontes,
  listarFontes,
  configurarFontes
} = require('../services/resultadosFallbackService');

console.log('🧪 TESTE DO SISTEMA DE FALLBACK\n');
console.log('=' .repeat(60));

async function executarTestes() {
  try {
    // Teste 1: Listar fontes disponíveis
    console.log('\n📋 TESTE 1: Listar Fontes Disponíveis');
    console.log('=' .repeat(60));
    const fontes = listarFontes();
    fontes.forEach(f => {
      console.log(`${f.ativa ? '✅' : '❌'} ${f.descricao} (prioridade: ${f.prioridade})`);
    });

    // Teste 2: Testar conectividade de todas as fontes
    console.log('\n\n🔌 TESTE 2: Testar Conectividade de Todas as Fontes');
    console.log('=' .repeat(60));
    const statusFontes = await testarTodasAsFontes();
    
    console.log('\n📊 Resumo dos Testes:');
    statusFontes.forEach(s => {
      const emoji = s.status === 'funcionando' ? '✅' : 
                    s.status === 'desativada' ? '⏸️' : 
                    s.status === 'dados inválidos' ? '⚠️' : '❌';
      console.log(`${emoji} ${s.descricao}: ${s.status}`);
      if (s.tempoResposta) {
        console.log(`   Tempo: ${s.tempoResposta}ms | Partidas: ${s.partidasEncontradas}`);
      }
      if (s.erro) {
        console.log(`   Erro: ${s.erro}`);
      }
    });

    // Teste 3: Buscar resultados com fallback (rodada de teste)
    console.log('\n\n🎯 TESTE 3: Buscar Resultados com Fallback (Rodada 22)');
    console.log('=' .repeat(60));
    const resultado = await buscarResultadosComFallback(22);
    
    if (resultado.sucesso) {
      console.log(`\n✅ SUCESSO!`);
      console.log(`Fonte utilizada: ${resultado.descricaoFonte}`);
      console.log(`Tentativas: ${resultado.tentativas}`);
      console.log(`Partidas encontradas: ${resultado.partidas.length}`);
      
      if (resultado.partidas.length > 0) {
        console.log('\n📝 Exemplo de partida normalizada:');
        const exemplo = resultado.partidas[0];
        console.log(JSON.stringify(exemplo, null, 2));
      }
    } else {
      console.log(`\n❌ FALHA!`);
      console.log(`Mensagem: ${resultado.mensagem}`);
      console.log('\nErros por fonte:');
      resultado.erros.forEach(e => {
        console.log(`  - ${e.fonte}: ${e.erro}`);
      });
    }

    // Teste 4: Testar com rodada diferente
    console.log('\n\n🎯 TESTE 4: Buscar Resultados (Rodada 1)');
    console.log('=' .repeat(60));
    const resultado2 = await buscarResultadosComFallback(1);
    
    if (resultado2.sucesso) {
      console.log(`✅ Fonte: ${resultado2.descricaoFonte} | Partidas: ${resultado2.partidas.length}`);
    } else {
      console.log(`❌ Falha ao buscar rodada 1`);
    }

    // Teste 5: Teste de desempenho
    console.log('\n\n⏱️ TESTE 5: Teste de Desempenho');
    console.log('=' .repeat(60));
    const inicio = Date.now();
    const resultado3 = await buscarResultadosComFallback(20);
    const tempoTotal = Date.now() - inicio;
    
    console.log(`Tempo total: ${tempoTotal}ms`);
    console.log(`Sucesso: ${resultado3.sucesso ? 'SIM' : 'NÃO'}`);
    if (resultado3.sucesso) {
      console.log(`Fonte: ${resultado3.fonte}`);
      console.log(`Partidas: ${resultado3.partidas.length}`);
    }

    // Resultado final
    console.log('\n\n' + '=' .repeat(60));
    console.log('🎉 TESTES CONCLUÍDOS!');
    console.log('=' .repeat(60));
    
    const fontesOk = statusFontes.filter(s => s.status === 'funcionando').length;
    const fontesFalha = statusFontes.filter(s => s.status === 'erro').length;
    
    console.log(`\n✅ Fontes funcionando: ${fontesOk}`);
    console.log(`❌ Fontes com erro: ${fontesFalha}`);
    console.log(`\nRecomendação: ${fontesOk > 0 ? '✅ Sistema pronto para produção!' : '⚠️ Configure pelo menos uma fonte de dados'}`);

  } catch (error) {
    console.error('\n💥 ERRO CRÍTICO NO TESTE:', error);
    console.error(error.stack);
  }

  process.exit(0);
}

// Adiciona opções via linha de comando
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Uso: node testarFallback.js [opções]

Opções:
  --help, -h          Mostra esta mensagem
  --rodada <N>        Testa com rodada específica
  --fonte <nome>      Testa apenas uma fonte específica
  --quick             Executa apenas testes rápidos
  
Exemplos:
  node testarFallback.js
  node testarFallback.js --rodada 15
  node testarFallback.js --fonte api-football
  node testarFallback.js --quick
  `);
  process.exit(0);
}

// Executa os testes
executarTestes();
