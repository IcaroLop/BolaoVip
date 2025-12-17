-- Adiciona coluna de contador de requisições da API-Futebol à tabela configuracoes
-- Compatível com MySQL 5.7+

SET @dbname = DATABASE();
SET @tablename = 'configuracoes';
SET @columnname = 'api_futebol_requisicoes';

-- Verifica existência
SELECT IF(EXISTS(
    SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = @columnname
), 'Coluna já existe', 'Coluna não encontrada - será adicionada...') AS status;

-- Adiciona coluna somente se não existir (via SQL dinâmico)
SET @colExists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @columnname);
SET @sql := IF(@colExists = 0,
  'ALTER TABLE configuracoes ADD COLUMN api_futebol_requisicoes INT DEFAULT 0 COMMENT "Contador de requisicoes API-Futebol" AFTER rodada_vigente',
  'SELECT "Coluna já existe" AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Define valor inicial (pedido: 40)
UPDATE configuracoes SET api_futebol_requisicoes = COALESCE(api_futebol_requisicoes, 40);

-- Confirmação
SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'configuracoes' AND COLUMN_NAME = 'api_futebol_requisicoes'
ORDER BY ORDINAL_POSITION;
