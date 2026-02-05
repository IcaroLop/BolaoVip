import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import axios from 'axios';
import API_BASE_URL from '../config';
import './SaqueModal.css';

function SaqueModal({ isOpen, onClose, saldoDisponivel, onSaqueSucesso }) {
  const [valor, setValor] = useState('');
  const [chavePix, setChavePix] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');

  // Buscar chave PIX do usuário ao abrir modal
  useEffect(() => {
    if (isOpen) {
      buscarChavePixUsuario();
    }
  }, [isOpen]);

  const buscarChavePixUsuario = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/usuarios/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.chave_pix) {
        setChavePix(response.data.chave_pix);
      }
    } catch (err) {
      console.error('Erro ao buscar chave PIX:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');
    setSucesso('');

    if (!valor || parseFloat(valor) <= 0) {
      setErro('Por favor, insira um valor válido (maior que 0)');
      return;
    }

    if (parseFloat(valor) < 50) {
      setErro('Valor mínimo de saque é R$ 50,00');
      return;
    }

    if (parseFloat(valor) > saldoDisponivel) {
      setErro(`Saldo insuficiente. Disponível: R$ ${saldoDisponivel.toFixed(2)}`);
      return;
    }

    if (parseFloat(valor) > (saldoDisponivel * 0.5)) {
      setErro('Não é possível sacar mais de 50% do saldo em uma única transação');
      return;
    }

    setCarregando(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_BASE_URL}/saldo/saque`, {
        valor: parseFloat(valor),
        chave_pix: chavePix || null
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      setSucesso(`Saque de R$ ${parseFloat(valor).toFixed(2)} solicitado com sucesso! Em análise.`);
      setValor('');
      setChavePix('');
      
      setTimeout(() => {
        if (onSaqueSucesso) {
          onSaqueSucesso(response.data.saque_id);
        }
        onClose();
      }, 2000);
    } catch (err) {
      setErro(err.response?.data?.erro || 'Erro ao solicitar saque. Tente novamente.');
    } finally {
      setCarregando(false);
    }
  };

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📤 Solicitar Saque</h2>
          <button className="close-button" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="saldo-info">
            <span className="label">Saldo Disponível:</span>
            <span className="valor">R$ {Number(saldoDisponivel || 0).toFixed(2)}</span>
          </div>

          <div className="form-group">
            <label htmlFor="valor">Valor do Saque (R$)</label>
            <div className="input-wrapper">
              <span className="currency-prefix">R$</span>
              <input
                id="valor"
                type="number"
                min="50"
                max={Math.min(saldoDisponivel, saldoDisponivel * 0.5)}
                step="0.01"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder="0,00"
                disabled={carregando}
                autoFocus
              />
            </div>
            <small className="input-hint">
              Mínimo: R$ 50,00 | Máximo: {Math.min(saldoDisponivel, saldoDisponivel * 0.5) > 0 
                ? `R$ ${Math.min(saldoDisponivel, saldoDisponivel * 0.5).toFixed(2)}`
                : 'Saldo insuficiente'}
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="chave-pix">Chave PIX (Opcional)</label>
            <input
              id="chave-pix"
              type="text"
              value={chavePix}
              onChange={(e) => setChavePix(e.target.value)}
              placeholder="CPF, email, telefone ou aleatória"
              disabled={carregando}
            />
            <small className="input-hint">Deixe em branco para usar dados cadastrados</small>
          </div>

          {erro && <div className="alert alert-error">{erro}</div>}
          {sucesso && <div className="alert alert-success">{sucesso}</div>}

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={carregando}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={carregando || saldoDisponivel <= 0}>
              {carregando ? 'Processando...' : 'Solicitar Saque'}
            </button>
          </div>
        </form>

            <div className="info-box">
              <p>
                <strong>ℹ️ Informações:</strong><br />
                • Modo DEV: saque instantâneo (simulado)<br />
                • Modo Produção: saques levam até 2 dias úteis<br />
                • Iremos para PIX da chave fornecida<br />
                • Taxas podem ser aplicadas
              </p>
            </div>
      </div>
    </div>,
    document.body
  );
}

export default SaqueModal;
