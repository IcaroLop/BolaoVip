import React, { useState } from 'react';
import axios from 'axios';
import API_BASE_URL from '../config';
import './TrocarSenhaModal.css';

const TrocarSenhaModal = ({ isOpen, onClose, token, bloqueante = false }) => {
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [tipoMensagem, setTipoMensagem] = useState(''); // 'erro' ou 'sucesso'
  const [processando, setProcessando] = useState(false);

  if (!isOpen) return null;

  const validarSenha = (senha) => {
    // Pelo menos 8 caracteres
    if (senha.length < 8) {
      return 'A senha deve ter pelo menos 8 caracteres';
    }

    // Letra maiúscula
    if (!/[A-Z]/.test(senha)) {
      return 'A senha deve conter pelo menos uma letra maiúscula';
    }

    // Letra minúscula
    if (!/[a-z]/.test(senha)) {
      return 'A senha deve conter pelo menos uma letra minúscula';
    }

    // Número
    if (!/\d/.test(senha)) {
      return 'A senha deve conter pelo menos um número';
    }

    // Caractere especial
    if (!/[@$!%*?&#]/.test(senha)) {
      return 'A senha deve conter pelo menos um caractere especial (@$!%*?&#)';
    }

    return null; // Senha válida
  };

  const handleTrocarSenha = async (e) => {
    e.preventDefault();
    setMensagem('');
    setTipoMensagem('');

    // Validações
    if (!senhaAtual || !novaSenha || !confirmarSenha) {
      setMensagem('Preencha todos os campos');
      setTipoMensagem('erro');
      return;
    }

    if (novaSenha !== confirmarSenha) {
      setMensagem('A nova senha e a confirmação não conferem');
      setTipoMensagem('erro');
      return;
    }

    // Validar complexidade da nova senha
    const erroValidacao = validarSenha(novaSenha);
    if (erroValidacao) {
      setMensagem(erroValidacao);
      setTipoMensagem('erro');
      return;
    }

    setProcessando(true);

    try {
      const res = await axios.put(
        `${API_BASE_URL}/auth/trocar-senha`,
        { senhaAtual, novaSenha },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setMensagem(res.data.mensagem || 'Senha alterada com sucesso!');
      setTipoMensagem('sucesso');

      // Aguardar 2s e fechar modal
      setTimeout(() => {
        setSenhaAtual('');
        setNovaSenha('');
        setConfirmarSenha('');
        onClose(true); // true indica sucesso
      }, 2000);
    } catch (err) {
      console.error('Erro ao trocar senha:', err);
      setMensagem(err?.response?.data?.erro || 'Erro ao trocar senha');
      setTipoMensagem('erro');
    } finally {
      setProcessando(false);
    }
  };

  const handleFechar = () => {
    if (bloqueante) {
      setMensagem('Você precisa trocar a senha para continuar');
      setTipoMensagem('erro');
      return;
    }
    onClose(false);
  };

  return (
    <div className="trocar-senha-overlay">
      <div className="trocar-senha-modal">
        <div className="trocar-senha-header">
          <h2>🔐 Trocar Senha</h2>
          {!bloqueante && (
            <button className="trocar-senha-close" onClick={handleFechar}>×</button>
          )}
        </div>

        {bloqueante && (
          <div className="trocar-senha-aviso">
            ⚠️ <strong>Atenção:</strong> Você está usando a senha padrão. Por segurança, é necessário trocar sua senha antes de continuar.
          </div>
        )}

        <form onSubmit={handleTrocarSenha} className="trocar-senha-form">
          <div className="form-group">
            <label>Senha Atual:</label>
            <input
              type="password"
              value={senhaAtual}
              onChange={(e) => setSenhaAtual(e.target.value)}
              placeholder="Digite sua senha atual"
              disabled={processando}
              required
            />
          </div>

          <div className="form-group">
            <label>Nova Senha:</label>
            <input
              type="password"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              placeholder="Digite a nova senha"
              disabled={processando}
              required
            />
            <small className="senha-requisitos">
              Mínimo 8 caracteres: letras maiúsculas, minúsculas, números e especiais (@$!%*?&#)
            </small>
          </div>

          <div className="form-group">
            <label>Confirmar Nova Senha:</label>
            <input
              type="password"
              value={confirmarSenha}
              onChange={(e) => setConfirmarSenha(e.target.value)}
              placeholder="Confirme a nova senha"
              disabled={processando}
              required
            />
          </div>

          {mensagem && (
            <div className={`trocar-senha-mensagem ${tipoMensagem}`}>
              {mensagem}
            </div>
          )}

          <div className="trocar-senha-actions">
            <button
              type="submit"
              className="btn-confirmar"
              disabled={processando}
            >
              {processando ? 'Processando...' : 'Confirmar Troca'}
            </button>
            {!bloqueante && (
              <button
                type="button"
                className="btn-cancelar"
                onClick={handleFechar}
                disabled={processando}
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default TrocarSenhaModal;
