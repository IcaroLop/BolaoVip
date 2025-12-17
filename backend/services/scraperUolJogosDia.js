const puppeteer = require('puppeteer');
const { format } = require('date-fns');
const ptBR = require('date-fns/locale/pt-BR');

async function buscarJogosDoDiaUOL(data = new Date()) {
  const dataFormatada = format(data, 'dd-MM-yyyy', { locale: ptBR });
  const url = `https://www.uol.com.br/esporte/futebol/central-de-jogos/#/${dataFormatada}`;

  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();

  try {
    console.log(`🟡 Acessando Central de Jogos da UOL: ${dataFormatada}`);
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 0 });

    // Aguarda pelo conteúdo renderizado dos cards
    await page.waitForSelector('.match-card', { timeout: 20000 });

    const jogos = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.match-card'));
      return cards.map(card => {
        const campeonato = card.querySelector('.match-info .match-league')?.innerText || null;
        const horario = card.querySelector('.match-info .match-date')?.innerText || null;
        const status = card.querySelector('.match-status')?.innerText || null;

        const timeCasa = card.querySelector('.team.team-home .team-name')?.innerText || null;
        const escudoCasa = card.querySelector('.team.team-home img')?.src || null;
        const placarCasa = card.querySelector('.match-score .score-home')?.innerText || null;

        const timeFora = card.querySelector('.team.team-away .team-name')?.innerText || null;
        const escudoFora = card.querySelector('.team.team-away img')?.src || null;
        const placarFora = card.querySelector('.match-score .score-away')?.innerText || null;

        return {
          campeonato,
          horario,
          status,
          timeCasa,
          escudoCasa,
          placarCasa,
          timeFora,
          escudoFora,
          placarFora
        };
      });
    });

    console.log(`✅ ${jogos.length} jogo(s) encontrados para ${dataFormatada}`);
    return jogos;
  } catch (erro) {
    console.error('❌ Erro ao buscar jogos:', erro.message);
    return [];
  } finally {
    await browser.close();
  }
}

// Exemplo de uso isolado:
if (require.main === module) {
  buscarJogosDoDiaUOL().then(console.log);
}

module.exports = { buscarJogosDoDiaUOL };
