const axios = require('axios');
const pool = require('../database/conexao');
const tokenConfig = require('../config/tokenConfig');

async function criarTabelaSeNaoExistir() {
  const sql = `
    CREATE TABLE IF NOT EXISTS campeonatos (
      campeonato_id INT PRIMARY KEY,
      nome VARCHAR(255),
      nome_popular VARCHAR(255),
      slug VARCHAR(255),
      tipo VARCHAR(50),
      status VARCHAR(50),
      logo VARCHAR(255),
      regiao VARCHAR(50),
      edicao_id INT,
      temporada VARCHAR(10),
      nome_edicao VARCHAR(255),
      nome_edicao_popular VARCHAR(255),
      slug_edicao VARCHAR(255),
      fase_id INT,
      fase_nome VARCHAR(255),
      fase_slug VARCHAR(255),
      fase_tipo VARCHAR(50),
      rodada_atual INT NULL,
      rodada_status VARCHAR(50),
      atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;
  await pool.query(sql);
}

async function buscarCampeonatos() {
  const token = tokenConfig.getToken();
  const res = await axios.get('https://api.api-futebol.com.br/v1/campeonatos', {
    headers: { Authorization: `Bearer ${token}` },
    timeout: 8000,
  });
  return res.data || [];
}

async function salvarCampeonatos(lista) {
  const sql = `
    INSERT INTO campeonatos (
      campeonato_id, nome, nome_popular, slug, tipo, status, logo, regiao, edicao_id, temporada, 
      nome_edicao, nome_edicao_popular, slug_edicao, fase_id, fase_nome, fase_slug, fase_tipo, 
      rodada_atual, rodada_status
    ) VALUES ?
    ON DUPLICATE KEY UPDATE
      nome = VALUES(nome),
      nome_popular = VALUES(nome_popular),
      slug = VALUES(slug),
      tipo = VALUES(tipo),
      status = VALUES(status),
      logo = VALUES(logo),
      regiao = VALUES(regiao),
      edicao_id = VALUES(edicao_id),
      temporada = VALUES(temporada),
      nome_edicao = VALUES(nome_edicao),
      nome_edicao_popular = VALUES(nome_edicao_popular),
      slug_edicao = VALUES(slug_edicao),
      fase_id = VALUES(fase_id),
      fase_nome = VALUES(fase_nome),
      fase_slug = VALUES(fase_slug),
      fase_tipo = VALUES(fase_tipo),
      rodada_atual = VALUES(rodada_atual),
      rodada_status = VALUES(rodada_status);
  `;

  const valores = lista.map((c) => [
    c.campeonato_id,
    c.nome || null,
    c.nome_popular || null,
    c.slug || null,
    c.tipo || null,
    c.status || null,
    c.logo || null,
    c.regiao || null,
    c.edicao_atual?.edicao_id || null,
    c.edicao_atual?.temporada || null,
    c.edicao_atual?.nome || null,
    c.edicao_atual?.nome_popular || null,
    c.edicao_atual?.slug || null,
    c.fase_atual?.fase_id || null,
    c.fase_atual?.nome || null,
    c.fase_atual?.slug || null,
    c.fase_atual?.tipo || null,
    c.rodada_atual?.rodada || null,
    c.rodada_atual?.status || null,
  ]);

  if (!valores.length) return { inseridos: 0 };

  const [resultado] = await pool.query(sql, [valores]);
  return { inseridos: resultado.affectedRows };
}

async function main() {
  try {
    console.log('🔄 Criando tabela se não existir...');
    await criarTabelaSeNaoExistir();

    console.log('⬆️  Buscando campeonatos na API...');
    const campeonatos = await buscarCampeonatos();
    console.log(`✅ Recebidos ${campeonatos.length} campeonatos.`);

    if (!campeonatos.length) {
      console.warn('⚠️  Nenhum campeonato retornado, nada a salvar.');
      return;
    }

    console.log('💾 Salvando na base...');
    const res = await salvarCampeonatos(campeonatos);
    console.log(`✅ Upsert concluído. Registros afetados: ${res.inseridos}`);
  } catch (err) {
    console.error('❌ Erro ao importar campeonatos:', err.message);
  } finally {
    pool.end();
  }
}

main();
