-- Script de diagnóstico: verificar todas as cobranças da rodada 12
-- Execute: mysql -u root -pfBVhh6w2KW bolaovip < diagnostico_rodada12.sql

USE bolaovip;

-- 1. Todas as cobranças recentes (últimas 50)
SELECT '=== COBRANÇAS MAIS RECENTES (últimas 50) ===' as diagnostico;
SELECT 
    id, 
    id_usuario,
    codigo_envio,
    status_pagamento,
    valor_original,
    webhook_recebido,
    SUBSTRING(payload_raw, 1, 100) as payload_preview,
    TIMESTAMPDIFF(MINUTE, created_at, NOW()) as minutos_idade,
    created_at
FROM pix_cobrancas 
ORDER BY created_at DESC 
LIMIT 50;

-- 2. Cobranças pendentes (qualquer rodada)
SELECT '=== COBRANÇAS PENDENTES (todas as rodadas) ===' as diagnostico;
SELECT 
    id,
    id_usuario,
    status_pagamento,
    webhook_recebido,
    JSON_UNQUOTE(JSON_EXTRACT(payload_raw,'$.rodada')) as rodada_extraida,
    JSON_UNQUOTE(JSON_EXTRACT(payload_raw,'$.origem')) as origem,
    TIMESTAMPDIFF(MINUTE, created_at, NOW()) as minutos_idade
FROM pix_cobrancas 
WHERE status_pagamento = 'PENDENTE'
ORDER BY created_at DESC;

-- 3. Buscar especificamente rodada 12 (qualquer formato)
SELECT '=== COBRANÇAS RODADA 12 (qualquer status) ===' as diagnostico;
SELECT 
    id,
    status_pagamento,
    webhook_recebido,
    payload_raw,
    created_at
FROM pix_cobrancas 
WHERE payload_raw LIKE '%"rodada":"12"%' 
   OR payload_raw LIKE '%"rodada":12%'
   OR payload_raw LIKE '%rodada12%'
ORDER BY created_at DESC
LIMIT 10;

-- 4. Contadores
SELECT '=== ESTATÍSTICAS ===' as diagnostico;
SELECT 
    COUNT(*) as total_cobrancas,
    SUM(CASE WHEN status_pagamento = 'PENDENTE' THEN 1 ELSE 0 END) as pendentes,
    SUM(CASE WHEN status_pagamento = 'PAGO' THEN 1 ELSE 0 END) as pagas,
    SUM(CASE WHEN webhook_recebido = 1 THEN 1 ELSE 0 END) as com_webhook
FROM pix_cobrancas;
