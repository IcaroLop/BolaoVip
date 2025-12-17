require('dotenv').config();

// Inicializa os cron jobs automáticos
const { iniciarTodosJobs } = require('./jobs/cronJobs');

const express = require('express');
const path = require('path');
const cors = require('cors');
const { safeLogSistema: logSistema } = require('./services/logService');

const authRoutes = require('./routes/authRoutes');
const palpiteRoutes = require('./routes/palpiteRoutes');
const rankingRoutes = require('./routes/rankingRoutes');
const rodadasRouter = require('./routes/rodadas');
const jogosRoutes = require('./routes/jogosRoutes');
const escudosRoutes = require('./routes/escudosRoutes');
const resultadoRoutes = require('./routes/resultadoRoutes');
const agendamentoRoutes = require('./routes/agendamentoRoutes');
const pagamentoRoutes = require('./routes/pixRoutes');
const pixRoutes = require('./routes/pixRoutes');
const configuracoesRoutes = require('./routes/configuracoesRoutes');
const classificacaoRoutes = require('./routes/classificacaoRoutes');
const adminRoutes = require('./routes/adminRoutes');
const premiacoesRoutes = require('./routes/premiacoesRoutes');
const noticiasRoutes = require('./routes/noticiasRoutes');
const jogosAoVivoRoutes = require('./routes/jogosAoVivoRoutes');
const gruposRoutes = require('./routes/gruposRoutes');
const campeonatosRoutes = require('./routes/campeonatosRoutes');
const usuariosRoutes = require('./routes/usuariosRoutes');
const partidasCampeonatoRoutes = require('./routes/partidasCampeonatoRoutes');
const configRoutes = require('./routes/configRoutes');
const saldoRoutes = require('./routes/saldoRoutes');

const app = express();
// Registrar ambiente de TokenConfig (se disponível)
try {
  const ambiente = process.env.NODE_ENV || 'development';
  console.log(`[TokenConfig] Inicializado com ambiente: ${ambiente}`);
  try { logSistema({ origem: 'server', nivel: 'info', descricao: `[TokenConfig] Inicializado com ambiente: ${ambiente}` }); } catch {}
} catch {}

app.use(cors());
app.use(express.json());
app.use('/escudos', express.static(path.join(__dirname, 'public', 'escudos')));

// Rotas da aplicação
app.use('/auth', authRoutes);
app.use('/palpites', palpiteRoutes);
app.use('/ranking', rankingRoutes);
app.use('/api', rodadasRouter);
app.use('/jogos', jogosRoutes);
app.use('/escudos', escudosRoutes);
app.use('/resultados', resultadoRoutes);
app.use('/', agendamentoRoutes);
app.use(agendamentoRoutes);
app.use('/pagamentos', pagamentoRoutes);
app.use('/pix', pixRoutes);
app.use('/configuracoes', configuracoesRoutes);
app.use('/grupos', gruposRoutes);
app.use('/campeonatos', campeonatosRoutes);
app.use('/usuarios', usuariosRoutes);
app.use('/saldo', saldoRoutes);
app.use('/api/partidas', partidasCampeonatoRoutes);
app.use('/api/config', configRoutes);
app.use('/classificacao', classificacaoRoutes);
app.use(adminRoutes);
app.use(premiacoesRoutes);
app.use('/', noticiasRoutes); // ou use um prefixo, como '/api'
app.use(jogosAoVivoRoutes);

// Rotas de debug para validar se o servidor responde
app.get('/debug/test', (req, res) => {
  console.log('[DEBUG/TEST] route hit');
  res.json({ ok: true, message: 'Debug route working' });
});

app.get('/debug/jogos-ao-vivo-test', async (req, res) => {
  console.log('[DEBUG/JOGOS-TEST] route hit');
  try {
    const { buscarJogosAoVivo } = require('./services/jogosAoVivoScraper');
    const jogos = await buscarJogosAoVivo();
    console.log('[DEBUG/JOGOS-TEST] fetched', jogos.length, 'jogos');
    res.json(jogos);
  } catch (err) {
    console.error('[DEBUG/JOGOS-TEST] error:', err.message);
    res.status(500).json({ erro: err.message });
  }
});

// Ativar scheduler quando finalizar o debug
// agendarConsultasResultadosPorRodada();

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  try { logSistema({ origem: 'server', nivel: 'info', descricao: `Servidor rodando na porta ${PORT}` }); } catch {}
  
  // Inicializa os cron jobs após o servidor estar rodando
  iniciarTodosJobs();
  
  // Replanejar agenda automaticamente ao subir (garante que saldo atual seja usado)
  const agendadorService = require('./services/agendadorService');
  setTimeout(async () => {
    try {
      console.log('[STARTUP] Replanejando agenda com base no saldo atual...');
      try { logSistema({ origem: 'startup', nivel: 'info', descricao: '[STARTUP] Replanejando agenda com base no saldo atual...' }); } catch {}
      const resultado = await agendadorService.planejarPersistirAgenda();
      console.log(`[STARTUP] Agenda replanejada: ${resultado.planejados} requisições agendadas.`);
      try { logSistema({ origem: 'startup', nivel: 'info', descricao: `Agenda replanejada: ${resultado.planejados} requisições agendadas` }); } catch {}
    } catch (err) {
      console.error('[STARTUP] Erro ao replanejar agenda:', err.message);
      try { logSistema({ origem: 'startup', nivel: 'error', descricao: `Falha ao replanejar agenda: ${err.message}` }); } catch {}
    }
  }, 2000); // 2s de delay para garantir que jobs/DB estejam prontos
});
