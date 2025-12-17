const axios = require('axios');

async function testar() {
  try {
    console.log('Testando service diretamente...');
    const { buscarJogosAoVivo } = require('./backend/services/jogosAoVivoScraper');
    const jogos = await buscarJogosAoVivo();
    console.log(`✓ Service retornou ${jogos.length} jogos`);
    
    console.log('\nTestando endpoint GET /jogos-ao-vivo...');
    const response = await axios.get('http://localhost:3002/jogos-ao-vivo', { timeout: 5000 });
    console.log(`✓ Endpoint retornou ${response.data.length} jogos`);
    console.log(JSON.stringify(response.data.slice(0,1), null, 2));
  } catch (err) {
    console.error('✗ Erro:', err.message);
  }
}

testar();
