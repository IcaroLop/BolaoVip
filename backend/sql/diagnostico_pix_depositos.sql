-- Script de diagnóstico para criação da tabela pix_depositos
-- Execute este script para identificar o problema

USE `bolaovip`;

-- 1. Verificar se a tabela usuario existe (necessária para FK)
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN 'OK - Tabela usuario existe'
        ELSE 'ERRO - Tabela usuario NÃO existe (necessária para Foreign Key)'
    END AS status_usuario
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = 'bolaovip' AND TABLE_NAME = 'usuario';

-- 2. Verificar se pix_depositos já existe
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN 'AVISO - Tabela pix_depositos JÁ existe'
        ELSE 'OK - Tabela pix_depositos não existe (pode criar)'
    END AS status_pix_depositos
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = 'bolaovip' AND TABLE_NAME = 'pix_depositos';

-- 3. Verificar versão MySQL (collation utf8mb4_0900_ai_ci requer MySQL 8.0+)
SELECT 
    VERSION() AS versao_mysql,
    CASE 
        WHEN VERSION() LIKE '8.%' OR VERSION() LIKE '9.%' THEN 'OK - Versão compatível com utf8mb4_0900_ai_ci'
        WHEN VERSION() LIKE '5.7%' THEN 'AVISO - MySQL 5.7 pode não suportar utf8mb4_0900_ai_ci'
        ELSE 'ERRO - Versão MySQL muito antiga'
    END AS status_versao;

-- 4. Verificar collations disponíveis
SELECT COUNT(*) AS total_collations_utf8mb4
FROM information_schema.COLLATIONS 
WHERE COLLATION_NAME LIKE 'utf8mb4%';

-- 5. Verificar se utf8mb4_0900_ai_ci está disponível
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN 'OK - Collation utf8mb4_0900_ai_ci disponível'
        ELSE 'ERRO - Collation utf8mb4_0900_ai_ci NÃO disponível (use utf8mb4_general_ci)'
    END AS status_collation
FROM information_schema.COLLATIONS 
WHERE COLLATION_NAME = 'utf8mb4_0900_ai_ci';

-- 6. Verificar privilégios do usuário atual
SHOW GRANTS;
