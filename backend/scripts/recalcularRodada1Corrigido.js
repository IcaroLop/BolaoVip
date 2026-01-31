#!/usr/bin/env node
/**
 * Script para recalcular ranking da rodada 1 com lógica correta
 */

const pool = require('../database/conexao');
const { calcularPontuacao } = require('../services/pontuacaoService');

async function main() {
  try {
    console.log('\n===== RECALCULANDO RANKING RODADA 1 COM LÓGICA CORRETA =====\n');

    // 1. Buscar todos os palpites da rodada 1, campeonato 10, grupo 3
    // Apenas de usuários que ainda estão no grupo
    const [palpites] = await pool.query(`
      SELECT p.id_usuario, p.id_jogo, p.gols_casa, p.gols_fora,
             j.placar_mandante, j.placar_visitante
      FROM palpites p
      JOIN jogos j ON p.id_jogo = j.id
      JOIN grupo_usuario_perfil gup ON p.id_usuario = gup.usuario_id
      WHERE p.rodada = 1 AND p.campeonato_id = 10 AND p.grupo_id = 3
      AND gup.grupo_id = 3 AND gup.perfil_id = 2
      ORDER BY p.id_usuario, p.id_jogo
    `);

    console.log(`📊 Total de palpites encontrados: ${palpites.length}\n`);

    // 2. Calcular pontuação por usuário
    const pontuacaoPorUsuario = {};

    palpites.forEach(p => {
      if (!pontuacaoPorUsuario[p.id_usuario]) {
        pontuacaoPorUsuario[p.id_usuario] = { usuario_id: p.id_usuario, pontos: 0, palpites: [] };
      }

      const pontos = calcularPontuacao(
        { placar_casa: p.gols_casa, placar_fora: p.gols_fora },
        { placar_mandante: p.placar_mandante, placar_visitante: p.placar_visitante }
      );

      pontuacaoPorUsuario[p.id_usuario].pontos += pontos;
      pontuacaoPorUsuario[p.id_usuario].palpites.push({
        jogo_id: p.id_jogo,
        palpite: `${p.gols_casa}x${p.gols_fora}`,
        placar: `${p.placar_mandante}x${p.placar_visitante}`,
        pontos: pontos
      });
    });

    // 3. Converter para array e ordenar
    const ranking = Object.values(pontuacaoPorUsuario)
      .sort((a, b) => b.pontos - a.pontos);

    // 4. Exibir ranking
    console.log('🏆 RANKING RECALCULADO:\n');
    ranking.forEach((r, idx) => {
      console.log(`${idx + 1}. Usuário ID ${r.usuario_id}: ${r.pontos.toFixed(2)} pts (${r.palpites.length} palpites)`);
    });

    // 5. Deletar ranking anterior
    console.log('\n🗑️  Deletando ranking anterior...');
    const [deleteResult] = await pool.query(
      'DELETE FROM ranking_rodada WHERE rodada = 2 AND campeonato_id = 10 AND grupo_id = 3'
    );
    console.log(`✅ ${deleteResult.affectedRows} registros deletados\n`);

    // 6. Inserir novo ranking
    console.log('📝 Inserindo novo ranking...');
    let posicao = 1;
    for (const r of ranking) {
      await pool.query(`
        INSERT INTO ranking_rodada (id_usuario, rodada, campeonato_id, grupo_id, pontos_totais, posicao)
        VALUES (?, 2, 10, 3, ?, ?)
      `, [r.usuario_id, r.pontos.toFixed(2), posicao]);
      posicao++;
    }
    console.log(`✅ Ranking inserido com ${ranking.length} usuários\n`);

    // 7. Verificar novo ranking
    const [novoRanking] = await pool.query(`
      SELECT r.id_usuario, u.nome, r.pontos_totais, r.posicao
      FROM ranking_rodada r
      JOIN usuarios u ON u.id = r.id_usuario
      WHERE r.rodada = 2 AND r.campeonato_id = 10 AND r.grupo_id = 3
      ORDER BY r.posicao
    `);

    console.log('📊 RANKING FINAL VERIFICADO:\n');
    console.table(novoRanking);

    console.log('\n✅ Recálculo concluído com sucesso!');
  } catch (err) {
    console.error('❌ Erro ao recalcular:', err.message);
  } finally {
    pool.end();
  }
}

main();
