const cron = require('node-cron');
const axios = require('axios');
const pool = require('../database/conexao');
const pixService = require('../services/pixService');
const { consultarResultadosDaRodada } = require('./consultaResultadosService');
const { buscarTabelaClassificacao, salvarClassificacaoNoBanco } = require('./consultaTabelaClassificacao');
const { DateTime } = require('luxon');
const { coletarNoticiasGE } = require('./noticiasScraper');
const tokenConfig = require('../config/tokenConfig');
const { registrarRequisicaoApiFutebol } = require('./apiFutebolHelper');


const API_BASE_URL = 'https://api.api-futebol.com.br/v1';
const CAMPEONATO_ID = 10;

// Token será obtido dinamicamente via tokenConfig
const getToken = () => tokenConfig.getToken();

// Flag para modo de teste (DRY_RUN): apenas loga, não dispara requisições reais
const DRY_RUN = process.env.DRY_RUN === 'true';

let isConsultandoRodada = false;
let isAtualizandoClassificacao = false;

async function atualizarClassificacaoAutomatico() {
  if (isAtualizandoClassificacao) {
    console.log(`⚠️ Ignorando atualização duplicada da classificação, já está em andamento.`);
    return;
  }
  isAtualizandoClassificacao = true;

  try {
    console.log(`🔄 Atualizando tabela de classificação...`);
    const tabelaData = await buscarTabelaClassificacao(CAMPEONATO_ID);
    await salvarClassificacaoNoBanco(CAMPEONATO_ID, tabelaData);
    console.log(`✅ Classificação atualizada com sucesso.`);
  } catch (err) {
    console.error(`❌ Erro ao atualizar classificação:`, err.response?.data || err.message);
  } finally {
    isAtualizandoClassificacao = false;
  }
}

async function buscarRodadaVigente() {
  try {
    console.log(`🌐 Buscando rodada vigente na API...`);
    await registrarRequisicaoApiFutebol();
    const response = await axios.get(`${API_BASE_URL}/campeonatos/${CAMPEONATO_ID}/rodadas`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    });

    const rodadaVigente = response.data.find(r => r.status === 'agendada');
    if (!rodadaVigente) throw new Error('Nenhuma rodada agendada encontrada na API.');

    console.log(`✅ Rodada vigente encontrada: ${rodadaVigente.rodada}`);

    await pool.query(`UPDATE configuracoes SET rodada_vigente = ?, data_atualizacao_rodada = NOW()`, [rodadaVigente.rodada]);

    return rodadaVigente.rodada;
  } catch (err) {
    console.error(`❌ Erro ao buscar rodada vigente:`, err.response?.data || err.message);
    throw err;
  }
}

async function atualizarJogosDaRodada(rodada) {
  try {
    console.log(`🌐 Atualizando jogos da rodada ${rodada}...`);
    await registrarRequisicaoApiFutebol();
    const response = await axios.get(`${API_BASE_URL}/campeonatos/${CAMPEONATO_ID}/rodadas/${rodada}`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    });

    const partidas = response.data.partidas;

    for (const jogo of partidas) {
      // Interpreta corretamente o offset fornecido pela API (se houver) e converte para Manaus
      const dataManaus = DateTime.fromISO(jogo.data_realizacao_iso, { setZone: true })
        .setZone('America/Manaus')
        .toFormat('yyyy-MM-dd HH:mm:ss');

      await pool.query(`
        INSERT INTO jogos (
          partida_id, campeonato_id, rodada, data, time_mandante, time_visitante, estadio, 
          placar_mandante, placar_visitante, status, escudo_mandante, escudo_visitante
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          campeonato_id = VALUES(campeonato_id),
          data = VALUES(data),
          time_mandante = VALUES(time_mandante),
          time_visitante = VALUES(time_visitante),
          estadio = VALUES(estadio),
          placar_mandante = VALUES(placar_mandante),
          placar_visitante = VALUES(placar_visitante),
          status = VALUES(status),
          escudo_mandante = VALUES(escudo_mandante),
          escudo_visitante = VALUES(escudo_visitante)
      `, [
        jogo.partida_id,
        CAMPEONATO_ID,
        rodada,
        dataManaus,
        jogo.time_mandante.nome_popular,
        jogo.time_visitante.nome_popular,
        jogo.estadio?.nome_popular || 'Indefinido',
        jogo.placar_mandante,
        jogo.placar_visitante,
        jogo.status,
        jogo.time_mandante.escudo,
        jogo.time_visitante.escudo
      ]);
    }

    console.log(`✅ Jogos da rodada ${rodada} atualizados no banco.`);
  } catch (err) {
    console.error(`❌ Erro ao atualizar jogos da rodada:`, err.response?.data || err.message);
    throw err;
  }
}

async function agendarConsultasResultadosPorRodada() {
  try {
    console.log('🚀 Iniciando agendamento das consultas por rodada vigente...');

    const [[config]] = await pool.query(`SELECT rodada_vigente, limite_requisicoes_dia FROM configuracoes ORDER BY id DESC LIMIT 1`);
    const rodada = config.rodada_vigente;
    const limiteDiario = config.limite_requisicoes_dia || 90;

    // Log adicional: exibir rodada vigente e campeonato alvo para facilitar diagnóstico
    console.log(`🔔 Agendamento ativo → rodada_vigente=${rodada} | campeonato_id=${CAMPEONATO_ID}`);

    const [jogos] = await pool.query(`SELECT partida_id, data FROM jogos WHERE rodada = ? AND data >= NOW() ORDER BY data ASC`, [rodada]);

    if (jogos.length === 0) {
      console.log(`✅ Nenhum jogo futuro encontrado para a rodada ${rodada}`);
      return;
    }

    const gruposPorDia = {};
    jogos.forEach(jogo => {
      // Interpreta o campo 'data' diretamente como horário de Manaus, evitando conversão implícita para UTC.
      let dataManaus = DateTime.fromSQL(jogo.data, { zone: 'America/Manaus' });

      // Se a data estiver inválida, tentamos um parser permissivo (fallbacks) antes de ignorar o jogo.
      let usedFallback = false;
      if (!dataManaus.isValid) {
        // 1) Tentar Date.parse / new Date(raw)
        try {
          const maybeDate = new Date(jogo.data);
          if (!isNaN(maybeDate.getTime())) {
            dataManaus = DateTime.fromJSDate(maybeDate).setZone('America/Manaus');
            usedFallback = true;
          }
        } catch (e) {
          // ignore
        }

        // 2) Tentar formatos RFC / HTTP com Luxon
        if (!dataManaus.isValid) {
          const tryRfc = DateTime.fromRFC2822(jogo.data, { zone: 'America/Manaus' });
          if (tryRfc.isValid) {
            dataManaus = tryRfc;
            usedFallback = true;
          }
        }

        if (!dataManaus.isValid) {
          const tryHttp = DateTime.fromHTTP(jogo.data, { zone: 'America/Manaus' });
          if (tryHttp.isValid) {
            dataManaus = tryHttp;
            usedFallback = true;
          }
        }

        if (!dataManaus.isValid) {
          console.warn(`⚠️ Jogo com data inválida - partida_id=${jogo.partida_id} data_raw=${jogo.data} (ignorado no agendamento)`);
          return; // ignora jogo com data inválida
        }

        if (usedFallback) {
          console.log(`🛠️ Fallback de parsing aplicado para partida_id=${jogo.partida_id}: parsed=${dataManaus.toISO()} (raw='${jogo.data}')`);
        }
      }

      const diaStr = dataManaus.toISODate();
      const horaStr = dataManaus.startOf('minute').toFormat('yyyy-MM-dd HH:mm');

      if (!gruposPorDia[diaStr]) gruposPorDia[diaStr] = {};
      if (!gruposPorDia[diaStr][horaStr]) gruposPorDia[diaStr][horaStr] = [];
      gruposPorDia[diaStr][horaStr].push(jogo);
    });

    // Calcula o próximo agendamento (menor inicio > agora em Manaus)
    try {
      const agoraManaus = DateTime.now().setZone('America/Manaus');
      const inicioCandidatos = [];

      for (const diaKey of Object.keys(gruposPorDia)) {
        for (const horaKey of Object.keys(gruposPorDia[diaKey])) {
          const inicio = DateTime.fromFormat(horaKey, 'yyyy-MM-dd HH:mm', { zone: 'America/Manaus' });
          if (!inicio.isValid) continue; // já tratamos jogos inválidos acima
          if (inicio > agoraManaus) inicioCandidatos.push(inicio);
        }
      }

      if (inicioCandidatos.length > 0) {
        inicioCandidatos.sort((a, b) => a.toMillis() - b.toMillis());
        const proximo = inicioCandidatos[0];
        const servidorAgora = DateTime.now();
        console.log(`🗓️ Próximo agendamento: ${proximo.toISO()} (America/Manaus) | Servidor agora: ${servidorAgora.toISO()} | Proximo (Servidor TZ): ${proximo.setZone(servidorAgora.zoneName).toISO()}`);
      } else {
        // Se nenhum futuro, informa que não há agendamentos futuros ou mostra o mais próximo passado
        const todosValidos = [];
        for (const diaKey of Object.keys(gruposPorDia)) {
          for (const horaKey of Object.keys(gruposPorDia[diaKey])) {
            const inicio = DateTime.fromFormat(horaKey, 'yyyy-MM-dd HH:mm', { zone: 'America/Manaus' });
            if (inicio.isValid) todosValidos.push(inicio);
          }
        }
        if (todosValidos.length > 0) {
          todosValidos.sort((a, b) => a.toMillis() - b.toMillis());
          const proximo = todosValidos[0];
          const servidorAgora = DateTime.now();
          console.log(`ℹ️ Nenhum agendamento futuro encontrado; primeiro agendamento (histórico) = ${proximo.toISO()} (America/Manaus) | Servidor agora: ${servidorAgora.toISO()}`);
        } else {
          console.log('ℹ️ Não foi possível determinar o próximo agendamento (nenhuma data válida encontrada nos jogos).');
        }
      }
    } catch (err) {
      console.error('❌ Erro ao calcular próximo agendamento:', err.message);
    }



    for (const dia of Object.keys(gruposPorDia)) {
      const grupos = gruposPorDia[dia];
      const horarios = [...new Set(Object.keys(grupos))];
      const numGruposNoDia = horarios.length;
      const reqPorGrupo = Math.floor(limiteDiario / numGruposNoDia);
      const duracaoMs = 130 * 60 * 1000;
      const intervaloMs = Math.floor(duracaoMs / reqPorGrupo);

      horarios.forEach((horaIso, idx) => {
        // Mantém o horário em Manaus e calcula o delta em ms sem depender do timezone do servidor.
        const inicioManaus = DateTime.fromFormat(horaIso, 'yyyy-MM-dd HH:mm', { zone: 'America/Manaus' });
        const agoraManaus = DateTime.now().setZone('America/Manaus');
        const tempoAteInicio = inicioManaus.diff(agoraManaus).as('milliseconds');
        const inicioStr = inicioManaus.toFormat('dd/MM/yyyy HH:mm');

        console.log(`📅 Agendado grupo ${idx + 1}/${numGruposNoDia} no dia ${dia} (local ${inicioStr}) → ${reqPorGrupo} requisições em intervalos de ${Math.floor(intervaloMs / 1000)}s`);

        // Log adicional para debug de timezone/agendamento
        const servidorAgora = DateTime.now();
        console.log(`🔍 Agendamento detalhes → Servidor agora: ${servidorAgora.toISO()} | Inicio (Manaus): ${inicioManaus.toISO()} | tempoAteInicio_ms: ${tempoAteInicio}`);

        const iniciarIntervalo = () => {
          if (isConsultandoRodada) {
            console.log(`⚠️ Ignorando execução duplicada para rodada ${rodada}, já está em andamento.`);
            return;
          }
          isConsultandoRodada = true;

          console.log(`🚀 Iniciando consultas do grupo ${idx + 1}/${numGruposNoDia} no dia ${dia} (Rodada ${rodada})`);
          console.log(`🔔 Disparo agendado → Servidor agora: ${DateTime.now().toISO()} | Inicio agendamento (Manaus): ${inicioManaus.toISO()} | Grupo ${idx + 1}/${numGruposNoDia}`);

          let contador = 0;
          const intervalId = setInterval(async () => {
            if (contador >= reqPorGrupo) {
              clearInterval(intervalId);
              isConsultandoRodada = false;
              console.log(`✅ Grupo ${idx + 1}/${numGruposNoDia} finalizado: ${reqPorGrupo} requisições feitas`);
              return;
            }
            console.log(`📡 [${contador + 1}/${reqPorGrupo}] Disparando consulta — Servidor agora: ${DateTime.now().toISO()} | Agendamento inicio (Manaus): ${inicioManaus.toISO()}`);
            if (DRY_RUN) {
              console.log(`🧪 [DRY_RUN] Simulando consulta à rodada ${rodada} (requisição NÃO enviada)`);
            } else {
              await consultarResultadosDaRodada(rodada);
            }
            contador++;
          }, intervaloMs);
        };

        if (tempoAteInicio > 0) {
          setTimeout(iniciarIntervalo, tempoAteInicio);
        } else {
          iniciarIntervalo();
        }

        setTimeout(atualizarClassificacaoAutomatico, Math.max(tempoAteInicio, 0) + 60 * 60 * 1000); // +1h
        setTimeout(atualizarClassificacaoAutomatico, Math.max(tempoAteInicio, 0) + 130 * 60 * 1000); // +130min
      });
    }
  } catch (err) {
    console.error('❌ Erro no agendamento por rodada:', err.message);
  }
}

// 🔄 Às 02:00 AM → atualizar rodada vigente, atualizar jogos e agendar grupos
cron.schedule('0 2 * * *', async () => {
  console.log('⏰ Executando rotina diária às 02:00 AM...');

  try {
    const rodadaVigente = await buscarRodadaVigente();
    await atualizarJogosDaRodada(rodadaVigente);
    await agendarConsultasResultadosPorRodada();
    
    // Reagendar notificações de jogos após atualizar os dados
    const notificacoesService = require('./notificacoesAgendadasService');
    console.log('🔔 Reagendando notificações de jogos após atualização...');
    await notificacoesService.agendarNotificacoesJogos();
    console.log('✅ Notificações de jogos reagendadas com sucesso.');
  } catch (err) {
    console.error('❌ Erro na rotina diária:', err.message);
  }
});

/** 🔔 MONITORAMENTO AUTOMÁTICO DE PAGAMENTOS PENDENTES */
cron.schedule('*/2 * * * *', async () => {
  //console.log('⏰ Executando monitoramento Pix a cada 2 minutos...');
  try {
    const [rows] = await pool.query("SELECT txid FROM pix_cobrancas WHERE status_pagamento = 'PENDENTE'");

    if (rows.length === 0) {
      //console.log('✅ Nenhuma cobrança pendente para monitorar.');
      return;
    }

    for (const row of rows) {
      try {
        const cobranca = await pixService.consultarCobranca(row.txid);
        const status = cobranca.status;

        if (status === 'CONCLUIDA') {
          await pool.query(
            'UPDATE pix_cobrancas SET status = ?, status_pagamento = ? WHERE txid = ?',
            [status, 'PAGO', row.txid]
          );
           await pool.query(
            'UPDATE palpites SET status_pagamento = ?, data_pagamento = NOW() WHERE codigo_envio = ?',
            ['PAGO', row.txid]
            );

            console.log(`✅ Pagamento confirmado e palpites atualizados → txid: ${row.txid}`);
        } else {
          console.log(`ℹ️ Ainda pendente → txid: ${row.txid}, status atual: ${status}`);
        }
      } catch (err) {
        console.error(`❌ Erro ao consultar cobrança txid ${row.txid}:`, err.response?.data || err.message);
      }
    }
  } catch (error) {
    console.error('❌ Erro no monitoramento Pix:', error.response?.data || error.message);
  }
});

// 🔄 Sincronizar notícias a cada 30 minutos

cron.schedule('*/30 * * * *', async () => {
  //console.log('🗞️ [CRON] Iniciando sincronização automática de notícias (GE)...');
  try {
    const noticias = await coletarNoticiasGE();
    let novas = 0;

    for (const n of noticias) {
      const [result] = await pool.query(`
        INSERT INTO noticias (titulo, resumo, imagem, link, fonte, data_publicacao)
        VALUES (?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE resumo = VALUES(resumo)
      `, [n.titulo, n.resumo, n.imagem, n.link, n.fonte, n.data_publicacao]);

      if (result.affectedRows === 1) novas++;
    }

    // Após inserir todas as notícias
    await pool.query(`
      DELETE FROM noticias
        WHERE id NOT IN (
          SELECT id FROM (
            SELECT id FROM noticias ORDER BY data_publicacao DESC LIMIT 100
            ) AS recentes
          )
      `);

    //console.log(`✅ Notícias sincronizadas com sucesso. Novas: ${novas}`);
  } catch (err) {
    console.error('❌ Erro ao sincronizar notícias:', err.message);
  }
});


module.exports = { 
  agendarConsultasResultadosPorRodada, 
  buscarRodadaVigente, 
  atualizarJogosDaRodada 
};


