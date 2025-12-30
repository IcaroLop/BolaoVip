const pool = require('../database/conexao');

async function verificar() {
  const conn = await pool.getConnection();
  try {
    console.log('\n=== VERIFICAÇÃO DO CÓDIGO COPIA E COLA ===\n');

    // Buscar uma cobrança que tenha pix_copiaecola preenchido
    const [cobrancas] = await conn.query(
      `SELECT codigo_envio, pix_copiaecola, txid, valor_original 
       FROM pix_cobrancas 
       WHERE pix_copiaecola IS NOT NULL 
       LIMIT 1`
    );

    if (cobrancas.length === 0) {
      console.log('⚠️  Nenhuma cobrança com PIX gerado encontrada');
      console.log('Execute "Gerar PIX" em alguma cobrança primeiro');
      return;
    }

    const cob = cobrancas[0];
    console.log('📋 Dados da cobrança:');
    console.log(`codigo_envio: ${cob.codigo_envio}`);
    console.log(`txid: ${cob.txid}`);
    console.log(`valor: R$ ${cob.valor_original}`);
    console.log(`\n🔑 Código Copia e Cola PIX:`);
    console.log(cob.pix_copiaecola);
    console.log(`\nTamanho: ${cob.pix_copiaecola.length} caracteres`);
    console.log(`\nPrimeiros 50 caracteres: ${cob.pix_copiaecola.substring(0, 50)}`);
    console.log(`Últimos 50 caracteres: ${cob.pix_copiaecola.substring(cob.pix_copiaecola.length - 50)}`);
    
    // Verificar se parece com um código PIX válido (deve começar com números específicos)
    const comecaCorreto = cob.pix_copiaecola.substring(0, 10);
    console.log(`\nComeça com: ${comecaCorreto}`);
    
    if (cob.pix_copiaecola.includes('BR.GOV.BCB.PIX')) {
      console.log('✅ Parece ser um código PIX válido (contém BR.GOV.BCB.PIX)');
    } else {
      console.log('⚠️ AVISO: Não contém "BR.GOV.BCB.PIX" - pode não ser um código PIX válido');
    }

    // Simular o que o frontend recebe
    console.log('\n\n=== SIMULANDO ENDPOINT DO FRONTEND ===\n');
    const [rows] = await conn.query(`
      SELECT c.id, c.codigo_envio, c.id_usuario, u.nome AS nome_usuario,
             c.valor_original AS valor,
             DATE_ADD(c.calendario_criacao, INTERVAL c.calendario_expiracao SECOND) AS data_expiracao,
             c.status_pagamento,
             c.status,
             c.pix_copiaecola,
             c.txid
      FROM pix_cobrancas c
      JOIN usuarios u ON c.id_usuario = u.id
      WHERE c.codigo_envio = ?
    `, [cob.codigo_envio]);

    if (rows.length > 0) {
      console.log('Dados que o frontend recebe:');
      console.log(`codigo_envio: ${rows[0].codigo_envio}`);
      console.log(`pix_copiaecola: ${rows[0].pix_copiaecola ? rows[0].pix_copiaecola.substring(0, 50) + '...' : 'NULL'}`);
      console.log(`\nO código que será copiado tem ${rows[0].pix_copiaecola ? rows[0].pix_copiaecola.length : 0} caracteres`);
    }

  } catch (err) {
    console.error('❌ Erro:', err);
  } finally {
    conn.release();
    process.exit(0);
  }
}

verificar();
