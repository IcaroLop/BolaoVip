import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import API_BASE_URL from '../config';
import './NoticiasPage.css';

const API = API_BASE_URL;

const NoticiasPage = () => {
  const [noticias, setNoticias] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [atualizando, setAtualizando] = useState(false);
  const [pullProgress, setPullProgress] = useState(0);

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
      const res = await axios.get(`${API}/noticias?limite=50`, authHeader);
      
      // Filtrar apenas notícias de fonte GE (case-insensitive)
      const noticiasFiltradas = res.data.filter(n => {
        const fonte = n.fonte ? n.fonte.toString().trim().toUpperCase() : '';
        return fonte === 'GE';
      });
      
      setNoticias(noticiasFiltradas);
      setUltimaAtualizacao(new Date());
    } catch (err) {
      console.error('[NoticiasPage] Erro ao carregar notícias:', err);
    } finally {
      setCarregando(false);
    }
  };

  const buscarNoticiasAoVivo = async () => {
    if (atualizando) return;
    setAtualizando(true);

    try {
      const res = await axios.get(`${API}/noticias?limite=50`, authHeader);
      
      // Filtrar apenas notícias de fonte GE (case-insensitive)
      const noticiasFiltradas = res.data.filter(n => {
        const fonte = n.fonte ? n.fonte.toString().trim().toUpperCase() : '';
        return fonte === 'GE';
      });
      
      setNoticias(noticiasFiltradas);
      setUltimaAtualizacao(new Date());
    } catch (err) {
      console.error('[NoticiasPage] Erro ao atualizar notícias:', err);
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
    
    // Implementar pull-to-refresh
    let touchStartY = 0;
    let isDragging = false;

    const handleTouchStart = (e) => {
      // Só inicia pull se estiver no topo da página
      if (window.scrollY === 0) {
        touchStartY = e.touches[0].clientY;
        isDragging = true;
      }
    };

    const handleTouchMove = (e) => {
      if (!isDragging || atualizando) return;

      const touchY = e.touches[0].clientY;
      const diff = touchY - touchStartY;

      // Mostrar progresso visualmente
      if (diff > 0) {
        const progress = Math.min(diff / 80, 1); // 80px para trigger completo
        setPullProgress(progress);

        // Prevenir scroll enquanto faz pull
        if (diff > 10) {
          e.preventDefault();
        }
      }
    };

    const handleTouchEnd = (e) => {
      isDragging = false;

      // Se puxou mais de 80px, atualizar
      if (pullProgress >= 1) {
        buscarNoticiasAoVivo();
      }

      setPullProgress(0);
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [atualizando]);

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
      {/* Indicador de Pull-to-Refresh */}
      {pullProgress > 0 && (
        <div className="pull-to-refresh-indicator" style={{ opacity: pullProgress }}>
          <div className="pull-spinner" style={{ transform: `rotate(${pullProgress * 360}deg)` }}>
            🔄
          </div>
          <p>{pullProgress >= 1 ? 'Solte para atualizar' : 'Deslize para atualizar'}</p>
        </div>
      )}

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

