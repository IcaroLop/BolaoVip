-- Script para adicionar coluna observacao_pagamento à tabela premios
-- Compatível com MySQL 5.7+

-- Verificar se coluna existe
SELECT IF(EXISTS(
    SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'premios' 
    AND COLUMN_NAME = 'observacao_pagamento'
), 'Coluna já existe', 'Coluna não encontrada - será adicionada...') AS status;

-- Adicionar a coluna se não existir
ALTER TABLE premios ADD COLUMN observacao_pagamento VARCHAR(500) DEFAULT NULL COMMENT 'Observação sobre o pagamento do prêmio' AFTER data_pagamento;

-- Confirmação
SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'premios' AND COLUMN_NAME IN ('data_pagamento', 'observacao_pagamento')
ORDER BY ORDINAL_POSITION;
