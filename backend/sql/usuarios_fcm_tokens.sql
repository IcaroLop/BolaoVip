-- Script para criar tabela de tokens FCM
-- Execute no banco de dados: mysql bolaovip < usuarios_fcm_tokens.sql

CREATE TABLE IF NOT EXISTS usuarios_fcm_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  fcm_token VARCHAR(500) NOT NULL UNIQUE,
  platform ENUM('android', 'ios', 'web') DEFAULT 'android',
  data_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
  ultima_atividade DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  ativo BOOLEAN DEFAULT TRUE,
  
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  INDEX idx_usuario (usuario_id),
  INDEX idx_token (fcm_token),
  INDEX idx_ativo (ativo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

COMMENT ON TABLE usuarios_fcm_tokens IS 'Armazena tokens Firebase Cloud Messaging para notificações push';
