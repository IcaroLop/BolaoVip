const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox'],
  });

  const page = await browser.newPage();

  console.log('🎯 Interceptando requisições da SPA...');

  page.on('response', async (response) => {
    const url = response.url();
    const ct = response.headers()['content-type'] || '';

    // Mostra apenas JSONs e chamadas com "agenda" ou "event"
    if (ct.includes('application/json') || url.includes('agenda') || url.includes('event')) {
      console.log(`🔗 [${response.status()}] ${url}`);
    }
  });

  await page.goto('https://ge.globo.com/agenda/#/futebol', {
    waitUntil: 'networkidle0',
    timeout: 60000,
  });

  console.log('⏳ Aguardando requisições...');
  await new Promise(resolve => setTimeout(resolve, 10000)); // Espera o JS carregar conteúdo
  await browser.close();
})();
