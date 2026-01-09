const express = require('express');
const router = express.Router();
const premiacoesController = require('../controllers/premiacoesController');
const pool = require('../database/conexao');
const saldoService = require('../services/saldoService');
const autenticar = require('../middleware/authMiddleware');

async function obterPerfisUsuario(usuarioId) {
	const [perfis] = await pool.query(
		`SELECT p.nome FROM perfis p
			 JOIN usuario_perfis up ON up.perfil_id = p.id
			WHERE up.usuario_id = ?`,
		[usuarioId]
	);
	return perfis.map((p) => (p.nome || '').toLowerCase());
}

async function isAdminOuFinanceiro(usuarioId) {
	const perfis = await obterPerfisUsuario(usuarioId);
	return perfis.includes('administrador') || perfis.includes('financeiro');
}

router.get('/premiacoes/rodada/:rodada', premiacoesController.getPremiacoesRodada);
router.get('/premiacoes/rodada/:rodada/detalhes', premiacoesController.getPremiacoesComDetalhesRodada);
router.get('/premiacoes/rodada/:rodada/preview', premiacoesController.getPremiacoesPreviaRodada);

/**
 * POST /premiacoes/:premioId/confirmar-pagamento
 * Confirma pagamento parcial ou integral com saldo disponível
 * Body: { tipo: 'parcial' | 'integral' }
 */
router.post('/premiacoes/:premioId/confirmar-pagamento', autenticar, async (req, res) => {
	const { premioId } = req.params;
	const { tipo } = req.body; // 'parcial' ou 'integral'
	const usuarioId = req.usuario.id;

	let conexao;
	try {
		conexao = await pool.getConnection();
		await conexao.beginTransaction();

		const isPrivilegiado = await isAdminOuFinanceiro(usuarioId);

		const [premios] = await conexao.query(
			`SELECT id, usuario_id, ABS(valor) AS valor_total, saldo_parcial, rodada, tipo_premio
			 FROM premios 
			 WHERE id = ? AND status_pagamento = 'pendente'`,
			[premioId]
		);

		if (premios.length === 0) {
			await conexao.rollback();
			return res.status(404).json({ erro: 'Prêmio não encontrado ou já foi processado.' });
		}

		const premio = premios[0];

		if (!isPrivilegiado && premio.usuario_id !== usuarioId) {
			await conexao.rollback();
			return res.status(403).json({ erro: 'Sem permissão para processar este prêmio.' });
		}

		const alvoUsuarioId = premio.usuario_id;
		const saldoInfo = await saldoService.obterSaldoUsuario(alvoUsuarioId);

		if (tipo === 'parcial') {
			if (saldoInfo.saldo_disponivel <= 0) {
				await conexao.rollback();
				return res.status(400).json({ erro: 'Saldo insuficiente para pagamento parcial.' });
			}

			await saldoService.debitarSaldo(
				alvoUsuarioId,
				saldoInfo.saldo_disponivel,
				`Pagamento parcial ${premio.tipo_premio} - Rodada ${premio.rodada}`,
				premio.id,
				'premio'
			);

			const { v4: uuidv4 } = require('uuid');
			const valorRestante = Number(premio.valor_total) - Number(saldoInfo.saldo_disponivel);
			const codigo_envio = uuidv4().replace(/-/g, '').substring(0, 26);

			await conexao.query('INSERT INTO pix_cobrancas SET ?', [{
				id_usuario: alvoUsuarioId,
				codigo_envio,
				txid: codigo_envio,
				status: 'ATIVA',
				status_pagamento: 'PENDENTE',
				valor_original: valorRestante,
				chave_pix: process.env.EFI_PIX_KEY || '',
				solicitacao_pagador: `Cobrança rodada ${premio.rodada} (saldo parcial usado)`,
				calendario_criacao: new Date(),
				calendario_expiracao: 259200,
				payload_raw: JSON.stringify({ 
					origem: 'premios_parcial', 
					rodada: premio.rodada, 
					premio_id: premio.id,
					valor_saldo_usado: saldoInfo.saldo_disponivel
				})
			}]);

			await conexao.query(
				"UPDATE premios SET saldo_parcial = NULL WHERE id = ?",
				[premio.id]
			);

			await conexao.commit();
			return res.json({
				sucesso: true,
				mensagem: `Saldo de R$ ${saldoInfo.saldo_disponivel.toFixed(2)} utilizado. Cobrança PIX criada para R$ ${valorRestante.toFixed(2)}.`,
				valorSaldoUsado: saldoInfo.saldo_disponivel,
				valorRestantePix: valorRestante
			});

		} else if (tipo === 'integral') {
			const valorTotal = Number(premio.valor_total);

			if (saldoInfo.saldo_disponivel < valorTotal) {
				await conexao.rollback();
				return res.status(400).json({ 
					erro: 'Saldo insuficiente para pagamento integral.',
					saldoDisponivel: saldoInfo.saldo_disponivel,
					valorNecessario: valorTotal
				});
			}

			await saldoService.debitarSaldo(
				alvoUsuarioId,
				valorTotal,
				`Débito ${premio.tipo_premio} - Rodada ${premio.rodada}`,
				premio.id,
				'premio'
			);

			await conexao.query(
				"UPDATE premios SET status_pagamento = 'pago', data_pagamento = NOW() WHERE id = ?",
				[premio.id]
			);

			await conexao.commit();
			return res.json({
				sucesso: true,
				mensagem: `Pagamento integral de R$ ${valorTotal.toFixed(2)} realizado com saldo.`,
				valorDebitado: valorTotal,
				novoSaldo: saldoInfo.saldo_disponivel - valorTotal
			});

		} else {
			await conexao.rollback();
			return res.status(400).json({ erro: 'Tipo de pagamento inválido. Use "parcial" ou "integral".' });
		}

	} catch (err) {
		if (conexao) await conexao.rollback();
		console.error('Erro ao confirmar pagamento:', err);
		res.status(500).json({ erro: 'Erro ao processar pagamento.', detalhes: err.message });
	} finally {
		if (conexao) conexao.release();
	}
});

/**
 * GET /premiacoes/pendentes-confirmacao
 * Lista prêmios aguardando confirmação de pagamento parcial
 */
router.get('/premiacoes/pendentes-confirmacao', autenticar, async (req, res) => {
	const usuarioId = req.usuario.id;

	try {
		const isPrivilegiado = await isAdminOuFinanceiro(usuarioId);
		const filtros = ["p.status_pagamento = 'pendente'", 'IFNULL(p.saldo_parcial,0) > 0'];
		const params = [];

		if (!isPrivilegiado) {
			filtros.push('p.usuario_id = ?');
			params.push(usuarioId);
		}

		const [premios] = await pool.query(
		      `SELECT p.id, p.rodada, p.tipo_premio, ABS(p.valor) AS valor_total, p.saldo_parcial, 
			      (ABS(p.valor) - IFNULL(p.saldo_parcial, 0)) AS valor_restante,
			      p.usuario_id, u.nome AS nome_usuario,
			      CASE WHEN p.valor > 0 THEN 'Premiação' ELSE 'Cobrança' END AS tipo_operacao
		       FROM premios p
		       JOIN usuarios u ON u.id = p.usuario_id
		       WHERE ${filtros.join(' AND ')}
		 ORDER BY p.rodada DESC`,
			params
		);

		res.json(premios);
	} catch (err) {
		console.error('Erro ao buscar prêmios pendentes:', err);
		res.status(500).json({ erro: 'Erro ao buscar prêmios pendentes.' });
	}
});

module.exports = router;
