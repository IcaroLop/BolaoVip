import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import API_BASE_URL from '../config';
import './Header.css';

const API = API_BASE_URL;

const TimeFavoritoModal = ({ aberto, onClose, onSelecionar, token }) => {
  const [times, setTimes] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!aberto) return;
    const carregar = async () => {
      setCarregando(true);
      setErro('');
      try {
        const res = await axios.get(`${API}/times`);
        setTimes(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        setErro('Não foi possível carregar os times.');
      } finally {
        setCarregando(false);
      }
    };
    carregar();
  }, [aberto]);

  const handleSelecionar = async (timeId) => {
    if (!token) return;
    setSalvando(true);
    setErro('');
    try {
      const res = await axios.put(
        `${API}/times/favorito`,
        { time_id: timeId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      onSelecionar(res.data.timeFavorito || null);
    } catch (err) {
      setErro('Falha ao salvar o time favorito.');
    } finally {
      setSalvando(false);
    }
  };

  if (!aberto) return null;

  const modal = (
    <div className="time-modal-backdrop" onClick={onClose}>
      <div className="time-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="time-modal-header">
          <h3>Escolha seu time favorito</h3>
          <button className="time-modal-close" onClick={onClose} aria-label="Fechar">×</button>
        </div>

        {erro && <div className="time-modal-erro">{erro}</div>}
        {carregando && <div className="time-modal-loading">Carregando times...</div>}

        {!carregando && (
          <div className="time-grid">
            {times.map((time) => (
              <button
                key={time.id}
                className="time-card"
                onClick={() => handleSelecionar(time.id)}
                disabled={salvando}
              >
                <img src={time.escudo_url} alt={time.nome} className="time-card-escudo" />
                <span className="time-card-nome">{time.nome}</span>
              </button>
            ))}
          </div>
        )}

        <div className="time-modal-footer">
          <button
            className="time-modal-clear"
            onClick={() => handleSelecionar(null)}
            disabled={salvando}
          >
            Remover time favorito
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
};

export default TimeFavoritoModal;
