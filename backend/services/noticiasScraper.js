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

      // Filtro: apenas notícias que contenham palavras-chave de futebol
      const palavrasChaveFutebol = ['futebol', 'gol', 'times', 'campeonato', 'cbf', 'série a', 'brasileirão', 'partida', 'match', 'jogador', 'técnico', 'torcida'];
      const textoCompleto = (titulo + ' ' + resumo).toLowerCase();
      const ehNoticiaFutebol = palavrasChaveFutebol.some(palavra => textoCompleto.includes(palavra));

      if (titulo && link && ehNoticiaFutebol) {
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

    console.log(`✅ ${noticias.length} notícias de futebol coletadas do GE`);
    return noticias;
  } catch (error) {
    console.error('❌ Erro ao coletar notícias do GE:', error.message);
    return [];
  }
}

// Coleta notícias do ESPN
async function coletarNoticiasESPN() {
  try {
    // Tentar URL alternativa mais simples
    const url = 'https://www.espn.com.br/futebol/';
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });
    const $ = cheerio.load(data);
    const noticias = [];

    // Seletores mais abrangentes
    $('a').each((_, el) => {
      const titulo = $(el).text().trim();
      let link = $(el).attr('href');
      
      // Filtra apenas links que parecem ser notícias
      if (!link || !titulo || titulo.length < 10) return;
      
      // Busca por imagem próxima
      const imagemEl = $(el).find('img').first();
      let imagem = imagemEl.attr('src') || imagemEl.attr('data-src');

      // Filtro: apenas notícias de futebol
      const palavrasChaveFutebol = ['futebol', 'gol', 'times', 'campeonato', 'cbf', 'série a', 'brasileirão', 'partida', 'match', 'jogador', 'técnico', 'torcida', 'seleção'];
      const ehNoticiaFutebol = palavrasChaveFutebol.some(palavra => titulo.toLowerCase().includes(palavra));

      if (ehNoticiaFutebol && link) {
        if (!link.startsWith('http')) {
          link = link.startsWith('/') ? `https://www.espn.com.br${link}` : `https://www.espn.com.br/${link}`;
        }
        
        const noticiaExiste = noticias.some(n => n.titulo === titulo);
        if (!noticiaExiste) {
          noticias.push({
            titulo,
            resumo: titulo,
            link,
            imagem,
            fonte: 'ESPN',
            data_publicacao: new Date()
          });
        }
      }
    });

    console.log(`✅ ${noticias.length} notícias de futebol coletadas da ESPN`);
    return noticias.slice(0, 10); // Limita a 10 notícias
  } catch (error) {
    console.error('❌ Erro ao coletar notícias da ESPN:', error.message);
    return [];
  }
}

// Coleta notícias do UOL Esporte
async function coletarNoticiasUOL() {
  try {
    const url = 'https://www.uol.com.br/esporte/futebol/';
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });
    const $ = cheerio.load(data);
    const noticias = [];

    // Seletores mais gerais para pegar notícias
    $('a').each((_, el) => {
      const titulo = $(el).text().trim();
      let link = $(el).attr('href');
      
      // Filtra apenas links que parecem ser notícias
      if (!link || !titulo || titulo.length < 10) return;
      
      // Busca por imagem próxima
      const imagemEl = $(el).find('img').first();
      let imagem = imagemEl.attr('src') || imagemEl.attr('data-src');

      // Filtro: apenas notícias de futebol
      const palavrasChaveFutebol = ['futebol', 'gol', 'times', 'campeonato', 'cbf', 'série a', 'brasileirão', 'partida', 'match', 'jogador', 'técnico', 'torcida', 'seleção'];
      const ehNoticiaFutebol = palavrasChaveFutebol.some(palavra => titulo.toLowerCase().includes(palavra));

      if (ehNoticiaFutebol && link) {
        if (!link.startsWith('http')) {
          link = link.startsWith('/') ? `https://www.uol.com.br${link}` : `https://www.uol.com.br/${link}`;
        }
        
        const noticiaExiste = noticias.some(n => n.titulo === titulo);
        if (!noticiaExiste) {
          noticias.push({
            titulo,
            resumo: titulo,
            link,
            imagem,
            fonte: 'UOL',
            data_publicacao: new Date()
          });
        }
      }
    });

    console.log(`✅ ${noticias.length} notícias de futebol coletadas do UOL`);
    return noticias.slice(0, 10); // Limita a 10 notícias
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
  
  // Remove duplicatas baseado no LINK (não no título)
  const noticiasUnicas = [];
  const linksVistos = new Set();

  for (const noticia of todasNoticias) {
    const linkNormalizado = noticia.link.toLowerCase().trim();
    if (!linksVistos.has(linkNormalizado)) {
      linksVistos.add(linkNormalizado);
      noticiasUnicas.push(noticia);
    }
  }

  console.log(`✅ Total de ${noticiasUnicas.length} notícias únicas coletadas (${noticiasGE.length} GE, ${noticiasESPN.length} ESPN, ${noticiasUOL.length} UOL)`);
  return noticiasUnicas;
}

module.exports = { 
  coletarNoticiasGE,
  coletarNoticiasESPN,
  coletarNoticiasUOL,
  coletarTodasNoticias
};
