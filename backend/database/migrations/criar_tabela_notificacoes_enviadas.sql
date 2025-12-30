-- Script para criar tabela de rastreamento de notificações enviadas
-- Execute este script no banco bolaovip

CREATE TABLE IF NOT EXISTS notificacoes_enviadas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  rodada_id INT NOT NULL,
  campeonato_id INT,
  tempo_alerta INT NOT NULL COMMENT '60, 30, 15 ou 5 minutos',
  notification_id BIGINT UNIQUE,
  data_envio DATETIME DEFAULT CURRENT_TIMESTAMP,
  data_agendada DATETIME COMMENT 'Quando a notificação deve disparar',
  status ENUM('agendada', 'enviada', 'expirada', 'cancelada') DEFAULT 'agendada',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (rodada_id) REFERENCES rodadas(id) ON DELETE CASCADE,
  INDEX idx_rodada_tempo (rodada_id, tempo_alerta),
  INDEX idx_data_envio (data_envio),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Índice composto para evitar duplicatas
CREATE UNIQUE INDEX idx_rodada_tempo_alerta ON notificacoes_enviadas(rodada_id, tempo_alerta);

-- Script para inserir notificações (executado pelo backend)
-- INSERT INTO notificacoes_enviadas (rodada_id, campeonato_id, tempo_alerta, notification_id, data_agendada)
-- VALUES (18, 10, 60, 1860, '2025-01-05 14:45:00');
