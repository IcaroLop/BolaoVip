-- Script: Inserir Palpites Rodada 3 + Preparar Teste EFI PIX
-- DB: bolaovip
-- Objetivo: Inserir palpites com placares aleatórios para rodada 3, então testar EFI PIX

USE `bolaovip`;

START TRANSACTION;

-- CONFIGURAÇÃO
SET @rodada = 3;
SET @campeonato_id = 69;         -- Premier League
SET @grupo_id = 2;
SET @valor_palpite = 15.00;
SET @users_csv = '1,2,3,4,5,6,7,8,9';

-- 1) Verificar se rodada 3 existe e tem jogos
SELECT COUNT(*) AS total_jogos_rodada_3
FROM jogos
WHERE rodada = @rodada AND campeonato_id = @campeonato_id;

-- 2) Se não houver jogos, aviso importante
SELECT IF(
  (SELECT COUNT(*) FROM jogos WHERE rodada = @rodada AND campeonato_id = @campeonato_id) = 0,
  '❌ ERRO: Nenhum jogo encontrado para rodada 3. Você precisa importar os jogos primeiro.',
  '✅ Jogos encontrados. Prosseguindo com inserção de palpites.'
) AS status;

-- 3) Criar tabela temporária de usuários
DROP TEMPORARY TABLE IF EXISTS tmp_users;
CREATE TEMPORARY TABLE tmp_users (usuario_id INT PRIMARY KEY);
INSERT INTO tmp_users (usuario_id)
SELECT CAST(value AS UNSIGNED) FROM (
  SELECT SUBSTRING_INDEX(SUBSTRING_INDEX(@users_csv, ',', n.n), ',', -1) AS value
  FROM (
    SELECT 1 n UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5
    UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10
  ) n
  WHERE n.n <= 1 + (LENGTH(@users_csv) - LENGTH(REPLACE(@users_csv, ',', '')))
) s
WHERE value <> '';

-- 4) Limpar palpites antigos da rodada 3 (se houver)
DELETE FROM palpites 
WHERE rodada = @rodada 
  AND campeonato_id = @campeonato_id
  AND id_usuario IN (SELECT usuario_id FROM tmp_users);

-- 5) Inserir novos palpites com placares ALEATÓRIOS
INSERT INTO palpites (id_usuario, rodada, campeonato_id, grupo_id, id_jogo, gols_casa, gols_fora, codigo_envio, data_envio, status_pagamento)
SELECT 
  u.usuario_id,
  @rodada,
  @campeonato_id,
  @grupo_id,
  j.id,
  CONV(SUBSTRING(SHA1(CONCAT(CAST(u.usuario_id AS CHAR), '_', CAST(j.id AS CHAR), '_casa')), 1, 2), 16, 10) % 6 AS gols_casa,
  CONV(SUBSTRING(SHA1(CONCAT(CAST(u.usuario_id AS CHAR), '_', CAST(j.id AS CHAR), '_fora')), 1, 2), 16, 10) % 6 AS gols_fora,
  SUBSTRING(REPLACE(UUID(),'-',''),1,26) AS codigo_envio,
  NOW() as data_envio,
  'pendente' as status_pagamento
FROM tmp_users u
JOIN jogos j ON j.rodada = @rodada AND j.campeonato_id = @campeonato_id
ORDER BY u.usuario_id, j.id;

-- 6) Ajustar saldos para diferentes cenários de cobrança

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

-- Usuário 7: Saldo alto R$ 300 (teste campeão/vice com crédito)
UPDATE saldo_usuario SET saldo_atual = 300.00 WHERE usuario_id = 7;

-- Usuário 8: Saldo alto R$ 300 (teste vice com crédito)
UPDATE saldo_usuario SET saldo_atual = 300.00 WHERE usuario_id = 8;

-- Usuário 9: Saldo zerado
UPDATE saldo_usuario SET saldo_atual = 0.00 WHERE usuario_id = 9;

-- 7) Resetar flag de pagamentos_gerados na rodada 3
UPDATE rodadas 
SET pagamentos_gerados = 0, pagamentos_gerados_em = NULL 
WHERE numero = @rodada;

-- 8) Deletar prêmios e cobranças antigas da rodada 3
DELETE FROM premios 
WHERE rodada = (SELECT id FROM rodadas WHERE numero = @rodada LIMIT 1)
  AND campeonato_id = @campeonato_id;

DELETE FROM pix_cobrancas 
WHERE JSON_UNQUOTE(JSON_EXTRACT(payload_raw,'$.origem')) = 'premios'
  AND JSON_UNQUOTE(JSON_EXTRACT(payload_raw,'$.rodada')) = CAST(@rodada AS CHAR)
  AND JSON_UNQUOTE(JSON_EXTRACT(payload_raw,'$.campeonato_id')) = CAST(@campeonato_id AS CHAR);

-- 9) Deletar ranking da rodada 3
DELETE FROM ranking_rodada 
WHERE rodada = (SELECT id FROM rodadas WHERE numero = @rodada LIMIT 1)
  AND campeonato_id = @campeonato_id;

-- 10) RECAP FINAL
SELECT '========== RECAP RODADA 3 ==========' AS msg;

SELECT 
  'Total de Palpites Inseridos' AS metrica,
  COUNT(*) AS valor
FROM palpites 
WHERE rodada = @rodada 
  AND campeonato_id = @campeonato_id
  AND id_usuario IN (SELECT usuario_id FROM tmp_users);

SELECT u.id, u.nome, su.saldo_atual, COUNT(p.id) AS palpites_count
FROM usuarios u
LEFT JOIN saldo_usuario su ON u.id = su.usuario_id
LEFT JOIN palpites p ON p.id_usuario = u.id AND p.rodada = @rodada
WHERE u.id IN (1,2,3,4,5,6,7,8,9)
GROUP BY u.id
ORDER BY u.id;

SELECT 
  'Status da Rodada 3' AS verificacao,
  (SELECT COUNT(*) FROM jogos WHERE rodada = @rodada AND campeonato_id = @campeonato_id) AS total_jogos,
  (SELECT COUNT(*) FROM palpites WHERE rodada = @rodada AND campeonato_id = @campeonato_id) AS total_palpites,
  (SELECT pagamentos_gerados FROM rodadas WHERE numero = @rodada LIMIT 1) AS pagamentos_gerados;

SELECT '✅ PRONTO PARA TESTAR EFI PIX!' AS mensagem;

-- COMMIT; -- Descomente para confirmar
-- ROLLBACK; -- Descomente para desfazer

COMMIT;

-- ========================================
-- PRÓXIMOS PASSOS:
-- ========================================
-- 1. Reinicie o backend: pm2 restart bolaovip-backend (ou node server.js)
-- 2. No app: Admin → Pagamentos → Selecione "Rodada 3"
-- 3. Clique "Gerar Pagamentos"
-- 4. Verifique logs:
--    🌐 "Enviando cobrança para EFI" = tentando integrar
--    ✅ "Cobrança criada na EFI" = sucesso
--    ⚠️ "Erro ao criar cobrança na EFI" = falhou (fallback)
--    🔔 "Cobrança PIX criada" = salvo no banco
-- 5. Consulte: SELECT * FROM pix_cobrancas WHERE JSON_UNQUOTE(JSON_EXTRACT(payload_raw,'$.rodada')) = '3';
