import React, { useEffect, useState, useCallback, useMemo } from 'react';
import axios from 'axios';
import API_BASE_URL from '../config';
import './PremiacoesPendentesPage.css';

const API = API_BASE_URL;

const PremiacoesPendentesPage = () => {
  const [itens, setItens] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const token = localStorage.getItem('token');
  const authHeader = useMemo(() => (token ? { headers: { Authorization: `Bearer ${token}` } } : {}), [token]);

  const carregarPendentes = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setMensagem('');
    try {
      const res = await axios.get(`${API}/premiacoes/pendentes-confirmacao`, authHeader);
      setItens(res.data || []);
    } catch (err) {
      console.error('Erro ao carregar premiações pendentes:', err);
      setMensagem(err?.response?.data?.erro || 'Erro ao carregar premiações pendentes.');
    } finally {
      setLoading(false);
    }
  }, [token, authHeader]);

  useEffect(() => { carregarPendentes(); }, [carregarPendentes]);

  const confirmarPagamento = async (premioId, tipo) => {
    try {
      setMensagem('Processando...');
      const res = await axios.post(`${API}/premiacoes/${premioId}/confirmar-pagamento`, { tipo }, authHeader);
      const msg = res?.data?.mensagem || 'Operação realizada com sucesso.';
      setMensagem(msg);
      await carregarPendentes();
    } catch (err) {
      console.error('Erro ao confirmar pagamento:', err);
      setMensagem(err?.response?.data?.erro || 'Erro ao confirmar pagamento.');
    }
  };

  const vazio = !loading && (!itens || itens.length === 0);

  return (
    <div className="premiacoes-container">
      <div className="premiacoes-header">
        <h2>💳 Premiações Pendentes de Confirmação</h2>
        <p>Use seu saldo para quitar parcial ou integralmente prêmios negativos.</p>
      </div>

      {mensagem && (
        <div className="premiacoes-message">{mensagem}</div>
      )}

      {loading && <p>Carregando...</p>}

      {vazio && (
        <div className="premiacoes-empty">
          <p>Nenhuma premiação pendente no momento.</p>
        </div>
      )}

      {!vazio && !loading && (
        <div className="premiacoes-grid">
          {itens.map(item => {
            const valorTotal = Number(item.valor_total || 0);
            const saldoParcial = Number(item.saldo_parcial || 0);
            const valorRestante = Number(item.valor_restante || Math.max(0, valorTotal - saldoParcial));
            return (
              <div key={item.id} className="premiacao-card">
                <div className="premiacao-meta">
                  <div className="rodada">Rodada {item.rodada}</div>
                  <div className="tipo">{item.tipo_premio}</div>
                </div>
                <div className="premiacao-values">
                  <div>Total devido: <strong>R$ {valorTotal.toFixed(2)}</strong></div>
                  <div>Saldo disponível: <strong>R$ {saldoParcial.toFixed(2)}</strong></div>
                  <div>Restante via PIX: <strong>R$ {valorRestante.toFixed(2)}</strong></div>
                </div>
                <div className="premiacao-actions">
                  <button onClick={() => confirmarPagamento(item.id, 'parcial')} className="btn btn-primary">
                    Usar saldo disponível
                  </button>
                  <button onClick={() => confirmarPagamento(item.id, 'integral')} className="btn btn-success">
                    Pagar integral com saldo
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PremiacoesPendentesPage;
