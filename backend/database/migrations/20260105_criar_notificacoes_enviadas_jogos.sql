-- ============================================================
-- Tabela para armazenar notificações agendadas de jogos
-- Criada em: 2026-01-05
-- Propósito: Rastrear notificações push enviadas 60/30/15/5 min antes de cada jogo
-- ============================================================

CREATE TABLE IF NOT EXISTS `notificacoes_enviadas_jogos` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `jogo_id` INT NOT NULL,
  `partida_id` INT NOT NULL,
  `rodada` INT NOT NULL,
  `campeonato_id` INT,
  `tempo_alerta` INT NOT NULL COMMENT '60, 30, 15, ou 5 minutos antes',
  `notification_id` BIGINT UNIQUE,
  `data_agendada` DATETIME NOT NULL,
  `data_enviada` DATETIME,
  `status` ENUM('agendada', 'enviada', 'cancelada', 'expirada') DEFAULT 'agendada',
  `titulo` VARCHAR(255),
  `mensagem` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_jogo_status (jogo_id, status),
  INDEX idx_data_status (data_agendada, status),
  FOREIGN KEY (jogo_id) REFERENCES jogos(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Índices para melhorar performance de queries
-- ============================================================

-- Já criados acima, mas documentados:
-- - idx_jogo_status: para buscar notificações por jogo e status
-- - idx_data_status: para buscar notificações agendadas por data

-- ============================================================
-- Exemplo de dados que serão inseridos automaticamente:
-- ============================================================
-- INSERT INTO notificacoes_enviadas_jogos (jogo_id, partida_id, rodada, campeonato_id, tempo_alerta, notification_id, data_agendada, status, titulo, mensagem)
-- VALUES (999, 12345, 20, 10, 60, 9999601, '2026-01-05 10:00:00', 'agendada', 'Real Madrid vs Barcelona', 'Jogo começa em 60 minutos');
