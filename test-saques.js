const axios = require('axios');

const API_BASE_URL = 'http://192.168.56.127:3001';
const token = process.env.TEST_TOKEN || 'seu_token_aqui';

async function testSaquesEndpoint() {
  try {
    console.log('🔍 Testando GET /admin/saques/solicitacoes');
    const res = await axios.get(`${API_BASE_URL}/admin/saques/solicitacoes`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    console.log('✅ Sucesso! Resposta:');
    console.log(JSON.stringify(res.data, null, 2));
  } catch (err) {
    if (err.response) {
      console.error('❌ Erro na resposta:', err.response.status);
      console.error(err.response.data);
    } else {
      console.error('❌ Erro na requisição:', err.message);
    }
  }
}

testSaquesEndpoint();
