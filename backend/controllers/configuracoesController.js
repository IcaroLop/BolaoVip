const db = require('../database/conexao');
const axios = require('axios');
const tokenConfig = require('../config/tokenConfig');
const classificacaoService = require('../services/classificacaoService');
const { registrarRequisicaoApiFutebol } = require('../services/apiFutebolHelper');

async function getConfiguracoes(req, res) {
  try {
    const [rows] = await db.query('SELECT * FROM configuracoes LIMIT 1');
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Configurações não encontradas' });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error('Erro ao buscar configurações:', error);
    res.status(500).json({ message: 'Erro ao buscar configurações' });
  }
}

async function consultarRodadaApiFutebol(req, res) {
  const campeonatoId = parseInt(req.params.campeonatoId || req.query.campeonatoId, 10);
  const rodada = parseInt(req.params.rodada || req.query.rodada, 10);
  const token = tokenConfig.getToken();

  if (!token) {
    return res.status(400).json({ erro: 'Token da API-Futebol não configurado.' });
  }
  if (!campeonatoId || !rodada) {
    return res.status(400).json({ erro: 'campeonatoId e rodada são obrigatórios' });
  }

  try {
    const url = `https://api.api-futebol.com.br/v1/campeonatos/${campeonatoId}/rodadas/${rodada}`;
    const resp = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` }
    });

    // Incrementa contador de requisições
    await registrarRequisicaoApiFutebol();

    const dados = resp.data;
    const partidas = Array.isArray(dados.partidas) ? dados.partidas : [];

    // Modo teste: não grava no banco quando token de desenvolvimento (test_*)
    const isTeste = typeof token === 'string' && token.startsWith('test_');
    if (isTeste) {
      return res.json({
        sucesso: true,
        modo: 'teste',
        mensagem: 'Conexão OK (MODO TESTE) - dados NÃO gravados.',
        campeonatoId,
        rodada,
        total_partidas: partidas.length,
        exemplo_partida: partidas[0] || null
      });
    }

    await salvarRodadaEJogos({ dados, partidas, campeonatoId, rodada });

    res.json({ mensagem: 'Rodada importada com sucesso', rodada, campeonatoId, partidas: partidas.length });
  } catch (error) {
    console.error('Erro ao consultar API Futebol (rodada):', error?.response?.data || error.message);
    const status = error?.response?.status || 500;
    res.status(status).json({ erro: 'Falha ao consultar API de futebol', detalhe: error?.response?.data || error.message });
  }
}

// Converte strings ISO (com ou sem timezone) para formato MySQL DATETIME (UTC)
function normalizarDataIso(valor) {
  if (!valor) return null;
  try {
    const d = new Date(valor);
    if (Number.isNaN(d.getTime())) return null;
    // Armazena em UTC no formato YYYY-MM-DD HH:MM:SS
    return d.toISOString().slice(0, 19).replace('T', ' ');
  } catch (e) {
    return null;
  }
}

// Novo endpoint: salvar payload já consultado da API-Futebol
async function salvarRodadaApiFutebol(req, res) {
  try {
    const { campeonatoId, rodada, payload } = req.body;
    if (!campeonatoId || !rodada || !payload) {
      return res.status(400).json({ erro: 'campeonatoId, rodada e payload são obrigatórios.' });
    }

    const dados = payload;
    const partidas = Array.isArray(dados.partidas) ? dados.partidas : [];

    await salvarRodadaEJogos({ dados, partidas, campeonatoId, rodada });

    res.json({ sucesso: true, mensagem: 'Rodada salva com sucesso', rodada, campeonatoId, partidas: partidas.length });
  } catch (error) {
    console.error('Erro ao salvar rodada API-Futebol:', error?.message || error);
    res.status(500).json({ erro: 'Falha ao salvar dados da rodada' });
  }
}

async function salvarRodadaEJogos({ dados, partidas, campeonatoId, rodada }) {
  // Salvar dados crus na api_rodadas
  try {
    await db.query(
      `INSERT INTO api_rodadas (
         campeonato_id, rodada, nome, slug, status,
         proxima_rodada_json, rodada_anterior_json, api_link, partidas_json
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         nome = VALUES(nome), slug = VALUES(slug), status = VALUES(status),
         proxima_rodada_json = VALUES(proxima_rodada_json),
         rodada_anterior_json = VALUES(rodada_anterior_json),
         api_link = VALUES(api_link),
         partidas_json = VALUES(partidas_json)
      `,
      [
        campeonatoId,
        rodada,
        dados?.nome || null,
        dados?.slug || null,
        dados?.status || null,
        dados?.proxima_rodada ? JSON.stringify(dados.proxima_rodada) : null,
        dados?.rodada_anterior ? JSON.stringify(dados.rodada_anterior) : null,
        `https://api.api-futebol.com.br/v1/campeonatos/${campeonatoId}/rodadas/${rodada}`,
        partidas.length ? JSON.stringify(partidas) : JSON.stringify([])
      ]
    );
  } catch (e) {
    console.warn('Aviso: falha ao registrar api_rodadas:', e.message);
  }

  // Upsert em jogos conforme payload
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    for (const p of partidas) {
      const partida_id = p.partida_id;
      const data_iso = normalizarDataIso(p.data_realizacao_iso || p.data_realizacao || p.data);
      const estadio = p.estadio?.nome_popular || p.estadio?.nome || null;
      const time_mandante = p.time_mandante?.nome_popular || p.time_mandante?.nome || null;
      const time_visitante = p.time_visitante?.nome_popular || p.time_visitante?.nome || null;
      const escudo_mandante = p.time_mandante?.escudo || null;
      const escudo_visitante = p.time_visitante?.escudo || null;
      const placar_mandante = p.placar_mandante ?? null;
      const placar_visitante = p.placar_visitante ?? null;
      const status = p.status || null;

      await conn.query(
        `INSERT INTO jogos (
          partida_id, rodada, campeonato_id, data, estadio,
          time_mandante, time_visitante,
          escudo_mandante, escudo_visitante,
          placar_mandante, placar_visitante, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          rodada = VALUES(rodada),
          campeonato_id = VALUES(campeonato_id),
          data = VALUES(data),
          estadio = VALUES(estadio),
          time_mandante = VALUES(time_mandante),
          time_visitante = VALUES(time_visitante),
          escudo_mandante = VALUES(escudo_mandante),
          escudo_visitante = VALUES(escudo_visitante),
          placar_mandante = VALUES(placar_mandante),
          placar_visitante = VALUES(placar_visitante),
          status = VALUES(status)
      `,
        [
          partida_id, rodada, campeonatoId, data_iso, estadio,
          time_mandante, time_visitante,
          escudo_mandante, escudo_visitante,
          placar_mandante, placar_visitante, status
        ]
      );
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function importarClassificacao(req, res) {
  try {
    const { grupoId } = req.body;
    
    if (!grupoId) {
      return res.status(400).json({ erro: 'grupoId é obrigatório.' });
    }

    // Busca o campeonato do grupo
    const [grupos] = await db.query('SELECT campeonato_id FROM grupos WHERE id = ?', [grupoId]);
    if (grupos.length === 0) {
      return res.status(404).json({ erro: 'Grupo não encontrado.' });
    }

    const campeonatoId = grupos[0].campeonato_id;

    // Importa classificação
    const resultado = await classificacaoService.importarClassificacao(campeonatoId);

    res.json({
      sucesso: true,
      mensagem: resultado.mensagem,
      inseridas: resultado.inseridas,
      atualizadas: resultado.atualizadas,
      total: resultado.total
    });
  } catch (err) {
    console.error('Erro ao importar classificação:', err);
    const msg = err.message || 'Erro ao importar classificação.';
    res.status(500).json({ erro: msg });
  }
};

async function obterClassificacao(req, res) {
  try {
    const { grupoId } = req.query;

    if (!grupoId) {
      return res.status(400).json({ erro: 'grupoId é obrigatório.' });
    }

    // Busca o campeonato do grupo
    const [grupos] = await db.query('SELECT campeonato_id FROM grupos WHERE id = ?', [grupoId]);
    if (grupos.length === 0) {
      return res.status(404).json({ erro: 'Grupo não encontrado.' });
    }

    const campeonatoId = grupos[0].campeonato_id;

    // Obtém classificação
    const classificacao = await classificacaoService.obterClassificacao(campeonatoId);

    res.json({
      sucesso: true,
      classificacao,
      total: classificacao.length
    });
  } catch (err) {
    console.error('Erro ao obter classificação:', err);
    res.status(500).json({ erro: 'Erro ao obter classificação.' });
  }
};

async function atualizarLimiteRequisicoesDia(req, res) {
  try {
    const { limite_requisicoes_dia } = req.body;

    if (limite_requisicoes_dia === undefined || limite_requisicoes_dia === null) {
      return res.status(400).json({ erro: 'limite_requisicoes_dia é obrigatório.' });
    }

    const limite = Math.max(1, Math.min(999, parseInt(limite_requisicoes_dia, 10)));

    if (isNaN(limite)) {
      return res.status(400).json({ erro: 'limite_requisicoes_dia deve ser um número válido.' });
    }

    // Atualiza a configuração
    await db.query('UPDATE configuracoes SET limite_requisicoes_dia = ? WHERE id = 1', [limite]);

    // Retorna a configuração atualizada
    const [rows] = await db.query('SELECT * FROM configuracoes WHERE id = 1');
    res.json({
      sucesso: true,
      mensagem: `Limite atualizado para ${limite} requisições por dia.`,
      configuracoes: rows[0] || null
    });
  } catch (err) {
    console.error('Erro ao atualizar limite de requisições:', err);
    res.status(500).json({ erro: 'Erro ao atualizar limite de requisições.' });
  }
}

module.exports = {
  getConfiguracoes,
  consultarRodadaApiFutebol,
  salvarRodadaApiFutebol,
  importarClassificacao,
  obterClassificacao,
  atualizarLimiteRequisicoesDia,
};
