const pool = require('../database/conexao');
const { buscarPartidasPorCampeonato } = require('../services/consultaPartidasCampeonatoService');
const { buscarRodadasPorCampeonato } = require('../services/consultaRodadasCampeonatoService');
const { DateTime } = require('luxon');
const tokenConfig = require('../config/tokenConfig');

/**
 * Extrai o número da rodada a partir do nome (ex: "1a-rodada" -> 1)
 * @param {string} nomeRodada - Nome da rodada (ex: "1a-rodada", "2a-rodada")
 * @returns {number|null} Número da rodada ou null se não encontrar
 */
function extrairNumeroRodada(nomeRodada) {
  const match = nomeRodada.match(/(\d+)a-rodada/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Converte data ISO para formato MySQL datetime
 * @param {string} dataISO - Data no formato ISO (ex: "2025-09-16T16:45:00.000Z")
 * @param {number|null} campeonatoId - ID do campeonato
 * @returns {string|null} Data formatada para MySQL (ex: "2025-09-16 13:45:00") ou null se inválida
 */
function converterParaDatetimeMySQL(dataISO, campeonatoId = null) {
  if (!dataISO) return null;

  try {
    // Respeita o timezone vindo da API e converte para Manaus
    let dt = DateTime.fromISO(dataISO, { setZone: true });

    // Fallback para formatos sem timezone explícito
    if (!dt.isValid) {
      dt = DateTime.fromFormat(dataISO, 'dd/LL/yyyy HH:mm', { zone: 'America/Sao_Paulo' });
    }

    if (!dt.isValid) return null;

    dt = dt.setZone('America/Manaus');

    return dt.toFormat('yyyy-LL-dd HH:mm:ss');
  } catch (error) {
    return null;
  }
}

/**
 * Importa todas as partidas de um campeonato para o banco de dados
 * @param {Object} req - Request com { grupoId } no body
 * @param {Object} res - Response
 */
exports.importarPartidasCampeonato = async (req, res) => {
  const { grupoId } = req.body;
  const usuarioId = req.usuario?.id;

  if (!grupoId) {
    return res.status(400).json({ erro: 'grupoId é obrigatório' });
  }

  if (!usuarioId) {
    return res.status(401).json({ erro: 'Usuário não autenticado' });
  }

  // Verificar se é token de teste usando TokenConfig
  const tokenInfo = tokenConfig.getTokenInfo();
  const API_TOKEN = tokenInfo.token;
  const isTokenTeste = tokenInfo.environment === 'development';

  let conexao;

  try {
    // 1. Buscar campeonato_id do grupo
    conexao = await pool.getConnection();
    
    const [grupos] = await conexao.query(
      'SELECT campeonato_id FROM grupos WHERE id = ?',
      [grupoId]
    );

    if (grupos.length === 0) {
      await conexao.release();
      return res.status(404).json({ erro: 'Grupo não encontrado' });
    }

    const campeonatoId = grupos[0].campeonato_id;

    if (!campeonatoId) {
      await conexao.release();
      return res.status(400).json({ erro: 'Grupo não possui campeonato vinculado' });
    }

    console.log(`[importarPartidasCampeonato] Importando partidas do campeonato ${campeonatoId} para grupo ${grupoId}`);
    console.log(`[importarPartidasCampeonato] Modo: ${isTokenTeste ? 'TESTE (não grava no banco)' : 'PRODUÇÃO (grava no banco)'}`);

    // 2. Buscar partidas da API
    const dadosAPI = await buscarPartidasPorCampeonato(campeonatoId);

    if (!dadosAPI || !dadosAPI.partidas) {
      await conexao.release();
      return res.status(500).json({ erro: 'Resposta inválida da API-Futebol' });
    }

    // Log da estrutura recebida para debug
    console.log('[importarPartidasCampeonato] Estrutura da API:', JSON.stringify(dadosAPI, null, 2).substring(0, 500) + '...');

    // Se for token de teste, apenas retorna informações sem gravar
    if (isTokenTeste) {
      await conexao.release();
      
      let totalPartidas = 0;
      let estruturaDetalhada = {};
      
      for (const [nomeFase, conteudoFase] of Object.entries(dadosAPI.partidas)) {
        estruturaDetalhada[nomeFase] = {
          tipo: Array.isArray(conteudoFase) ? 'array' : typeof conteudoFase,
          quantidade: 0
        };
        
        if (Array.isArray(conteudoFase)) {
          totalPartidas += conteudoFase.length;
          estruturaDetalhada[nomeFase].quantidade = conteudoFase.length;
        } else if (typeof conteudoFase === 'object') {
          for (const [chave, valor] of Object.entries(conteudoFase)) {
            if (Array.isArray(valor)) {
              totalPartidas += valor.length;
              estruturaDetalhada[nomeFase].quantidade += valor.length;
            }
          }
        }
      }
      
      return res.json({
        sucesso: true,
        modo: 'teste',
        mensagem: `✅ Conexão OK! API retornou ${totalPartidas} partidas (Token de TESTE - dados não foram gravados)`,
        inseridas: 0,
        atualizadas: 0,
        total: totalPartidas,
        fases: Object.keys(dadosAPI.partidas),
        estrutura: estruturaDetalhada
      });
    }

    // 3. Processar partidas e inserir/atualizar no banco
    await conexao.beginTransaction();

    let totalInseridas = 0;
    let totalAtualizadas = 0;

    // Função auxiliar para processar partidas recursivamente
    const processarPartidas = async (dados, fase, rodada = null) => {
      let inseridas = 0;
      let atualizadas = 0;

      if (Array.isArray(dados)) {
        // É um array de partidas
        console.log(`[importarPartidasCampeonato] Processando ${dados.length} partidas da fase ${fase}${rodada ? `, rodada ${rodada}` : ''}`);
        for (const partida of dados) {
          const resultado = await inserirOuAtualizarPartida(conexao, partida, fase, rodada, campeonatoId);
          if (resultado === 'inserida') inseridas++;
          if (resultado === 'atualizada') atualizadas++;
        }
      } else if (typeof dados === 'object' && dados !== null) {
        // É um objeto, pode conter rodadas
        console.log(`[importarPartidasCampeonato] Objeto com chaves: ${Object.keys(dados).join(', ')}`);
        
        for (const [chave, valor] of Object.entries(dados)) {
          // Verificar se a chave parece uma rodada (contém "rodada" ou número)
          const isRodada = /rodada|^\d+/i.test(chave);
          
          if (isRodada) {
            // É uma rodada
            const numeroRodada = extrairNumeroRodada(chave);
            const { inseridas: ins, atualizadas: atu } = await processarPartidas(valor, fase, numeroRodada);
            inseridas += ins;
            atualizadas += atu;
          } else if (Array.isArray(valor)) {
            // É um array de partidas direto
            const { inseridas: ins, atualizadas: atu } = await processarPartidas(valor, chave || fase);
            inseridas += ins;
            atualizadas += atu;
          } else if (typeof valor === 'object' && valor !== null) {
            // Pode ser outra camada de fases
            const { inseridas: ins, atualizadas: atu } = await processarPartidas(valor, chave || fase);
            inseridas += ins;
            atualizadas += atu;
          }
        }
      }

      return { inseridas, atualizadas };
    };

    // Iterar sobre as fases principais
    for (const [nomeFase, conteudoFase] of Object.entries(dadosAPI.partidas)) {
      console.log(`[importarPartidasCampeonato] Iniciando processamento da fase: ${nomeFase}`);
      
      const { inseridas: ins, atualizadas: atu } = await processarPartidas(conteudoFase, nomeFase);
      totalInseridas += ins;
      totalAtualizadas += atu;
    }

    await conexao.commit();
    await conexao.release();

    console.log(`[importarPartidasCampeonato] Importação concluída: ${totalInseridas} inseridas, ${totalAtualizadas} atualizadas`);

    return res.json({
      sucesso: true,
      modo: 'producao',
      mensagem: `✅ Importação concluída com sucesso! ${totalInseridas + totalAtualizadas} partidas processadas e gravadas no banco de dados.`,
      inseridas: totalInseridas,
      atualizadas: totalAtualizadas,
      total: totalInseridas + totalAtualizadas,
      timestamp: new Date().toLocaleString('pt-BR')
    });
  } catch (error) {
    console.error('[importarPartidasCampeonato] Erro:', error);
    
    if (conexao) {
      try {
        await conexao.rollback();
      } catch (rollbackErr) {
        console.error('[importarPartidasCampeonato] Erro ao fazer rollback:', rollbackErr);
      }
      await conexao.release();
    }

    return res.status(500).json({ 
      sucesso: false,
      erro: '❌ Erro ao importar partidas',
      detalhes: error.message || 'Erro desconhecido',
      timestamp: new Date().toLocaleString('pt-BR')
    });
  }
};

/**
 * Importa status das rodadas de um campeonato e salva no banco
 * @param {Object} req - Request com { grupoId }
 * @param {Object} res - Response
 */
exports.importarRodadasCampeonato = async (req, res) => {
  const { grupoId } = req.body;
  const usuarioId = req.usuario?.id;

  if (!grupoId) {
    return res.status(400).json({ erro: 'grupoId é obrigatório' });
  }

  if (!usuarioId) {
    return res.status(401).json({ erro: 'Usuário não autenticado' });
  }

  const tokenInfo = tokenConfig.getTokenInfo();
  const isTokenTeste = tokenInfo.environment === 'development';

  let conexao;

  try {
    // 1. Buscar campeonato_id do grupo
    conexao = await pool.getConnection();
    const [grupos] = await conexao.query(
      'SELECT campeonato_id FROM grupos WHERE id = ?',
      [grupoId]
    );

    if (grupos.length === 0) {
      await conexao.release();
      return res.status(404).json({ erro: 'Grupo não encontrado' });
    }

    const campeonatoId = grupos[0].campeonato_id;
    if (!campeonatoId) {
      await conexao.release();
      return res.status(400).json({ erro: 'Grupo não possui campeonato vinculado' });
    }

    console.log(`[importarRodadasCampeonato] Importando rodadas do campeonato ${campeonatoId} para grupo ${grupoId}`);
    console.log(`[importarRodadasCampeonato] Modo: ${isTokenTeste ? 'TESTE (não grava no banco)' : 'PRODUÇÃO (grava no banco)'}`);

    // 2. Buscar rodadas na API
    const dadosAPI = await buscarRodadasPorCampeonato(campeonatoId);
    if (!dadosAPI || typeof dadosAPI !== 'object') {
      await conexao.release();
      return res.status(500).json({ erro: 'Resposta inválida da API-Futebol' });
    }

    console.log('[importarRodadasCampeonato] Estrutura da API:', JSON.stringify(dadosAPI, null, 2).substring(0, 500) + '...');

    // Normalizar estrutura: se for array direto, transformar em objeto {default: array}
    let rodadasPorFase = dadosAPI;
    if (Array.isArray(dadosAPI)) {
      console.log('[importarRodadasCampeonato] API retornou array direto, convertendo para estrutura {default: array}');
      rodadasPorFase = { 'default': dadosAPI };
    }

    // 3. Se token de teste, apenas retornar resumo
    if (isTokenTeste) {
      await conexao.release();

      const resumo = Object.entries(rodadasPorFase).map(([fase, rodadas]) => ({
        fase,
        totalRodadas: Array.isArray(rodadas) ? rodadas.length : 0,
        statusPorRodada: Array.isArray(rodadas)
          ? rodadas.map((r) => ({ rodada: r.rodada, status: r.status }))
          : []
      }));

      const totalRodadas = resumo.reduce((acc, item) => acc + item.totalRodadas, 0);

      return res.json({
        sucesso: true,
        modo: 'teste',
        mensagem: `✅ Conexão OK! API retornou ${totalRodadas} rodadas (Token de TESTE - dados não foram gravados)`,
        total: totalRodadas,
        resumo
      });
    }

    // 4. Persistir no banco
    await conexao.beginTransaction();
    let inseridas = 0;
    let atualizadas = 0;

    const upsertRodada = async (rodada, fase) => {
      const sql = `INSERT INTO rodadas_status (
          campeonato_id, fase, rodada, nome, slug, status, proxima_rodada, proxima_nome, proxima_status,
          rodada_anterior, rodada_anterior_nome, rodada_anterior_status, link
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          nome = VALUES(nome),
          slug = VALUES(slug),
          status = VALUES(status),
          proxima_rodada = VALUES(proxima_rodada),
          proxima_nome = VALUES(proxima_nome),
          proxima_status = VALUES(proxima_status),
          rodada_anterior = VALUES(rodada_anterior),
          rodada_anterior_nome = VALUES(rodada_anterior_nome),
          rodada_anterior_status = VALUES(rodada_anterior_status),
          link = VALUES(link),
          atualizado_em = CURRENT_TIMESTAMP`;

      const params = [
        campeonatoId,
        fase,
        rodada.rodada,
        rodada.nome,
        rodada.slug,
        rodada.status,
        rodada.proxima_rodada?.rodada || null,
        rodada.proxima_rodada?.nome || null,
        rodada.proxima_rodada?.status || null,
        rodada.rodada_anterior?.rodada || null,
        rodada.rodada_anterior?.nome || null,
        rodada.rodada_anterior?.status || null,
        rodada._link || null
      ];

      const [result] = await conexao.query(sql, params);
      return result.affectedRows === 1 ? 'inserida' : 'atualizada';
    };

    for (const [fase, rodadas] of Object.entries(rodadasPorFase)) {
      if (!Array.isArray(rodadas)) continue;
      for (const rodada of rodadas) {
        const action = await upsertRodada(rodada, fase);
        if (action === 'inserida') inseridas++;
        else atualizadas++;
      }
    }

    await conexao.commit();
    await conexao.release();

    console.log(`[importarRodadasCampeonato] Importação concluída: ${inseridas} inseridas, ${atualizadas} atualizadas`);

    return res.json({
      sucesso: true,
      modo: 'producao',
      mensagem: '✅ Status das rodadas sincronizado com sucesso!',
      inseridas,
      atualizadas,
      total: inseridas + atualizadas,
      timestamp: new Date().toLocaleString('pt-BR')
    });
  } catch (error) {
    console.error('[importarRodadasCampeonato] Erro:', error);

    if (conexao) {
      try {
        await conexao.rollback();
      } catch (rollbackErr) {
        console.error('[importarRodadasCampeonato] Erro ao fazer rollback:', rollbackErr);
      }
      await conexao.release();
    }

    return res.status(500).json({
      sucesso: false,
      erro: '❌ Erro ao importar rodadas',
      detalhes: error.message || 'Erro desconhecido',
      timestamp: new Date().toLocaleString('pt-BR')
    });
  }
};

/**
 * Insere ou atualiza uma partida no banco de dados
 * @param {Object} conexao - Conexão do pool MySQL
 * @param {Object} partida - Dados da partida da API
 * @param {string} fase - Nome da fase
 * @param {number|null} rodada - Número da rodada (null para mata-mata)
 * @param {number} campeonatoId - ID do campeonato
 * @returns {Promise<string>} 'inserida' ou 'atualizada'
 */
async function inserirOuAtualizarPartida(conexao, partida, fase, rodada, campeonatoId) {
  try {
    const dataHora = converterParaDatetimeMySQL(partida.data_realizacao_iso, campeonatoId);

    // Verificar se partida já existe
    const [existente] = await conexao.query(
      'SELECT id FROM jogos WHERE partida_id = ?',
      [partida.partida_id]
    );

    const dados = {
      partida_id: partida.partida_id,
      campeonato_id: campeonatoId,
      rodada: rodada,
      fase: fase,
      data: dataHora,
      time_mandante: partida.time_mandante.nome_popular,
      time_visitante: partida.time_visitante.nome_popular,
      escudo_mandante: partida.time_mandante.escudo,
      escudo_visitante: partida.time_visitante.escudo,
      placar_mandante: null, // Será preenchido quando buscar resultados
      placar_visitante: null,
      estadio: null
    };

    if (existente.length > 0) {
      // UPDATE
      await conexao.query(
        `UPDATE jogos 
         SET campeonato_id = ?, rodada = ?, fase = ?, data = ?, time_mandante = ?, time_visitante = ?,
             escudo_mandante = ?, escudo_visitante = ?
         WHERE partida_id = ?`,
        [
          dados.campeonato_id,
          dados.rodada,
          dados.fase,
          dados.data,
          dados.time_mandante,
          dados.time_visitante,
          dados.escudo_mandante,
          dados.escudo_visitante,
          dados.partida_id
        ]
      );
      return 'atualizada';
    } else {
      // INSERT
      await conexao.query(
        `INSERT INTO jogos (partida_id, campeonato_id, rodada, fase, data, time_mandante, time_visitante,
                            escudo_mandante, escudo_visitante, placar_mandante, placar_visitante, estadio)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          dados.partida_id,
          dados.campeonato_id,
          dados.rodada,
          dados.fase,
          dados.data,
          dados.time_mandante,
          dados.time_visitante,
          dados.escudo_mandante,
          dados.escudo_visitante,
          dados.placar_mandante,
          dados.placar_visitante,
          dados.estadio
        ]
      );
      return 'inserida';
    }
  } catch (error) {
    console.error(`[inserirOuAtualizarPartida] Erro ao processar partida ${partida.partida_id}:`, error.message);
    throw error;
  }
}
