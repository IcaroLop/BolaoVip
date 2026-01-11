-- Script: Alternativa - Converter coluna para VARCHAR temporariamente
-- Data: 2026-01-11
-- Descrição: Se o ENUM continuar causando problemas, use este script

-- BACKUP: Ver dados atuais
SELECT tipo, COUNT(*) as total FROM notificacoes_usuarios GROUP BY tipo;

-- OPÇÃO 1: Se houver valores que não estão no ENUM, converter para VARCHAR será mais seguro
-- ALTER TABLE notificacoes_usuarios MODIFY COLUMN tipo VARCHAR(50) NOT NULL DEFAULT 'sistema';

-- OPÇÃO 2: Ou manter como ENUM mas com todos os valores possíveis
-- Execute o comando abaixo após verificar os valores únicos acima
ALTER TABLE notificacoes_usuarios 
CHANGE COLUMN tipo tipo ENUM(
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
  'saque_expirado',
  'saque_cancelado',
  'notificacao_sistema'
) NOT NULL DEFAULT 'sistema';
