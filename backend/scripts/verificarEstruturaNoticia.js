const pool = require('../database/conexao');

async function verificarEstrutura() {
  try {
    console.log('🔍 Verificando estrutura da tabela noticias...\n');
    
    // 1. Estrutura da tabela
    const [colunas] = await pool.query('DESCRIBE noticias');
    console.log('📋 Colunas:');
    console.table(colunas);
    
    // 2. Índices
    const [indices] = await pool.query('SHOW INDEX FROM noticias');
    console.log('\n🔑 Índices:');
    console.table(indices.map(i => ({
      Nome: i.Key_name,
      Coluna: i.Column_name,
      Unique: i.Non_unique === 0 ? 'SIM' : 'NÃO',
      Tipo: i.Index_type
    })));
    
    // 3. Create table
    const [createTable] = await pool.query('SHOW CREATE TABLE noticias');
    console.log('\n📝 CREATE TABLE:');
    console.log(createTable[0]['Create Table']);
    
    // 4. Últimas notícias GE
    const [ultimasGE] = await pool.query(`
      SELECT id, titulo, link 
      FROM noticias 
      WHERE fonte = 'GE' 
      ORDER BY data_publicacao DESC 
      LIMIT 10
    `);
    console.log('\n📰 Últimas 10 notícias GE no banco:');
    ultimasGE.forEach(n => console.log(`[${n.id}] ${n.titulo}`));
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Erro:', err);
    process.exit(1);
  }
}

verificarEstrutura();
