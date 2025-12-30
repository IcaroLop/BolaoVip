const pool = require('../database/conexao');

async function limparRodada18() {
  const conexao = await pool.getConnection();
  try {
    await conexao.beginTransaction();

    // Buscar palpites da rodada 18 para pegar os códigos de envio
    const [palpites] = await conexao.query(
      'SELECT DISTINCT codigo_envio FROM palpites WHERE rodada = 18'
    );

    console.log(`📋 Encontrados ${palpites.length} conjuntos de palpites na rodada 18`);

    // Deletar cobranças relacionadas
    if (palpites.length > 0) {
      const codigosEnvio = palpites.map(p => p.codigo_envio);
      const placeholders = codigosEnvio.map(() => '?').join(',');
      
      const [resultCobrancas] = await conexao.query(
        `DELETE FROM pix_cobrancas WHERE codigo_envio IN (${placeholders})`,
        codigosEnvio
      );
      console.log(`🗑️ ${resultCobrancas.affectedRows} cobranças PIX deletadas`);

      // Deletar movimentações de saldo relacionadas
      const [resultExtrato] = await conexao.query(
        `DELETE FROM extrato_movimentacao WHERE referencia_id IN (${placeholders}) AND referencia_tipo = 'palpite'`,
        codigosEnvio
      );
      console.log(`🗑️ ${resultExtrato.affectedRows} movimentações de saldo deletadas`);
    }

    // Deletar palpites da rodada 18
    const [resultPalpites] = await conexao.query(
      'DELETE FROM palpites WHERE rodada = 18'
    );
    console.log(`🗑️ ${resultPalpites.affectedRows} palpites deletados`);

    // Deletar notificações relacionadas à rodada 18
    const [resultNotif] = await conexao.query(
      `DELETE FROM notificacoes_usuarios 
       WHERE tipo IN ('palpite_enviado', 'pagamento_pendente') 
       AND JSON_EXTRACT(dados_json, '$.rodada') = 18`
    );
    console.log(`🗑️ ${resultNotif.affectedRows} notificações deletadas`);

    await conexao.commit();
    console.log('✅ Rodada 18 limpa com sucesso!');

  } catch (err) {
    await conexao.rollback();
    console.error('❌ Erro ao limpar rodada 18:', err);
  } finally {
    conexao.release();
    process.exit();
  }
}

limparRodada18();
