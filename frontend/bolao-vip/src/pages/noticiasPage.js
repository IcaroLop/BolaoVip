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
  
  // Estados para os cards de ranking
  const [rankingG4, setRankingG4] = useState([]);
  const [rankingZ4, setRankingZ4] = useState([]);
  const [maiorLanterna, setMaiorLanterna] = useState(null);
  const [tabAtiva, setTabAtiva] = useState('g4'); // 'g4', 'z4', 'lanterna'
  const [carregandoRanking, setCarregandoRanking] = useState(false);

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

  const carregarRanking = async () => {
    if (carregandoRanking) return;
    setCarregandoRanking(true);

    try {
      const grupoId = localStorage.getItem('grupoId') || sessionStorage.getItem('grupoId');
      if (!grupoId) {
        console.warn('[NoticiasPage] Nenhum grupo selecionado');
        setCarregandoRanking(false);
        return;
      }

      // Buscar rodada vigente
      let rodadaFinal = 1;
      try {
        const rvRes = await axios.get(`${API}/resultados/rodada-vigente?grupoId=${grupoId}`, authHeader);
        rodadaFinal = rvRes.data?.rodada ?? rvRes.data?.rodada_vigente ?? 1;
      } catch (err) {
        console.error('[NoticiasPage] Erro ao obter rodada vigente:', err);
      }

      // Buscar ranking geral
      const params = new URLSearchParams();
      params.append('grupoId', grupoId);
      params.append('rodadaFinal', rodadaFinal);
      params.append('campeonatoId', 10);

      const res = await axios.get(`${API}/ranking/geral?${params.toString()}`, authHeader);
      const ranking = res.data || [];

      // G4 - Top 4
      const top4 = ranking.slice(0, 4);
      setRankingG4(top4);

      // Z4 - Bottom 4
      const bottom4 = ranking.slice(-4).reverse();
      setRankingZ4(bottom4);

      // Maior Lanterna - Último colocado
      const ultimo = ranking[ranking.length - 1];
      const penultimo = ranking[ranking.length - 2];
      if (ultimo) {
        setMaiorLanterna({
          ...ultimo,
          diferencaPenultimo: penultimo ? (penultimo.pontos_totais - ultimo.pontos_totais).toFixed(2) : 0
        });
      }
    } catch (err) {
      console.error('[NoticiasPage] Erro ao carregar ranking:', err);
    } finally {
      setCarregandoRanking(false);
    }
  };

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
      
      // Atualizar ranking também
      await carregarRanking();
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
    carregarRanking();
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

  const getMedalha = (posicao) => {
    if (posicao === 1) return '🥇';
    if (posicao === 2) return '🥈';
    if (posicao === 3) return '🥉';
    if (posicao === 4) return '🏆';
    return '📍';
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

      {/* Cards de Ranking com Tabs */}
      <div className="ranking-destaque-section">
        <h2 className="ranking-destaque-titulo">📊 Destaques do Ranking</h2>
        
        {/* Tabs */}
        <div className="ranking-tabs">
          <button 
            className={`ranking-tab ${tabAtiva === 'g4' ? 'active' : ''}`}
            onClick={() => setTabAtiva('g4')}
          >
            🏆 G4
          </button>
          <button 
            className={`ranking-tab ${tabAtiva === 'z4' ? 'active' : ''}`}
            onClick={() => setTabAtiva('z4')}
          >
            ⚠️ Z4
          </button>
          <button 
            className={`ranking-tab ${tabAtiva === 'lanterna' ? 'active' : ''}`}
            onClick={() => setTabAtiva('lanterna')}
          >
            💡 Lanterna
          </button>
        </div>

        {/* Conteúdo dos Tabs */}
        {carregandoRanking ? (
          <div className="ranking-card loading">
            <p>Carregando ranking...</p>
          </div>
        ) : (
          <>
            {/* G4 Card */}
            {tabAtiva === 'g4' && (
              <div className="ranking-card g4-card shake-animation">
                <h3 className="ranking-card-titulo">🏆 Zona de Glória</h3>
                <div className="ranking-grid">
                  {rankingG4.map((apostador, idx) => (
                    <div key={apostador.id_usuario} className="ranking-item g4-item">
                      <div className="ranking-item-header">
                        <span className="medalha">{getMedalha(idx + 1)}</span>
                        <span className="posicao">{idx + 1}º</span>
                      </div>
                      <p className="nome">{apostador.nome_apostador}</p>
                      <p className="pontos">{Number(apostador.pontos_totais).toFixed(2)} pts</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Z4 Card */}
            {tabAtiva === 'z4' && (
              <div className="ranking-card z4-card shake-animation">
                <h3 className="ranking-card-titulo">⚠️ Zona de Perigo</h3>
                <div className="ranking-grid">
                  {rankingZ4.map((apostador, idx) => (
                    <div key={apostador.id_usuario} className="ranking-item z4-item">
                      <div className="ranking-item-header">
                        <span className="alerta">⚠️</span>
                        <span className="posicao">{apostador.posicao}º</span>
                      </div>
                      <p className="nome">{apostador.nome_apostador}</p>
                      <p className="pontos">{Number(apostador.pontos_totais).toFixed(2)} pts</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Lanterna Card */}
            {tabAtiva === 'lanterna' && maiorLanterna && (
              <div className="ranking-card lanterna-card shake-animation">
                <h3 className="ranking-card-titulo">💡 Maior Lanterna</h3>
                <div className="lanterna-destaque">
                  <div className="lanterna-icon">💡</div>
                  <h4 className="lanterna-nome">{maiorLanterna.nome_apostador}</h4>
                  <p className="lanterna-posicao">Última Posição - {maiorLanterna.posicao}º</p>
                  <p className="lanterna-pontos">{Number(maiorLanterna.pontos_totais).toFixed(2)} pontos</p>
                  <p className="lanterna-diferenca">
                    {maiorLanterna.diferencaPenultimo} pts atrás do penúltimo
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>

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

