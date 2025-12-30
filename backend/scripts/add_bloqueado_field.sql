-- Script para adicionar coluna bloqueado na tabela usuarios
-- Execução: mysql -u root -p bolaovip < add_bloqueado_field.sql

USE bolaovip;

-- Verificar se a coluna já existe antes de adicionar
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
                   WHERE TABLE_SCHEMA = 'bolaovip' 
                   AND TABLE_NAME = 'usuarios' 
                   AND COLUMN_NAME = 'bloqueado');

-- Adicionar coluna apenas se não existir
SET @query = IF(@col_exists = 0,
    'ALTER TABLE usuarios ADD COLUMN bloqueado TINYINT(1) DEFAULT 0 NOT NULL AFTER precisa_trocar_senha',
    'SELECT "Coluna bloqueado já existe. Nenhuma alteração necessária." AS status');

PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT 'Script executado com sucesso!' AS status;
