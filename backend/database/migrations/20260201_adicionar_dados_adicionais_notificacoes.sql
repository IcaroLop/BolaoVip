-- ============================================================
-- Adicionar coluna dados_adicionais à tabela notificacoes_enviadas_jogos
-- Criada em: 2026-02-01
-- Propósito: Armazenar metadados adicionais como redireciona, tipo, etc
-- ============================================================

ALTER TABLE `notificacoes_enviadas_jogos` 
ADD COLUMN `dados_adicionais` JSON COMMENT 'Dados adicionais como tipo e redireciona' AFTER `mensagem`;
