/**
 * Script para executar a criação da tabela notificacoes_usuarios
 */

const pool = require('../database/conexao');
const fs = require('fs');
const path = require('path');

async function executarSQL() {
  let conexao;
  try {
    console.log('🔄 Conectando ao banco de dados...');
    conexao = await pool.getConnection();
    
    // Ler o arquivo SQL
    const sqlFilePath = path.join(__dirname, 'criarTabelaNotificacoes.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    // Remover comentários e dividir por statements
    const statements = sqlContent
      .split('\n')
      .filter(line => !line.trim().startsWith('--'))
      .join('\n')
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    console.log(`📝 Executando ${statements.length} statement(s)...`);
    
    // Executar cada statement
    for (const statement of statements) {
      if (statement.trim()) {
        await conexao.query(statement);
        console.log('✅ Statement executado com sucesso');
      }
    }
    
    console.log('\n✅ Tabela notificacoes_usuarios criada com sucesso!');
    console.log('📊 Verificando estrutura...\n');
    
    // Verificar a tabela criada
    const [columns] = await conexao.query('DESCRIBE notificacoes_usuarios');
    console.table(columns);
    
    console.log('\n✅ Sistema de notificações pronto para uso!');
    
  } catch (erro) {
    console.error('❌ Erro ao criar tabela:', erro.message);
    if (erro.code === 'ER_TABLE_EXISTS_ERR') {
      console.log('ℹ️  A tabela já existe no banco de dados.');
    }
    process.exit(1);
  } finally {
    if (conexao) {
      conexao.release();
    }
    await pool.end();
  }
}

// Executar
executarSQL();
