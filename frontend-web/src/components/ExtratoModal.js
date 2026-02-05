import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import axios from 'axios';
import API_BASE_URL from '../config';
import './ExtratoModal.css';

function ExtratoModal({ isOpen, onClose }) {
  const [extrato, setExtrato] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [filtro, setFiltro] = useState('todos');

  useEffect(() => {
    if (isOpen) {
      carregarExtrato();
    }
  }, [isOpen]);

  const carregarExtrato = async () => {
    setCarregando(true);
    setErro('');
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/saldo/extrato`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const payload = Array.isArray(response.data) ? response.data : (response.data?.extrato || []);
      const normalizado = payload.map((item) => ({
        ...item,
        valor: Number(item.valor),
        saldo_novo: Number(item.saldo_novo),
        saldo_anterior: item.saldo_anterior != null ? Number(item.saldo_anterior) : null,
      }));
      setExtrato(normalizado);
    } catch (err) {
      setErro(err.response?.data?.erro || 'Erro ao carregar extrato');
    } finally {
      setCarregando(false);
    }
  };

  const formatarData = (data) => {
    return new Date(data).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const obterIconeTipo = (tipo) => {
    const icons = {
      'deposito': '💳',
      'saque': '🏧',
      'palpite_debitado': '⚽',
      'premiacao_creditada': '🎁'
    };
    return icons[tipo] || '📝';
  };

  const obterCorStatus = (status) => {
    const cores = {
      'pendente': '#FFA500',
      'confirmado': '#4CAF50',
      'rejeitado': '#F44336',
      'cancelado': '#9E9E9E'
    };
    return cores[status] || '#666';
  };

  const filtrarExtrato = () => {
    if (filtro === 'todos') return extrato;
    return extrato.filter(item => item.tipo === filtro);
  };

  const extratoFiltrado = filtrarExtrato();
  const totalDepositos = extrato.filter(e => e.tipo === 'deposito').reduce((sum, e) => sum + Number(e.valor || 0), 0);
  const totalSaques = extrato.filter(e => e.tipo === 'saque').reduce((sum, e) => sum + Number(e.valor || 0), 0);
  const totalPalpites = extrato.filter(e => e.tipo === 'palpite_debitado').reduce((sum, e) => sum + Number(e.valor || 0), 0);
  const totalPremios = extrato.filter(e => e.tipo === 'premiacao_creditada').reduce((sum, e) => sum + Number(e.valor || 0), 0);

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📋 Extrato de Movimentações</h2>
          <button className="close-button" onClick={onClose}>&times;</button>
        </div>

        {/* Resumo */}
        <div className="resumo-container">
          <div className="resumo-item">
            <span className="label">💳 Depósitos</span>
            <span className="valor positivo">+R$ {totalDepositos.toFixed(2)}</span>
          </div>
          <div className="resumo-item">
            <span className="label">🏧 Saques</span>
            <span className="valor negativo">-R$ {totalSaques.toFixed(2)}</span>
          </div>
          <div className="resumo-item">
            <span className="label">⚽ Palpites</span>
            <span className="valor negativo">-R$ {totalPalpites.toFixed(2)}</span>
          </div>
          <div className="resumo-item">
            <span className="label">🎁 Prêmios</span>
            <span className="valor positivo">+R$ {totalPremios.toFixed(2)}</span>
          </div>
        </div>

        {/* Filtro */}
        <div className="filtro-container">
          <select 
            value={filtro} 
            onChange={(e) => setFiltro(e.target.value)}
            disabled={carregando}
          >
            <option value="todos">Todas as movimentações</option>
            <option value="deposito">💳 Depósitos</option>
            <option value="saque">🏧 Saques</option>
            <option value="palpite_debitado">⚽ Palpites</option>
            <option value="premiacao_creditada">🎁 Prêmios</option>
          </select>
        </div>

        {erro && <div className="alert alert-error">{erro}</div>}

        {carregando ? (
          <div className="loading">Carregando extrato...</div>
        ) : extratoFiltrado.length === 0 ? (
          <div className="empty-state">
            <p>Nenhuma movimentação encontrada</p>
          </div>
        ) : (
          <div className="extrato-table">
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Tipo</th>
                  <th>Valor</th>
                  <th>Saldo</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {extratoFiltrado.map((item, index) => (
                  <tr key={index} className={`status-${item.status}`}>
                    <td className="data">{formatarData(item.criado_em)}</td>
                    <td className="tipo">
                      <span className="tipo-badge">
                        {obterIconeTipo(item.tipo)} {item.tipo.replace(/_/g, ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className={`valor ${['deposito', 'premiacao_creditada'].includes(item.tipo) ? 'positivo' : 'negativo'}`}>
                      {['deposito', 'premiacao_creditada'].includes(item.tipo) ? '+' : '-'}R$ {Math.abs(Number(item.valor || 0)).toFixed(2)}
                    </td>
                    <td className="saldo-novo">R$ {Number(item.saldo_novo || 0).toFixed(2)}</td>
                    <td className="status">
                      <span 
                        className="status-badge"
                        style={{ color: obterCorStatus(item.status) }}
                      >
                        {item.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Fechar
          </button>
          <button type="button" className="btn btn-secondary" onClick={carregarExtrato} disabled={carregando}>
            {carregando ? 'Atualizando...' : 'Atualizar'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default ExtratoModal;
