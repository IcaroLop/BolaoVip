USE bolaovip;

-- Adiciona suporte a grupos/campeonatos nas tabelas de palpites e ranking
-- Execute em MySQL

-- palpites: associa palpite ao campeonato/grupo (idempotente via checagem em information_schema)
SET @col_exists := (SELECT COUNT(*) FROM information_schema.columns 
  WHERE table_schema = DATABASE() AND table_name = 'palpites' AND column_name = 'campeonato_id');
SET @sql := IF(@col_exists = 0, 'ALTER TABLE palpites ADD COLUMN campeonato_id INT NULL AFTER rodada', 'SELECT 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists := (SELECT COUNT(*) FROM information_schema.columns 
  WHERE table_schema = DATABASE() AND table_name = 'palpites' AND column_name = 'grupo_id');
SET @sql := IF(@col_exists = 0, 'ALTER TABLE palpites ADD COLUMN grupo_id INT NULL AFTER campeonato_id', 'SELECT 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_exists := (SELECT COUNT(*) FROM information_schema.statistics 
  WHERE table_schema = DATABASE() AND table_name = 'palpites' AND index_name = 'idx_palpites_camp_rodada');
SET @sql := IF(@idx_exists = 0, 'CREATE INDEX idx_palpites_camp_rodada ON palpites (campeonato_id, rodada)', 'SELECT 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_exists := (SELECT COUNT(*) FROM information_schema.statistics 
  WHERE table_schema = DATABASE() AND table_name = 'palpites' AND index_name = 'idx_palpites_grupo');
SET @sql := IF(@idx_exists = 0, 'CREATE INDEX idx_palpites_grupo ON palpites (grupo_id)', 'SELECT 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ranking_rodada: armazena ranking por campeonato/grupo
SET @col_exists := (SELECT COUNT(*) FROM information_schema.columns 
  WHERE table_schema = DATABASE() AND table_name = 'ranking_rodada' AND column_name = 'campeonato_id');
SET @sql := IF(@col_exists = 0, 'ALTER TABLE ranking_rodada ADD COLUMN campeonato_id INT NULL AFTER rodada', 'SELECT 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists := (SELECT COUNT(*) FROM information_schema.columns 
  WHERE table_schema = DATABASE() AND table_name = 'ranking_rodada' AND column_name = 'grupo_id');
SET @sql := IF(@col_exists = 0, 'ALTER TABLE ranking_rodada ADD COLUMN grupo_id INT NULL AFTER campeonato_id', 'SELECT 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_exists := (SELECT COUNT(*) FROM information_schema.statistics 
  WHERE table_schema = DATABASE() AND table_name = 'ranking_rodada' AND index_name = 'idx_rank_camp');
SET @sql := IF(@idx_exists = 0, 'CREATE INDEX idx_rank_camp ON ranking_rodada (campeonato_id, rodada)', 'SELECT 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_exists := (SELECT COUNT(*) FROM information_schema.statistics 
  WHERE table_schema = DATABASE() AND table_name = 'ranking_rodada' AND index_name = 'idx_rank_grupo');
SET @sql := IF(@idx_exists = 0, 'CREATE INDEX idx_rank_grupo ON ranking_rodada (grupo_id, rodada)', 'SELECT 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- premios: premiações por campeonato/grupo
SET @col_exists := (SELECT COUNT(*) FROM information_schema.columns 
  WHERE table_schema = DATABASE() AND table_name = 'premios' AND column_name = 'campeonato_id');
SET @sql := IF(@col_exists = 0, 'ALTER TABLE premios ADD COLUMN campeonato_id INT NULL AFTER rodada', 'SELECT 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists := (SELECT COUNT(*) FROM information_schema.columns 
  WHERE table_schema = DATABASE() AND table_name = 'premios' AND column_name = 'grupo_id');
SET @sql := IF(@col_exists = 0, 'ALTER TABLE premios ADD COLUMN grupo_id INT NULL AFTER campeonato_id', 'SELECT 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_exists := (SELECT COUNT(*) FROM information_schema.statistics 
  WHERE table_schema = DATABASE() AND table_name = 'premios' AND index_name = 'idx_premios_camp');
SET @sql := IF(@idx_exists = 0, 'CREATE INDEX idx_premios_camp ON premios (campeonato_id, rodada)', 'SELECT 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_exists := (SELECT COUNT(*) FROM information_schema.statistics 
  WHERE table_schema = DATABASE() AND table_name = 'premios' AND index_name = 'idx_premios_grupo');
SET @sql := IF(@idx_exists = 0, 'CREATE INDEX idx_premios_grupo ON premios (grupo_id, rodada)', 'SELECT 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
