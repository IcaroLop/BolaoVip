#!/usr/bin/env node
/**
 * CLI para gerenciar tokens da API Futebol
 * Uso: node scripts/tokenManager.js [status|dev|prod|set <token>]
 * 
 * Exemplos:
 *   node scripts/tokenManager.js status          # Mostra o status atual
 *   node scripts/tokenManager.js dev             # Alterna para desenvolvimento
 *   node scripts/tokenManager.js prod            # Alterna para produção
 *   node scripts/tokenManager.js set dev novo_token_dev
 */

require('dotenv').config();
const tokenConfig = require('../config/tokenConfig');

const command = process.argv[2] || 'status';
const arg1 = process.argv[3];
const arg2 = process.argv[4];

console.log('\n========================================');
console.log('  Gerenciador de Tokens API Futebol');
console.log('========================================\n');

switch (command) {
  case 'status':
  case 's':
    showStatus();
    break;

  case 'dev':
  case 'development':
    changeEnvironment('development');
    break;

  case 'prod':
  case 'production':
    changeEnvironment('production');
    break;

  case 'toggle':
  case 't':
    toggleEnvironment();
    break;

  case 'set':
    setToken(arg1, arg2);
    break;

  case 'info':
  case 'i':
    showInfo();
    break;

  case 'help':
  case 'h':
  case '?':
    showHelp();
    break;

  default:
    console.log(`❌ Comando desconhecido: ${command}\n`);
    showHelp();
    process.exit(1);
}

function showStatus() {
  const status = tokenConfig.getStatus();
  const info = tokenConfig.getTokenInfo();

  console.log('📊 Status Atual:');
  console.log(`   Ambiente: ${status.currentEnvironment.toUpperCase()}`);
  console.log(`   Token Ativo: ${info.token} (${info.type})`);
  console.log(`\n📋 Detalhes:\n`);
  
  console.log(`   Development:`);
  console.log(`     Token: ${status.development.token}`);
  console.log(`     Status: ${status.development.active ? '✅ ATIVO' : '⭕ Inativo'}`);
  
  console.log(`\n   Production:`);
  console.log(`     Token: ${status.production.token}`);
  console.log(`     Status: ${status.production.active ? '✅ ATIVO' : '⭕ Inativo'}`);
  
  console.log('\n');
}

function changeEnvironment(env) {
  const sucesso = tokenConfig.setEnvironment(env);
  
  if (sucesso) {
    const info = tokenConfig.getTokenInfo();
    console.log(`✅ Ambiente alterado com sucesso!`);
    console.log(`   Novo ambiente: ${env}`);
    console.log(`   Token ativo: ${info.token}`);
    console.log(`   Tipo: ${info.type}\n`);
  } else {
    console.log(`❌ Erro ao alterar ambiente\n`);
    process.exit(1);
  }
}

function toggleEnvironment() {
  const novoAmbiente = tokenConfig.toggleEnvironment();
  const info = tokenConfig.getTokenInfo();
  
  console.log(`✅ Token alternado com sucesso!`);
  console.log(`   Novo ambiente: ${novoAmbiente}`);
  console.log(`   Token ativo: ${info.token}`);
  console.log(`   Tipo: ${info.type}\n`);
}

function setToken(env, token) {
  if (!env || !token) {
    console.log(`❌ Uso: tokenManager.js set <dev|prod> <novo_token>\n`);
    process.exit(1);
  }

  // Mapear aliases
  const envMap = {
    'dev': 'development',
    'development': 'development',
    'prod': 'production',
    'production': 'production'
  };

  const nomeAmbiente = envMap[env];
  
  if (!nomeAmbiente) {
    console.log(`❌ Ambiente inválido. Use 'dev' ou 'prod'\n`);
    process.exit(1);
  }

  const sucesso = tokenConfig.setToken(nomeAmbiente, token);
  
  if (sucesso) {
    console.log(`✅ Token ${nomeAmbiente} atualizado com sucesso!`);
    console.log(`   Novo token: ${token.substring(0, 10)}...\n`);
  } else {
    console.log(`❌ Erro ao atualizar token\n`);
    process.exit(1);
  }
}

function showInfo() {
  const info = tokenConfig.getTokenInfo();
  
  console.log('ℹ️  Informações do Token Atual:\n');
  console.log(`   Ambiente: ${info.environment}`);
  console.log(`   Tipo: ${info.type}`);
  console.log(`   Prefixo: ${info.prefix}`);
  console.log(`   Token completo: ${info.token}\n`);
}

function showHelp() {
  console.log('📖 Disponível Comandos:\n');
  console.log('  status, s         - Mostra o status de ambos os tokens');
  console.log('  dev               - Alterna para token de DESENVOLVIMENTO');
  console.log('  prod              - Alterna para token de PRODUÇÃO');
  console.log('  toggle, t         - Alterna entre dev e prod');
  console.log('  set <env> <token> - Define um token personalizado');
  console.log('  info, i           - Mostra informações do token ativo');
  console.log('  help, h           - Mostra esta mensagem de ajuda\n');
  
  console.log('📝 Exemplos:\n');
  console.log('  node scripts/tokenManager.js status');
  console.log('  node scripts/tokenManager.js dev');
  console.log('  node scripts/tokenManager.js prod');
  console.log('  node scripts/tokenManager.js toggle');
  console.log('  node scripts/tokenManager.js set dev test_novo_token_aqui\n');
}
