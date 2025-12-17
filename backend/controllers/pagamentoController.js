/*const { gerarCobrancaPix } = require('../services/pixService');

async function gerarPagamentoPix(req, res) {
  const { usuario_id, palpite_id, valor, cpf, nome } = req.body;

  if (!usuario_id || !palpite_id || !valor || !cpf || !nome) {
    return res.status(400).json({ erro: 'Campos obrigatórios ausentes.' });
  }

  const txid = `bolao-${palpite_id}-${Date.now()}`.substring(0, 35); // até 35 chars

  try {
    const cobranca = await gerarCobrancaPix(valor, txid, cpf, nome);

    // (Opcional) salvar no banco a cobrança gerada

    return res.status(201).json({
      mensagem: 'Cobrança Pix criada com sucesso.',
      txid: cobranca.txid,
      location: cobranca.location
    });
  } catch (err) {
    return res.status(500).json({ erro: 'Erro ao gerar cobrança Pix.' });
  }
}

module.exports = { gerarPagamentoPix };
*/
const { gerarCobrancaPix } = require('../services/pixService');

async function criarCobrancaPix(req, res) {
  const { usuario_id, valor } = req.body;

  try {
    const cobranca = await gerarCobrancaPix({ usuario_id, valor });

    // Aqui você pode salvar no banco como "pendente"
    // await pool.query('INSERT INTO pagamentos (...) VALUES (...)', [...]);

    res.status(201).json({
      mensagem: 'Cobrança Pix criada com sucesso (modo simulado)',
      cobranca,
    });
  } catch (error) {
    console.error('Erro ao gerar cobrança Pix:', error);
    res.status(500).json({ erro: 'Erro ao gerar cobrança Pix' });
  }
}
module.exports = { gerarCobrancaPix };