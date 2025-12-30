-- Script para adicionar coluna precisa_trocar_senha na tabela usuarios
-- Execução: mysql -u root -p bolaovip < add_precisa_trocar_senha.sql

USE bolaovip;

-- Nota: A coluna precisa_trocar_senha já deve existir na tabela usuarios
-- Se não existir, execute manualmente: ALTER TABLE usuarios ADD COLUMN precisa_trocar_senha TINYINT(1) DEFAULT 1;

-- Atualizar usuários existentes: marcar como TRUE para forçar troca na primeira vez
UPDATE usuarios 
SET precisa_trocar_senha = 1 
WHERE id > 0 AND precisa_trocar_senha IS NULL;

SELECT 'Coluna precisa_trocar_senha atualizada com sucesso!' AS status;
