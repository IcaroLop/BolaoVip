-- ============================================
-- FASE 2: INSERIR PALPITES RODADAS 1-21
-- Para todos os 9 usuários com placares aleatórios
-- ============================================

USE bolaovip;

START TRANSACTION;

-- CONFIGURAÇÃO
SET @campeonato_id = 69;  -- Premier League
SET @grupo_id = 2;
SET @users_csv = '1,2,3,4,5,6,7,8,9';  -- Todos os 9 usuários

-- Cria tabela temporária de usuários
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

-- Inserir palpites para TODAS as rodadas 1-21
-- Usa SHA1 para gerar placares ALEATÓRIOS (0-5 gols) por usuário + jogo
INSERT INTO palpites (id_usuario, rodada, campeonato_id, grupo_id, id_jogo, gols_casa, gols_fora, codigo_envio, data_envio, status_pagamento)
SELECT 
  u.usuario_id,
  j.rodada,
  @campeonato_id,
  @grupo_id,
  j.id,
  CONV(SUBSTRING(SHA1(CONCAT(CAST(u.usuario_id AS CHAR), '_', CAST(j.id AS CHAR), '_casa')), 1, 2), 16, 10) % 6 AS gols_casa,
  CONV(SUBSTRING(SHA1(CONCAT(CAST(u.usuario_id AS CHAR), '_', CAST(j.id AS CHAR), '_fora')), 1, 2), 16, 10) % 6 AS gols_fora,
  SUBSTRING(REPLACE(UUID(),'-',''),1,26) AS codigo_envio,
  NOW() as data_envio,
  'pendente' as status_pagamento
FROM tmp_users u
JOIN jogos j ON j.campeonato_id = @campeonato_id AND j.rodada BETWEEN 1 AND 21
ORDER BY u.usuario_id, j.rodada, j.id;

SELECT '=== DIAGNÓSTICO FASE 2: PALPITES INSERIDOS ===' AS diagnostic;

-- Verificar palpites por rodada e usuário
SELECT 
  rodada,
  COUNT(DISTINCT id_usuario) as usuarios_com_palpites,
  COUNT(*) as total_palpites,
  MIN(CONCAT(gols_casa, 'x', gols_fora)) as exemplo_placar,
  MAX(gols_casa + gols_fora) as max_gols_por_jogo
FROM palpites 
WHERE rodada BETWEEN 1 AND 21 AND campeonato_id = 69
GROUP BY rodada
ORDER BY rodada;

-- Verificar distribuição de placares (confirmar aleatoriedade)
SELECT 
  CONCAT(gols_casa, 'x', gols_fora) AS placar,
  COUNT(*) AS total
FROM palpites 
WHERE rodada BETWEEN 1 AND 21 AND campeonato_id = 69
GROUP BY gols_casa, gols_fora
ORDER BY total DESC;

-- Amostra de palpites por usuário (rodada 1)
SELECT 
  id_usuario,
  COUNT(*) as total_palpites_rodada1,
  GROUP_CONCAT(CONCAT(gols_casa, 'x', gols_fora) SEPARATOR ', ') as placares
FROM palpites 
WHERE rodada = 1 AND campeonato_id = 69
GROUP BY id_usuario
ORDER BY id_usuario;

COMMIT;
