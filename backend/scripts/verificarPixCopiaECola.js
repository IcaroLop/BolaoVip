const pool = require('../database/conexao');

async function verificar() {
  const conn = await pool.getConnection();
  try {
    console.log('\n=== VERIFICAÇÃO DE PIX COPIA E COLA ===\n');

    // 1. Verificar se a coluna existe
    console.log('1️⃣  Verificando se coluna pix_copiaecola existe:');
    const [cols] = await conn.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pix_cobrancas' 
       AND COLUMN_NAME LIKE '%copia%'`
    );
    console.table(cols);

    // 2. Verificar dados reais de uma cobrança pendente
    console.log('\n2️⃣  Dados de cobranças pendentes (primeiras 3):');
    const [cobrancas] = await conn.query(
      `SELECT codigo_envio, pix_copiaecola, txid, valor_original, status_pagamento 
       FROM pix_cobrancas 
       WHERE status_pagamento = 'PENDENTE' 
       LIMIT 3`
    );
    
    if (cobrancas.length === 0) {
      console.log('⚠️  Nenhuma cobrança pendente encontrada');
    } else {
      cobrancas.forEach((cob, idx) => {
        console.log(`\n--- Cobrança ${idx + 1} ---`);
        console.log(`codigo_envio: ${cob.codigo_envio}`);
        console.log(`pix_copiaecola: ${cob.pix_copiaecola ? cob.pix_copiaecola.substring(0, 50) + '...' : 'NULL'}`);
        console.log(`txid: ${cob.txid}`);
        console.log(`valor: ${cob.valor_original}`);
        console.log(`Tamanho do pix_copiaecola: ${cob.pix_copiaecola ? cob.pix_copiaecola.length : 0} caracteres`);
      });
    }

    // 3. Simular query do endpoint
    console.log('\n3️⃣  Simulando query do endpoint /pagamentos/cobrancas/pendentes:');
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
      WHERE c.status_pagamento = 'PENDENTE'
      LIMIT 1
    `);
    
    if (rows.length > 0) {
      console.log('\nPrimeiro resultado do endpoint:');
      console.log(JSON.stringify(rows[0], null, 2));
    } else {
      console.log('⚠️  Nenhum resultado');
    }

  } catch (err) {
    console.error('❌ Erro:', err);
  } finally {
    conn.release();
    process.exit(0);
  }
}

verificar();
