USE bolaovip;

-- Adiciona coluna campeonato_id se não existir
SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE table_schema = DATABASE() AND table_name = 'jogos' AND column_name = 'campeonato_id'
);

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE jogos ADD COLUMN campeonato_id INT NULL AFTER partida_id',
  'SELECT "coluna campeonato_id já existe"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Cria índice em campeonato_id,rodada para filtro rápido
SET @idx_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE table_schema = DATABASE() AND table_name = 'jogos' AND index_name = 'idx_jogos_campeonato_rodada'
);

SET @sql_idx = IF(@idx_exists = 0,
  'CREATE INDEX idx_jogos_campeonato_rodada ON jogos (campeonato_id, rodada)',
  'SELECT "índice idx_jogos_campeonato_rodada já existe"');
PREPARE stmt2 FROM @sql_idx; EXECUTE stmt2; DEALLOCATE PREPARE stmt2;
