-- Script para adicionar contador de requisições à API Futebol
-- Compatível com MySQL 5.7+

-- Verificar se coluna existe
SELECT IF(EXISTS(
    SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'configuracoes' 
    AND COLUMN_NAME = 'requisicoes_api_futebol'
), 'Coluna já existe', 'Coluna não encontrada - será adicionada...') AS status;

-- Adicionar a coluna com valor inicial 40
ALTER TABLE configuracoes ADD COLUMN requisicoes_api_futebol INT DEFAULT 40 COMMENT 'Contador de requisições à API Futebol (produção)';

-- Confirmação
SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'configuracoes' AND COLUMN_NAME = 'requisicoes_api_futebol';
