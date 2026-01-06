const pool = require('../database/conexao');
const { DateTime } = require('luxon');
const axios = require('axios');
const { logSistema } = require('./logService');

// Converte qualquer formato ISO/SQL para DateTime em America/Manaus; retorna null se inválido
function parseDataManaus(value) {
  if (!value) return null;

  // Se veio como objeto Date do MySQL (DATETIME), INTERPRETAR os campos como hora local de Manaus
  // (não converter a partir do instante UTC, pois MySQL DATETIME é 'naive')
  if (value instanceof Date) {
    const dtObj = DateTime.fromObject({
      year: value.getFullYear(),
      month: value.getMonth() + 1,
      day: value.getDate(),
      hour: value.getHours(),
      minute: value.getMinutes(),
      second: value.getSeconds(),
    }, { zone: 'America/Manaus' });
    return dtObj.isValid ? dtObj : null;
  }

  // Tenta ISO com offset/Z
  let dt = DateTime.fromISO(String(value), { setZone: true });
  if (dt.isValid) return dt.setZone('America/Manaus');

  // Tenta formato SQL local (assume Manaus já que foi salvo sem offset)
  dt = DateTime.fromSQL(String(value), { zone: 'America/Manaus' });
  if (dt.isValid) return dt;

  return null;
}

// Tabela de persistência
const ensureTableSQL = `
CREATE TABLE IF NOT EXISTS agendador_requisicoes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  data_hora DATETIME NOT NULL,
  campeonato_id INT NOT NULL,
  rodada INT NOT NULL,
  grupo_chave VARCHAR(32) NOT NULL,
  requests_previstos INT NOT NULL DEFAULT 1,
  executados INT NOT NULL DEFAULT 0,
  tipo ENUM('placar','classificacao') NOT NULL DEFAULT 'placar',
  status ENUM('planejado','executado','falhou','adiado') NOT NULL DEFAULT 'planejado',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_sched (campeonato_id, rodada, grupo_chave)
)`;

async function ensureTable() {
  const conn = await pool.getConnection();
  try {
    await conn.query(ensureTableSQL);
    // Ajuste de coluna tipo, caso tabela já exista (compatível com MySQL sem IF NOT EXISTS)
    const [[col]] = await conn.query(
      `SELECT COUNT(*) AS cnt
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'agendador_requisicoes'
         AND COLUMN_NAME = 'tipo'`
    );
    if (Number(col?.cnt) === 0) {
      await conn.query(
        "ALTER TABLE agendador_requisicoes ADD COLUMN tipo ENUM('placar','classificacao') NOT NULL DEFAULT 'placar' AFTER executados"
      );
    }
  } finally {
    conn.release();
  }
}

// Busca configurações atuais (limite e contador de requisições)
async function obterConfiguracoes(conn) {
  const [[cfg]] = await conn.query(
    'SELECT limite_requisicoes_dia, requisicoes_api_futebol FROM configuracoes ORDER BY id DESC LIMIT 1'
  );
  return {
    limite: Number(cfg?.limite_requisicoes_dia) || 100,
    usadas: Number(cfg?.requisicoes_api_futebol) || 0,
  };
}

// Determina rodada atual por campeonato, baseado nos grupos e rodadas_status
async function obterRodadaAtualPorCampeonato(conn) {
  // Campeonatos ativos a partir dos grupos
  const [grps] = await conn.query(`SELECT DISTINCT campeonato_id FROM grupos WHERE campeonato_id IS NOT NULL`);
  const mapa = new Map();
  const agora = DateTime.now().setZone('America/Manaus');
  const limiteData = agora.plus({ days: 7 }); // Busca apenas rodadas com jogos nos próximos 7 dias
  
  for (const g of grps) {
    const campId = Number(g.campeonato_id);
    
    // Busca a menor rodada com jogos pendentes nos próximos 7 dias
    const [rs] = await conn.query(
      `SELECT rodada
       FROM jogos
       WHERE campeonato_id = ? 
         AND (status IN ('agendado','andamento') OR status IS NULL OR placar_mandante IS NULL)
         AND data <= ?
       ORDER BY data ASC
       LIMIT 1`,
      [campId, limiteData.toSQL({ includeOffset: false })]
    );
    
    if (rs && rs.length > 0) {
      mapa.set(campId, Number(rs[0].rodada));
    }
  }
  return mapa; // Map<campeonatoId, rodadaAtual>
}

// Agrupa jogos por data+hora da rodada atual de cada campeonato
async function obterGruposPorRodadaAtual(conn) {
  const mapaRodada = await obterRodadaAtualPorCampeonato(conn);
  const grupos = new Map();
  
  for (const [campId, rodada] of mapaRodada.entries()) {
    const [rows] = await conn.query(
      `SELECT campeonato_id, rodada, data, partida_id
       FROM jogos
       WHERE campeonato_id = ? AND rodada = ? 
         AND (status IN ('agendado', 'andamento') OR status IS NULL OR placar_mandante IS NULL)
       ORDER BY data ASC`,
      [campId, rodada]
    );
    for (const r of rows) {
      const dt = parseDataManaus(r.data);
      if (!dt) {
        console.warn('[agendador] Ignorando jogo com data inválida', { campId: r.campeonato_id, rodada: r.rodada, partida: r.partida_id, data: r.data });
        continue;
      }

      const key = `${dt.toFormat('yyyy-LL-dd HH:mm')}|${r.campeonato_id}|${r.rodada}`;
      const entry = grupos.get(key) || { dataHora: dt, campeonatoId: r.campeonato_id, rodada: r.rodada, jogos: 0 };
      entry.jogos += 1;
      grupos.set(key, entry);
    }
  }
  return Array.from(grupos.values()).sort((a, b) => a.dataHora.toMillis() - b.dataHora.toMillis());
}

exports.calcularAgendaTodosGrupos = async (page = 1, limit = 10) => {
  await ensureTable();
  const conn = await pool.getConnection();
  try {
    const cfg = await obterConfiguracoes(conn);
    
    // Lê diretamente da tabela persistida se houver registros planejados
    const [planejados] = await conn.query(
      `SELECT * FROM agendador_requisicoes 
       WHERE status = 'planejado' 
       ORDER BY data_hora ASC, FIELD(tipo, 'placar', 'classificacao')`
    );
    
    let agenda = [];
    
    if (planejados && planejados.length > 0) {
      // Buscar jogos por grupo para preencher jogosNoGrupo  
      const gruposUnicos = new Set();
      planejados.forEach(r => {
        const key = `${r.campeonato_id}|${r.rodada}`;
        gruposUnicos.add(key);
      });
      
      const jogosMap = new Map();
      for (const key of gruposUnicos) {
        const [campId, rodada] = key.split('|').map(Number);
        const [rows] = await conn.query(
          `SELECT data, COUNT(*) as total FROM jogos 
           WHERE campeonato_id = ? AND rodada = ? AND (status = 'agendado' OR status IS NULL OR placar_mandante IS NULL)
           GROUP BY data`,
          [campId, rodada]
        );
        rows.forEach(row => {
          const dtJogo = parseDataManaus(row.data);
          if (!dtJogo) return;
          const chaveHorario = `${campId}|${rodada}|${dtJogo.toFormat('yyyy-LL-dd HH:mm')}`;
          jogosMap.set(chaveHorario, row.total);
        });
      }

      // Agrega por baseKey (horário base do grupo)
      const gruposAgregados = new Map();
      planejados.forEach(r => {
        const baseKey = r.grupo_chave
          .replace(/-classificacao$/, '')
          .replace(/-placar$/, '')
          .replace(/-\d+\/\d+$/, '');
        const chaveGrupo = `${r.campeonato_id}|${r.rodada}|${baseKey}`;
        const baseData = DateTime.fromFormat(baseKey, 'yyyy-LL-dd HH:mm', { zone: 'America/Manaus' });
        if (!gruposAgregados.has(chaveGrupo)) {
          gruposAgregados.set(chaveGrupo, {
            campeonatoId: r.campeonato_id,
            rodada: r.rodada,
            baseDataHora: baseData,
            placarCount: 0,
            placarPrevistos: 0,
            hasClassificacao: false,
            classDataHora: null,
          });
        }
        const g = gruposAgregados.get(chaveGrupo);
        if (r.tipo === 'placar') {
          const prev = Number(r.requests_previstos) || 1;
          g.placarCount += prev;
          g.placarPrevistos += prev;
        } else if (r.tipo === 'classificacao') {
          g.hasClassificacao = true;
          g.classDataHora = DateTime.fromJSDate(r.data_hora).setZone('America/Manaus');
        }
      });

      // Monta agenda agregada (uma linha placar + uma linha classificação por grupo)
      const linhas = [];
      for (const [chave, g] of gruposAgregados.entries()) {
        // Corrige busca em jogosMap - monta chave compatível com formato do mapa
        const chaveJogos = `${g.campeonatoId}|${g.rodada}|${g.baseDataHora.toFormat('yyyy-LL-dd HH:mm')}`;
        const numJogos = jogosMap.get(chaveJogos) || 0;
        if (g.placarPrevistos > 0) {
          const intervaloCalculado = 130 / g.placarPrevistos;
          const intervaloFinal = Math.max(0.5, intervaloCalculado); // Mínimo 30 segundos
          linhas.push({
            dataHora: g.baseDataHora,
            campeonatoId: g.campeonatoId,
            rodada: g.rodada,
            jogos: numJogos,
            permitido: true,
            motivo: null,
            disparosPrevistos: g.placarPrevistos,
            intervaloMinutos: intervaloFinal,
            tipo: 'placar',
          });
        }
        if (g.hasClassificacao) {
          linhas.push({
            dataHora: g.classDataHora || g.baseDataHora.plus({ minutes: 130 }),
            campeonatoId: g.campeonatoId,
            rodada: g.rodada,
            jogos: numJogos,
            permitido: true,
            motivo: null,
            disparosPrevistos: 1,
            intervaloMinutos: null,
            tipo: 'classificacao',
          });
        }
      }

      linhas.sort((a, b) => a.dataHora.toMillis() - b.dataHora.toMillis());
      agenda = linhas;
      try { await logSistema({ origem: 'agendadorService', nivel: 'info', descricao: `Agenda carregada de persistidos: ${planejados.length} registros` }); } catch {}
      
    } else {
      // Cálculo em tempo real (fallback quando não há planejamento persistido)
      const grupos = await obterGruposPorRodadaAtual(conn);
      const hojeKey = DateTime.now().setZone('America/Manaus').toFormat('yyyy-LL-dd');

      const porDia = new Map();
      for (const g of grupos) {
        const key = g.dataHora.toFormat('yyyy-LL-dd');
        if (!porDia.has(key)) porDia.set(key, []);
        porDia.get(key).push(g);
      }

      for (const [diaKey, lista] of porDia.entries()) {
        let saldoDia = Math.max(0, (diaKey === hojeKey ? cfg.limite - cfg.usadas : cfg.limite));

        // Primeiro garante 1 requisição de classificação por grupo (se houver saldo)
        const classificacoes = [];
        for (const g of lista) {
          if (saldoDia <= 0) break;
          classificacoes.push({
            ...g,
            dataHora: g.dataHora.plus({ minutes: 130 }),
            permitido: true,
            motivo: null,
            disparosPrevistos: 1,
            intervaloMinutos: null,
            tipo: 'classificacao',
          });
          saldoDia -= 1;
        }

        // Distribui saldo remanescente entre placares do dia (uma linha agregada por grupo)
        const base = lista.length > 0 ? Math.floor(saldoDia / lista.length) : 0;
        const resto = lista.length > 0 ? saldoDia % lista.length : 0;

        lista.forEach((g, idx) => {
          const disparos = base + (idx < resto ? 1 : 0);
          if (disparos <= 0) return;
          const intervaloCalculado = 130 / disparos;
          const intervaloFinal = Math.max(0.5, intervaloCalculado); // Mínimo 30 segundos
          agenda.push({
            ...g,
            permitido: true,
            motivo: null,
            disparosPrevistos: disparos,
            intervaloMinutos: intervaloFinal,
            tipo: 'placar',
          });
        });

        // Adiciona classificações calculadas
        agenda.push(...classificacoes);
      }
      try { await logSistema({ origem: 'agendadorService', nivel: 'info', descricao: `Agenda calculada em tempo real: ${agenda.length} registros` }); } catch {}
    }
    
    // Paginação
    const total = agenda.length;
    const skip = (page - 1) * limit;
    const paginado = agenda.slice(skip, skip + limit).map(item => ({
      dataHora: item.dataHora.setZone ? item.dataHora.setZone('America/Manaus').toISO() : item.dataHora,
      campeonatoId: item.campeonatoId,
      rodada: item.rodada,
      jogosNoGrupo: item.jogos,
      permitido: item.permitido,
      motivo: item.motivo || null,
      disparosPrevistos: item.disparosPrevistos || 0,
      intervaloMinutos: item.intervaloMinutos || null,
      tipo: item.tipo || 'placar',
    }));
    
    return {
      agenda: paginado,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      limiteDiario: cfg.limite,
      requisicoesUsadas: cfg.usadas,
      saldoDisponivel: Math.max(0, cfg.limite - cfg.usadas),
    };
  } finally {
    conn.release();
  }
};

exports.calcularAgendaPorDia = async (dia, page = 1, limit = 10) => {
  await ensureTable();
  const conn = await pool.getConnection();
  try {
    const cfg = await obterConfiguracoes(conn);
    const [rows] = await conn.query(
      `SELECT campeonato_id, rodada, data, COUNT(*) AS total
       FROM jogos
       WHERE DATE(data) = ? AND (status IN ('agendado','andamento') OR status IS NULL OR placar_mandante IS NULL)
       GROUP BY campeonato_id, rodada, data
       ORDER BY data ASC`,
      [dia]
    );

    const gruposNoDia = rows.length;
    const saldoDisponivel = Math.max(0, cfg.limite - cfg.usadas);
    const disparosPorGrupo = Math.max(1, Math.floor(saldoDisponivel / Math.max(1, gruposNoDia)));
    const intervaloCalculado = 130 / disparosPorGrupo;
    const intervaloMin = Math.max(0.5, intervaloCalculado); // mínimo 0,5 minuto (30s)

    const agenda = rows.map(r => {
      const dt = parseDataManaus(r.data);
      return {
        dataHora: dt || DateTime.invalid('Invalid date'),
        campeonatoId: r.campeonato_id,
        rodada: r.rodada,
        jogosNoGrupo: Number(r.total) || 0,
        permitido: true,
        motivo: dt ? null : 'data invalida',
        disparosPrevistos: disparosPorGrupo,
        intervaloMinutos: intervaloMin,
        tipo: 'placar',
      };
    }).filter(item => item.dataHora.isValid);

    const total = agenda.length;
    const skip = (page - 1) * limit;
    const paginado = agenda.slice(skip, skip + limit).map(item => ({
      dataHora: item.dataHora.setZone('America/Manaus').toISO(),
      campeonatoId: item.campeonatoId,
      rodada: item.rodada,
      jogosNoGrupo: item.jogosNoGrupo,
      permitido: item.permitido,
      motivo: item.motivo,
      disparosPrevistos: item.disparosPrevistos,
      intervaloMinutos: item.intervaloMinutos,
      tipo: item.tipo,
    }));

    return {
      agenda: paginado,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      limiteDiario: cfg.limite,
      requisicoesUsadas: cfg.usadas,
      saldoDisponivel: Math.max(0, cfg.limite - cfg.usadas),
    };
  } finally {
    conn.release();
  }
};

exports.planejarPersistirAgenda = async () => {
  await ensureTable();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    
    // Limpar todos os agendamentos futuros (planejados ou falhados) para permitir replanejamento
    await conn.query(`DELETE FROM agendador_requisicoes WHERE status IN ('planejado', 'falhou') OR data_hora > NOW()`);
    
    const grupos = await obterGruposPorRodadaAtual(conn);
    const cfg = await obterConfiguracoes(conn);
    const hojeKey = DateTime.now().setZone('America/Manaus').toFormat('yyyy-LL-dd');

    // Agrupa grupos por dia para distribuir saldo
    const porDia = new Map();
    for (const g of grupos) {
      const key = g.dataHora.toFormat('yyyy-LL-dd');
      if (!porDia.has(key)) porDia.set(key, []);
      porDia.get(key).push(g);
    }

    let planejados = 0;

    for (const [diaKey, lista] of porDia.entries()) {
      let saldoDia = Math.max(0, (diaKey === hojeKey ? cfg.limite - cfg.usadas : cfg.limite));

      // Primeiro garante 1 classificação por grupo (se houver saldo)
      for (const g of lista) {
        if (saldoDia <= 0) break;
        const dtExecClass = g.dataHora.plus({ minutes: 130 });
        const grupoChaveClass = `${g.dataHora.toFormat('yyyy-LL-dd HH:mm')}-classificacao`;
        await conn.query(
          `INSERT INTO agendador_requisicoes (data_hora, campeonato_id, rodada, grupo_chave, requests_previstos, tipo, status)
           VALUES (?, ?, ?, ?, 1, 'classificacao', 'planejado')
           ON DUPLICATE KEY UPDATE data_hora=VALUES(data_hora), status='planejado', updated_at=CURRENT_TIMESTAMP`,
          [dtExecClass.toSQL({ includeOffset: false }), g.campeonatoId, g.rodada, grupoChaveClass]
        );
        saldoDia -= 1;
        planejados += 1;
      }

      // Distribui saldo restante entre placares
      const base = lista.length > 0 ? Math.floor(saldoDia / lista.length) : 0;
      const resto = lista.length > 0 ? saldoDia % lista.length : 0;

      for (let idx = 0; idx < lista.length; idx++) {
        const g = lista[idx];
        const disparos = base + (idx < resto ? 1 : 0);
        if (disparos <= 0) continue;
        const intervaloCalculado = 130 / disparos;
        const intervaloMin = Math.max(0.5, intervaloCalculado); // Mínimo 30 segundos
        // Iniciar os disparos somente após 130 minutos do início do jogo
        const dtExecStart = g.dataHora.plus({ minutes: 130 });
        for (let k = 0; k < disparos; k++) {
          const dtExec = dtExecStart.plus({ minutes: intervaloMin * k });
          const grupoChave = `${g.dataHora.toFormat('yyyy-LL-dd HH:mm')}-placar-${k + 1}/${disparos}`;
          await conn.query(
            `INSERT INTO agendador_requisicoes (data_hora, campeonato_id, rodada, grupo_chave, requests_previstos, tipo, status)
             VALUES (?, ?, ?, ?, 1, 'placar', 'planejado')
             ON DUPLICATE KEY UPDATE data_hora=VALUES(data_hora), status='planejado', updated_at=CURRENT_TIMESTAMP`,
            [dtExec.toSQL({ includeOffset: false }), g.campeonatoId, g.rodada, grupoChave]
          );
          planejados += 1;
        }
      }
    }
    await conn.commit();
    try { await logSistema({ origem: 'agendadorService', nivel: 'info', descricao: `Agenda planejada e persistida: ${planejados} registros` }); } catch {}
    return { planejados };
  } catch (err) {
    await conn.rollback();
    try { await logSistema({ origem: 'agendadorService', nivel: 'error', descricao: `Falha ao planejar agenda: ${err.message}` }); } catch {}
    throw err;
  } finally {
    conn.release();
  }
};

exports.executarDevidos = async () => {
  await ensureTable();
  const conn = await pool.getConnection();
  try {
    const agora = DateTime.now().setZone('America/Manaus');
    const [rows] = await conn.query(
      `SELECT * FROM agendador_requisicoes
       WHERE status = 'planejado' AND data_hora <= NOW()
       ORDER BY data_hora ASC`
    );
    
    // Agrupa por campeonato_id/rodada/tipo para evitar requisições duplicadas
    const grupos = new Map();
    for (const r of rows) {
      const key = `${r.tipo}-${r.campeonato_id}-${r.rodada}`;
      if (!grupos.has(key)) {
        grupos.set(key, { tipo: r.tipo, campeonato_id: r.campeonato_id, rodada: r.rodada, ids: [] });
      }
      grupos.get(key).ids.push(r.id);
    }
    
    let executados = 0;
    let requisicoesApi = 0;
    
    for (const [key, grupo] of grupos.entries()) {
      try {
        if (grupo.tipo === 'classificacao') {
          const classificacaoService = require('./classificacaoService');
          await classificacaoService.importarClassificacao(grupo.campeonato_id);
          requisicoesApi++;
          try { await logSistema({ origem: 'agendadorService', nivel: 'info', descricao: `Executado classificação camp=${grupo.campeonato_id} rodada=${grupo.rodada}` }); } catch {}
        } else {
          // Disparo da consulta de rodada específica (placares) - APENAS 1 REQUISIÇÃO POR RODADA
          // Salvaguarda: só executar após início do jogo +130min. Caso contrário, reagendar para o horário permitido.
          try {
            const [[minRow]] = await conn.query(
              `SELECT MIN(data) AS inicio
               FROM jogos
               WHERE campeonato_id = ? AND rodada = ?`,
              [grupo.campeonato_id, grupo.rodada]
            );
            const inicioManaus = parseDataManaus(minRow?.inicio);
            if (inicioManaus && inicioManaus.isValid) {
              const permitido = inicioManaus.plus({ minutes: 130 });
              if (agora < permitido) {
                await conn.query(
                  `UPDATE agendador_requisicoes SET data_hora = ?, updated_at = CURRENT_TIMESTAMP WHERE id IN (?)`,
                  [permitido.toSQL({ includeOffset: false }), grupo.ids]
                );
                try { await logSistema({ origem: 'agendadorService', nivel: 'info', descricao: `Execução adiada: camp=${grupo.campeonato_id} rodada=${grupo.rodada} para ${permitido.toISO()}` }); } catch {}
                continue; // não executar agora
              }
            }
          } catch (chkErr) {
            try { await logSistema({ origem: 'agendadorService', nivel: 'warn', descricao: `Falha na checagem de horário permitido: ${chkErr.message}` }); } catch {}
          }
          const jwt = require('jsonwebtoken');
          const tokenSistema = jwt.sign(
            { id: 0, nome: 'SISTEMA_AGENDADOR', tipo: 'sistema' },
            process.env.JWT_SECRET || 'seu_jwt_secret_super_seguro',
            { expiresIn: '1h' }
          );
          
          const apiBase = process.env.API_BASE_URL || 'http://localhost:3001';
          const url = `${apiBase}/configuracoes/api-futebol/campeonatos/${grupo.campeonato_id}/rodadas/${grupo.rodada}`;
          await axios.post(url, {}, {
            headers: { Authorization: `Bearer ${tokenSistema}` }
          });
          requisicoesApi++;
          try { await logSistema({ origem: 'agendadorService', nivel: 'info', descricao: `Executado placar camp=${grupo.campeonato_id} rodada=${grupo.rodada}` }); } catch {}
          
          // Recalcular ranking da rodada após atualizar placares
          try {
            const rankingController = require('../controllers/rankingController');
            await rankingController.calcularRankingRodada(grupo.rodada, grupo.campeonato_id, null);
            try { await logSistema({ origem: 'agendadorService', nivel: 'info', descricao: `Ranking da rodada ${grupo.rodada} atualizado automaticamente` }); } catch {}
          } catch (rankErr) {
            try { await logSistema({ origem: 'agendadorService', nivel: 'warn', descricao: `Falha ao atualizar ranking: ${rankErr.message}` }); } catch {}
          }
        }
        
        // Marca TODOS os registros deste grupo como executados
        await conn.query(
          `UPDATE agendador_requisicoes SET status='executado', executados=executados+1, updated_at=CURRENT_TIMESTAMP WHERE id IN (?)`,
          [grupo.ids]
        );
        executados += grupo.ids.length;
      } catch (err) {
        console.error('Falha ao executar grupo', key, err.message);
        try { await logSistema({ origem: 'agendadorService', nivel: 'error', descricao: `Falha ao executar grupo=${key}: ${err.message}` }); } catch {}
        // Marca TODOS os registros deste grupo como falhados
        await conn.query(
          `UPDATE agendador_requisicoes SET status='falhou', updated_at=CURRENT_TIMESTAMP WHERE id IN (?)`,
          [grupo.ids]
        );
      }
    }
    
    // Apenas exibir log se houve processamento
    if (executados > 0 || requisicoesApi > 0) {
      console.log(`✅ Agendador: ${executados} registro(s) processado(s), ${requisicoesApi} requisição(ões) à API externa`);
    }
    return { executados, requisicoesApi };
  } finally {
    conn.release();
  }
};
