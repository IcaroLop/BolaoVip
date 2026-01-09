-- Buscar as 20 cobranças mais recentes (sem filtro de data)
USE bolaovip;

-- Últimas cobranças
SELECT 
    id,
    SUBSTRING(txid, 1, 30) as txid_preview,
    id_usuario,
    valor_original,
    status,
    status_pagamento,
    webhook_recebido,
    TIMESTAMPDIFF(MINUTE, created_at, NOW()) as minutos_idade,
    DATE_FORMAT(created_at, '%d/%m/%Y %H:%i:%s') as criada_em
FROM pix_cobrancas 
ORDER BY id DESC
LIMIT 20;

-- Total por status
SELECT 
    status_pagamento,
    COUNT(*) as total,
    SUM(CASE WHEN webhook_recebido = 1 THEN 1 ELSE 0 END) as com_webhook
FROM pix_cobrancas
GROUP BY status_pagamento;
