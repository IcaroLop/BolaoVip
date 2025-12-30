import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import axios from 'axios';
import API_BASE_URL from '../config';
import './DepositoModal.css';

function DepositoModal({ isOpen, onClose, onDepositoSucesso }) {
  const [valor, setValor] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');
    setSucesso('');

    if (!valor || parseFloat(valor) <= 0) {
      setErro('Por favor, insira um valor válido (maior que 0)');
      return;
    }

    if (parseFloat(valor) < 10) {
      setErro('Valor mínimo de depósito é R$ 10,00');
      return;
    }

    if (parseFloat(valor) > 50000) {
      setErro('Valor máximo de depósito é R$ 50.000,00');
      return;
    }

    setCarregando(true);
    try {
      const token = localStorage.getItem('token');
      
      // Detectar ambiente: usar deposito-dev em desenvolvimento, deposito em produção
      const isDevelopment = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';
      const endpoint = isDevelopment ? '/saldo/deposito-dev' : '/saldo/deposito';
      
      const response = await axios.post(`${API_BASE_URL}${endpoint}`, {
        valor: parseFloat(valor)
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      setSucesso(`✅ Depósito de R$ ${parseFloat(valor).toFixed(2)} confirmado com sucesso!`);
      setValor('');
      
      setTimeout(() => {
        if (onDepositoSucesso) {
          onDepositoSucesso(response.data.movimentacao_id || response.data.deposito_id);
        }
        onClose();
      }, 2000);
    } catch (err) {
      setErro(err.response?.data?.erro || 'Erro ao solicitar depósito. Tente novamente.');
    } finally {
      setCarregando(false);
    }
  };

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>💰 Depositar Saldo</h2>
          <button className="close-button" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="valor">Valor do Depósito (R$)</label>
            <div className="input-wrapper">
              <span className="currency-prefix">R$</span>
              <input
                id="valor"
                type="number"
                min="10"
                max="50000"
                step="0.01"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder="0,00"
                disabled={carregando}
                autoFocus
              />
            </div>
            <small className="input-hint">Mínimo: R$ 10,00 | Máximo: R$ 50.000,00</small>
          </div>

          {erro && <div className="alert alert-error">{erro}</div>}
          {sucesso && <div className="alert alert-success">{sucesso}</div>}

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={carregando}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={carregando}>
              {carregando ? 'Processando...' : 'Confirmar'}
            </button>
          </div>
        </form>

        <div className="info-box">
          <p>
            <strong>ℹ️ Como funciona:</strong><br />
            1. Digite o valor desejado<br />
            2. Clique em "Confirmar"<br />
            3. Seu saldo será creditado instantaneamente (modo desenvolvimento)
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default DepositoModal;
