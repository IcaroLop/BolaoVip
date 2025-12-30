const { coletarTodasNoticias } = require('./services/noticiasScraper');

async function testar() {
  console.log('🔄 Testando coleta de notícias...');
  try {
    const noticias = await coletarTodasNoticias();
    console.log('\n✅ Teste completo!');
    console.log(`\n📰 Total de notícias coletadas: ${noticias.length}`);
    
    if (noticias.length > 0) {
      console.log('\n📄 Primeiras 3 notícias:');
      noticias.slice(0, 3).forEach((n, i) => {
        console.log(`\n${i + 1}. [${n.fonte}] ${n.titulo}`);
        console.log(`   Link: ${n.link}`);
      });
    }
  } catch (err) {
    console.error('❌ Erro:', err.message);
  }
  process.exit(0);
}

testar();
