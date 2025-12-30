const pool = require('../database/conexao');
const { v4: uuidv4 } = require('uuid');

async function gerarCobrancasDaRodada(rodada, campeonatoId = null, grupoId = null) {
  try {
    const rodadaNum = Number(rodada);
    const campeonatoFiltro = campeonatoId ? Number(campeonatoId) : 10;
    const grupoIdNum = grupoId ? Number(grupoId) : null;

    const filtros = ['rodada = ?', 'valor < 0', "status_pagamento = 'pendente'"];
    const params = [rodadaNum];

    filtros.push('campeonato_id = ?');
    params.push(campeonatoFiltro);

    if (grupoIdNum) {
      filtros.push('grupo_id = ?');
      params.push(grupoIdNum);
    }

    const [negativos] = await pool.query(
      `SELECT usuario_id, ABS(valor) AS valor_cobranca FROM premios WHERE ${filtros.join(' AND ')}`,
      params
    );

    if (negativos.length === 0) {
      console.log('Nenhum prêmio negativo pendente para gerar cobrança.');
      process.exit(0);
    }

    for (const n of negativos) {
      const codigo_envio = uuidv4().replace(/-/g, '').substring(0, 26);
      const insertData = {
        id_usuario: n.usuario_id,
        codigo_envio,
        txid: codigo_envio,
        status: 'ATIVA',
        status_pagamento: 'PENDENTE',
        valor_original: Number(n.valor_cobranca),
        chave_pix: process.env.EFI_PIX_KEY || '',
        solicitacao_pagador: `Cobrança rodada ${rodadaNum}`,
        loc_id: null,
        loc_location: null,
        loc_tipo: null,
        pix_copiaecola: null,
        calendario_criacao: new Date(),
        calendario_expiracao: 259200,
        payload_raw: JSON.stringify({ origem: 'premios', rodada: rodadaNum, campeonato_id: campeonatoFiltro, grupo_id: grupoIdNum }),
        webhook_recebido: false,
        webhook_payload: null
      };

      await pool.query('INSERT INTO pix_cobrancas SET ?', [insertData]);
    }

    console.log(`Cobranças PIX criadas: ${negativos.length}`);
    process.exit(0);
  } catch (err) {
    console.error('Erro ao gerar cobranças da rodada:', err.message);
    process.exit(1);
  }
}

const [,, rodadaArg, campeonatoArg, grupoArg] = process.argv;
if (!rodadaArg) {
  console.log('Uso: node scripts/gerarCobrancasDaRodada.js <rodada> [campeonatoId] [grupoId]');
  process.exit(1);
}

gerarCobrancasDaRodada(rodadaArg, campeonatoArg, grupoArg);
