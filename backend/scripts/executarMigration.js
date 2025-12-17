const fs = require('fs');
const path = require('path');
const pool = require('../database/conexao');

async function executarMigration() {
  const sqlFile = path.join(__dirname, 'BD', 'alter_add_fase_jogos.sql');
  
  try {
    const sql = fs.readFileSync(sqlFile, 'utf8');
    console.log('📋 Arquivo SQL lido com sucesso');
    
    const conexao = await pool.getConnection();
    console.log('🔌 Conectado ao banco de dados');

    // Executar cada statement separado por ;
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);

    for (let i = 0; i < statements.length; i++) {
      console.log(`\n▶️  Executando statement ${i + 1}/${statements.length}...`);
      await conexao.query(statements[i]);
      console.log(`✅ Statement ${i + 1} executado com sucesso`);
    }

    await conexao.release();
    console.log('\n🎉 Migration concluída com sucesso!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Erro ao executar migration:', error.message);
    if (error.sql) console.error('SQL:', error.sql);
    process.exit(1);
  }
}

executarMigration();
