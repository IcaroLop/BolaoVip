-- Script: Adicionar tipos de notificação saque_solicitado e pix_expirado
-- Data: 2026-01-11
-- Descrição: Adiciona novos valores ao ENUM da coluna 'tipo' mantendo os existentes

-- Valores atuais identificados:
-- - palpite_enviado
-- - pagamento_pendente
-- - sistema
-- - pagamento_confirmado

ALTER TABLE notificacoes_usuarios 
MODIFY COLUMN tipo ENUM(
  'palpite_enviado',
  'pagamento_pendente',
  'pagamento_confirmado',
  'inicio_rodada',
  'resultado_publicado',
  'premio_recebido',
  'sistema',
  'saque_solicitado',
  'pix_expirado'
) NOT NULL DEFAULT 'sistema';

-- Verificação
SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'bolaovip' AND TABLE_NAME = 'notificacoes_usuarios' AND COLUMN_NAME = 'tipo';
