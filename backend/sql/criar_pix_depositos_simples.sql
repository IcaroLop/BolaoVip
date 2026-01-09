-- Script SIMPLIFICADO: Criar tabela pix_depositos
-- Sem Foreign Key (adicione depois manualmente se necessário)

USE `bolaovip`;

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
  `webhook_recebido` tinyint(1) DEFAULT 0,
  `webhook_payload` json DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `txid` (`txid`),
  KEY `idx_id_usuario` (`id_usuario`),
  KEY `idx_status_pagamento` (`status_pagamento`),
  KEY `idx_data_pagamento` (`data_pagamento`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_depositos_pendentes` (`status_pagamento`, `webhook_recebido`, `created_at`),
  KEY `idx_depositos_usuario_status` (`id_usuario`, `status_pagamento`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4;

-- Verificação
SELECT 'Tabela pix_depositos criada com sucesso!' AS resultado;
SELECT COUNT(*) AS total_colunas FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = 'bolaovip' AND TABLE_NAME = 'pix_depositos';
