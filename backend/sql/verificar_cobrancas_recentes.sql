-- Verificar cobranças criadas recentemente (últimas 2 horas)
USE bolaovip;

SELECT 
    id,
    txid,
    id_usuario,
    valor_original,
    status,
    status_pagamento,
    webhook_recebido,
    qr_code_imagem IS NOT NULL as tem_qrcode,
    pix_copia_e_cola IS NOT NULL as tem_pix_copia_cola,
    TIMESTAMPDIFF(MINUTE, created_at, NOW()) as minutos_idade,
    created_at
FROM pix_cobrancas 
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 2 HOUR)
ORDER BY created_at DESC
LIMIT 20;
