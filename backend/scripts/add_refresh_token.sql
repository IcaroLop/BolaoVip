-- Adicionar coluna refresh_token na tabela usuarios
-- Executa: mysql -u root -p bolaovip < backend/scripts/add_refresh_token.sql

ALTER TABLE usuarios 
ADD COLUMN refresh_token VARCHAR(500) NULL COMMENT 'Refresh token para renovação de sessão'
AFTER senha_hash;

-- Adicionar índice para buscas rápidas
ALTER TABLE usuarios 
ADD INDEX idx_refresh_token (refresh_token);

-- Confirmar adição
SELECT COLUMN_NAME, COLUMN_TYPE, COLUMN_KEY 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'usuarios' AND TABLE_SCHEMA = DATABASE()
ORDER BY ORDINAL_POSITION;
