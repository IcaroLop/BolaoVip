const pool = require('../database/conexao');
const { coletarTodasNoticias } = require('../services/noticiasScraper');

async function listarNoticias(req, res) {
  try {
    const pagina = parseInt(req.query.pagina) || 1;
    const limite = parseInt(req.query.limite) || 20;
    const offset = (pagina - 1) * limite;

    const [rows] = await pool.query(
      `SELECT * FROM noticias 
       ORDER BY data_publicacao DESC 
       LIMIT ? OFFSET ?`,
      [limite, offset]
    );
    
    res.json(rows);
  } catch (error) {
    console.error('Erro ao listar notícias:', error);
    res.status(500).json({ erro: 'Erro ao listar notícias' });
  }
}

async function sincronizarNoticias(req, res) {
  try {
    console.log('🔄 Sincronizando notícias de múltiplas fontes...');
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

    console.log(`✅ Sincronização concluída: ${inseridas} inseridas, ${atualizadas} atualizadas`);
    res.json({ 
      sucesso: true, 
      total: noticias.length,
      inseridas,
      atualizadas
    });
  } catch (error) {
    console.error('❌ Erro ao sincronizar notícias:', error);
    res.status(500).json({ erro: 'Erro ao sincronizar notícias' });
  }
}

// Busca notícias diretamente da internet (sem salvar no banco)
async function buscarNoticiasAoVivo(req, res) {
  try {
    const noticias = await coletarTodasNoticias();
    res.json(noticias);
  } catch (error) {
    console.error('❌ Erro ao buscar notícias ao vivo:', error);
    res.status(500).json({ erro: 'Erro ao buscar notícias' });
  }
}

async function obterNoticiaPorId(req, res) {
  const { id } = req.params;

  try {
    const [rows] = await pool.query(
      `SELECT * FROM noticias WHERE id = ?`, [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ erro: 'Notícia não encontrada' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Erro ao buscar notícia por ID:', error);
    res.status(500).json({ erro: 'Erro ao buscar notícia' });
  }
}


module.exports = { 
  listarNoticias, 
  sincronizarNoticias, 
  obterNoticiaPorId,
  buscarNoticiasAoVivo 
};
