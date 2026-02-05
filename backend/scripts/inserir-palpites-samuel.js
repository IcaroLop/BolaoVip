const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'localhost',
  port: 3307,
  user: 'root',
  password: 'fBVhh6w2KW',
  database: 'bolaovip',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const palpites = [
  { jogo_id: 43725, gols_casa: 2, gols_fora: 1 },  // Flamengo 2 x 1 Internacional
  { jogo_id: 43726, gols_casa: 1, gols_fora: 2 },  // Bragantino 1 x 2 Atlético-MG
  { jogo_id: 43727, gols_casa: 2, gols_fora: 1 },  // Santos 2 x 1 São Paulo
  { jogo_id: 43728, gols_casa: 2, gols_fora: 1 },  // Remo 2 x 1 Mirassol
  { jogo_id: 43729, gols_casa: 3, gols_fora: 0 },  // Palmeiras 3 x 0 Vitória
  { jogo_id: 43730, gols_casa: 2, gols_fora: 1 }   // Grêmio 2 x 1 Botafogo
];

(async () => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    console.log('🔄 Iniciando inserção de palpites para Samuel de Oliveira Barros...\n');
    
    for (let i = 0; i < palpites.length; i++) {
      const palpite = palpites[i];
      await connection.query(
        `INSERT INTO palpites 
         (id_usuario, grupo_id, campeonato_id, rodada, id_jogo, gols_casa, gols_fora) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [23, 3, 10, 2, palpite.jogo_id, palpite.gols_casa, palpite.gols_fora]
      );
      
      console.log(`✅ Palpite ${i + 1}/6 inserido - Jogo ID ${palpite.jogo_id}: ${palpite.gols_casa} x ${palpite.gols_fora}`);
    }
    
    await connection.commit();
    console.log('\n✅ Todos os 6 palpites de Samuel foram inseridos com sucesso!');
    
    // Verificar inserção
    const [verificacao] = await connection.query(
      'SELECT COUNT(*) as total FROM palpites WHERE id_usuario = 23 AND rodada = 2'
    );
    console.log(`\n📊 Verificação: ${verificacao[0].total} palpites para Samuel de Oliveira Barros na rodada 2`);
    
  } catch (error) {
    await connection.rollback();
    console.error('❌ ERRO na inserção:', error.message);
    console.error('Transação desfeita - nenhum dado foi alterado');
  } finally {
    connection.release();
    await pool.end();
  }
})();
