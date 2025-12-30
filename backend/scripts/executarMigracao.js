const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'isl050382',
  database: 'bolaovip'
});

async function executarMigracao() {
  const conexao = await pool.getConnection();
  
  try {
    console.log('🚀 Iniciando migração do banco de dados...\n');
    
    // Verificar se coluna já existe
    const [colunas] = await conexao.execute(`DESCRIBE rodadas`);
    const temPagamentosGerados = colunas.some(col => col.Field === 'pagamentos_gerados');
    const temPagamentosGeradosEm = colunas.some(col => col.Field === 'pagamentos_gerados_em');
    
    // 1. Adicionar coluna pagamentos_gerados
    if (!temPagamentosGerados) {
      console.log('✓ Adicionando coluna pagamentos_gerados à tabela rodadas...');
      await conexao.execute(`
        ALTER TABLE rodadas 
        ADD COLUMN pagamentos_gerados TINYINT(1) DEFAULT 0
      `);
      console.log('  ✅ Coluna pagamentos_gerados adicionada\n');
    } else {
      console.log('  ℹ️ Coluna pagamentos_gerados já existe\n');
    }
    
    // 2. Adicionar coluna pagamentos_gerados_em
    if (!temPagamentosGeradosEm) {
      console.log('✓ Adicionando coluna pagamentos_gerados_em à tabela rodadas...');
      await conexao.execute(`
        ALTER TABLE rodadas 
        ADD COLUMN pagamentos_gerados_em DATETIME NULL
      `);
      console.log('  ✅ Coluna pagamentos_gerados_em adicionada\n');
    } else {
      console.log('  ℹ️ Coluna pagamentos_gerados_em já existe\n');
    }
    
    // 3. Criar índice para performance
    console.log('✓ Criando índice para otimização...');
    try {
      await conexao.execute(`
        ALTER TABLE rodadas 
        ADD INDEX idx_rodadas_pagamentos (pagamentos_gerados, numero)
      `);
      console.log('  ✅ Índice idx_rodadas_pagamentos criado\n');
    } catch (e) {
      if (e.code === 'ER_DUP_KEYNAME') {
        console.log('  ℹ️ Índice já existe\n');
      } else {
        throw e;
      }
    }
    
    console.log('✅ Migração concluída com sucesso!');
    console.log('\n📊 Verificando tabela rodadas...');
    
    const [colunasAtuais] = await conexao.execute(`DESCRIBE rodadas`);
    const colunasNovas = colunasAtuais.filter(col => 
      ['pagamentos_gerados', 'pagamentos_gerados_em'].includes(col.Field)
    );
    
    console.log('\nColunas adicionadas:');
    colunasNovas.forEach(col => {
      console.log(`  • ${col.Field}: ${col.Type} (Default: ${col.Default})`);
    });
    
    console.log('\n🎉 Banco de dados pronto para uso!');
    
  } catch (erro) {
    console.error('❌ Erro na migração:', erro.message);
    throw erro;
  } finally {
    conexao.release();
    await pool.end();
  }
}

executarMigracao();
