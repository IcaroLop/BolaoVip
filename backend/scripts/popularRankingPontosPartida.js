// Script de backfill para ranking_pontos_partida
// Uso: node backend/scripts/popularRankingPontosPartida.js [--rodada=N] [--grupoId=G] [--campeonatoId=C]

const pool = require('../database/conexao');
const { calcularPontuacao } = require('../services/pontuacaoService');

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  args.forEach(arg => {
    const [k, v] = arg.replace(/^--/, '').split('=');
    if (k === 'rodada') out.rodada = Number(v);
    if (k === 'grupoId') out.grupoId = Number(v);
    if (k === 'campeonatoId') out.campeonatoId = Number(v);
  });
  return out;
}

async function main() {
  const { rodada, grupoId, campeonatoId } = parseArgs();

  const filtros = [
    'j.placar_mandante IS NOT NULL',
    'j.placar_visitante IS NOT NULL'
  ];
  const params = [];

  if (rodada) {
    filtros.push('p.rodada = ?');
    params.push(rodada);
  }
  if (grupoId) {
    filtros.push('p.grupo_id = ?');
    params.push(grupoId);
  }
  if (campeonatoId) {
    filtros.push('p.campeonato_id = ?');
    filtros.push('j.campeonato_id = ?');
    params.push(campeonatoId, campeonatoId);
  }

  console.log('🔄 Iniciando backfill ranking_pontos_partida...', { rodada, grupoId, campeonatoId });

  const [rows] = await pool.query(`
    SELECT 
      p.id_usuario AS usuario_id,
      p.id_jogo,
      p.gols_casa AS placar_casa,
      p.gols_fora AS placar_fora,
      p.grupo_id,
      p.campeonato_id,
      p.rodada,
      j.partida_id,
      j.placar_mandante,
      j.placar_visitante
    FROM palpites p
    JOIN jogos j ON j.id = p.id_jogo
    WHERE ${filtros.join(' AND ')}
  `, params);

  console.log(`Encontrados ${rows.length} palpites com jogos finalizados para processar.`);

  let processados = 0;
  let atualizados = 0;
  for (const r of rows) {
    processados++;

    const palpite = { placar_casa: r.placar_casa, placar_fora: r.placar_fora };
    const resultado = { placar_mandante: r.placar_mandante, placar_visitante: r.placar_visitante };
    const pontos = calcularPontuacao(palpite, resultado);

    const acerto_exato = (r.placar_casa === r.placar_mandante) && (r.placar_fora === r.placar_visitante) ? 1 : 0;
    const vencedorPalpite = r.placar_casa > r.placar_fora ? 'mandante' : r.placar_casa < r.placar_fora ? 'visitante' : 'empate';
    const vencedorReal = r.placar_mandante > r.placar_visitante ? 'mandante' : r.placar_mandante < r.placar_visitante ? 'visitante' : 'empate';
    const vencedor_correto = (vencedorPalpite === vencedorReal && vencedorReal !== 'empate') ? 1 : 0;
    const gols_casa_corretos = (r.placar_casa === r.placar_mandante) ? 1 : 0;
    const gols_fora_corretos = (r.placar_fora === r.placar_visitante) ? 1 : 0;

    try {
      const [result] = await pool.query(`
        INSERT INTO ranking_pontos_partida
          (grupo_id, campeonato_id, rodada, partida_id, usuario_id, pontos, acerto_exato, vencedor_correto, gols_casa_corretos, gols_fora_corretos)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          pontos = VALUES(pontos),
          acerto_exato = VALUES(acerto_exato),
          vencedor_correto = VALUES(vencedor_correto),
          gols_casa_corretos = VALUES(gols_casa_corretos),
          gols_fora_corretos = VALUES(gols_fora_corretos),
          updated_at = CURRENT_TIMESTAMP
      `, [
        r.grupo_id,
        r.campeonato_id,
        r.rodada,
        r.partida_id,
        r.usuario_id,
        Number(pontos.toFixed(2)),
        acerto_exato,
        vencedor_correto,
        gols_casa_corretos,
        gols_fora_corretos
      ]);
      if (result.affectedRows > 0) atualizados++;
    } catch (err) {
      console.error('❌ Erro ao persistir registro:', err.message, {
        usuario_id: r.usuario_id,
        partida_id: r.partida_id,
        rodada: r.rodada,
        grupo_id: r.grupo_id,
        campeonato_id: r.campeonato_id
      });
    }
  }

  console.log(`✅ Backfill concluído. Processados: ${processados}, atualizados/UPSERT: ${atualizados}`);
}

main()
  .catch(err => {
    console.error('❌ Erro no backfill:', err.message);
  })
  .finally(() => {
    pool.end();
  });
