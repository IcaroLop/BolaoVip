-- Correção da tabela noticias para evitar duplicatas

USE bolaovip;

-- Guardar configuração atual e desabilitar safe update temporariamente
SET @prev_sql_safe_updates := @@SQL_SAFE_UPDATES;
SET SQL_SAFE_UPDATES = 0;

START TRANSACTION;

-- (Opcional) Diagnóstico: quantidade de links maiores que 512 antes da alteração
SELECT COUNT(*) AS links_maiores_512_pre
FROM noticias
WHERE CHAR_LENGTH(link) > 512;

-- 1. Alterar coluna 'link' de TEXT para VARCHAR(512)
-- (TEXT não aceita índice UNIQUE completo)
ALTER TABLE noticias MODIFY link VARCHAR(512);

-- 2. Remover duplicatas mantendo apenas a mais recente (maior ID)
DELETE n1
FROM noticias n1
INNER JOIN noticias n2
  ON n1.link = n2.link AND n1.id < n2.id;

-- 3. Adicionar índice UNIQUE no link (nome estável)
ALTER TABLE noticias ADD CONSTRAINT unique_link UNIQUE (link);

COMMIT;

-- Restaurar configuração de safe updates
SET SQL_SAFE_UPDATES = @prev_sql_safe_updates;

-- 4. Verificações pós-ação
SHOW INDEX FROM noticias;

SELECT COUNT(*) AS links_maiores_512_pos
FROM noticias
WHERE CHAR_LENGTH(link) > 512;

SELECT 'Tabela noticias corrigida com sucesso! Duplicatas removidas e UNIQUE KEY adicionado.' AS status;
