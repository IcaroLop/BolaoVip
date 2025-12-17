require('dotenv').config();

const axios = require('axios');
const pool = require('../database/conexao');
const { registrarRequisicaoApiFutebol } = require('../services/apiFutebolHelper');

/**
 * Executa manualmente o job de atualização de status das rodadas
 * Sincroniza os dados da API-Futebol com a tabela rodadas_status no banco
 */
async function executarJobAtualizarStatusRodadas() {
  console.log('🔄 Iniciando execução manual do job de atualização de status das rodadas...\n');
  
  const conexao = await pool.getConnection();
  try {
    // Busca todos os campeonatos vinculados aos grupos
    const [grupos] = await conexao.query(
      'SELECT DISTINCT campeonato_id FROM grupos WHERE campeonato_id IS NOT NULL'
    );

    if (grupos.length === 0) {
      console.log('⚠️ Nenhum grupo com campeonato vinculado encontrado.');
      return;
    }

    console.log(`📊 Encontrados ${grupos.length} campeonato(s) para atualizar.\n`);

    // Para cada campeonato, buscar status das rodadas na API
    const token = process.env.API_FUTEBOL_TOKEN;

    if (!token) {
      console.error('❌ Token da API-Futebol não configurado. Verifique o arquivo .env');
      return;
    }

    for (const grupo of grupos) {
      const campeonatoId = grupo.campeonato_id;
      console.log(`🔍 Buscando rodadas do campeonato ${campeonatoId}...`);

      try {
        const url = `https://api.api-futebol.com.br/v1/campeonatos/${campeonatoId}/rodadas`;
        const response = await axios.get(url, {
          headers: { Authorization: `Bearer ${token}` }
        });

        // Incrementa contador de requisições
        await registrarRequisicaoApiFutebol();

        const rodadas = response.data;
        console.log(`📥 Recebidas ${rodadas.length} rodadas do campeonato ${campeonatoId}.`);

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

        console.log(`✅ Status das rodadas do campeonato ${campeonatoId} atualizado.\n`);
      } catch (apiErr) {
        console.error(`❌ Erro ao buscar rodadas do campeonato ${campeonatoId}:`, apiErr.message, '\n');
      }
    }

    console.log('✅ Job de atualização de status das rodadas concluído com sucesso!');
  } catch (err) {
    console.error('❌ Erro durante a execução do job:', err.message);
  } finally {
    conexao.release();
    process.exit(0);
  }
}

// Executar o job
executarJobAtualizarStatusRodadas().catch(err => {
  console.error('Erro fatal:', err);
  process.exit(1);
});
