-- ============================================
-- FASE 1: RESET COMPLETO
-- Limpa dados de teste e seta saldo inicial
-- ============================================

USE bolaovip;

START TRANSACTION;

-- 1) Deletar palpites das rodadas 1-21 (campeonato 69 - Premier League)
DELETE FROM palpites 
WHERE rodada BETWEEN 1 AND 21 AND campeonato_id = 69;

SELECT 'Palpites deletados' AS step1;

-- 2) Deletar rankings das rodadas 1-21 (campeonato 69)
DELETE FROM ranking_rodada 
WHERE rodada BETWEEN 1 AND 21 AND campeonato_id = 69;

SELECT 'Rankings deletados' AS step2;

-- 3) Deletar prêmios das rodadas 1-21 (campeonato 69)
DELETE FROM premios 
WHERE rodada BETWEEN 1 AND 21 AND campeonato_id = 69;

SELECT 'Prêmios deletados' AS step3;

-- 4) Deletar movimentações de saldo relacionadas aos prêmios das rodadas 1-21
DELETE FROM extrato_movimentacao 
WHERE usuario_id IN (1, 2, 3, 4, 5, 6, 7, 8, 9) 
  AND tipo IN ('premio_recebido', 'lancamento_premio');

SELECT 'Movimentações de prêmios deletadas' AS step4;

-- 5) Resetar saldo de todos os 9 usuários para R$ 300.00 (AMBAS as tabelas)
-- Tabela 1: usuarios (coluna: saldo)
UPDATE usuarios SET saldo = 300.00 
WHERE id IN (1, 2, 3, 4, 5, 6, 7, 8, 9);

-- Tabela 2: saldo_usuario (coluna: saldo_atual)
UPDATE saldo_usuario SET saldo_atual = 300.00 
WHERE usuario_id IN (1, 2, 3, 4, 5, 6, 7, 8, 9);

SELECT 'Saldos resetados para R$ 300.00 (usuarios + saldo_usuario)' AS step5;

-- 6) Reset das flags de pagamentos gerados nas rodadas 1-21
UPDATE rodadas SET pagamentos_gerados = 0 
WHERE numero BETWEEN 1 AND 21;

SELECT 'Flags pagamentos_gerados resetadas' AS step6;

-- 7) Diagnóstico Final
SELECT '=== DIAGNÓSTICO FINAL FASE 1 ===' AS diagnostic;

SELECT COUNT(*) AS palpites_restantes 
FROM palpites WHERE rodada BETWEEN 1 AND 21 AND campeonato_id = 69;

SELECT COUNT(*) AS rankings_restantes 
FROM ranking_rodada WHERE rodada BETWEEN 1 AND 21 AND campeonato_id = 69;

SELECT COUNT(*) AS premios_restantes 
FROM premios WHERE rodada BETWEEN 1 AND 21 AND campeonato_id = 69;

-- Verificar saldos em ambas as tabelas
SELECT u.id, u.nome, u.saldo as saldo_usuarios, su.saldo_atual as saldo_usuario_tabela
FROM usuarios u
LEFT JOIN saldo_usuario su ON u.id = su.usuario_id
WHERE u.id IN (1, 2, 3, 4, 5, 6, 7, 8, 9)
ORDER BY u.id;

COMMIT;
