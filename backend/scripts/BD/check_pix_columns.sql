-- Script alternativo: apenas verificar se coluna existe
-- Se receber erro "Duplicate column", significa que a coluna já foi criada e está OK

SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'pix_cobrancas' 
AND (COLUMN_NAME = 'data_pagamento' OR COLUMN_NAME LIKE '%pagamento%')
ORDER BY ORDINAL_POSITION;
