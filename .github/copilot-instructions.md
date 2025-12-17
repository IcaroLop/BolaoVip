# Bolão VIP - AI Coding Agent Instructions

## Project Overview
Brazilian soccer pool betting platform with React frontend and Node.js/Express backend. Integrates with api-futebol.com.br API for match data/results, web scrapers for live scores (GE/Globo), and Efí Pay (formerly Gerencianet) for PIX payments.

## Architecture

### Backend (`backend/`)
- **Server**: Express on port 3001 (`server.js`)
- **Database**: MySQL 2 connection pool (`database/conexao.js`)
  - Database name: `bolaovip`
  - Uses prepared statements for all queries
- **Authentication**: JWT tokens (12h expiry), bcrypt password hashing
  - Middleware: `middleware/authMiddleware.js` extracts `req.usuario` from Bearer token
  - Secret: `process.env.JWT_SECRET`

### Frontend (`frontend/bolao-vip/`)
- **Stack**: React 19 + React Router + Tailwind CSS
- **Dev Server**: Port 3000 (`npm start`)
- **API Base URL**: Hardcoded to `http://192.168.56.127:3001` (see `CadastroPage.js` pattern)
- **Layout**: Shared `Layout.js` wraps all pages with `Header` and `Footer`

## Critical Data Flows

### 1. Match Prediction Scoring System (`services/pontuacaoService.js`)
**Exact logic for point calculation:**
- **Exact score**: 4.0 pts (≤3 goals), 5.5 pts (4 goals), 6.5 pts (5 goals), 7.5 pts (6 goals), 8.5+ pts (>6 goals)
- **Draw prediction (any score)**: 1.5 pts
- **Correct winner only**: 1.5 pts
- **One correct goal count (casa OR fora)**: 0.5 pts
- **All wrong**: 0.0 pts

### 2. Automated Match Result Updates
**Key workflow (scheduled via `node-cron`):**
1. `jobs/agendaResultadosJob.js` - Queries API for "agendada" rounds with pending results (`placar_mandante IS NULL`)
2. `services/scheduler.js` - Orchestrates:
   - `buscarRodadaVigente()` - Finds current active round
   - `atualizarJogosDaRodada(rodada)` - Syncs match details from api-futebol
   - `consultarResultadosDaRodada(rodada)` - Fetches final scores after matches end
   - `atualizarClassificacaoAutomatico()` - Updates league standings table
3. `services/consultaResultadosService.js` - Calculates points for all user predictions when results arrive

**Timezone handling:** All dates converted from São Paulo to Manaus (`America/Manaus`) using Luxon

### 3. External API Integration
**api-futebol.com.br patterns:**
- Base URL: `https://api.api-futebol.com.br/v1`
- Auth: `Authorization: Bearer ${process.env.API_FUTEBOL_TOKEN}`
- Championship ID: `10` (Brasileirão Série A)
- Endpoints:
  - `/campeonatos/10/rodadas` - List all rounds
  - `/campeonatos/10/rodadas/{N}` - Round N match details
  - `/campeonatos/10/tabela` - League standings

**Scrapers (Puppeteer/Cheerio):**
- `services/noticiasScraper.js` - GE.com news feed (`.feed-post` class)
- `services/jogosAoVivoScraper.js` - Live scores from `api.api-one.globo.com/fixtures`

### 4. PIX Payment Integration
**Efí Pay (GN SDK):**
- Certificate-based auth: `EFI_PIX_CERT_PATH`, `EFI_PIX_KEY_PATH`
- Sandbox toggle: `EFI_PIX_SANDBOX=true`
- Txid pattern: UUID stripped of hyphens, truncated to 26 chars (see `palpiteController.js` `codigo_envio`)
- Key: `process.env.EFI_PIX_KEY`

## Development Workflows

### Starting the Application
```powershell
# Backend (in backend/)
node server.js  # No npm script defined, run directly

# Frontend (in frontend/bolao-vip/)
npm start  # Starts on localhost:3000
```

### Database Operations
- **Connection hardcoded** in `database/conexao.js` (credentials in `.env` but not loaded there)
- **Transactions**: Get connection from pool, use `beginTransaction()`/`commit()`/`rollback()`, always `release()` in `finally`
- **Example pattern** from `palpiteController.enviarPalpites()`:
  ```javascript
  const conexao = await pool.getConnection();
  try {
    await conexao.beginTransaction();
    // ... queries on conexao
    await conexao.commit();
  } catch (err) {
    await conexao.rollback();
  } finally {
    conexao.release();
  }
  ```

### Running Utility Scripts
```powershell
# Import matches for rounds 20-38 (updates jogos table)
node backend/scripts/importarJogos.js

# Manually fetch classification table
node backend/scripts/importarClassificacao.js

# Test scheduler behavior
node backend/helpers/testScheduler.js
```

## Project-Specific Conventions

### Naming & Structure
- **Route files**: `{resource}Routes.js` (e.g., `palpiteRoutes.js`)
- **Controllers**: Export named functions (e.g., `exports.enviarPalpites`)
- **Database columns**: Snake_case (`placar_mandante`, `gols_casa`)
- **API responses**: Camel case in JS (`placarCasa`, `timeMandante`)

### Authentication Flow
1. Login POST to `/auth/login` returns `{ token, nome }`
2. Frontend stores token (likely in localStorage, see `LoginPage.js` patterns)
3. Protected routes send `Authorization: Bearer ${token}`
4. Middleware populates `req.usuario = { id, nome }` from JWT payload

### Error Handling
- Controllers use try/catch with `console.error()` logging
- Return JSON: `{ erro: 'message' }` with appropriate HTTP status
- Example: `res.status(400).json({ erro: 'Usuário não autenticado.' })`

### UUID Generation
**Pattern for transaction codes:**
```javascript
const { v4: uuidv4 } = require('uuid');
const codigo_envio = uuidv4().replace(/-/g, '').substring(0, 26);
```

## Key Files to Reference

### Business Logic
- `services/pontuacaoService.js` - Scoring algorithm (NEVER modify without understanding 5-tier system)
- `controllers/rankingController.js` - Ranking calculation and prize distribution
- `controllers/palpiteController.js` - Prediction submission with transaction patterns

### Configuration
- `backend/.env` - All secrets (JWT, DB, EFI_PIX_*, API_FUTEBOL_TOKEN)
- `backend/server.js` - Route registration order (affects middleware execution)
- `frontend/bolao-vip/src/App.js` - React Router paths

### Data Sync
- `services/scheduler.js` - Main orchestration (280+ lines, handles all cron jobs)
- `services/consultaResultadosService.js` - Result fetching and point calculation trigger

## Environment Variables Required
```env
# Database (checked but not used in conexao.js - hardcoded values present)
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=bolaovip

# JWT
JWT_SECRET=

# api-futebol.com.br
API_FUTEBOL_TOKEN=live_***

# Efí Pay PIX
EFI_CLIENT_ID=
EFI_CLIENT_SECRET=
EFI_PIX_KEY=
EFI_PIX_CERT_PATH=./pix/certificados/producao.pem
EFI_PIX_KEY_PATH=./pix/certificados/producao-key.pem
EFI_PIX_SANDBOX=false
```

## Common Pitfalls
1. **Database credentials**: `.env` exists but `conexao.js` has hardcoded values - update BOTH
2. **Frontend API URL**: Search for `192.168.56.127:3001` across all pages if changing backend host
3. **Token expiry**: 12h JWT timeout, no refresh token mechanism implemented
4. **Scheduler lock**: `isConsultandoRodada` flag prevents duplicate cron executions
5. **Match status**: API uses "agendada"/"encerrado", scrapers may differ - always check `status` field mapping
