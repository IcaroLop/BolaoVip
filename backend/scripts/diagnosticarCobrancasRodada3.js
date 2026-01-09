#!/usr/bin/env node

/**
 * Script: Diagnosticar Cobranças Rodada 3
 * Propósito: Verificar todas as cobranças da rodada 3 e identificar qual usar no teste
 */

require('dotenv').config();
const pool = require('../database/conexao');

async function diagnosticar() {
  try {
    console.log('\n📊 DIAGNÓSTICO - COBRANÇAS RODADA 3');
    console.log('=====================================\n');

    // 1) Verificar cobranças com origem='premios'
    console.log('1️⃣  Cobranças com ORIGEM="premios" (geradas via gerarPremiacoesRodada):');
    const [cobrancasPremios] = await pool.query(`
      SELECT 
        id, 
        id_usuario, 
        txid,
        valor_original,
        status_pagamento,
        payload_raw
      FROM pix_cobrancas
      WHERE JSON_UNQUOTE(JSON_EXTRACT(payload_raw,'$.origem')) = 'premios'
        AND JSON_UNQUOTE(JSON_EXTRACT(payload_raw,'$.rodada')) = '3'
      ORDER BY id DESC
    `);

    if (cobrancasPremios && cobrancasPremios.length > 0) {
      console.log(`✅ Encontradas ${cobrancasPremios.length} cobranças:\n`);
      cobrancasPremios.forEach((c, idx) => {
        const payload = JSON.parse(c.payload_raw || '{}');
        console.log(`   ${idx + 1}. ID: ${c.id} | Usuario: ${c.id_usuario} | Valor: R$ ${c.valor_original.toFixed(2)} | Status: ${c.status_pagamento}`);
        console.log(`      TXID: ${c.txid}`);
        console.log(`      Payload: origem=${payload.origem}, rodada=${payload.rodada}, tipo=${payload.tipo_premio}`);
        console.log();
      });
    } else {
      console.log('❌ Nenhuma cobrança com origem="premios" encontrada\n');
    }

    // 2) Verificar cobranças com origem='palpites'
    console.log('2️⃣  Cobranças com ORIGEM="palpites" (para pagamento de palpites):');
    const [cobrancasPalpites] = await pool.query(`
      SELECT 
        id, 
        id_usuario, 
        txid,
        valor_original,
        status_pagamento,
        payload_raw
      FROM pix_cobrancas
      WHERE JSON_UNQUOTE(JSON_EXTRACT(payload_raw,'$.origem')) = 'palpites'
        AND JSON_UNQUOTE(JSON_EXTRACT(payload_raw,'$.rodada')) = '3'
      ORDER BY id DESC
      LIMIT 5
    `);

    if (cobrancasPalpites && cobrancasPalpites.length > 0) {
      console.log(`✅ Encontradas ${cobrancasPalpites.length} cobranças (mostrando primeiras 5):\n`);
      cobrancasPalpites.forEach((c, idx) => {
        const payload = JSON.parse(c.payload_raw || '{}');
        console.log(`   ${idx + 1}. ID: ${c.id} | Usuario: ${c.id_usuario} | Valor: R$ ${c.valor_original.toFixed(2)} | Status: ${c.status_pagamento}`);
        console.log(`      TXID: ${c.txid}`);
        console.log(`      Palpite ID: ${payload.palpite_id}`);
        console.log();
      });
    } else {
      console.log('❌ Nenhuma cobrança com origem="palpites" encontrada\n');
    }

    // 3) Procurar especificamente por Maria Souza (usuario_id=4)
    console.log('3️⃣  Procurando cobranças de Maria Souza (usuario_id=4):');
    const [cobrancasMaria] = await pool.query(`
      SELECT 
        id, 
        id_usuario, 
        txid,
        valor_original,
        status,
        status_pagamento,
        payload_raw
      FROM pix_cobrancas
      WHERE id_usuario = 4
        AND JSON_UNQUOTE(JSON_EXTRACT(payload_raw,'$.rodada')) = '3'
      ORDER BY id DESC
    `);

    if (cobrancasMaria && cobrancasMaria.length > 0) {
      console.log(`✅ Encontradas ${cobrancasMaria.length} cobranças para Maria Souza:\n`);
      cobrancasMaria.forEach((c, idx) => {
        const payload = JSON.parse(c.payload_raw || '{}');
        console.log(`   ${idx + 1}. ID: ${c.id}`);
        console.log(`      TXID: ${c.txid}`);
        console.log(`      Valor: R$ ${c.valor_original.toFixed(2)}`);
        console.log(`      Status EFI: ${c.status} | Status Pagamento: ${c.status_pagamento}`);
        console.log(`      Origem: ${payload.origem} | Tipo: ${payload.tipo_premio || 'N/A'}`);
        console.log();
      });
    } else {
      console.log('❌ Nenhuma cobrança de Maria Souza encontrada\n');
    }

    // 4) Estatísticas gerais
    console.log('4️⃣  ESTATÍSTICAS RODADA 3:');
    const [stats] = await pool.query(`
      SELECT 
        COUNT(*) AS total_cobrancas,
        SUM(CASE WHEN status_pagamento = 'PENDENTE' THEN 1 ELSE 0 END) AS pendentes,
        SUM(CASE WHEN status_pagamento = 'PAGO' THEN 1 ELSE 0 END) AS pagas,
        SUM(valor_original) AS valor_total
      FROM pix_cobrancas
      WHERE JSON_UNQUOTE(JSON_EXTRACT(payload_raw,'$.rodada')) = '3'
    `);

    console.log(`   Total de cobranças: ${stats[0].total_cobrancas}`);
    console.log(`   Pendentes: ${stats[0].pendentes}`);
    console.log(`   Pagas: ${stats[0].pagas}`);
    console.log(`   Valor total: R$ ${(stats[0].valor_total || 0).toFixed(2)}\n`);

    // 5) Sugestão para teste
    console.log('5️⃣  SUGESTÃO PARA TESTE DO WEBHOOK:\n');
    
    if (cobrancasPremios && cobrancasPremios.length > 0) {
      const cobrancaTeste = cobrancasPremios.find(c => c.status_pagamento === 'PENDENTE') || cobrancasPremios[0];
      console.log(`✅ Use a cobrança de ID: ${cobrancaTeste.id}`);
      console.log(`   TXID: ${cobrancaTeste.txid}`);
      console.log(`   Usuario: ${cobrancaTeste.id_usuario}`);
      console.log(`   Valor: R$ ${cobrancaTeste.valor_original.toFixed(2)}`);
      console.log(`   Status: ${cobrancaTeste.status_pagamento}`);
      console.log(`\n   Execute: node scripts/testarWebhookEfiPix.js\n`);
    } else if (cobrancasMaria && cobrancasMaria.length > 0) {
      console.log(`✅ Encontrada cobrança de Maria Souza!`);
      console.log(`   ID: ${cobrancasMaria[0].id}`);
      console.log(`   TXID: ${cobrancasMaria[0].txid}`);
      console.log(`   Valor: R$ ${cobrancasMaria[0].valor_original.toFixed(2)}`);
      console.log(`   Status: ${cobrancasMaria[0].status_pagamento}`);
      console.log(`\n   Mas ela tem origem='${JSON.parse(cobrancasMaria[0].payload_raw || '{}').origem}'`);
      console.log(`   O script procura por origem='premios' e status_pagamento='PENDENTE'\n`);
    } else {
      console.log(`❌ NENHUMA COBRANÇA ENCONTRADA PARA RODADA 3!\n`);
      console.log(`   Possíveis causas:`);
      console.log(`   1. Pagamentos não foram gerados para rodada 3`);
      console.log(`   2. Todas as cobranças já foram pagas`);
      console.log(`   3. Palpites não foram inseridos para rodada 3\n`);
      console.log(`   Verifique os prêmios gerados:\n`);
      
      const [premios] = await pool.query(`
        SELECT COUNT(*) as total FROM premios
        WHERE rodada = (SELECT id FROM rodadas WHERE numero = 3 LIMIT 1)
      `);
      console.log(`   Total de prêmios/cobranças: ${premios[0].total}`);
    }

    console.log('=====================================\n');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ ERRO:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Executar diagnóstico
diagnosticar();
