require('dotenv').config();
const mysql = require('mysql2/promise');

/**
 * Script para verificar cobranças pendentes da rodada 12
 * Executa: node backend/scripts/verificarCobrancasRodada12.js
 */
async function verificar() {
  const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'fBVhh6w2KW',
    database: 'bolaovip',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  try {
    console.log('='.repeat(70));
    console.log('VERIFICANDO COBRANÇAS PENDENTES - RODADA 12');
    console.log('='.repeat(70));

    // Buscar cobranças pendentes da rodada 12
    const [cobrancas] = await pool.query(`
      SELECT 
        id, 
        txid, 
        id_usuario, 
        valor_original, 
        status_pagamento, 
        webhook_recebido,
        TIMESTAMPDIFF(MINUTE, created_at, NOW()) as minutos_idade,
        created_at
      FROM pix_cobrancas 
      WHERE JSON_UNQUOTE(JSON_EXTRACT(payload_raw,'$.rodada')) = '12' 
        AND status_pagamento = 'PENDENTE'
      ORDER BY created_at DESC 
      LIMIT 20
    `);

    console.log(`\n📋 Encontradas ${cobrancas.length} cobranças PENDENTES na rodada 12\n`);

    if (cobrancas.length === 0) {
      console.log('✅ Não há cobranças pendentes para verificar');
      await pool.end();
      return;
    }

    // Mostrar detalhes
    cobrancas.forEach((c, idx) => {
      console.log(`${idx + 1}. Cobrança #${c.id}`);
      console.log(`   Usuario: ${c.id_usuario}`);
      console.log(`   Txid: ${c.txid}`);
      console.log(`   Valor: R$ ${Number(c.valor_original).toFixed(2)}`);
      console.log(`   Status: ${c.status_pagamento}`);
      console.log(`   Webhook: ${c.webhook_recebido ? 'SIM' : 'NÃO'}`);
      console.log(`   Idade: ${c.minutos_idade} minutos`);
      console.log(`   Criada: ${c.created_at}`);
      console.log('');
    });

    // Verificar se alguma é elegível para fallback (> 2 minutos)
    const elegiveis = cobrancas.filter(c => c.minutos_idade >= 2);
    
    console.log('='.repeat(70));
    console.log(`✅ Elegíveis para verificação fallback (> 2 min): ${elegiveis.length}`);
    console.log('='.repeat(70));

    if (elegiveis.length > 0) {
      console.log('\n⏰ O cron job verificará estas cobranças na próxima execução (a cada 5 min)');
      console.log('   Ou execute: node backend/scripts/testarPixFallback.js\n');
    } else {
      const maisAntiga = cobrancas[0];
      const tempoRestante = 2 - maisAntiga.minutos_idade;
      console.log(`\n⏳ Aguarde ${Math.ceil(tempoRestante)} minuto(s) para verificação automática`);
      console.log('   (cobranças devem ter > 2 minutos de idade)\n');
    }

    await pool.end();

  } catch (error) {
    console.error('❌ Erro:', error.message);
    await pool.end();
    process.exit(1);
  }
}

verificar();
