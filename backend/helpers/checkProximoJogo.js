require('dotenv').config();
const pool = require('../database/conexao');
const { DateTime } = require('luxon');

const partidaId = process.argv[2] || '26862';

function parseData(raw) {
  if (!raw) return null;
  let dt = DateTime.fromSQL(raw, { zone: 'America/Manaus' });
  if (dt.isValid) return dt;
  const maybe = new Date(raw);
  if (!isNaN(maybe.getTime())) return DateTime.fromJSDate(maybe).setZone('America/Manaus');
  const rfc = DateTime.fromRFC2822(raw, { zone: 'America/Manaus' });
  if (rfc.isValid) return rfc;
  const http = DateTime.fromHTTP(raw, { zone: 'America/Manaus' });
  if (http.isValid) return http;
  return null;
}

(async () => {
  try {
    const [[config]] = await pool.query("SELECT rodada_vigente, limite_requisicoes_dia FROM configuracoes ORDER BY id DESC LIMIT 1");
    console.log(`Rodada vigente no banco: ${config.rodada_vigente}`);

    const [rows] = await pool.query('SELECT id, partida_id, rodada, campeonato_id, data, status, placar_mandante, placar_visitante FROM jogos WHERE partida_id = ?', [partidaId]);
    if (rows.length === 0) {
      console.log(`Nenhum jogo encontrado para partida_id=${partidaId}`);
      return process.exit(0);
    }

    const j = rows[0];
    console.log('Jogo encontrado:');
    console.log(j);

    const parsed = parseData(j.data);
    console.log('Data raw:', j.data);
    if (parsed) {
      const servidorAgora = DateTime.now();
      console.log('Parsed (America/Manaus):', parsed.toISO());
      console.log('Parsed (Servidor TZ):', parsed.setZone(servidorAgora.zoneName).toISO());
      console.log('Servidor agora:', servidorAgora.toISO());
      console.log('Está no futuro?', parsed > DateTime.now().setZone('America/Manaus') );
    } else {
      console.log('Não foi possível parsear a data do jogo (formatos conhecidos).');
    }

    console.log('Rodada do jogo:', j.rodada, '| Rodada vigente:', config.rodada_vigente);
    if (j.rodada !== config.rodada_vigente) {
      console.warn('Atenção: a rodada do jogo difere da rodada vigente (agendador não considerará este jogo para a rodada atual).');
    } else {
      console.log('Ok: a rodada do jogo coincide com a rodada vigente.');
    }

  } catch (err) {
    console.error('Erro ao verificar jogo:', err.message || err);
  } finally {
    try { await pool.end(); } catch(e){}
    process.exit(0);
  }
})();