const pool = require('../database/conexao');

async function cadastrarPremiacoes() {
  try {
    console.log('Iniciando cadastro de premiações...\n');

    // Buscar um usuário válido para usar como placeholder
    const [usuarios] = await pool.query('SELECT id FROM usuarios LIMIT 1');
    if (usuarios.length === 0) {
      console.error('❌ Nenhum usuário encontrado no sistema!');
      process.exit(1);
    }
    const placeholderUserId = usuarios[0].id;
    console.log(`📌 Usando usuario_id ${placeholderUserId} como placeholder\n`);

    const campeonatoId = 69; // BolaoPremier
    const grupoId = 2; // Grupo BolaoPremier

    // Buscar todas as rodadas cadastradas no sistema
    const [rodadas] = await pool.query('SELECT id, numero FROM rodadas ORDER BY numero');
    if (rodadas.length === 0) {
      console.error('❌ Nenhuma rodada cadastrada no sistema!');
      process.exit(1);
    }
    console.log(`📋 ${rodadas.length} rodadas encontradas no sistema\n`);

    // Definição das premiações
    // Tipos permitidos: 'campeao','vice','turno','lanterna','outro'
    const premiacoes = [
      { posicao: 1, tipo: 'campeao', valor: 120.00, descricao: 'Campeão (1º lugar)' },
      { posicao: 2, tipo: 'vice', valor: 10.00, descricao: 'Vice (2º lugar)' },
      { posicao: 'ultimo', tipo: 'lanterna', valor: -20.00, descricao: 'Lanterna (último lugar)' },
      { posicao: 'demais', tipo: 'outro', valor: -10.00, descricao: 'Demais participantes' }
    ];

    // Limpar premiações antigas do grupo para evitar duplicação
    const [deleted] = await pool.query(
      'DELETE FROM premios WHERE campeonato_id = ? AND grupo_id = ?',
      [campeonatoId, grupoId]
    );
    console.log(`✅ ${deleted.affectedRows} premiações antigas removidas\n`);

    let totalInseridos = 0;

    // Inserir premiações para cada rodada
    // NOTA: usuario_id será atualizado quando o ranking da rodada for calculado
    // Por ora, usamos um usuário válido como placeholder
    for (const rodada of rodadas) {
      for (const premio of premiacoes) {
        await pool.query(`
          INSERT INTO premios (
            usuario_id, 
            rodada, 
            campeonato_id, 
            grupo_id, 
            tipo_premio, 
            valor, 
            status_pagamento
          ) VALUES (?, ?, ?, ?, ?, ?, 'pendente')
        `, [placeholderUserId, rodada.id, campeonatoId, grupoId, premio.tipo, premio.valor]);
        
        totalInseridos++;
      }

      if (rodada.numero % 5 === 0) {
        console.log(`Rodadas 1-${rodada.numero}: ${rodada.numero * premiacoes.length} premiações cadastradas`);
      }
    }

    console.log(`\n✅ CONCLUÍDO: ${totalInseridos} premiações cadastradas com sucesso!`);
    console.log('\nDetalhamento por rodada:');
    premiacoes.forEach(p => {
      const sinal = p.valor >= 0 ? 'recebe' : 'paga';
      const valorAbs = Math.abs(p.valor).toFixed(2);
      console.log(`  - ${p.descricao}: ${sinal} R$ ${valorAbs}`);
    });

    // Verificar cadastro da rodada 16
    console.log('\n📊 Verificação rodada 16:');
    const [rodada16] = await pool.query(
      'SELECT tipo_premio, valor FROM premios WHERE rodada = 16 AND campeonato_id = ? AND grupo_id = ?',
      [campeonatoId, grupoId]
    );
    rodada16.forEach(p => {
      console.log(`  - ${p.tipo_premio}: R$ ${Number(p.valor).toFixed(2)}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao cadastrar premiações:', error);
    process.exit(1);
  }
}

cadastrarPremiacoes();
