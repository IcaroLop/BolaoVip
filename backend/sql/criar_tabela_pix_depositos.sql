-- Script: Criar tabela pix_depositos para armazenar depósitos via PIX
-- DB: bolaovip
-- Propósito: Armazenar QRCode, CopiaECola e status de depósitos EFI PIX
-- Similar a pix_cobrancas, mas para depósitos do usuário

USE `bolaovip`;

-- Verificar se tabela usuario existe
SET @usuario_exists = (
    SELECT COUNT(*) 
    FROM information_schema.TABLES 
    WHERE TABLE_SCHEMA = 'bolaovip' AND TABLE_NAME = 'usuario'
);

-- Criar tabela pix_depositos SEM Foreign Key primeiro
CREATE TABLE IF NOT EXISTS `pix_depositos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_usuario` int NOT NULL,
  `txid` varchar(50) NOT NULL,
  `status` varchar(30) NOT NULL DEFAULT 'ATIVA',
  `status_pagamento` varchar(30) DEFAULT 'PENDENTE' COMMENT 'PENDENTE, PAGO, EXPIRADO',
  `data_pagamento` datetime DEFAULT NULL COMMENT 'Data de pagamento confirmado',
  `valor_original` decimal(10,2) NOT NULL,
  `chave_pix` varchar(100) NOT NULL,
  `solicitacao_pagador` varchar(255) DEFAULT NULL,
  `loc_id` int DEFAULT NULL,
  `loc_location` text,
  `loc_tipo` varchar(30) DEFAULT NULL,
  `pix_copiaecola` text,
  `calendario_criacao` datetime DEFAULT NULL,
  `calendario_expiracao` int DEFAULT NULL COMMENT 'Segundos até expiração',
  `payload_raw` json DEFAULT NULL COMMENT 'JSON completo da resposta EFI',
  `webhook_recebido` tinyint(1) DEFAULT '0',
  `webhook_payload` json DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `txid` (`txid`),
  KEY `idx_id_usuario` (`id_usuario`),
  KEY `idx_status_pagamento` (`status_pagamento`),
  KEY `idx_data_pagamento` (`data_pagamento`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_depositos_pendentes` (status_pagamento, webhook_recebido, created_at),
  KEY `idx_depositos_usuario_status` (id_usuario, status_pagamento)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Tentar adicionar Foreign Key (só funciona se tabela usuario existir)
-- Se der erro, ignore e adicione manualmente depois
SET @add_fk = CONCAT(
    'ALTER TABLE `pix_depositos` ',
    'ADD CONSTRAINT `fk_pix_depositos_usuario` ',
    'FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id`) ',
    'ON DELETE CASCADE'
);

-- Executar apenas se usuario existir
SET @skip_fk = IF(@usuario_exists > 0, @add_fk, 'SELECT "AVISO: Tabela usuario não existe. FK não adicionada." AS aviso');
PREPARE stmt FROM @skip_fk;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verificação
SELECT COUNT(*) AS total_tables_pix_depositos 
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = 'bolaovip' AND TABLE_NAME = 'pix_depositos';

-- Confirmação de sucesso
-- SELECT 'Tabela pix_depositos criada com sucesso!' AS resultado;
