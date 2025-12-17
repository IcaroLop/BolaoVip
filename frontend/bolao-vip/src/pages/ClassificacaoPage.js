import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import './ClassificacaoPage.css';

const API = 'http://192.168.56.127:3001';

const ClassificacaoPage = () => {
  const [classificacao, setClassificacao] = useState([]);
  const [mensagem, setMensagem] = useState('');
  const [loading, setLoading] = useState(false);
  const [grupoId, setGrupoId] = useState(() => {
    const stored = localStorage.getItem('grupoId');
    return stored ? Number(stored) : null;
  });

  const token = useMemo(() => {
    try {
      const tLocal = localStorage.getItem('token');
      if (tLocal) return tLocal;
    } catch {}
    try {
      const tSession = sessionStorage.getItem('token');
      if (tSession) return tSession;
    } catch {}
    if (process.env.REACT_APP_DEV_TOKEN && process.env.NODE_ENV !== 'production') {
      return process.env.REACT_APP_DEV_TOKEN;
    }
    return null;
  }, []);

  const authHeader = useMemo(() => (token ? { headers: { Authorization: `Bearer ${token}` } } : {}), [token]);

  useEffect(() => {
    const handleStorage = () => {
      const stored = localStorage.getItem('grupoId');
      setGrupoId(stored ? Number(stored) : null);
    };
    window.addEventListener('storage', handleStorage);
    const interval = setInterval(handleStorage, 500);
    return () => {
      window.removeEventListener('storage', handleStorage);
      clearInterval(interval);
    };
  }, []);

  const carregarClassificacao = async () => {
    if (!grupoId) {
      setMensagem('Selecione um grupo no topo para ver a classificação.');
      setClassificacao([]);
      return;
    }
    if (!token) {
      setMensagem('Faça login para consultar a classificação.');
      setClassificacao([]);
      return;
    }

    setLoading(true);
    setMensagem('');
    try {
      const res = await axios.get(`${API}/configuracoes/api-futebol/classificacao?grupoId=${grupoId}`, authHeader);
      setClassificacao(res.data.classificacao || []);
      if (!res.data.classificacao || res.data.classificacao.length === 0) {
        setMensagem('Nenhuma classificação encontrada para este grupo.');
      }
    } catch (err) {
      console.error('Erro ao buscar classificação:', err);
      const msg = err?.response?.data?.erro || err.message || 'Erro ao buscar classificação.';
      setMensagem(`❌ ${msg}`);
      setClassificacao([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarClassificacao();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grupoId, token]);

  return (
    <div className="classificacao-container">
      <h2 className="title">🏆 Tabela de Classificação</h2>
      {mensagem && <p className="muted" style={{ marginBottom: 8, whiteSpace: 'pre-wrap' }}>{mensagem}</p>}
      {loading && <p className="muted">⏳ Carregando...</p>}

      {!loading && classificacao.length > 0 && (
        <table className="classificacao-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Time</th>
              <th>P</th>
              <th>J</th>
              <th>V</th>
              <th>E</th>
              <th>D</th>
              <th>GP</th>
              <th>SG</th>
            </tr>
          </thead>
          <tbody>
            {classificacao.map((item, index) => {
              const isLeader = index === 0;
              const isZ4 = index >= classificacao.length - 4;
              const escudoUrl = item.escudo
                ? (item.escudo.startsWith('http') ? item.escudo : `${API}/escudos/${(item.escudo || '').split('/').pop()}`)
                : null;

              return (
                <tr key={`${item.time_id || index}-${index}`} className={`${isLeader ? 'leader' : ''} ${isZ4 ? 'z4' : ''}`}>
                  <td>{item.posicao || index + 1}</td>
                  <td className="time-cell">
                    {escudoUrl && (
                      <img
                        src={escudoUrl}
                        alt={item.nome_popular || 'Escudo'}
                        className="escudo"
                        onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
                      />
                    )}
                    <span className="nome-time">{item.nome_popular || item.sigla || 'Time'}</span>
                    {isLeader && <span className="emoji">🥇</span>}
                    {isZ4 && <span className="emoji">🔻</span>}
                  </td>
                  <td>{item.pontos}</td>
                  <td>{item.jogos}</td>
                  <td>{item.vitorias}</td>
                  <td>{item.empates}</td>
                  <td>{item.derrotas}</td>
                  <td>{item.gols_pro}</td>
                  <td>{item.saldo_gols}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default ClassificacaoPage;

