const pool = require('../database/conexao');
const axios = require('axios');
const { obterTokenApiFutebol, registrarRequisicaoApiFutebol } = require('./apiFutebolHelper');

// Garante que a tabela classificacao existe
const ensureTableSQL = `
CREATE TABLE IF NOT EXISTS classificacao (
  id INT AUTO_INCREMENT PRIMARY KEY,
  campeonato_id INT NOT NULL,
  tipo_competicao VARCHAR(100) NOT NULL,
  grupo VARCHAR(100) NOT NULL,
  posicao INT NOT NULL,
  time_id INT NOT NULL,
  nome_popular VARCHAR(255) NOT NULL,
  sigla VARCHAR(10) NOT NULL,
  escudo VARCHAR(500),
  jogos INT,
  vitorias INT,
  empates INT,
  derrotas INT,
  gols_pro INT,
  gols_contra INT,
  saldo_gols INT,
  pontos INT,
  aproveitamento DECIMAL(5,2),
  variacao_posicao INT,
  ultimos_jogos JSON,
  atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_class (campeonato_id, tipo_competicao, grupo, posicao),
  INDEX idx_campeonato (campeonato_id)
)`;

async function ensureTable() {
  const conn = await pool.getConnection();
  try {
    await conn.query(ensureTableSQL);
    // Ajusta colunas/índices ausentes consultando INFORMATION_SCHEMA (compatível com MySQL antigos)
    const [cols] = await conn.query(
      `SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH 
         FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'classificacao'`
    );
    const colSet = new Set(cols.map((c) => c.COLUMN_NAME));
    const colInfo = Object.fromEntries(cols.map((c) => [c.COLUMN_NAME, c]));

    const missingAlters = [];
    if (!colSet.has('tipo_competicao')) {
      missingAlters.push("ALTER TABLE classificacao ADD COLUMN tipo_competicao VARCHAR(100) NOT NULL DEFAULT '' AFTER campeonato_id");
    }
    if (!colSet.has('grupo')) {
      missingAlters.push("ALTER TABLE classificacao ADD COLUMN grupo VARCHAR(100) NOT NULL DEFAULT '' AFTER tipo_competicao");
    }
    if (!colSet.has('variacao_posicao')) {
      missingAlters.push('ALTER TABLE classificacao ADD COLUMN variacao_posicao INT NULL AFTER aproveitamento');
    }
    if (!colSet.has('ultimos_jogos')) {
      // usa MEDIUMTEXT para compatibilidade com MySQL sem JSON e suportar payloads maiores
      missingAlters.push('ALTER TABLE classificacao ADD COLUMN ultimos_jogos MEDIUMTEXT NULL AFTER variacao_posicao');
    }
    if (!colSet.has('atualizado_em')) {
      missingAlters.push('ALTER TABLE classificacao ADD COLUMN atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER ultimos_jogos');
    }

    for (const sql of missingAlters) {
      try { await conn.query(sql); } catch (e) { /* ignora se já existir */ }
    }

    // Ajusta tipo de ultimos_jogos se for muito pequeno (ex.: VARCHAR) para evitar overflow
    if (colSet.has('ultimos_jogos')) {
      const info = colInfo['ultimos_jogos'] || {};
      const dataType = (info.DATA_TYPE || '').toLowerCase();
      const maxLen = info.CHARACTER_MAXIMUM_LENGTH || 0;
      if (dataType !== 'json' && dataType !== 'mediumtext' && dataType !== 'longtext') {
        try { await conn.query('ALTER TABLE classificacao MODIFY ultimos_jogos MEDIUMTEXT NULL'); } catch (e) { /* ignora */ }
      } else if (maxLen && maxLen < 5000) {
        try { await conn.query('ALTER TABLE classificacao MODIFY ultimos_jogos MEDIUMTEXT NULL'); } catch (e) { /* ignora */ }
      }
    }

    // Índices/chave única
    const [idx] = await conn.query(
      `SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'classificacao'`
    );
    const idxSet = new Set(idx.map((r) => r.INDEX_NAME));
    if (!idxSet.has('uniq_class')) {
      try {
        await conn.query('ALTER TABLE classificacao ADD UNIQUE KEY uniq_class (campeonato_id, tipo_competicao, grupo, posicao)');
      } catch (e) { /* ignora se já existir */ }
    }
    if (!idxSet.has('idx_campeonato')) {
      try { await conn.query('ALTER TABLE classificacao ADD INDEX idx_campeonato (campeonato_id)'); } catch (e) { /* ignora */ }
    }
  } finally {
    conn.release();
  }
}

exports.importarClassificacao = async (campeonatoId) => {
  await ensureTable();
  
  const token = obterTokenApiFutebol();
  const url = `https://api.api-futebol.com.br/v1/campeonatos/${campeonatoId}/tabela`;
  
  try {
    const res = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` }
    });

    // Incrementa contador de requisições
    await registrarRequisicaoApiFutebol();

    const data = res.data || {};
    const conn = await pool.getConnection();
    
    try {
      await conn.beginTransaction();
      
      let totalInseridos = 0;
      let totalAtualizados = 0;
      
      // Normaliza estrutura da API: pode vir como array simples ou objeto por fases/grupos
      const fasesNormalizadas = [];

      if (Array.isArray(data)) {
        fasesNormalizadas.push({ tipo: 'geral', grupos: { Geral: data } });
      } else {
        for (const tipoCompeticao in data) {
          const fase = data[tipoCompeticao];

          // Caso a fase já seja um array de times (sem grupos)
          if (Array.isArray(fase)) {
            fasesNormalizadas.push({ tipo: tipoCompeticao, grupos: { Geral: fase } });
            continue;
          }

          // Caso venha objeto de grupos
          if (fase && typeof fase === 'object') {
            const grupos = {};
            for (const grupo in fase) {
              const bloco = fase[grupo];
              if (Array.isArray(bloco)) {
                grupos[grupo] = bloco;
              } else if (bloco && typeof bloco === 'object') {
                if (Array.isArray(bloco.times)) grupos[grupo] = bloco.times;
                else if (Array.isArray(bloco.classificacao)) grupos[grupo] = bloco.classificacao;
              }
            }
            fasesNormalizadas.push({ tipo: tipoCompeticao, grupos });
          }
        }
      }

      if (!fasesNormalizadas.length) {
        throw new Error('Formato inesperado da classificação retornada pela API.');
      }

      // Itera por fases e grupos já normalizados
      for (const fase of fasesNormalizadas) {
        const { tipo, grupos } = fase;
        for (const grupo in grupos) {
          const times = grupos[grupo] || [];
          for (const time of times) {
            if (!time || !time.time) continue; // ignora entradas malformadas
            const ultimosJogos = time.ultimos_jogos ? JSON.stringify(time.ultimos_jogos) : null;
            
            const [result] = await conn.query(
              `INSERT INTO classificacao 
               (campeonato_id, tipo_competicao, grupo, posicao, time_id, nome_popular, sigla, escudo,
                jogos, vitorias, empates, derrotas, gols_pro, gols_contra, saldo_gols, pontos,
                aproveitamento, variacao_posicao, ultimos_jogos)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
               ON DUPLICATE KEY UPDATE
               nome_popular = VALUES(nome_popular),
               escudo = VALUES(escudo),
               jogos = VALUES(jogos),
               vitorias = VALUES(vitorias),
               empates = VALUES(empates),
               derrotas = VALUES(derrotas),
               gols_pro = VALUES(gols_pro),
               gols_contra = VALUES(gols_contra),
               saldo_gols = VALUES(saldo_gols),
               pontos = VALUES(pontos),
               aproveitamento = VALUES(aproveitamento),
               variacao_posicao = VALUES(variacao_posicao),
               ultimos_jogos = VALUES(ultimos_jogos),
               atualizado_em = CURRENT_TIMESTAMP`,
              [
                campeonatoId,
                tipo,
                grupo,
                time.posicao,
                time.time.time_id,
                time.time.nome_popular,
                time.time.sigla,
                time.time.escudo,
                time.jogos,
                time.vitorias,
                time.empates,
                time.derrotas,
                time.gols_pro,
                time.gols_contra,
                time.saldo_gols,
                time.pontos,
                time.aproveitamento,
                time.variacao_posicao,
                ultimosJogos
              ]
            );
            
            if (result.affectedRows === 1 && result.insertId) {
              totalInseridos++;
            } else if (result.affectedRows === 2) {
              totalAtualizados++;
            }
          }
        }
      }
      
      await conn.commit();
      
      return {
        sucesso: true,
        mensagem: '✅ Classificação importada com sucesso',
        inseridas: totalInseridos,
        atualizadas: totalAtualizados,
        total: totalInseridos + totalAtualizados
      };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error('Erro ao importar classificação:', err.message);
    throw new Error(`Falha ao consultar classificação da API: ${err.message}`);
  }
};

exports.obterClassificacao = async (campeonatoId) => {
  await ensureTable();
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(
      `SELECT tipo_competicao, grupo, posicao, time_id, nome_popular, sigla, escudo,
              jogos, vitorias, empates, derrotas, gols_pro, gols_contra, saldo_gols, pontos,
              aproveitamento, variacao_posicao, ultimos_jogos
       FROM classificacao
       WHERE campeonato_id = ?
       ORDER BY tipo_competicao, grupo, posicao ASC`,
      [campeonatoId]
    );
    return rows || [];
  } finally {
    conn.release();
  }
};
