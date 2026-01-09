-- Script: Resetar pagamentos de uma rodada para permitir nova geração
-- DB: bolaovip
-- USO: Ajuste @rodada_numero e @campeonato_id conforme necessário

USE `bolaovip`;

START TRANSACTION;

-- CONFIGURAÇÃO
SET @rodada_numero = 21;  -- Ajuste para a rodada desejada
SET @campeonato_id = 69;  -- Premier League

-- Buscar o ID da rodada (FK)
SELECT @rodada_id := id FROM rodadas WHERE numero = @rodada_numero LIMIT 1;

-- 1) Resetar flag de pagamentos_gerados na tabela rodadas
UPDATE rodadas 
SET pagamentos_gerados = 0, pagamentos_gerados_em = NULL 
WHERE numero = @rodada_numero;

-- 2) Deletar prêmios existentes
DELETE FROM premios 
WHERE rodada = @rodada_id 
  AND campeonato_id = @campeonato_id;

-- 3) Deletar cobranças PIX relacionadas a prêmios desta rodada
DELETE FROM pix_cobrancas 
WHERE JSON_UNQUOTE(JSON_EXTRACT(payload_raw,'$.origem')) = 'premios'
  AND JSON_UNQUOTE(JSON_EXTRACT(payload_raw,'$.rodada')) = CAST(@rodada_numero AS CHAR)
  AND JSON_UNQUOTE(JSON_EXTRACT(payload_raw,'$.campeonato_id')) = CAST(@campeonato_id AS CHAR);

-- 4) Verificação
SELECT 'STATUS APÓS RESET' AS msg;

SELECT pagamentos_gerados, pagamentos_gerados_em 
FROM rodadas 
WHERE numero = @rodada_numero;

SELECT COUNT(*) AS premios_restantes 
FROM premios 
WHERE rodada = @rodada_id AND campeonato_id = @campeonato_id;

SELECT COUNT(*) AS cobrancas_premios_restantes 
FROM pix_cobrancas 
WHERE JSON_UNQUOTE(JSON_EXTRACT(payload_raw,'$.origem')) = 'premios'
  AND JSON_UNQUOTE(JSON_EXTRACT(payload_raw,'$.rodada')) = CAST(@rodada_numero AS CHAR);

-- COMMIT; -- Descomente para confirmar
-- ROLLBACK; -- Descomente para desfazer

COMMIT;
