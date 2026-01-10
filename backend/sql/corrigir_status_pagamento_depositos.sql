-- Corrigir coluna status_pagamento da tabela pix_depositos
-- Problema: "Data truncated for column 'status_pagamento' at row 1"
-- Causa: Coluna pode estar como ENUM ou VARCHAR muito pequeno

USE bolaovip;

-- Verificar estrutura atual
SHOW COLUMNS FROM pix_depositos LIKE 'status_pagamento';

-- Alterar para VARCHAR(30) permitindo todos os valores necessários
ALTER TABLE pix_depositos 
MODIFY COLUMN status_pagamento VARCHAR(30) DEFAULT 'PENDENTE' 
COMMENT 'PENDENTE, PAGO, EXPIRADO, CONCLUIDO';

-- Verificar alteração
SHOW COLUMNS FROM pix_depositos LIKE 'status_pagamento';

-- Listar depósitos atuais com seus status
SELECT 
  id,
  id_usuario,
  status,
  status_pagamento,
  valor_original,
  created_at
FROM pix_depositos
ORDER BY created_at DESC
LIMIT 10;
