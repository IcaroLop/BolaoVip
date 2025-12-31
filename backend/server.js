require('dotenv').config();

// Inicializa os cron jobs automáticos
const { iniciarTodosJobs } = require('./jobs/cronJobs');

const express = require('express');
const path = require('path');
const cors = require('cors');
const pool = require('./database/conexao');
const { safeLogSistema: logSistema } = require('./services/logService');

const authRoutes = require('./routes/authRoutes');
const palpiteRoutes = require('./routes/palpiteRoutes');
const palpitesJogoRoutes = require('./routes/palpitesJogoRoutes');
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
const notificacoesRoutes = require('./routes/notificacoesRoutes');
const notificacoesAgendadasRoutes = require('./routes/notificacoesAgendadasRoutes');

const timeRoutes = require('./routes/timeRoutes');
const app = express();
// Registrar ambiente de TokenConfig (se disponível)
try {
  const ambiente = process.env.NODE_ENV || 'development';
  console.log(`[TokenConfig] Inicializado com ambiente: ${ambiente}`);
  try { logSistema({ origem: 'server', nivel: 'info', descricao: `[TokenConfig] Inicializado com ambiente: ${ambiente}` }); } catch {}
} catch {}

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use('/escudos', express.static(path.join(__dirname, 'public', 'escudos')));

// Rotas da aplicação
app.use('/auth', authRoutes);
app.use('/palpites', palpiteRoutes);
app.use('/palpites', palpitesJogoRoutes);
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
app.use('/notificacoes', notificacoesRoutes);
app.use('/notificacoes-agendadas', notificacoesAgendadasRoutes);
app.use('/api/partidas', partidasCampeonatoRoutes);
app.use('/times', timeRoutes);
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

app.get('/debug/sincronizar-noticias', async (req, res) => {
  console.log('[DEBUG/NOTICIAS] Iniciando sincronização manual de notícias...');
  try {
    const { coletarTodasNoticias } = require('./services/noticiasScraper');
    const noticias = await coletarTodasNoticias();
    
    let inseridas = 0;
    let atualizadas = 0;

    for (const n of noticias) {
      const [result] = await pool.query(`
        INSERT INTO noticias (titulo, resumo, imagem, link, fonte, data_publicacao)
        VALUES (?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
          resumo = VALUES(resumo), 
          imagem = VALUES(imagem),
          data_publicacao = VALUES(data_publicacao)
      `, [n.titulo, n.resumo, n.imagem, n.link, n.fonte, n.data_publicacao]);

      if (result.affectedRows === 1) inseridas++;
      else if (result.affectedRows === 2) atualizadas++;
    }

    console.log(`[DEBUG/NOTICIAS] ✅ Sincronização concluída: ${inseridas} inseridas, ${atualizadas} atualizadas`);
    res.json({ 
      sucesso: true, 
      total: noticias.length,
      inseridas,
      atualizadas,
      noticias: noticias.slice(0, 5) // Retorna primeiras 5 para debug
    });
  } catch (err) {
    console.error('[DEBUG/NOTICIAS] ❌ Erro:', err.message);
    res.status(500).json({ erro: err.message });
  }
});

app.get('/debug/noticias-db', async (req, res) => {
  console.log('[DEBUG/NOTICIAS-DB] Verificando noticias no banco...');
  try {
    const [noticias] = await pool.query('SELECT id, titulo, fonte FROM noticias ORDER BY data_publicacao DESC LIMIT 30');
    
    const contagem = {
      total: noticias.length,
      GE: noticias.filter(n => n.fonte === 'GE').length,
      ESPN: noticias.filter(n => n.fonte === 'ESPN').length,
      UOL: noticias.filter(n => n.fonte === 'UOL').length,
      outros: noticias.filter(n => n.fonte !== 'GE' && n.fonte !== 'ESPN' && n.fonte !== 'UOL').length
    };
    
    console.log('[DEBUG/NOTICIAS-DB] Contagem por fonte:', contagem);
    console.log('[DEBUG/NOTICIAS-DB] Primeiras 5 notícias:', noticias.slice(0, 5).map(n => `[${n.fonte}] ${n.titulo}`));
    
    res.json({ 
      contagem,
      amostra: noticias.slice(0, 5)
    });
  } catch (err) {
    console.error('[DEBUG/NOTICIAS-DB] ❌ Erro:', err.message);
    res.status(500).json({ erro: err.message });
  }
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
  
  // Sincronizar notícias ao iniciar o servidor
  setTimeout(async () => {
    try {
      console.log('[STARTUP] Sincronizando notícias de futebol na inicialização...');
      try { logSistema({ origem: 'startup', nivel: 'info', descricao: '[STARTUP] Sincronizando notícias de futebol na inicialização...' }); } catch {}
      
      const { coletarTodasNoticias } = require('./services/noticiasScraper');
      const noticias = await coletarTodasNoticias();
      
      let inseridas = 0;
      let atualizadas = 0;
      let erros = 0;

      for (const n of noticias) {
        try {
          const [result] = await pool.query(`
            INSERT INTO noticias (titulo, resumo, imagem, link, fonte, data_publicacao)
            VALUES (?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
              resumo = VALUES(resumo), 
              imagem = VALUES(imagem),
              data_publicacao = VALUES(data_publicacao)
          `, [n.titulo, n.resumo, n.imagem, n.link, n.fonte, n.data_publicacao]);

          if (result.affectedRows === 1) inseridas++;
          else if (result.affectedRows === 2) atualizadas++;
        } catch (err) {
          erros++;
          console.error(`[STARTUP] Erro ao inserir notícia [${n.fonte}] ${n.titulo.substring(0, 50)}...:`, err.message);
        }
      }

      console.log(`[STARTUP] ✅ Notícias sincronizadas: ${inseridas} inseridas, ${atualizadas} atualizadas, ${erros} erros`);
      try { logSistema({ origem: 'startup', nivel: 'info', descricao: `Notícias sincronizadas: ${inseridas} inseridas, ${atualizadas} atualizadas, ${erros} erros` }); } catch {}
    } catch (err) {
      console.error('[STARTUP] ❌ Erro ao sincronizar notícias:', err.message);
      try { logSistema({ origem: 'startup', nivel: 'error', descricao: `Erro ao sincronizar notícias: ${err.message}` }); } catch {}
    }
  }, 1000); // 1s de delay após o servidor iniciar
  
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
