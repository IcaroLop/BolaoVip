import React from 'react';
import './ConfirmacaoModal.css';

const ConfirmacaoModal = ({ 
  isOpen, 
  titulo = 'Confirmação',
  mensagem = 'Tem certeza?',
  textoBotaoConfirmar = 'Confirmar',
  textoBotaoCancelar = 'Cancelar',
  onConfirmar,
  onCancelar,
  loading = false,
  tipo = 'aviso' // 'aviso', 'perigo', 'sucesso'
}) => {
  if (!isOpen) return null;

  return (
    <div className="confirmacao-overlay">
      <div className={`confirmacao-modal confirmacao-${tipo}`}>
        <div className="confirmacao-header">
          <h2>{titulo}</h2>
          <button 
            className="confirmacao-close"
            onClick={onCancelar}
            disabled={loading}
          >
            ✕
          </button>
        </div>

        <div className="confirmacao-body">
          <p>{mensagem}</p>
        </div>

        <div className="confirmacao-footer">
          <button 
            className="confirmacao-btn-cancelar"
            onClick={onCancelar}
            disabled={loading}
          >
            {textoBotaoCancelar}
          </button>
          <button 
            className={`confirmacao-btn-confirmar confirmacao-btn-${tipo}`}
            onClick={onConfirmar}
            disabled={loading}
          >
            {loading ? '⏳ Processando...' : textoBotaoConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmacaoModal;
