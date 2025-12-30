const pool = require('../database/conexao');
const saldoService = require('../services/saldoService');
require('dotenv').config();

/**
 * Script para listar e confirmar depósitos pendentes em desenvolvimento
 */
async function executar() {
  try {
    console.log('📊 Buscando depósitos pendentes...\n');

    // Buscar depósitos pendentes
    const [depositos] = await pool.query(`
      SELECT 
        em.id,
        em.usuario_id,
        u.nome AS nome_usuario,
        em.valor,
        em.descricao,
        em.status,
        em.criado_em
      FROM extrato_movimentacao em
      JOIN usuarios u ON em.usuario_id = u.id
      WHERE em.tipo = 'deposito' AND em.status = 'pendente'
      ORDER BY em.criado_em DESC
    `);

    if (depositos.length === 0) {
      console.log('❌ Nenhum depósito pendente encontrado.\n');
      process.exit(0);
    }

    console.log(`✅ ${depositos.length} depósito(s) pendente(s) encontrado(s):\n`);
    depositos.forEach((dep, idx) => {
      const valor = parseFloat(dep.valor);
      console.log(`${idx + 1}. ID: ${dep.id} | Usuário: ${dep.nome_usuario} (${dep.usuario_id}) | R$ ${valor.toFixed(2)} | ${new Date(dep.criado_em).toLocaleString('pt-BR')}`);
    });

    console.log('\n💡 Para confirmar um depósito em desenvolvimento:');
    console.log('   Exemplo: node scripts/confirmarDepositoPendente.js 1\n');
    console.log('   Isso confirmará o depósito de ID 1 e creditará o saldo.\n');

    // Verificar se foi passado um ID via argumentos
    const idSolicitado = process.argv[2];
    if (!idSolicitado) {
      console.log('⚠️  Passe o ID do depósito a confirmar como argumento.\n');
      process.exit(0);
    }

    const movimentacaoId = parseInt(idSolicitado, 10);
    const deposito = depositos.find(d => d.id === movimentacaoId);

    if (!deposito) {
      console.log(`❌ Depósito com ID ${movimentacaoId} não encontrado.\n`);
      process.exit(1);
    }

    console.log(`\n🔄 Confirmando depósito de R$ ${parseFloat(deposito.valor).toFixed(2)} para ${deposito.nome_usuario}...`);

    // Confirmar depósito
    const resultado = await saldoService.confirmarDeposito(deposito.usuario_id, movimentacaoId);

    console.log(`✅ Depósito confirmado com sucesso!`);
    console.log(`   Saldo anterior: R$ 0.00`);
    console.log(`   Saldo novo: R$ ${parseFloat(resultado.saldoNovo).toFixed(2)}\n`);

    // Verificar saldo final
    const saldo = await saldoService.obterSaldoUsuario(deposito.usuario_id);
    console.log(`📈 Saldo atualizado do usuário ${deposito.nome_usuario}:`);
    console.log(`   Saldo atual: R$ ${parseFloat(saldo.saldo_atual).toFixed(2)}`);
    console.log(`   Saldo bloqueado: R$ ${parseFloat(saldo.saldo_bloqueado).toFixed(2)}`);
    console.log(`   Saldo disponível: R$ ${parseFloat(saldo.saldo_disponivel).toFixed(2)}\n`);

    process.exit(0);
  } catch (err) {
    console.error('❌ Erro ao confirmar depósito:', err.message);
    console.error(err);
    process.exit(1);
  }
}

executar();
