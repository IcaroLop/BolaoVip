import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './AdminAgendamentosPage.css';

const AdminAgendamentosPage = () => {
  const [proximo, setProximo] = useState(null);
  const [historico, setHistorico] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [mensagem, setMensagem] = useState('');
  const [offset, setOffset] = useState(0);
  const limit = 10;
  //const [dataConsulta, setDataConsulta] = useState('');
  const [mensagemData, setMensagemData] = useState('');
  const [dataConsulta, setDataConsulta] = useState(() => {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, '0');
  const dia = String(hoje.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`; // "2025-07-05"
  });



  useEffect(() => {
    buscarDados();
    //console.log("DATA CONSULTA NO USEEFFECT:", dataConsulta);
  }, [offset]);
  

  const consultarPorData = async () => {
  try {
    await axios.post(`http://192.168.56.127:3001/agendamentos/data/${dataConsulta}/consultar`);
    setMensagemData(`✅ Consulta dos jogos do dia ${dataConsulta} enviada com sucesso.`);
  } catch (error) {
    console.error('Erro ao consultar por data:', error);
    setMensagemData('❌ Erro ao consultar resultados da data.');
  }
  };

  const buscarDados = async () => {
    setCarregando(true);
    try {
      const [resProximo, resHistorico] = await Promise.all([
        axios.get('http://192.168.56.127:3001/agendamentos/proximo'),
        axios.get(`http://192.168.56.127:3001/agendamentos/historico?offset=${offset}&limit=${limit}`)
      ]);

      setProximo(resProximo.data);
      setHistorico(resHistorico.data);
      setCarregando(false);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      setCarregando(false);
    }
  };

  const consultarRodadaManual = async () => {
    if (!proximo) return;
    try {
      await axios.post(`http://192.168.56.127:3001/agendamentos/rodada/${proximo.rodada}/consultar`);
      setMensagem(`✅ Consulta manual da rodada ${proximo.rodada} enviada!`);
    } catch (err) {
      console.error('Erro ao consultar rodada:', err);
      setMensagem('❌ Erro ao enviar consulta manual.');
    }
  };

  return (
    <div className="admin-agendamentos-container">
      <h1>🛠️ Administração de Agendamentos</h1>

      {carregando ? (
        <p>Carregando informações...</p>
      ) : (
        <>
          {proximo ? (
            <div className="proximo-agendamento">
              <h2>📆 Próximo Agendamento</h2>
              <p><strong>Rodada:</strong> {proximo.rodada}</p>
              <p><strong>Data e Hora:</strong> {proximo.data_formatada}</p>
              <p><strong>Jogos:</strong> {proximo.quantidade_jogos}</p>
              <button onClick={consultarRodadaManual}>🔄 Consultar Rodada Manualmente</button>
              {mensagem && <p className="mensagem">{mensagem}</p>}
            </div>
            
          ) : (
            <p>❗ Nenhum agendamento encontrado.</p>
          )}

          <div className="consulta-por-data">
                <h2>📅 Consulta Manual por Data</h2>
                <form
                      onSubmit={(e) => {
                      e.preventDefault();
                      consultarPorData();
            }}
          >
            
          <input
            type="date"
            value={dataConsulta}
            onChange={(e) => {setDataConsulta(e.target.value);
              //console.log("Nova data:", e.target.value);
            }}
            
            required
          />

            <button type="submit">🔍 Consultar Resultados do Dia</button>
        </form>
  {mensagemData && <p className="mensagem">{mensagemData}</p>}
</div>


          <div className="historico-agendamentos">
            <h2>📜 Histórico Simplificado</h2>
            <table>
              <thead>
                <tr>
                  <th>Rodada</th>
                  <th>Horários</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                  {historico.map((item, idx) => (
                    <tr key={`${item.rodada}-${idx}`}>
                    <td>{item.rodada}</td>
                    <td>
                        {Array.isArray(item.horarios) ? (
                        item.horarios.map((h, i) => <div key={i}>{h}</div>)
                        ) : (
                        <span>—</span>
                        )}
                    </td>

                      <td>{item.status}</td>
                    </tr>
                    ))}
                </tbody>

            </table>

            <div className="paginacao">
              <button
                onClick={() => setOffset(Math.max(0, offset - limit))}
                disabled={offset === 0}
              >
                ◀ Anterior
              </button>
              <button
                onClick={() => setOffset(offset + limit)}
                disabled={historico.length < limit}
              >
                Próximo ▶
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminAgendamentosPage;

