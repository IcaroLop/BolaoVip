// src/pages/RankingGeralPage.js
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './RankingGeralPage.css';

const RankingGeralPage = () => {
  const [ranking, setRanking] = useState([]);
  const [erro, setErro] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    const fetchRanking = async () => {
      try {
        const res = await axios.get('http://192.168.56.127:3001/ranking/geral', {
                    headers: {
                            Authorization: `Bearer ${token}`
                    }
        });
        setRanking(res.data);
      } catch (err) {
        console.error('Erro ao buscar ranking geral:', err);
        setErro('Erro ao carregar ranking geral.');
      }
    };

    fetchRanking();
  }, []);

  return (
    <div className="ranking-geral-container">
      <h2>🏆 Ranking Geral</h2>

      {erro && <p className="erro">{erro}</p>}

      <table className="ranking-tabela">
        <thead>
          <tr>
            <th>Posição</th>
            <th>Nome</th>
            <th>Pontos</th>
          </tr>
        </thead>
        <tbody>
          {ranking.map((user, index) => (
            <tr key={user.id_usuario}>
              <td>{index + 1}º</td>
              <td>{user.nome}</td>
              <td>{user.pontos.toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default RankingGeralPage;

