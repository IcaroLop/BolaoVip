const cron = require('node-cron');
const { safeLogSistema: logSistema } = require('../services/logService');
const pool = require('../database/conexao');
const axios = require('axios');
const agendadorService = require('../services/agendadorService');
const { registrarRequisicaoApiFutebol } = require('../services/apiFutebolHelper');
const classificacaoService = require('../services/classificacaoService');

// Configuração de timezone (Manaus - America/Manaus UTC-4)
const TIMEZONE = 'America/Manaus';

/**
 * Job 1: Zerar contador de requisições à API-Futebol
 * Execução: Todos os dias às 00:01 AM
 */
function iniciarJobZerarContador() {
  cron.schedule('1 0 * * *', async () => {
    console.log('🔄 [00:01] Iniciando job de zerar contador de requisições API-Futebol...');
    try {
      const [result] = await pool.query(
        'UPDATE configuracoes SET requisicoes_api_futebol = 0 WHERE id = 1'
      );
      console.log('✅ [00:01] Contador de requisições zerado com sucesso.', result.affectedRows, 'linha(s) atualizada(s).');
    } catch (err) {
      console.error('❌ [00:01] Erro ao zerar contador de requisições:', err.message);
    }
  }, {
    scheduled: true,
    timezone: TIMEZONE
  });
  console.log('✅ Job de zerar contador agendado para 00:01 AM (America/Manaus)');
  try { logSistema({ origem: 'cron', nivel: 'info', descricao: 'Job de zerar contador agendado para 00:01 AM (America/Manaus)' }); } catch {}
}

/**
 * Job 2: Atualizar status das rodadas dos campeonatos dos grupos criados
 * Execução: Todos os dias às 01:00 AM
 */
function iniciarJobAtualizarStatusRodadas() {
  cron.schedule('0 1 * * *', async () => {
    console.log('🔄 [01:00] Iniciando job de atualização de status das rodadas...');
    const conexao = await pool.getConnection();
    try {
      // Busca todos os campeonatos vinculados aos grupos
      const [grupos] = await conexao.query(
        'SELECT DISTINCT campeonato_id FROM grupos WHERE campeonato_id IS NOT NULL'
      );

      if (grupos.length === 0) {
        console.log('⚠️ [01:00] Nenhum grupo com campeonato vinculado encontrado.');
        return;
      }

      console.log(`📊 [01:00] Encontrados ${grupos.length} campeonato(s) para atualizar.`);

      // Para cada campeonato, buscar status das rodadas na API
      const token = process.env.API_FUTEBOL_TOKEN;

      if (!token) {
        console.error('❌ [01:00] Token da API-Futebol não configurado , verifique e confirme antes de executar algo');
        return;
      }

      for (const grupo of grupos) {
        const campeonatoId = grupo.campeonato_id;
        console.log(`🔍 [01:00] Buscando rodadas do campeonato ${campeonatoId}...`);

        try {
          const url = `https://api.api-futebol.com.br/v1/campeonatos/${campeonatoId}/rodadas`;
          const response = await axios.get(url, {
            headers: { Authorization: `Bearer ${token}` }
          });

          // Incrementa contador de requisições
          await registrarRequisicaoApiFutebol();

          const rodadas = response.data;
          console.log(`📥 [01:00] Recebidas ${rodadas.length} rodadas do campeonato ${campeonatoId}.`);

          // Atualizar rodadas_status
          for (const rodada of rodadas) {
            const { 
              rodada: numRodada, 
              status, 
              proxima_rodada,
              fase,
              nome,
              slug,
              link
            } = rodada;

            await conexao.query(
              `INSERT INTO rodadas_status (
                campeonato_id, fase, rodada, nome, slug, status, proxima_rodada, link
               )
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)
               ON DUPLICATE KEY UPDATE
                 status = VALUES(status),
                 proxima_rodada = VALUES(proxima_rodada),
                 nome = VALUES(nome),
                 slug = VALUES(slug),
                 link = VALUES(link),
                 atualizado_em = CURRENT_TIMESTAMP`,
              [
                campeonatoId, 
                fase || 'primeira-fase', 
                numRodada, 
                nome || `Rodada ${numRodada}`, 
                slug || `rodada-${numRodada}`,
                status || 'agendada', 
                proxima_rodada || null,
                link || null
              ]
            );
          }

          console.log(`✅ [01:00] Status das rodadas do campeonato ${campeonatoId} atualizado.`);
        } catch (apiErr) {
          console.error(`❌ [01:00] Erro ao buscar rodadas do campeonato ${campeonatoId}:`, apiErr.message);
        }
      }

      console.log('✅ [01:00] Job de atualização de status das rodadas concluído.');
    } catch (err) {
      console.error('❌ [01:00] Erro no job de atualização de status das rodadas:', err.message);
    } finally {
      conexao.release();
    }
  }, {
    scheduled: true,
    timezone: TIMEZONE
  });
  console.log('✅ Job de atualizar status das rodadas agendado para 01:00 AM (America/Manaus)');
  try { logSistema({ origem: 'cron', nivel: 'info', descricao: 'Job de atualizar status das rodadas agendado para 01:00 AM (America/Manaus)' }); } catch {}
}

/**
 * Job 2b: Atualizar tabela de classificação após status das rodadas
 * Execução: Todos os dias às 01:10 AM (logo após o job de status)
 */
function iniciarJobAtualizarClassificacao() {
  cron.schedule('10 1 * * *', async () => {
    console.log('🔄 [01:10] Iniciando job de atualização da tabela de classificação...');
    const conexao = await pool.getConnection();
    try {
      const [grupos] = await conexao.query(
        'SELECT DISTINCT campeonato_id FROM grupos WHERE campeonato_id IS NOT NULL'
      );

      if (grupos.length === 0) {
        console.log('⚠️ [01:10] Nenhum grupo com campeonato vinculado encontrado.');
        return;
      }

      console.log(`📊 [01:10] Encontrados ${grupos.length} campeonato(s) para atualizar classificação.`);

      for (const grupo of grupos) {
        const campeonatoId = grupo.campeonato_id;
        try {
          await classificacaoService.importarClassificacao(campeonatoId);
          console.log(`✅ [01:10] Classificação atualizada para campeonato ${campeonatoId}.`);
        } catch (err) {
          console.error(`❌ [01:10] Erro ao atualizar classificação do campeonato ${campeonatoId}:`, err.message);
        }
      }

      console.log('✅ [01:10] Job de classificação concluído.');
    } catch (err) {
      console.error('❌ [01:10] Erro no job de classificação:', err.message);
    } finally {
      conexao.release();
    }
  }, {
    scheduled: true,
    timezone: TIMEZONE
  });
  console.log('✅ Job de atualizar classificação agendado para 01:10 AM (America/Manaus)');
  try { logSistema({ origem: 'cron', nivel: 'info', descricao: 'Job de atualizar classificação agendado para 01:10 AM (America/Manaus)' }); } catch {}
}

/**
 * Job 3: Planejar agendamentos de disparo de requisições de placares
 * Execução: Todos os dias às 02:00 AM
 */
function iniciarJobPlanejarAgendamentos() {
  cron.schedule('0 2 * * *', async () => {
    console.log('🔄 [02:00] Iniciando job de planejamento de agendamentos...');
    try {
      // Chama o serviço de agendador para planejar e persistir a agenda
      const resultado = await agendadorService.planejarPersistirAgenda();
      
      console.log('✅ [02:00] Planejamento de agendamentos concluído.');
      console.log(`📊 [02:00] ${resultado.mensagem}`);
      console.log(`📅 [02:00] Total de grupos planejados: ${resultado.totalGrupos}`);
      console.log(`📊 [02:00] Total de requisições previstas: ${resultado.totalRequests}`);
    } catch (err) {
      console.error('❌ [02:00] Erro no job de planejamento de agendamentos:', err.message);
    }
  }, {
    scheduled: true,
    timezone: TIMEZONE
  });
  console.log('✅ Job de planejar agendamentos agendado para 02:00 AM (America/Manaus)');
  try { logSistema({ origem: 'cron', nivel: 'info', descricao: 'Job de planejar agendamentos agendado para 02:00 AM (America/Manaus)' }); } catch {}
}

/**
 * Job 4: Executar requisições de placares agendadas
 * Execução: A cada 1 minuto (verifica agendamentos devidos)
 */
function iniciarJobExecutarRequisicoes() {
  cron.schedule('* * * * *', async () => {
    try {
      const agendadorService = require('../services/agendadorService');
      const resultado = await agendadorService.executarDevidos();
      if (resultado.executados > 0) {
        console.log(`✅ [Verificador] ${resultado.executados} registro(s) processado(s), ${resultado.requisicoesApi} requisição(ões) à API`);
        try { logSistema({ origem: 'cron', nivel: 'info', descricao: `${resultado.executados} registro(s) processado(s), ${resultado.requisicoesApi} requisição(ões) à API` }); } catch {}
      }
    } catch (err) {
      console.error('❌ [Verificador] Erro ao executar requisições agendadas:', err.message);
      try { logSistema({ origem: 'cron', nivel: 'error', descricao: `Erro ao executar requisições agendadas: ${err.message}` }); } catch {}
    }
  }, {
    scheduled: true,
    timezone: TIMEZONE
  });
  console.log('✅ Job de executar requisições agendado para verificação a cada 1 minuto (America/Manaus)');
  try { logSistema({ origem: 'cron', nivel: 'info', descricao: 'Job de executar requisições agendado para verificação a cada 1 minuto (America/Manaus)' }); } catch {}
}

/**
 * Inicializa todos os jobs
 */
function iniciarTodosJobs() {
  console.log('🚀 Iniciando sistema de cron jobs...');
  try { logSistema({ origem: 'cron', nivel: 'info', descricao: 'Iniciando sistema de cron jobs' }); } catch {}
  iniciarJobZerarContador();
  iniciarJobAtualizarStatusRodadas();
  iniciarJobAtualizarClassificacao();
  iniciarJobPlanejarAgendamentos();
  iniciarJobExecutarRequisicoes();
  console.log('✅ Todos os cron jobs foram agendados com sucesso!');
  try { logSistema({ origem: 'cron', nivel: 'info', descricao: 'Todos os cron jobs foram agendados com sucesso' }); } catch {}
}

module.exports = {
  iniciarTodosJobs,
  iniciarJobZerarContador,
  iniciarJobAtualizarStatusRodadas,
  iniciarJobAtualizarClassificacao,
  iniciarJobPlanejarAgendamentos,
  iniciarJobExecutarRequisicoes,
};
