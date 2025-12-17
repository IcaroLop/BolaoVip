import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './NoticiasPage.css';

const API = 'http://192.168.56.127:3001';

const NoticiasPage = () => {
  const [noticias, setNoticias] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [atualizando, setAtualizando] = useState(false);

  const [ultimaAtualizacao, setUltimaAtualizacao] = useState(null);

  const navigate = useNavigate();

  const token = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const tParam = params.get('token');
    if (tParam) {
      try { localStorage.setItem('token', tParam); } catch {}
      try { sessionStorage.setItem('token', tParam); } catch {}
      return tParam;
    }
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

  const carregarNoticias = async () => {
    if (carregando) return;
    setCarregando(true);

    try {
      const res = await axios.get(`${API}/noticias?limite=30`, authHeader);
      setNoticias(res.data);
      setUltimaAtualizacao(new Date());
    } catch (err) {
      console.error('Erro ao carregar notícias:', err);
    } finally {
      setCarregando(false);
    }
  };

  const buscarNoticiasAoVivo = async () => {
    if (atualizando) return;
    setAtualizando(true);

    try {
      const res = await axios.get(`${API}/noticias/ao-vivo`, authHeader);
      setNoticias(res.data);
      setUltimaAtualizacao(new Date());
      await carregarAoVivo();
    } catch (err) {
      console.error('Erro ao buscar notícias ao vivo:', err);
      alert('Erro ao atualizar notícias. Tente novamente.');
    } finally {
      setAtualizando(false);
    }
  };

  const sincronizarNoticias = async () => {
    if (atualizando) return;
    setAtualizando(true);

    try {
      await axios.post(`${API}/noticias/sincronizar`, {}, authHeader);
      await carregarNoticias();
      alert('✅ Notícias sincronizadas com sucesso!');
    } catch (err) {
      console.error('Erro ao sincronizar notícias:', err);
      alert('Erro ao sincronizar notícias. Tente novamente.');
    } finally {
      setAtualizando(false);
    }
  };

  const voltarTopo = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  // Ao vivo desativado temporariamente: não realizar requisição e manter UI oculta
  const carregarAoVivo = async () => {
    // no-op
  };

  // navegarCarrossel removido por não ser utilizado


  useEffect(() => {
    carregarNoticias();
    carregarAoVivo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Atualização automática da agenda a cada 90s para manter os quadros vivos sem ação do usuário
  useEffect(() => {
    const intervalId = setInterval(() => {
      carregarAoVivo();
    }, 90000);

    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getFonteEmoji = (fonte) => {
    const fonteUpper = fonte.toUpperCase();
    if (fonteUpper === 'GE') return '⚽';
    if (fonteUpper === 'ESPN') return '🏆';
    if (fonteUpper === 'UOL') return '📰';
    return '📄';
  };

  const getFonteCor = (fonte) => {
    const fonteUpper = fonte.toUpperCase();
    if (fonteUpper === 'GE') return '#00FF88';
    if (fonteUpper === 'ESPN') return '#FFD700';
    if (fonteUpper === 'UOL') return '#FF6B35';
    return '#4BA4FF';
  };

  return (
    <div className="noticias-container">
      <div className="noticias-header">
        <h2 className="titulo">📰 Notícias do Brasileirão</h2>
        <div className="noticias-acoes">
          <button 
            className="btn-atualizar"
            onClick={buscarNoticiasAoVivo}
            disabled={atualizando}
          >
            {atualizando ? '🔄 Atualizando...' : '🔄 Atualizar Agora'}
          </button>
          {ultimaAtualizacao && (
            <span className="ultima-atualizacao">
              Atualizado: {ultimaAtualizacao.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {/* Bloco de jogos ao vivo desativado temporariamente */}

      <section className="agenda-bloco">
        <div className="agenda-header">
          <div>
            <p className="agenda-legenda">Mundo · Ao vivo (principais ligas e copas)</p>
            <h3>Destaques internacionais</h3>
          </div>
          <span className="agenda-count">0 partida(s)</span>
        </div>
        <p className="agenda-vazio">Quadro internacional desativado.</p>
      </section>

      {carregando && noticias.length === 0 ? (
        <p className="carregando">Carregando notícias...</p>
      ) : noticias.length === 0 ? (
        <div className="sem-noticias">
          <p>📭 Nenhuma notícia disponível</p>
          <button className="btn-sincronizar" onClick={sincronizarNoticias}>
            Sincronizar Notícias
          </button>
        </div>
      ) : (
        <div className="noticias-lista">
          {noticias.map((n, index) => (
            <div 
              key={n.id || index} 
              className="noticia-card" 
              onClick={() => navigate(`/noticia/${n.id || index}`, { state: { noticia: n } })}
            >
              {n.imagem && (
                <img
                  src={n.imagem}
                  alt="Imagem da notícia"
                  className="noticia-imagem"
                  onError={(e) => e.target.style.display = 'none'}
                />
              )}
              <div className="noticia-conteudo">
                <h3 className="noticia-titulo">{n.titulo}</h3>
                {n.resumo && n.resumo !== n.titulo && (
                  <p className="noticia-resumo">{n.resumo}</p>
                )}
                <div className="noticia-info">
                  <span 
                    className="fonte" 
                    style={{ 
                      backgroundColor: getFonteCor(n.fonte),
                      color: '#000',
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      fontWeight: 'bold'
                    }}
                  >
                    {getFonteEmoji(n.fonte)} {n.fonte.toUpperCase()}
                  </span>
                  <span className="data">
                    {new Date(n.data_publicacao).toLocaleString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <button className="btn-topo-flutuante" onClick={voltarTopo}>🔝</button>
    </div>
  );
};

export default NoticiasPage;

