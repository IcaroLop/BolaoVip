import { useEffect, useState } from 'react';
import axios from 'axios';

export default function Dashboard() {
  const [jogos, setJogos] = useState([]);
  const [palpites, setPalpites] = useState({});
  const [mensagem, setMensagem] = useState('');
  const [rankingRodada, setRankingRodada] = useState([]);
  const [rankingGeral, setRankingGeral] = useState([]);
  const rodada = 1;

  useEffect(() => {
    const token = localStorage.getItem('token');
    axios.get(`http://localhost:3000/jogos/${rodada}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((res) => setJogos(res.data));

    axios.get(`http://localhost:3000/ranking/${rodada}`).then((res) => setRankingRodada(res.data));
    axios.get(`http://localhost:3000/ranking-geral`).then((res) => setRankingGeral(res.data));
  }, []);

  const enviarPalpite = async (id_jogo) => {
    const token = localStorage.getItem('token');
    try {
      await axios.post(
        'http://localhost:3000/palpites',
        { id_jogo, gols_casa: palpites[id_jogo]?.casa || 0, gols_fora: palpites[id_jogo]?.fora || 0 },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMensagem('Palpite enviado com sucesso!');
    } catch (err) {
      setMensagem('Erro ao enviar palpite');
    }
  };

  return (
    <div className="p-6 bg-gray-900 text-white min-h-screen">
      <h2 className="text-2xl font-bold mb-4">Rodada {rodada} - Palpites</h2>
      {mensagem && <p className="mb-4 text-green-400">{mensagem}</p>}
      <div className="space-y-4 mb-8">
        {jogos.map((jogo) => (
          <div key={jogo.id} className="bg-gray-800 p-4 rounded-xl flex justify-between items-center">
            <div>
              <p>{jogo.time_casa} vs {jogo.time_fora}</p>
              <div className="flex gap-2 mt-2">
                <input
                  type="number"
                  placeholder="Gols Casa"
                  className="w-20 p-1 rounded"
                  value={palpites[jogo.id]?.casa || ''}
                  onChange={(e) => setPalpites({ ...palpites, [jogo.id]: { ...palpites[jogo.id], casa: e.target.value } })}
                />
                <input
                  type="number"
                  placeholder="Gols Fora"
                  className="w-20 p-1 rounded"
                  value={palpites[jogo.id]?.fora || ''}
                  onChange={(e) => setPalpites({ ...palpites, [jogo.id]: { ...palpites[jogo.id], fora: e.target.value } })}
                />
              </div>
            </div>
            <button className="bg-green-600 px-3 py-1 rounded" onClick={() => enviarPalpite(jogo.id)}>Enviar</button>
          </div>
        ))}
      </div>

      <h2 className="text-2xl font-bold mb-4">Ranking da Rodada {rodada}</h2>
      <table className="w-full text-left bg-gray-800 rounded-xl overflow-hidden mb-8">
        <thead className="bg-gray-700">
          <tr>
            <th className="p-2">Posição</th>
            <th className="p-2">Usuário</th>
            <th className="p-2">Pontos</th>
          </tr>
        </thead>
        <tbody>
          {rankingRodada.map((item, idx) => (
            <tr key={idx} className="border-b border-gray-600">
              <td className="p-2">{item.posicao}</td>
              <td className="p-2">{item.nome}</td>
              <td className="p-2">{item.pontos_totais}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="text-2xl font-bold mb-4">Ranking Geral</h2>
      <table className="w-full text-left bg-gray-800 rounded-xl overflow-hidden">
        <thead className="bg-gray-700">
          <tr>
            <th className="p-2">Posição</th>
            <th className="p-2">Usuário</th>
            <th className="p-2">Pontos</th>
          </tr>
        </thead>
        <tbody>
          {rankingGeral.map((item, idx) => (
            <tr key={idx} className="border-b border-gray-600">
              <td className="p-2">{item.posicao}</td>
              <td className="p-2">{item.nome}</td>
              <td className="p-2">{item.pontos_totais}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
