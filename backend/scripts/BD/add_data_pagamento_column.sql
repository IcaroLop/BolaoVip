-- Script para adicionar coluna data_pagamento à tabela pix_cobrancas
-- Compatível com MySQL 5.7+

-- Verificar se coluna existe e adicionar se não existir
SET @dbname = DATABASE();
SET @tablename = 'pix_cobrancas';
SET @columnname = 'data_pagamento';

SELECT IF(EXISTS(
    SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = @dbname 
    AND TABLE_NAME = @tablename 
    AND COLUMN_NAME = @columnname
), 'Coluna já existe', 'Adicionando coluna...') AS status;

-- Adicionar a coluna (será ignorada se já existir)
ALTER TABLE pix_cobrancas ADD COLUMN data_pagamento DATETIME DEFAULT NULL COMMENT 'Data de pagamento confirmado' AFTER status_pagamento;

-- Adicionar índice para otimizar buscas
ALTER TABLE pix_cobrancas ADD INDEX idx_data_pagamento (data_pagamento);

-- Confirmação
SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'pix_cobrancas' AND COLUMN_NAME = 'data_pagamento';
