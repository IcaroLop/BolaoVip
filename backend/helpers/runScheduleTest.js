require('dotenv').config();
const pool = require('../database/conexao');
const { agendarConsultasResultadosPorRodada } = require('../services/scheduler');

(async () => {
  try {
    console.log('🔧 RUN: agendarConsultasResultadosPorRodada (teste isolado)');
    await agendarConsultasResultadosPorRodada();
    console.log('✅ RUN: agendamento concluído (verifique logs acima)');
  } catch (e) {
    console.error('❌ RUN: erro ao agendar:', e.message || e);
  } finally {
    try { await pool.end(); } catch (e) {}
    process.exit(0);
  }
})();