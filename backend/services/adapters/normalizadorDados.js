/**
 * Normalizador de Dados
 * Converte diferentes formatos de APIs para o formato interno do sistema
 */

/**
 * Normaliza status de partida para padrão interno
 * @param {string} status - Status em qualquer formato
 * @param {string} fonte - Nome da fonte (api-futebol, api-football, football-data, globo)
 * @returns {string} Status normalizado
 */
function normalizarStatus(status, fonte) {
  if (!status) return 'agendado';

  const statusLower = String(status).toLowerCase();

  // Mapeamento de status por fonte
  const mapeamentos = {
    'api-futebol': {
      'finalizado': 'finalizado',
      'encerrado': 'finalizado',
      'agendado': 'agendado',
      'ao-vivo': 'ao-vivo',
      'em andamento': 'ao-vivo'
    },
    'api-football': {
      'ft': 'finalizado',
      'aet': 'finalizado',
      'pen': 'finalizado',
      'ns': 'agendado',
      'tbd': 'agendado',
      'live': 'ao-vivo',
      '1h': 'ao-vivo',
      '2h': 'ao-vivo',
      'ht': 'ao-vivo'
    },
    'football-data': {
      'finished': 'finalizado',
      'scheduled': 'agendado',
      'in_play': 'ao-vivo',
      'paused': 'ao-vivo',
      'postponed': 'adiado',
      'cancelled': 'cancelado'
    },
    'globo': {
      'encerrado': 'finalizado',
      'finalizado': 'finalizado',
      'agendado': 'agendado',
      'ao vivo': 'ao-vivo',
      'em andamento': 'ao-vivo'
    }
  };

  const mapa = mapeamentos[fonte] || {};
  
  // Procura correspondência exata
  if (mapa[statusLower]) {
    return mapa[statusLower];
  }

  // Fallback por palavras-chave
  if (statusLower.includes('finalizado') || statusLower.includes('encerrado') || statusLower.includes('finished') || statusLower === 'ft') {
    return 'finalizado';
  }
  if (statusLower.includes('ao vivo') || statusLower.includes('ao-vivo') || statusLower.includes('live') || statusLower.includes('andamento')) {
    return 'ao-vivo';
  }
  if (statusLower.includes('agendado') || statusLower.includes('scheduled') || statusLower === 'ns') {
    return 'agendado';
  }
  if (statusLower.includes('adiado') || statusLower.includes('postponed')) {
    return 'adiado';
  }
  if (statusLower.includes('cancelado') || statusLower.includes('cancelled')) {
    return 'cancelado';
  }

  return 'agendado'; // Default
}

/**
 * Normaliza data ISO para garantir formato consistente
 * @param {string} data - Data em qualquer formato
 * @returns {string} Data em formato ISO
 */
function normalizarDataISO(data) {
  if (!data) return null;

  try {
    const date = new Date(data);
    if (isNaN(date.getTime())) return null;
    return date.toISOString();
  } catch (err) {
    console.error('Erro ao normalizar data:', data, err.message);
    return null;
  }
}

/**
 * Normaliza dados da API api-futebol.com.br (formato atual)
 * @param {object} dados - Resposta da API
 * @returns {array} Array de partidas normalizadas
 */
function normalizarApiFutebol(dados) {
  if (!dados || !dados.partidas) return [];

  return dados.partidas.map(jogo => ({
    partida_id: jogo.partida_id,
    rodada: dados.rodada,
    data_realizacao_iso: jogo.data_realizacao_iso,
    time_mandante: {
      nome_popular: jogo.time_mandante?.nome_popular || 'N/A',
      escudo: jogo.time_mandante?.escudo || ''
    },
    time_visitante: {
      nome_popular: jogo.time_visitante?.nome_popular || 'N/A',
      escudo: jogo.time_visitante?.escudo || ''
    },
    placar_mandante: jogo.placar_mandante,
    placar_visitante: jogo.placar_visitante,
    status: normalizarStatus(jogo.status, 'api-futebol'),
    estadio: {
      nome_popular: jogo.estadio?.nome_popular || 'Indefinido'
    }
  }));
}

/**
 * Normaliza dados da API-Football (RapidAPI)
 * @param {object} dados - Resposta da API
 * @returns {array} Array de partidas normalizadas
 */
function normalizarApiFootball(dados) {
  if (!dados || !dados.response) return [];

  return dados.response.map(jogo => ({
    partida_id: jogo.fixture?.id || null,
    rodada: extractRodadaFromLeague(jogo.league?.round),
    data_realizacao_iso: normalizarDataISO(jogo.fixture?.date),
    time_mandante: {
      nome_popular: jogo.teams?.home?.name || 'N/A',
      escudo: jogo.teams?.home?.logo || ''
    },
    time_visitante: {
      nome_popular: jogo.teams?.away?.name || 'N/A',
      escudo: jogo.teams?.away?.logo || ''
    },
    placar_mandante: jogo.goals?.home,
    placar_visitante: jogo.goals?.away,
    status: normalizarStatus(jogo.fixture?.status?.short, 'api-football'),
    estadio: {
      nome_popular: jogo.fixture?.venue?.name || 'Indefinido'
    }
  }));
}

/**
 * Normaliza dados da Football-Data.org
 * @param {object} dados - Resposta da API
 * @returns {array} Array de partidas normalizadas
 */
function normalizarFootballData(dados) {
  if (!dados || !dados.matches) return [];

  return dados.matches.map(jogo => ({
    partida_id: jogo.id || null,
    rodada: jogo.matchday || null,
    data_realizacao_iso: normalizarDataISO(jogo.utcDate),
    time_mandante: {
      nome_popular: jogo.homeTeam?.name || jogo.homeTeam?.shortName || 'N/A',
      escudo: jogo.homeTeam?.crest || ''
    },
    time_visitante: {
      nome_popular: jogo.awayTeam?.name || jogo.awayTeam?.shortName || 'N/A',
      escudo: jogo.awayTeam?.crest || ''
    },
    placar_mandante: jogo.score?.fullTime?.home,
    placar_visitante: jogo.score?.fullTime?.away,
    status: normalizarStatus(jogo.status, 'football-data'),
    estadio: {
      nome_popular: jogo.venue || 'Indefinido'
    }
  }));
}

/**
 * Normaliza dados da API Globo (não oficial)
 * @param {object} dados - Resposta da API
 * @returns {array} Array de partidas normalizadas
 */
function normalizarGloboApi(dados) {
  if (!dados) return [];

  // Verifica se é array direto ou objeto com propriedade
  const partidas = Array.isArray(dados) ? dados : (dados.fixtures || dados.jogos || []);

  return partidas.map(jogo => ({
    partida_id: jogo.id || jogo.fixture_id || null,
    rodada: jogo.round || jogo.rodada || null,
    data_realizacao_iso: normalizarDataISO(jogo.date || jogo.data || jogo.datetime),
    time_mandante: {
      nome_popular: jogo.home_team?.name || jogo.time_casa || 'N/A',
      escudo: jogo.home_team?.logo || jogo.escudo_casa || ''
    },
    time_visitante: {
      nome_popular: jogo.away_team?.name || jogo.time_visitante || 'N/A',
      escudo: jogo.away_team?.logo || jogo.escudo_visitante || ''
    },
    placar_mandante: jogo.home_score || jogo.placar_casa,
    placar_visitante: jogo.away_score || jogo.placar_visitante,
    status: normalizarStatus(jogo.status || jogo.situacao, 'globo'),
    estadio: {
      nome_popular: jogo.venue || jogo.estadio || 'Indefinido'
    }
  }));
}

/**
 * Extrai número da rodada de strings como "Regular Season - 22"
 * @param {string} roundString - String da rodada
 * @returns {number|null} Número da rodada
 */
function extractRodadaFromLeague(roundString) {
  if (!roundString) return null;
  
  const match = roundString.match(/\d+/);
  return match ? parseInt(match[0]) : null;
}

/**
 * Normaliza dados de qualquer fonte para formato interno
 * @param {object} dados - Dados brutos da API
 * @param {string} fonte - Nome da fonte
 * @returns {array} Array de partidas normalizadas
 */
function normalizarDados(dados, fonte) {
  if (!dados) return [];

  switch (fonte) {
    case 'api-futebol':
      return normalizarApiFutebol(dados);
    
    case 'api-football':
      return normalizarApiFootball(dados);
    
    case 'football-data':
      return normalizarFootballData(dados);
    
    case 'globo':
      return normalizarGloboApi(dados);
    
    default:
      console.warn(`Fonte desconhecida: ${fonte}. Tentando normalização genérica.`);
      return normalizarApiFutebol(dados); // Fallback para formato padrão
  }
}

/**
 * Valida se os dados normalizados estão corretos
 * @param {array} partidas - Array de partidas normalizadas
 * @returns {boolean} True se válido
 */
function validarDadosNormalizados(partidas) {
  if (!Array.isArray(partidas) || partidas.length === 0) {
    return false;
  }

  // Verifica se pelo menos 50% das partidas têm dados essenciais
  const partidasValidas = partidas.filter(p => 
    p.partida_id && 
    p.time_mandante?.nome_popular && 
    p.time_visitante?.nome_popular
  );

  return partidasValidas.length >= partidas.length * 0.5;
}

module.exports = {
  normalizarDados,
  normalizarStatus,
  normalizarDataISO,
  validarDadosNormalizados,
  // Exporta normalizadores específicos para testes
  normalizarApiFutebol,
  normalizarApiFootball,
  normalizarFootballData,
  normalizarGloboApi
};
