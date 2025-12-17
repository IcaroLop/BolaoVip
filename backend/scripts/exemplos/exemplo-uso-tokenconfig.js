/**
 * EXEMPLO: Como usar TokenConfig em seus scripts
 * 
 * Execute: node scripts/exemplos/exemplo-uso-tokenconfig.js
 */

const tokenConfig = require('../../config/tokenConfig');

console.log('\n╔════════════════════════════════════════╗');
console.log('║  Exemplo de Uso - Token Config       ║');
console.log('╚════════════════════════════════════════╝\n');

// ========================================
// 1. OBTER TOKEN ATUAL
// ========================================
console.log('1️⃣  Obtendo token atual...');
const tokenAtual = tokenConfig.getToken();
console.log(`   Token: ${tokenAtual}\n`);

// ========================================
// 2. OBTER INFORMAÇÕES DETALHADAS
// ========================================
console.log('2️⃣  Informações detalhadas do token...');
const info = tokenConfig.getTokenInfo();
console.log(`   Ambiente: ${info.environment}`);
console.log(`   Tipo: ${info.type}`);
console.log(`   Prefixo: ${info.prefix}`);
console.log(`   Token: ${info.token}\n`);

// ========================================
// 3. VERIFICAR STATUS DE AMBOS
// ========================================
console.log('3️⃣  Status de todos os ambientes...');
const status = tokenConfig.getStatus();
console.log(`   Atual: ${status.currentEnvironment}`);
console.log(`   Development: ${status.development.active ? '✅ Ativo' : '⭕ Inativo'}`);
console.log(`   Production: ${status.production.active ? '✅ Ativo' : '⭕ Inativo'}\n`);

// ========================================
// 4. ALTERAR PARA PRODUÇÃO
// ========================================
console.log('4️⃣  Alterando para PRODUÇÃO...');
tokenConfig.setEnvironment('production');
console.log(`   Novo ambiente: ${tokenConfig.currentEnvironment}`);
console.log(`   Token: ${tokenConfig.getToken()}\n`);

// ========================================
// 5. ALTERNAR ENTRE AMBIENTES
// ========================================
console.log('5️⃣  Alternando ambientes (toggle)...');
const novoAmbiente = tokenConfig.toggleEnvironment();
console.log(`   Novo ambiente: ${novoAmbiente}`);
console.log(`   Token: ${tokenConfig.getToken()}\n`);

// ========================================
// 6. USAR EM REQUISIÇÃO HTTP
// ========================================
console.log('6️⃣  Exemplo de uso em requisição HTTP:\n');
const codigoExemplo = `
const axios = require('axios');
const tokenConfig = require('./config/tokenConfig');

async function buscarRodadas() {
  const token = tokenConfig.getToken();  // Obtém token do ambiente atual
  
  const response = await axios.get(
    'https://api.api-futebol.com.br/v1/campeonatos/10/rodadas',
    {
      headers: {
        'Authorization': \`Bearer \${token}\`
      }
    }
  );
  
  return response.data;
}
`;
console.log(codigoExemplo);

// ========================================
// 7. STATUS FINAL
// ========================================
console.log('7️⃣  Status FINAL do token...');
const statusFinal = tokenConfig.getStatus();
console.log(`   Ambiente: ${statusFinal.currentEnvironment.toUpperCase()}`);
console.log(`   Token: ${tokenConfig.getToken().substring(0, 15)}...\n`);

console.log('✅ Exemplo concluído!\n');
