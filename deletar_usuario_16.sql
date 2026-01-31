-- Deletar registros do usuário icaro.sales@seisu.com.br (ID 16)

DELETE FROM palpites WHERE id_usuario = 16;
DELETE FROM extrato_movimentacao WHERE usuario_id = 16;
DELETE FROM pagamentos WHERE usuario_id = 16;
DELETE FROM pix_depositos WHERE usuario_id = 16;
DELETE FROM pix_cobrancas WHERE usuario_id = 16;
DELETE FROM notificacoes WHERE usuario_id = 16;
DELETE FROM usuarios WHERE id = 16;

SELECT 'Usuario ID 16 deletado com sucesso!' as resultado;
