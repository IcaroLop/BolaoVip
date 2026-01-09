-- Script: Teste Rodada 2 - Maria Souza
-- DB: bolaovip
-- Objetivo: Ajustar saldo de Maria Souza para R$ 12.00 para testar cobrança parcial

USE `bolaovip`;

-- 1) Identificar Maria Souza
SELECT id, nome, email FROM usuarios WHERE nome LIKE '%Maria Souza%';

-- 2) Ajustar saldo para R$ 12.00
UPDATE saldo_usuario 
SET saldo_atual = 12.00 
WHERE usuario_id = (
  SELECT id FROM usuarios WHERE nome LIKE '%Maria Souza%' LIMIT 1
);

-- 3) Verificar ajuste
SELECT u.id, u.nome, su.saldo_atual 
FROM usuarios u
LEFT JOIN saldo_usuario su ON u.id = su.usuario_id
WHERE u.nome LIKE '%Maria Souza%';

-- 4) Verificar se há cobrança prévia de 20.00
SELECT id, usuario_id, tipo_premio, valor, status_pagamento, rodada 
FROM premios 
WHERE usuario_id = (SELECT id FROM usuarios WHERE nome LIKE '%Maria Souza%' LIMIT 1)
ORDER BY rodada DESC;

-- 5) Recap antes de gerar pagamentos
SELECT 'STATUS ANTES DO PAGAMENTO' AS msg;
SELECT COUNT(*) AS total_rodadas FROM premios WHERE usuario_id = (SELECT id FROM usuarios WHERE nome LIKE '%Maria Souza%' LIMIT 1);
