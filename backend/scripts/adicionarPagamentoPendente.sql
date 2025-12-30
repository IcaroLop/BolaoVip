-- Adicionar 'pagamento_pendente' ao ENUM de tipo de notificações
ALTER TABLE notificacoes_usuarios 
MODIFY COLUMN tipo ENUM(
  'palpite_enviado', 
  'pagamento_pendente', 
  'pagamento_confirmado', 
  'inicio_rodada', 
  'resultado_publicado', 
  'premio_recebido', 
  'sistema'
) NOT NULL DEFAULT 'sistema';

SELECT 'ENUM atualizado com sucesso!' AS status;
