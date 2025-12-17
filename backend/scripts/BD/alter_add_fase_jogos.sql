USE bolaovip;

-- Verificar se coluna fase já existe antes de adicionar
SET @col_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = 'bolaovip' 
    AND TABLE_NAME = 'jogos' 
    AND COLUMN_NAME = 'fase'
);

-- Adicionar coluna fase se não existir
SET @sql_col = IF(
  @col_exists = 0,
  'ALTER TABLE jogos ADD COLUMN fase VARCHAR(50) NULL AFTER rodada',
  'SELECT "Coluna fase já existe" AS message'
);

PREPARE stmt_col FROM @sql_col;
EXECUTE stmt_col;
DEALLOCATE PREPARE stmt_col;

-- Verificar se índice único em partida_id já existe antes de criar
SET @idx_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.STATISTICS 
  WHERE TABLE_SCHEMA = 'bolaovip' 
    AND TABLE_NAME = 'jogos' 
    AND INDEX_NAME = 'idx_unique_partida_id'
);

-- Criar índice único se não existir
SET @sql_idx = IF(
  @idx_exists = 0,
  'CREATE UNIQUE INDEX idx_unique_partida_id ON jogos(partida_id)',
  'SELECT "Índice idx_unique_partida_id já existe" AS message'
);

PREPARE stmt_idx FROM @sql_idx;
EXECUTE stmt_idx;
DEALLOCATE PREPARE stmt_idx;

-- Mensagem de sucesso
SELECT 
  IF(@col_exists = 0, 'Coluna fase adicionada', 'Coluna fase já existia') AS status_coluna,
  IF(@idx_exists = 0, 'Índice único criado', 'Índice já existia') AS status_indice;
