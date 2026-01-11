-- Script: Verificar valores únicos na coluna tipo antes de alterar ENUM
-- Data: 2026-01-11

SELECT DISTINCT tipo, COUNT(*) as total 
FROM notificacoes_usuarios 
GROUP BY tipo
ORDER BY tipo;
