require('dotenv').config();
const pool = require('../database/conexao');
const { DateTime } = require('luxon');

async function parseData(raw) {
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

async function run() {
  try {
    const [rows] = await pool.query("SELECT id, partida_id, data FROM jogos WHERE data IS NOT NULL");
    const parsed = [];
    for (const r of rows) {
      const dt = await parseData(r.data);
      parsed.push({ id: r.id, partida_id: r.partida_id, raw: r.data, parsed: dt ? dt.toISO() : null });
    }

    parsed.sort((a,b)=>{
      if(!a.parsed) return 1;
      if(!b.parsed) return -1;
      return new Date(a.parsed) - new Date(b.parsed);
    });

    console.log('Próximos jogos (10):');
    console.log(parsed.slice(0,10));

    const agoraManaus = DateTime.now().setZone('America/Manaus');
    const futuros = parsed.filter(p=>p.parsed && DateTime.fromISO(p.parsed) > agoraManaus);
    console.log('\nPróximo jogo futuro:');
    console.log(futuros[0] || 'Nenhum encontrado');

  } catch (err) {
    console.error('Erro:', err.message || err);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

run();