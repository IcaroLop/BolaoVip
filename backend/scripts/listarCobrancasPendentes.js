const pool = require('../database/conexao');

async function verificar() {
  const conn = await pool.getConnection();
  try {
    console.log('\n=== TODAS AS COBRANÇAS PENDENTES ===\n');

    const [cobrancas] = await conn.query(
      `SELECT c.codigo_envio, u.nome AS nome_usuario, c.valor_original, 
              c.pix_copiaecola IS NOT NULL AS tem_pix,
              CHAR_LENGTH(c.pix_copiaecola) AS tamanho_pix
       FROM pix_cobrancas c
       JOIN usuarios u ON c.id_usuario = u.id
       WHERE c.status_pagamento = 'PENDENTE'
       ORDER BY c.calendario_criacao DESC`
    );

    if (cobrancas.length === 0) {
      console.log('⚠️  Nenhuma cobrança pendente');
      return;
    }

    console.log(`Total de cobranças pendentes: ${cobrancas.length}\n`);
    
    cobrancas.forEach((cob, idx) => {
      console.log(`${idx + 1}. ${cob.nome_usuario} - R$ ${cob.valor_original}`);
      console.log(`   Código: ${cob.codigo_envio}`);
      console.log(`   PIX gerado: ${cob.tem_pix ? '✅ SIM' : '❌ NÃO'}`);
      if (cob.tem_pix) {
        console.log(`   Tamanho do PIX: ${cob.tamanho_pix} caracteres`);
      }
      console.log('');
    });

    const comPix = cobrancas.filter(c => c.tem_pix).length;
    const semPix = cobrancas.filter(c => !c.tem_pix).length;
    
    console.log(`\n📊 Resumo:`);
    console.log(`   Com PIX gerado: ${comPix}`);
    console.log(`   Sem PIX gerado: ${semPix}`);
    
    if (semPix > 0) {
      console.log(`\n⚠️  As cobranças SEM PIX mostrarão o botão "🔄 Gerar PIX"`);
      console.log(`   Clique nele para gerar o código copia e cola do PIX`);
    }

  } catch (err) {
    console.error('❌ Erro:', err);
  } finally {
    conn.release();
    process.exit(0);
  }
}

verificar();
