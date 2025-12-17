const cron = require('node-cron');
const { coletarTodasNoticias } = require('../services/noticiasScraper');
const pool = require('../database/conexao');

// Sincroniza notícias automaticamente a cada 30 minutos
cron.schedule('*/30 * * * *', async () => {
  console.log('🔄 [CRON] Iniciando sincronização automática de notícias...');
  
  try {
    const noticias = await coletarTodasNoticias();
    
    let inseridas = 0;
    let atualizadas = 0;

    for (const n of noticias) {
      const [result] = await pool.query(`
        INSERT INTO noticias (titulo, resumo, imagem, link, fonte, data_publicacao)
        VALUES (?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
          resumo = VALUES(resumo), 
          imagem = VALUES(imagem),
          data_publicacao = VALUES(data_publicacao)
      `, [n.titulo, n.resumo, n.imagem, n.link, n.fonte, n.data_publicacao]);

      if (result.affectedRows === 1) inseridas++;
      else if (result.affectedRows === 2) atualizadas++;
    }

    console.log(`✅ [CRON] Sincronização concluída: ${inseridas} inseridas, ${atualizadas} atualizadas`);
  } catch (error) {
    console.error('❌ [CRON] Erro na sincronização automática:', error.message);
  }
});

console.log('⏰ Job de sincronização de notícias agendado (a cada 30 minutos)');

module.exports = {};
