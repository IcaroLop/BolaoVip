-- Script COMPATÍVEL: Criar tabela pix_depositos
-- Compatível com MySQL 5.7+ e 8.0+
-- Propósito: Armazenar depósitos via PIX da EFI

USE `bolaovip`;

-- Remover índices se existirem (caso de recriação)
DROP INDEX IF EXISTS idx_depositos_pendentes ON pix_depositos;
DROP INDEX IF EXISTS idx_depositos_usuario_status ON pix_depositos;

-- Remover tabela se existir (CUIDADO: remove dados!)
-- Descomente apenas se quiser recriar do zero
-- DROP TABLE IF EXISTS `pix_depositos`;

-- Criar tabela pix_depositos
CREATE TABLE IF NOT EXISTS `pix_depositos` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `id_usuario` INT NOT NULL,
  `txid` VARCHAR(50) NOT NULL,
  `status` VARCHAR(30) NOT NULL DEFAULT 'ATIVA',
  `status_pagamento` VARCHAR(30) DEFAULT 'PENDENTE' COMMENT 'PENDENTE, PAGO, EXPIRADO',
  `data_pagamento` DATETIME DEFAULT NULL COMMENT 'Data de pagamento confirmado',
  `valor_original` DECIMAL(10,2) NOT NULL,
  `chave_pix` VARCHAR(100) NOT NULL,
  `solicitacao_pagador` VARCHAR(255) DEFAULT NULL,
  `loc_id` INT DEFAULT NULL,
  `loc_location` TEXT,
  `loc_tipo` VARCHAR(30) DEFAULT NULL,
  `pix_copiaecola` TEXT,
  `calendario_criacao` DATETIME DEFAULT NULL,
  `calendario_expiracao` INT DEFAULT NULL COMMENT 'Segundos até expiração',
  `payload_raw` JSON DEFAULT NULL COMMENT 'JSON completo da resposta EFI',
  `webhook_recebido` TINYINT(1) DEFAULT 0,
  `webhook_payload` JSON DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_txid` (`txid`),
  KEY `idx_id_usuario` (`id_usuario`),
  KEY `idx_status_pagamento` (`status_pagamento`),
  KEY `idx_data_pagamento` (`data_pagamento`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB 
  AUTO_INCREMENT=1 
  DEFAULT CHARSET=utf8mb4 
  COLLATE=utf8mb4_general_ci 
  COMMENT='Tabela de depósitos PIX via EFI - similar a pix_cobrancas';

-- Adicionar Foreign Key separadamente (melhor para debug)
ALTER TABLE `pix_depositos` 
  ADD CONSTRAINT `fk_pix_depositos_usuario` 
  FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id`) 
  ON DELETE CASCADE;

-- Criar índices compostos para otimizar queries de fallback
CREATE INDEX idx_depositos_pendentes 
  ON pix_depositos(status_pagamento, webhook_recebido, created_at);

CREATE INDEX idx_depositos_usuario_status 
  ON pix_depositos(id_usuario, status_pagamento);

-- Verificação final
SELECT 
    'Tabela pix_depositos criada com sucesso!' AS resultado,
    COUNT(*) AS total_colunas
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = 'bolaovip' AND TABLE_NAME = 'pix_depositos';

SELECT 
    COLUMN_NAME, 
    DATA_TYPE, 
    IS_NULLABLE, 
    COLUMN_DEFAULT,
    COLUMN_KEY
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = 'bolaovip' 
  AND TABLE_NAME = 'pix_depositos'
ORDER BY ORDINAL_POSITION;
