-- Script: Zerar todas as movimentações de saldo
-- DB: bolaovip
-- Propósito: Limpar extrato_movimentacao para resetar ao estado inicial
-- Nota: Os saldos em usuarios.saldo e saldo_usuario.saldo_atual continuam em R$300

USE `bolaovip`;

START TRANSACTION;

-- 1) Contar movimentações antes de deletar
SELECT COUNT(*) AS movimentacoes_antes FROM extrato_movimentacao;

-- 2) Deletar TODAS as movimentações
DELETE FROM extrato_movimentacao;

-- 3) Recap
SELECT 'RECAP' AS msg;
SELECT COUNT(*) AS movimentacoes_apos
FROM extrato_movimentacao;

-- 4) Verificar saldos (devem estar em 300.00)
SELECT u.id, u.nome, u.saldo, su.saldo_atual
FROM usuarios u
LEFT JOIN saldo_usuario su ON u.id = su.usuario_id
WHERE u.id IN (1,2,3,4,5,6,7,8,9)
ORDER BY u.id;

-- COMMIT; -- descomente para confirmar
-- ROLLBACK; -- se quiser desfazer antes do commit

-- ⚠️ IMPORTANTE: Execute COM COMMIT para que as mudanças sejam salvas no banco!
COMMIT;
