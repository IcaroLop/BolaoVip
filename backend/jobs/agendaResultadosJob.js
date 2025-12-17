const cron = require('node-cron');
const axios = require('axios');
const pool = require('../database/conexao');
const { agendarConsultasResultados } = require('../services/consultaResultadosService');
const { obterCampeonatoPreferido, obterTokenApiFutebol } = require('../services/apiFutebolHelper');

async function buscarRodadaAgendadaComJogosPendentes() {
  try {
    const token = obterTokenApiFutebol();
    const { urlBase } = await obterCampeonatoPreferido();

    const res = await axios.get(`${urlBase}/rodadas`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const rodadas = res.data;

    for (const rodada of rodadas) {
      if (rodada.status === 'agendada') {
        const numeroRodada = rodada.rodada;

        // Verifica se há jogos pendentes dessa rodada no banco
        const [resultados] = await pool.query(`
          SELECT COUNT(*) AS total
          FROM jogos
          WHERE rodada = ? AND (placar_mandante IS NULL OR placar_visitante IS NULL)
        `, [numeroRodada]);

        if (resultados[0].total > 0) {
          return numeroRodada;
        }
      }
    }

    return null;
  } catch (err) {
    console.error('❌ Erro ao buscar rodadas na API:', err.message);
    return null;
  }
}

// Agendamento automático diário às 12h
//cron.schedule('0 12 * * *', async () => {
 // console.log('⏱️ Verificando rodada agendada com jogos sem placar...');

//  const proximaRodada = await buscarRodadaAgendadaComJogosPendentes();

//  if (proximaRodada) {
//    console.log(`📌 Rodada ${proximaRodada} agendada com jogos pendentes.`);
//    await agendarConsultasResultados(proximaRodada);
//  } else {
//    console.log('✅ Nenhuma rodada agendada com jogos pendentes encontrada.');
//  }
//});
module.exports = {
  buscarRodadaAgendadaComJogosPendentes
};
