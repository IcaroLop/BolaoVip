const axios = require('axios');
const cheerio = require('cheerio');

// Coleta notícias do GE.globo.com
async function coletarNoticiasGE() {
  try {
    const url = 'https://ge.globo.com/futebol/brasileirao-serie-a/';
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    const $ = cheerio.load(data);
    const noticias = [];

    // Seletor atualizado para feed do GE
    $('.feed-post-body, .bastian-feed-item').each((_, el) => {
      const titulo = $(el).find('.feed-post-link, .feed-post-body-title a').text().trim();
      const link = $(el).find('.feed-post-link, .feed-post-body-title a').attr('href');
      const resumo = $(el).find('.feed-post-body-resumo, .feed-post-body-lead').text().trim();
      
      // Tenta extrair imagem
      let imagem = $(el).find('.feed-media-wrapper img, .bstn-fd-picture-image img').attr('src');
      if (!imagem) {
        imagem = $(el).find('img').attr('src');
      }

      if (titulo && link) {
        noticias.push({
          titulo,
          resumo: resumo || titulo,
          link: link.startsWith('http') ? link : `https://ge.globo.com${link}`,
          imagem,
          fonte: 'GE',
          data_publicacao: new Date()
        });
      }
    });

    console.log(`✅ ${noticias.length} notícias coletadas do GE`);
    return noticias;
  } catch (error) {
    console.error('❌ Erro ao coletar notícias do GE:', error.message);
    return [];
  }
}

// Coleta notícias do ESPN
async function coletarNoticiasESPN() {
  try {
    const url = 'https://www.espn.com.br/futebol/brasileiro-serie-a/';
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    const $ = cheerio.load(data);
    const noticias = [];

    $('article.contentItem, .contentItem__content').each((_, el) => {
      const titulo = $(el).find('.contentItem__title, h1, h2').text().trim();
      const link = $(el).find('a').attr('href');
      const resumo = $(el).find('.contentItem__subhead, .contentItem__description').text().trim();
      const imagem = $(el).find('img').attr('data-default-src') || $(el).find('img').attr('src');

      if (titulo && link) {
        noticias.push({
          titulo,
          resumo: resumo || titulo,
          link: link.startsWith('http') ? link : `https://www.espn.com.br${link}`,
          imagem,
          fonte: 'ESPN',
          data_publicacao: new Date()
        });
      }
    });

    console.log(`✅ ${noticias.length} notícias coletadas da ESPN`);
    return noticias;
  } catch (error) {
    console.error('❌ Erro ao coletar notícias da ESPN:', error.message);
    return [];
  }
}

// Coleta notícias do UOL Esporte
async function coletarNoticiasUOL() {
  try {
    const url = 'https://www.uol.com.br/esporte/futebol/campeonatos/brasileiro/';
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    const $ = cheerio.load(data);
    const noticias = [];

    $('.thumbnails-item, .news-item').slice(0, 15).each((_, el) => {
      const titulo = $(el).find('.thumb-title, .news-title, h3, h2').text().trim();
      const link = $(el).find('a').attr('href');
      const resumo = $(el).find('.thumb-subtitle, .news-subtitle').text().trim();
      const imagem = $(el).find('img').attr('src') || $(el).find('img').attr('data-src');

      if (titulo && link) {
        noticias.push({
          titulo,
          resumo: resumo || titulo,
          link: link.startsWith('http') ? link : `https://www.uol.com.br${link}`,
          imagem,
          fonte: 'UOL',
          data_publicacao: new Date()
        });
      }
    });

    console.log(`✅ ${noticias.length} notícias coletadas do UOL`);
    return noticias;
  } catch (error) {
    console.error('❌ Erro ao coletar notícias do UOL:', error.message);
    return [];
  }
}

// Função principal que coleta de todas as fontes
async function coletarTodasNoticias() {
  console.log('🔄 Iniciando coleta de notícias de múltiplas fontes...');
  
  const [noticiasGE, noticiasESPN, noticiasUOL] = await Promise.all([
    coletarNoticiasGE(),
    coletarNoticiasESPN(),
    coletarNoticiasUOL()
  ]);

  const todasNoticias = [...noticiasGE, ...noticiasESPN, ...noticiasUOL];
  
  // Remove duplicatas baseado no título
  const noticiasUnicas = [];
  const titulosVistos = new Set();

  for (const noticia of todasNoticias) {
    const tituloNormalizado = noticia.titulo.toLowerCase().trim();
    if (!titulosVistos.has(tituloNormalizado)) {
      titulosVistos.add(tituloNormalizado);
      noticiasUnicas.push(noticia);
    }
  }

  console.log(`✅ Total de ${noticiasUnicas.length} notícias únicas coletadas`);
  return noticiasUnicas;
}

module.exports = { 
  coletarNoticiasGE,
  coletarNoticiasESPN,
  coletarNoticiasUOL,
  coletarTodasNoticias
};
