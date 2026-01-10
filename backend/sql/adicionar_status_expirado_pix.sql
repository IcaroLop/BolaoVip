-- ========================================
-- Adicionar status EXPIRADO ao campo status_pagamento
-- Tabela: pix_depositos
-- Data: 15/01/2025
-- ========================================

-- Verificar estrutura atual
DESCRIBE pix_depositos;

-- Alterar coluna para incluir novo status EXPIRADO
ALTER TABLE pix_depositos 
MODIFY COLUMN status_pagamento 
ENUM('PENDENTE', 'CONCLUIDO', 'EXPIRADO', 'CANCELADO') 
DEFAULT 'PENDENTE';

-- Verificar alteração
SHOW COLUMNS FROM pix_depositos LIKE 'status_pagamento';

-- Marcar como EXPIRADO todos os PIX com mais de 1 hora sem pagamento
UPDATE pix_depositos
SET status_pagamento = 'EXPIRADO', 
    updated_at = NOW()
WHERE status_pagamento = 'PENDENTE'
  AND TIMESTAMPDIFF(SECOND, created_at, NOW()) > 3600;

-- Ver quantos foram afetados
SELECT 
  status_pagamento,
  COUNT(*) as total,
  SUM(valor_original) as valor_total
FROM pix_depositos
GROUP BY status_pagamento;

-- ========================================
-- Após executar este script:
-- 1. Sistema detectará expiração a cada 30s no frontend
-- 2. Backend marcará como EXPIRADO automaticamente
-- 3. Notificação será criada para o usuário
-- ========================================
