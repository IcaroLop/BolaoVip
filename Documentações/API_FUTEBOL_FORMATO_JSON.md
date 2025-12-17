# Formato JSON - API Futebol (api-futebol.com.br)

## Endpoint Atual
```
GET https://api.api-futebol.com.br/v1/campeonatos/10/rodadas/{rodada}
Headers: Authorization: Bearer {TOKEN}
```

## Estrutura JSON Recebida

### Resposta Principal
```json
{
  "nome": "Rodada X",
  "slug": "rodada-x",
  "rodada": X,
  "status": "encerrada" | "agendada" | "em andamento",
  "partidas": [
    {
      "partida_id": 123456,
      "campeonato": {
        "campeonato_id": 10,
        "nome": "Brasileirão Série A",
        "slug": "brasileirao-serie-a"
      },
      "estadio": {
        "estadio_id": 789,
        "nome_popular": "Maracanã"
      },
      "time_mandante": {
        "time_id": 1,
        "nome_popular": "Flamengo",
        "sigla": "FLA",
        "escudo": "https://api.api-futebol.com.br/escudos/flamengo.svg"
      },
      "time_visitante": {
        "time_id": 2,
        "nome_popular": "Palmeiras",
        "sigla": "PAL",
        "escudo": "https://api.api-futebol.com.br/escudos/palmeiras.svg"
      },
      "placar_mandante": 2,
      "placar_visitante": 1,
      "status": "finalizado" | "agendado" | "ao-vivo",
      "slug": "flamengo-palmeiras",
      "data_realizacao": "2024-11-30 16:00:00",
      "data_realizacao_iso": "2024-11-30T19:00:00.000Z",
      "hora_realizacao": "16:00"
    }
  ]
}
```

## Campos Essenciais Utilizados no Sistema

### Para Atualização de Jogos (scheduler.js)
- `partida_id` - Identificador único da partida
- `data_realizacao_iso` - Data/hora em formato ISO (convertida de SP para Manaus)
- `time_mandante.nome_popular` - Nome do time da casa
- `time_visitante.nome_popular` - Nome do time visitante
- `estadio.nome_popular` - Nome do estádio
- `placar_mandante` - Gols do time da casa (null se não finalizado)
- `placar_visitante` - Gols do time visitante (null se não finalizado)
- `status` - Status da partida
- `time_mandante.escudo` - URL do escudo do time da casa
- `time_visitante.escudo` - URL do escudo do time visitante

### Para Consulta de Resultados (consultaResultadosService.js)
- `partida_id` - Para identificar o jogo no banco
- `placar_mandante` - Resultado final casa
- `placar_visitante` - Resultado final visitante
- `status` - Status atualizado

---

## Alternativas de APIs Gratuitas/Públicas

### 1. **API-FOOTBALL (RapidAPI)**
**URL:** https://rapidapi.com/api-sports/api/api-football

**Endpoint:** 
```
GET https://v3.football.api-sports.io/fixtures
Params: league=71&season=2024&round=Regular Season - {rodada}
```

**Formato de Resposta:**
```json
{
  "response": [
    {
      "fixture": {
        "id": 1234567,
        "date": "2024-11-30T19:00:00+00:00",
        "status": {
          "long": "Match Finished",
          "short": "FT"
        },
        "venue": {
          "name": "Maracanã"
        }
      },
      "league": {
        "id": 71,
        "name": "Serie A"
      },
      "teams": {
        "home": {
          "id": 123,
          "name": "Flamengo",
          "logo": "https://media.api-sports.io/football/teams/123.png"
        },
        "away": {
          "id": 124,
          "name": "Palmeiras",
          "logo": "https://media.api-sports.io/football/teams/124.png"
        }
      },
      "goals": {
        "home": 2,
        "away": 1
      },
      "score": {
        "halftime": {
          "home": 1,
          "away": 0
        },
        "fulltime": {
          "home": 2,
          "away": 1
        }
      }
    }
  ]
}
```

**Mapeamento:**
- `fixture.id` → `partida_id`
- `fixture.date` → `data_realizacao_iso`
- `teams.home.name` → `time_mandante.nome_popular`
- `teams.away.name` → `time_visitante.nome_popular`
- `fixture.venue.name` → `estadio.nome_popular`
- `goals.home` → `placar_mandante`
- `goals.away` → `placar_visitante`
- `fixture.status.short` → converter para `status` (FT=finalizado, NS=agendado, LIVE=ao-vivo)
- `teams.home.logo` → `time_mandante.escudo`
- `teams.away.logo` → `time_visitante.escudo`

**Prós:**
- Muito completa e atualizada em tempo real
- Cobertura global incluindo Brasileirão
- 100 requisições/dia no plano gratuito

**Contras:**
- Requer cadastro no RapidAPI
- Limite de 100 req/dia pode ser pouco para múltiplas consultas

---

### 2. **Football-Data.org API**
**URL:** https://www.football-data.org/

**Endpoint:**
```
GET https://api.football-data.org/v4/competitions/BSA/matches
Params: season=2024&matchday={rodada}
Headers: X-Auth-Token: {YOUR_TOKEN}
```

**Formato de Resposta:**
```json
{
  "matches": [
    {
      "id": 123456,
      "utcDate": "2024-11-30T19:00:00Z",
      "status": "FINISHED" | "SCHEDULED" | "IN_PLAY",
      "matchday": 22,
      "stage": "REGULAR_SEASON",
      "homeTeam": {
        "id": 1,
        "name": "Flamengo",
        "shortName": "Flamengo",
        "tla": "FLA",
        "crest": "https://crests.football-data.org/flamengo.png"
      },
      "awayTeam": {
        "id": 2,
        "name": "Palmeiras",
        "shortName": "Palmeiras",
        "tla": "PAL",
        "crest": "https://crests.football-data.org/palmeiras.png"
      },
      "score": {
        "fullTime": {
          "home": 2,
          "away": 1
        },
        "halfTime": {
          "home": 1,
          "away": 0
        }
      },
      "venue": "Maracanã"
    }
  ]
}
```

**Mapeamento:**
- `id` → `partida_id`
- `utcDate` → `data_realizacao_iso`
- `homeTeam.name` → `time_mandante.nome_popular`
- `awayTeam.name` → `time_visitante.nome_popular`
- `venue` → `estadio.nome_popular`
- `score.fullTime.home` → `placar_mandante`
- `score.fullTime.away` → `placar_visitante`
- `status` → converter (FINISHED=finalizado, SCHEDULED=agendado, IN_PLAY=ao-vivo)
- `homeTeam.crest` → `time_mandante.escudo`
- `awayTeam.crest` → `time_visitante.escudo`

**Prós:**
- 10 requisições/minuto no plano gratuito
- Boa documentação
- Dados confiáveis

**Contras:**
- Cobertura do Brasileirão pode ser limitada (verificar disponibilidade)
- Menos detalhes que API-Football

---

### 3. **TheSportsDB (Gratuita)**
**URL:** https://www.thesportsdb.com/

**Endpoint:**
```
GET https://www.thesportsdb.com/api/v1/json/{API_KEY}/eventsround.php
Params: id=4351&r={rodada}&s=2024
```

**Formato de Resposta:**
```json
{
  "events": [
    {
      "idEvent": "123456",
      "strEvent": "Flamengo vs Palmeiras",
      "dateEvent": "2024-11-30",
      "strTime": "19:00:00",
      "strHomeTeam": "Flamengo",
      "strAwayTeam": "Palmeiras",
      "intHomeScore": "2",
      "intAwayScore": "1",
      "strStatus": "Match Finished",
      "strVenue": "Maracanã",
      "strHomeTeamBadge": "https://www.thesportsdb.com/images/media/team/badge/flamengo.png",
      "strAwayTeamBadge": "https://www.thesportsdb.com/images/media/team/badge/palmeiras.png"
    }
  ]
}
```

**Mapeamento:**
- `idEvent` → `partida_id`
- `dateEvent + strTime` → `data_realizacao_iso` (converter para ISO)
- `strHomeTeam` → `time_mandante.nome_popular`
- `strAwayTeam` → `time_visitante.nome_popular`
- `strVenue` → `estadio.nome_popular`
- `intHomeScore` → `placar_mandante`
- `intAwayScore` → `placar_visitante`
- `strStatus` → converter status
- `strHomeTeamBadge` → `time_mandante.escudo`
- `strAwayTeamBadge` → `time_visitante.escudo`

**Prós:**
- Completamente gratuita
- Boa cobertura de ligas

**Contras:**
- Atualizações podem ser mais lentas
- API menos robusta

---

### 4. **Scraping de Fontes Brasileiras (Implementação Própria)**

#### Opção A: GloboEsporte API
```
GET https://api.api-one.globo.com/fixtures?league=brasileiro-serie-a&round={rodada}
```

#### Opção B: CBF (Confederação Brasileira de Futebol)
```
GET https://api.cbf.com.br/competition-matches/1/{rodada}
```

**Prós:**
- Fonte oficial brasileira
- Dados sempre atualizados
- Sem limites de requisições

**Contras:**
- Não documentado oficialmente (pode mudar sem aviso)
- Requer engenharia reversa
- Possível bloqueio por rate limiting

---

## Recomendação de Implementação

### Estratégia de Fallback (Redundância)
Implementar um sistema com múltiplas fontes:

```javascript
async function buscarResultadosComFallback(rodada) {
  const fontes = [
    () => buscarApiFootball(rodada),      // Fonte principal
    () => buscarFootballData(rodada),     // Fallback 1
    () => buscarGloboApi(rodada),         // Fallback 2
    () => buscarTheSportsDB(rodada)       // Fallback 3
  ];

  for (const fonte of fontes) {
    try {
      const resultados = await fonte();
      if (resultados && resultados.length > 0) {
        return normalizarDados(resultados);
      }
    } catch (erro) {
      console.error('Fonte falhou, tentando próxima...', erro.message);
    }
  }

  throw new Error('Todas as fontes de dados falharam');
}

function normalizarDados(dados) {
  // Converte qualquer formato para o formato interno do sistema
  return dados.map(jogo => ({
    partida_id: jogo.id || jogo.idEvent || jogo.fixture?.id,
    data_realizacao_iso: jogo.date || jogo.utcDate || jogo.fixture?.date,
    time_mandante: {
      nome_popular: jogo.homeTeam?.name || jogo.teams?.home?.name,
      escudo: jogo.homeTeam?.crest || jogo.teams?.home?.logo
    },
    time_visitante: {
      nome_popular: jogo.awayTeam?.name || jogo.teams?.away?.name,
      escudo: jogo.awayTeam?.crest || jogo.teams?.away?.logo
    },
    placar_mandante: jogo.score?.fullTime?.home || jogo.goals?.home,
    placar_visitante: jogo.score?.fullTime?.away || jogo.goals?.away,
    status: normalizarStatus(jogo.status),
    estadio: {
      nome_popular: jogo.venue || jogo.fixture?.venue?.name
    }
  }));
}
```

## Próximos Passos

1. **Testar API-Football (RapidAPI)** - Mais completa e confiável
2. **Implementar camada de normalização** - Adapter pattern para múltiplas fontes
3. **Adicionar cache inteligente** - Reduzir requisições repetidas
4. **Monitoramento de falhas** - Log quando uma fonte falha e fallback é usado
5. **Configuração via .env** - Permitir escolher fonte primária
