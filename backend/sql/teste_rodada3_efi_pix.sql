-- Script: Preparar Teste Rodada 3 - Premier League (com integração EFI PIX)
-- DB: bolaovip
-- Objetivo: 
--   1) Resetar rodada 3 (limpar pagamentos anteriores)
--   2) Garantir que usuários têm palpites (serão usados os já inseridos ou gerar novos)
--   3) Verificar saldos (alguns com saldo zerado para testar cobrança PIX via EFI)

USE `bolaovip`;

START TRANSACTION;

-- CONFIGURAÇÃO
SET @rodada = 3;
SET @campeonato_id = 69;  -- Premier League
SET @grupo_id = 2;

-- 1) Resetar flag de pagamentos_gerados na rodada 3
UPDATE rodadas 
SET pagamentos_gerados = 0, pagamentos_gerados_em = NULL 
WHERE numero = @rodada;

-- 2) Deletar prêmios existentes da rodada 3
DELETE FROM premios 
WHERE rodada = (SELECT id FROM rodadas WHERE numero = @rodada LIMIT 1)
  AND campeonato_id = @campeonato_id;

-- 3) Deletar cobranças PIX relacionadas a prêmios desta rodada
DELETE FROM pix_cobrancas 
WHERE JSON_UNQUOTE(JSON_EXTRACT(payload_raw,'$.origem')) = 'premios'
  AND JSON_UNQUOTE(JSON_EXTRACT(payload_raw,'$.rodada')) = CAST(@rodada AS CHAR)
  AND JSON_UNQUOTE(JSON_EXTRACT(payload_raw,'$.campeonato_id')) = CAST(@campeonato_id AS CHAR);

-- 4) Deletar ranking da rodada 3
DELETE FROM ranking_rodada 
WHERE rodada = (SELECT id FROM rodadas WHERE numero = @rodada LIMIT 1)
  AND campeonato_id = @campeonato_id;

-- 5) Verificar se existem palpites para rodada 3
SELECT COUNT(*) AS palpites_rodada_3
FROM palpites 
WHERE rodada = @rodada 
  AND campeonato_id = @campeonato_id;

-- 6) Se não houver palpites, informar
SELECT IF(
  COUNT(*) = 0,
  '⚠️ AVISO: Nenhum palpite encontrado para rodada 3. Você precisa inserir palpites antes de gerar pagamentos.',
  '✅ Palpites encontrados para rodada 3. Pronto para gerar pagamentos.'
) AS status
FROM palpites 
WHERE rodada = @rodada 
  AND campeonato_id = @campeonato_id;

-- 7) Ajustar saldos de alguns usuários para testar diferentes cenários de cobrança

-- Usuário 1: Saldo zerado (testará cobrança PIX total)
UPDATE saldo_usuario SET saldo_atual = 0.00 WHERE usuario_id = 1;

-- Usuário 2: Saldo insuficiente de R$ 5 (testará débito parcial + cobrança PIX da diferença)
UPDATE saldo_usuario SET saldo_atual = 5.00 WHERE usuario_id = 2;

-- Usuário 3: Saldo normal R$ 50
UPDATE saldo_usuario SET saldo_atual = 50.00 WHERE usuario_id = 3;

-- Usuário 4 (Maria Souza): Saldo zerado (testará cobrança PIX total como lanterna)
UPDATE saldo_usuario SET saldo_atual = 0.00 WHERE usuario_id = 4;

-- Usuário 5: Saldo normal R$ 100
UPDATE saldo_usuario SET saldo_atual = 100.00 WHERE usuario_id = 5;

-- Usuário 6: Saldo insuficiente R$ 2
UPDATE saldo_usuario SET saldo_atual = 2.00 WHERE usuario_id = 6;

-- Usuário 7: Saldo alto R$ 200 (teste campeão/vice com crédito)
UPDATE saldo_usuario SET saldo_atual = 200.00 WHERE usuario_id = 7;

-- Usuário 8: Saldo alto R$ 200 (teste vice com crédito)
UPDATE saldo_usuario SET saldo_atual = 200.00 WHERE usuario_id = 8;

-- Usuário 9: Saldo zerado
UPDATE saldo_usuario SET saldo_atual = 0.00 WHERE usuario_id = 9;

-- 8) Recap Final
SELECT 'RECAP - STATUS RODADA 3' AS msg;

SELECT u.id, u.nome, su.saldo_atual, COUNT(p.id) AS palpites_count
FROM usuarios u
LEFT JOIN saldo_usuario su ON u.id = su.usuario_id
LEFT JOIN palpites p ON p.id_usuario = u.id AND p.rodada = @rodada
WHERE u.id IN (1,2,3,4,5,6,7,8,9)
GROUP BY u.id
ORDER BY u.id;

-- 9) Verificação de games de rodada 3
SELECT COUNT(*) AS total_jogos_rodada_3
FROM jogos
WHERE rodada = @rodada AND campeonato_id = @campeonato_id;

SELECT 
  'Status dos Jogos Rodada 3' AS verificacao,
  SUM(CASE WHEN placar_mandante IS NOT NULL THEN 1 ELSE 0 END) AS jogos_com_placar,
  COUNT(*) AS total_jogos
FROM jogos
WHERE rodada = @rodada AND campeonato_id = @campeonato_id;

-- COMMIT; -- Descomente para confirmar
-- ROLLBACK; -- Descomente para desfazer

COMMIT;

-- ========================================
-- PRÓXIMOS PASSOS:
-- ========================================
-- 1. Execute: npm run dev (ou pm2 restart bolaovip-backend)
-- 2. No app, vá para Admin → Pagamentos → Selecione Rodada 3
-- 3. Clique em "Gerar Pagamentos"
-- 4. Verifique os logs do servidor:
--    - "🌐 Enviando cobrança para EFI" = tentou integrar com EFI
--    - "✅ Cobrança criada na EFI" = sucesso na EFI
--    - "⚠️ Erro ao criar cobrança na EFI" = falhou (fallback para banco local)
--    - "🔔 Cobrança PIX criada" = salvo no banco com dados do EFI (ou fallback)
-- 5. Consulte pix_cobrancas para verificar:
--    - pix_copiaecola: Deve ter QR Code da EFI
--    - loc_id, loc_location: Deve ter ID de localização EFI
--    - payload_raw: Deve ter resposta completa da EFI
-- 6. Verifique webhook: Simule um pagamento na EFI para testar webhook
