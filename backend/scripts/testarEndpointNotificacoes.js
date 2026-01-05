#!/bin/bash

# Script de teste do endpoint de notificações
# Use: node backend/scripts/testarEndpointNotificacoes.js TOKEN_AQUI

const axios = require('axios');

const token = process.argv[2];

if (!token) {
  console.log('❌ Token não fornecido!');
  console.log('Uso: node backend/scripts/testarEndpointNotificacoes.js SEU_TOKEN_JWT');
  process.exit(1);
}

const api = 'http://191.243.196.240:3001';

(async () => {
  try {
    console.log('🔍 Testando endpoint de notificações...\n');
    console.log(`📍 URL: ${api}/notificacoes/usuario`);
    console.log(`🔑 Token: ${token.substring(0, 20)}...\n`);

    const res = await axios.get(`${api}/notificacoes/usuario?limite=10`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 5000
    });

    console.log('✅ SUCESSO! Conexão OK\n');
    console.log(`📊 Notificações recebidas: ${res.data.notificacoes.length}`);
    console.log(`📬 Não lidas: ${res.data.total_nao_lidas}\n`);

    if (res.data.notificacoes.length > 0) {
      console.log('📋 Últimas notificações:');
      res.data.notificacoes.slice(0, 3).forEach((notif, idx) => {
        console.log(`  ${idx + 1}. [${notif.tipo}] ${notif.titulo}`);
        console.log(`     ${notif.mensagem}`);
      });
    } else {
      console.log('ℹ️  Nenhuma notificação no momento');
    }

  } catch (err) {
    console.log('❌ ERRO na conexão\n');
    console.log(`Status: ${err.response?.status || 'N/A'}`);
    console.log(`Mensagem: ${err.message}`);
    console.log(`\nVerificar:`);
    console.log(`  - Servidor rodando? pm2 status`);
    console.log(`  - Porta 3001 aberta?`);
    console.log(`  - Token válido?`);
    console.log(`  - Firewall bloqueando?`);
  }
})();
