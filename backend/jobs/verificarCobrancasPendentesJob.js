const cron = require('node-cron');
const { verificarCobrancasPendentes } = require('../services/pixConsultaService');

let isVerificando = false;
let cronTask = null;

/**
 * Tarefa cron que verifica cobranças PIX pendentes
 * Executa a cada 5 minutos
 */
async function executarVerificacao() {
  // Prevenir execuções simultâneas
  if (isVerificando) {
    console.log('[Cron PIX Fallback] ⚠️  Verificação anterior ainda em execução, pulando...');
    return;
  }

  try {
    isVerificando = true;
    console.log('[Cron PIX Fallback] 🚀 Iniciando verificação de cobranças pendentes...');

    const resultado = await verificarCobrancasPendentes();

    console.log('[Cron PIX Fallback] ✅ Verificação concluída:', {
      timestamp: new Date().toISOString(),
      ...resultado
    });

  } catch (error) {
    console.error('[Cron PIX Fallback] ❌ Erro na verificação:', error.message);
  } finally {
    isVerificando = false;
  }
}

/**
 * Inicia o job de verificação de cobranças pendentes
 * Executa a cada 5 minutos: */5 * * * *
 */
function iniciarJob() {
  if (cronTask) {
    console.log('[Cron PIX Fallback] ⚠️  Job já estava rodando');
    return;
  }

  // A cada 5 minutos
  cronTask = cron.schedule('*/5 * * * *', executarVerificacao, {
    timezone: 'America/Manaus'
  });

  console.log('[Cron PIX Fallback] ✅ Job iniciado - verificação a cada 5 minutos');

  // Executar uma verificação inicial após 30 segundos (startup)
  setTimeout(() => {
    console.log('[Cron PIX Fallback] 🏁 Executando verificação inicial...');
    executarVerificacao();
  }, 30000);
}

/**
 * Para o job de verificação
 */
function pararJob() {
  if (cronTask) {
    cronTask.stop();
    cronTask = null;
    console.log('[Cron PIX Fallback] 🛑 Job parado');
  }
}

/**
 * Executa verificação manual (para testes)
 */
async function executarManual() {
  console.log('[Cron PIX Fallback] 🔧 Execução manual solicitada');
  return await executarVerificacao();
}

module.exports = {
  iniciarJob,
  pararJob,
  executarManual,
  executarVerificacao
};
