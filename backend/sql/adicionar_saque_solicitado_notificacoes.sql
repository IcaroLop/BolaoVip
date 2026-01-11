-- Script: Adicionar tipos de notificação saque_solicitado e pix_expirado
-- Data: 2026-01-11
-- Descrição: Adiciona novos valores ao ENUM da coluna 'tipo' na tabela notificacoes_usuarios

-- PASSO 1: Verificar valores atuais
SELECT DISTINCT tipo FROM notificacoes_usuarios ORDER BY tipo;

-- PASSO 2: Alterar ENUM com todos os valores conhecidos
-- Primeiro, identificar valores que podem estar no banco
ALTER TABLE notificacoes_usuarios 
MODIFY COLUMN tipo ENUM(
  'palpite_enviado', 
  'pagamento_confirmado', 
  'inicio_rodada', 
  'resultado_publicado', 
  'premio_recebido', 
  'sistema', 
  'saque_solicitado',
  'pix_expirado',
  'deposito_confirmado',
  'saque',
  'saque_expirado'
) NOT NULL DEFAULT 'sistema';

-- PASSO 3: Verificação
SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'bolaovip' AND TABLE_NAME = 'notificacoes_usuarios' AND COLUMN_NAME = 'tipo';
