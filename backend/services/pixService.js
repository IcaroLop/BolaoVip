const axios = require('axios');
const fs = require('fs');
const https = require('https');
require('dotenv').config();

const cert = fs.readFileSync(process.env.EFI_PIX_CERT_PATH);
const key = fs.readFileSync(process.env.EFI_PIX_KEY_PATH);

const httpsAgent = new https.Agent({
  cert: cert,
  key: key,
  rejectUnauthorized: false // ATENÇÃO: em produção usar true!
});

async function getAccessToken() {
  try {
    console.log('[pixService] getAccessToken: Iniciando...');
    const auth = Buffer.from(`${process.env.EFI_CLIENT_ID}:${process.env.EFI_CLIENT_SECRET}`).toString('base64');
    const url = process.env.EFI_PIX_SANDBOX === 'true'
      ? 'https://pix-h.api.efipay.com.br/oauth/token'
      : 'https://pix.api.efipay.com.br/oauth/token';

    console.log('[pixService] getAccessToken: URL=', url, 'SANDBOX=', process.env.EFI_PIX_SANDBOX);

    const response = await axios.post(url, 'grant_type=client_credentials', {
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      httpsAgent
    });

    console.log('[pixService] getAccessToken: ✅ Token obtido. Scope:', response.data.scope);
    return response.data.access_token;
  } catch (error) {
    console.error('[pixService] getAccessToken: ❌ Erro ao obter token. Erro:', error.message, error.response?.data);
    throw error;
  }
}

async function criarCobranca(txid, valor, chavePix, descricao, nomeUsuario) {
  try {
    console.log('[pixService] criarCobranca: Iniciando para txid=', txid, 'valor=', valor);
    const token = await getAccessToken();
    console.log('[pixService] criarCobranca: Token obtido com sucesso');

    const url = process.env.EFI_PIX_SANDBOX === 'true'
      ? `https://pix-h.api.efipay.com.br/v2/cob/${txid}`
      : `https://pix.api.efipay.com.br/v2/cob/${txid}`;

    const payload = {
      calendario: { expiracao: 3600 },
      valor: { original: valor.toFixed(2) },
      chave: chavePix,
      solicitacaoPagador: descricao
    };

    console.log('[pixService] criarCobranca: URL=', url);
    console.log('[pixService] criarCobranca: Payload=', JSON.stringify(payload));

    const response = await axios.put(url, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      httpsAgent
    });

    console.log('[pixService] criarCobranca: ✅ Requisição PUT bem-sucedida');
    console.log('[pixService] criarCobranca: Status:', response.status);
    console.log('[pixService] criarCobranca: Response data (primeiros 300 chars):', JSON.stringify(response.data).substring(0, 300));
    
    return response.data;
  } catch (error) {
    console.error('[pixService] criarCobranca: ❌ Erro ao criar cobrança. txid=', txid);
    console.error('[pixService] criarCobranca: Status:', error.response?.status);
    console.error('[pixService] criarCobranca: Erro response:', error.response?.data);
    console.error('[pixService] criarCobranca: Mensagem:', error.message);
    console.error('[pixService] criarCobranca: Stack:', error.stack);
    throw error;
  }
}

async function consultarCobranca(txid) {
  const token = await getAccessToken();

  const url = process.env.EFI_PIX_SANDBOX === 'true'
    ? `https://pix-h.api.efipay.com.br/v2/cob/${txid}`
    : `https://pix.api.efipay.com.br/v2/cob/${txid}`;

  const response = await axios.get(url, {
    headers: {
      Authorization: `Bearer ${token}`
    },
    httpsAgent
  });

  return response.data; // Retorna o objeto completo da cobrança
}

module.exports = {
  criarCobranca,
  consultarCobranca
};
