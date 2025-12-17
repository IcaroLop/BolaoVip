import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import './NoticiaVisualizarPage.css';

const NoticiaVisualizarPage = () => {
  const { id } = useParams();
  const location = useLocation();
  const [noticia, setNoticia] = useState(location.state?.noticia || null);
  const [carregando, setCarregando] = useState(!noticia);
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!noticia && id) {
      async function fetchNoticia() {
        setCarregando(true);
        try {
          const res = await axios.get(`http://192.168.56.127:3001/noticias/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setNoticia(res.data);
        } catch (err) {
          console.error('Erro ao buscar notícia:', err);
        } finally {
          setCarregando(false);
        }
      }
      fetchNoticia();
    }
  }, [id, noticia, token]);

  const abrirNoNavegador = () => {
    if (noticia?.link) {
      window.open(noticia.link, '_blank');
    }
  };

  const getFonteEmoji = (fonte) => {
    const fonteUpper = fonte?.toUpperCase();
    if (fonteUpper === 'GE') return '⚽';
    if (fonteUpper === 'ESPN') return '🏆';
    if (fonteUpper === 'UOL') return '📰';
    return '📄';
  };

  const getFonteCor = (fonte) => {
    const fonteUpper = fonte?.toUpperCase();
    if (fonteUpper === 'GE') return '#00FF88';
    if (fonteUpper === 'ESPN') return '#FFD700';
    if (fonteUpper === 'UOL') return '#FF6B35';
    return '#4BA4FF';
  };

  if (carregando) {
    return (
      <div className="noticia-viewer-container">
        <p className="carregando-noticia">Carregando notícia...</p>
      </div>
    );
  }

  if (!noticia) {
    return (
      <div className="noticia-viewer-container">
        <button className="btn-voltar" onClick={() => navigate('/noticias')}>
          🔙 Voltar
        </button>
        <p className="erro-noticia">Notícia não encontrada</p>
      </div>
    );
  }

  return (
    <div className="noticia-viewer-container">
      <div className="noticia-viewer-header">
        <button className="btn-voltar" onClick={() => navigate('/noticias')}>
          🔙 Voltar
        </button>
        <button className="btn-navegador" onClick={abrirNoNavegador}>
          🔗 Abrir no Navegador
        </button>
      </div>

      <div className="noticia-viewer-content">
        {noticia.imagem && (
          <img
            src={noticia.imagem}
            alt="Imagem da notícia"
            className="noticia-viewer-imagem"
            onError={(e) => e.target.style.display = 'none'}
          />
        )}

        <div className="noticia-viewer-info">
          <span 
            className="noticia-viewer-fonte" 
            style={{ 
              backgroundColor: getFonteCor(noticia.fonte),
              color: '#000',
            }}
          >
            {getFonteEmoji(noticia.fonte)} {noticia.fonte?.toUpperCase()}
          </span>
          <span className="noticia-viewer-data">
            {new Date(noticia.data_publicacao).toLocaleString('pt-BR', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </span>
        </div>

        <h1 className="noticia-viewer-titulo">{noticia.titulo}</h1>

        {noticia.resumo && noticia.resumo !== noticia.titulo && (
          <p className="noticia-viewer-resumo">{noticia.resumo}</p>
        )}

        <div className="noticia-viewer-iframe-container">
          <iframe
            src={noticia.link}
            title="Notícia"
            className="noticia-iframe"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          />
        </div>

        <div className="noticia-viewer-footer">
          <a 
            href={noticia.link} 
            target="_blank" 
            rel="noopener noreferrer"
            className="link-original"
          >
            📄 Ler notícia completa no site original
          </a>
        </div>
      </div>
    </div>
  );
};

export default NoticiaVisualizarPage;

