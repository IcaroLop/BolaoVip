-- Script: inserir palpites + criar cobranças PIX (rodada 21, campeonato_id 69, users 1,2,3,4,5,6,8,9)
-- DB: bolaovip
-- BACKUP RECOMENDADO: mysqldump -u <user> -p bolaovip > backup_before_inserts.sql

-- Use o banco de destino
USE `bolaovip`;

START TRANSACTION;

-- CONFIGURAÇÃO (ajuste se necessário)
SET @rodada = 21;
SET @campeonato_id = 69;         -- Premier League
SET @grupo_id = 2;               -- grupo alvo
SET @valor_palpite = 15.00;
-- Lista de usuários (ajuste conforme necessário)
SET @users_csv = '1,2,3,4,5,6,8,9';

-- Converte CSV em tabela temporária de usuários
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

-- 1) (Opcional) remover palpites/cobranças antigas desta rodada/grupo/usuarios
-- Deleta cobranças vinculadas a palpites dessa rodada/campeonato/grupo
DELETE pc
FROM pix_cobrancas pc
JOIN tmp_users u ON JSON_UNQUOTE(JSON_EXTRACT(pc.payload_raw,'$.usuario_id')) = CAST(u.usuario_id AS CHAR)
WHERE JSON_UNQUOTE(JSON_EXTRACT(pc.payload_raw,'$.rodada')) = CAST(@rodada AS CHAR)
  AND JSON_UNQUOTE(JSON_EXTRACT(pc.payload_raw,'$.origem')) = 'palpites'
  AND JSON_UNQUOTE(JSON_EXTRACT(pc.payload_raw,'$.campeonato_id')) = CAST(@campeonato_id AS CHAR)
  AND (JSON_UNQUOTE(JSON_EXTRACT(pc.payload_raw,'$.grupo_id')) IS NULL OR JSON_UNQUOTE(JSON_EXTRACT(pc.payload_raw,'$.grupo_id')) = CAST(@grupo_id AS CHAR));

-- Deleta palpites antigos
DELETE p
FROM palpites p
JOIN tmp_users u ON p.id_usuario = u.usuario_id
WHERE p.rodada = @rodada
  AND p.campeonato_id = @campeonato_id
  AND (p.grupo_id IS NULL OR p.grupo_id = @grupo_id);

-- 2) Inserir novos palpites (gols 0x0 determinístico)
INSERT INTO palpites (id_usuario, rodada, campeonato_id, grupo_id, id_jogo, gols_casa, gols_fora, codigo_envio, data_envio, status_pagamento)
SELECT u.usuario_id,
       @rodada,
       @campeonato_id,
       @grupo_id,
       j.id,
       0 AS gols_casa,
       0 AS gols_fora,
       SUBSTRING(REPLACE(UUID(),'-',''),1,26) AS codigo_envio,
       NOW() as data_envio,
       'pendente' as status_pagamento
FROM tmp_users u
JOIN jogos j ON j.rodada = @rodada AND j.campeonato_id = @campeonato_id
ORDER BY u.usuario_id, j.id;

-- 3) Criar PIX cobranças pendentes para os palpites inseridos
INSERT INTO pix_cobrancas (
  id_usuario, codigo_envio, txid, status, status_pagamento, data_pagamento,
  valor_original, chave_pix, solicitacao_pagador, calendario_criacao, calendario_expiracao, payload_raw, created_at, updated_at
)
SELECT
  p.id_usuario,
  p.codigo_envio,
  REPLACE(UUID(),'-','') AS txid,
  'PENDENTE' AS status,
  'PENDENTE' AS status_pagamento,
  NULL AS data_pagamento,
  @valor_palpite AS valor_original,
  'SIMULADO-CHAVE-PIX' AS chave_pix,
  CONCAT('Cobrança palpite rodada ', p.rodada) AS solicitacao_pagador,
  NOW() AS calendario_criacao,
  259200 AS calendario_expiracao,
  JSON_OBJECT(
    'origem','palpites',
    'rodada', p.rodada,
    'campeonato_id', p.campeonato_id,
    'grupo_id', p.grupo_id,
    'palpite_id', p.id,
    'usuario_id', p.id_usuario
  ) AS payload_raw,
  NOW(), NOW()
FROM palpites p
LEFT JOIN pix_cobrancas pc ON JSON_UNQUOTE(JSON_EXTRACT(pc.payload_raw,'$.palpite_id')) = CAST(p.id AS CHAR)
WHERE p.rodada = @rodada
  AND p.campeonato_id = @campeonato_id
  AND (p.grupo_id IS NULL OR p.grupo_id = @grupo_id)
  AND EXISTS (SELECT 1 FROM tmp_users u WHERE u.usuario_id = p.id_usuario)
  AND pc.id IS NULL;

-- 4) Recap
SELECT 'RECAP' AS msg;
SELECT COUNT(*) AS palpites_inseridos
FROM palpites p
WHERE p.rodada = @rodada AND p.campeonato_id = @campeonato_id AND (p.grupo_id IS NULL OR p.grupo_id = @grupo_id)
  AND p.id_usuario IN (SELECT usuario_id FROM tmp_users);

SELECT COUNT(*) AS cobrancas_criadas
FROM pix_cobrancas pc
WHERE JSON_UNQUOTE(JSON_EXTRACT(pc.payload_raw,'$.rodada')) = CAST(@rodada AS CHAR)
  AND JSON_UNQUOTE(JSON_EXTRACT(pc.payload_raw,'$.origem')) = 'palpites'
  AND JSON_UNQUOTE(JSON_EXTRACT(pc.payload_raw,'$.campeonato_id')) = CAST(@campeonato_id AS CHAR)
  AND (JSON_UNQUOTE(JSON_EXTRACT(pc.payload_raw,'$.grupo_id')) IS NULL OR JSON_UNQUOTE(JSON_EXTRACT(pc.payload_raw,'$.grupo_id')) = CAST(@grupo_id AS CHAR))
  AND JSON_UNQUOTE(JSON_EXTRACT(pc.payload_raw,'$.usuario_id')) IN (SELECT CAST(usuario_id AS CHAR) FROM tmp_users);

-- COMMIT; -- descomente após revisar contagens
-- ROLLBACK; -- se quiser desfazer antes do commit

-- Observações:
-- - Este script não ajusta saldos/extratos; apenas insere palpites e cobranças pendentes.
-- - Ajuste @grupo_id se quiser aplicar em outro grupo ou remover para geral.
