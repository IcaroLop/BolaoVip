import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './CobrancasPendentesPage.css';

const CobrancasPendentesPage = () => {
  const [cobrancas, setCobrancas] = useState([]);
  const [historico, setHistorico] = useState([]);
  const [mensagem, setMensagem] = useState('');
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [itensPorPagina] = useState(10);
  const token = localStorage.getItem('token');

  useEffect(() => {
    buscarCobrancasPendentes();
    buscarHistoricoCobrancas();
  }, [buscarCobrancasPendentes, buscarHistoricoCobrancas]);

  useEffect(() => {
    setPaginaAtual(1); // Reset página quando histórico muda
  }, [historico]);

  const buscarCobrancasPendentes = async () => {
    try {
      const res = await axios.get('http://192.168.56.127:3001/admin/pagamentos/cobrancas/pendentes', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCobrancas(res.data);
    } catch (err) {
      console.error('Erro ao buscar cobranças pendentes:', err);
      setMensagem('Erro ao carregar cobranças pendentes.');
    }
  };

  const buscarHistoricoCobrancas = async () => {
    try {
      const res = await axios.get('http://192.168.56.127:3001/admin/pagamentos/cobrancas/historico', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setHistorico(res.data);
    } catch (err) {
      console.error('Erro ao buscar histórico de cobranças:', err);
      setMensagem('Erro ao carregar histórico de cobranças.');
    }
  };

  const copiarCodigoPix = (codigo) => {
    navigator.clipboard.writeText(codigo)
      .then(() => setMensagem('Código Pix copiado!'))
      .catch(() => setMensagem('Erro ao copiar código Pix.'));
  };

  const marcarComoPago = async (codigo_envio) => {
    try {
      await axios.post(`http://192.168.56.127:3001/admin/pagamentos/cobrancas/${codigo_envio}/pagar`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMensagem('Cobrança marcada como paga.');

      // Atualiza status localmente
      setCobrancas(prev =>
        prev.map(cob =>
          cob.codigo_envio === codigo_envio ? { ...cob, status_pagamento: 'PAGO' } : cob
        )
      );
    } catch (err) {
      console.error('Erro ao marcar como pago:', err);
      setMensagem('Erro ao marcar cobrança como paga.');
    }
  };

  const resumo = () => {
    const total = cobrancas.reduce((sum, c) => sum + Number(c.valor), 0);
    const pendentes = cobrancas.filter(c => c.status_pagamento.toUpperCase() === 'PENDENTE').length;
    const pagas = cobrancas.filter(c => c.status_pagamento.toUpperCase() === 'PAGO').length;
    return { total, pendentes, pagas };
  };

  const { total, pendentes, pagas } = resumo();

  return (
    <div className="cobrancas-container">
      <h2 className="title">💰 Cobranças Pendentes</h2>

      <div className="resumo">
        <p><strong>Total R$:</strong> {total.toFixed(2)}</p>
        <p><strong>Pendentes:</strong> {pendentes}</p>
        <p><strong>Pagas (marcadas manualmente):</strong> {pagas}</p>
      </div>

      {mensagem && <p className="mensagem">{mensagem}</p>}

      <table className="cobrancas-table">
        <thead>
          <tr>
            <th>Usuário</th>
            <th>Valor (R$)</th>
            <th>Expiração</th>
            <th>Status</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {cobrancas.length === 0 ? (
            <tr>
              <td colSpan="5">Nenhuma cobrança pendente.</td>
            </tr>
          ) : (
            cobrancas.map((cob) => (
              <tr key={cob.codigo_envio}>
                <td>{cob.nome_usuario || 'Desconhecido'}</td>
                <td>{Number(cob.valor).toFixed(2)}</td>
                <td>
                  {cob.data_expiracao
                    ? new Date(cob.data_expiracao).toLocaleString()
                    : 'Sem data'}
                </td>
                <td>
                  <span className={`badge ${cob.status_pagamento.toLowerCase()}`}>
                    {cob.status_pagamento}
                  </span>
                </td>
                <td>
                  {cob.status_pagamento.toUpperCase() !== 'PAGO' ? (
                    <>
                      <button onClick={() => copiarCodigoPix(cob.codigo_envio)}>📋 Copiar Código</button>
                      <br />
                      <button onClick={() => marcarComoPago(cob.codigo_envio)}>✅ Marcar Pago</button>
                    </>
                  ) : (
                    <span style={{ color: '#00AA00', fontWeight: 'bold' }}>✓ Pago</span>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <h2 className="title" style={{ marginTop: '40px' }}>📜 Histórico de Pagamentos</h2>

      <table className="cobrancas-table">
        <thead>
          <tr>
            <th>Usuário</th>
            <th>Valor (R$)</th>
            <th>Criação</th>
            <th>Expiração</th>
            <th>Status Pagamento</th>
            <th>Status Final</th>
          </tr>
        </thead>
        <tbody>
          {historico.length === 0 ? (
            <tr>
              <td colSpan="6">Nenhum pagamento concluído.</td>
            </tr>
          ) : (
            (() => {
              const indiceInicio = (paginaAtual - 1) * itensPorPagina;
              const indiceFim = indiceInicio + itensPorPagina;
              const historicoOrdenado = [...historico].sort((a, b) => 
                new Date(b.calendario_criacao) - new Date(a.calendario_criacao)
              );
              const historicoPaginado = historicoOrdenado.slice(indiceInicio, indiceFim);
              return historicoPaginado.map((hist) => (
                <tr key={hist.codigo_envio}>
                  <td>{hist.nome_usuario || 'Desconhecido'}</td>
                  <td>{Number(hist.valor).toFixed(2)}</td>
                  <td>
                    {hist.calendario_criacao
                      ? new Date(hist.calendario_criacao).toLocaleString()
                      : 'Sem data'}
                  </td>
                  <td>
                    {hist.data_expiracao
                      ? new Date(hist.data_expiracao).toLocaleString()
                      : 'Sem data'}
                  </td>
                  <td>
                    <span className={`badge ${hist.status_pagamento.toLowerCase()}`}>
                      {hist.status_pagamento}
                    </span>
                  </td>
                  <td>{hist.status}</td>
                </tr>
              ));
            })()
          )}
        </tbody>
      </table>

      {historico.length > itensPorPagina && (
        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setPaginaAtual(p => Math.max(p - 1, 1))}
            disabled={paginaAtual === 1}
            style={{ padding: '8px 16px', cursor: paginaAtual === 1 ? 'not-allowed' : 'pointer', opacity: paginaAtual === 1 ? 0.5 : 1 }}
          >
            ⬅ Anterior
          </button>
          <span style={{ alignSelf: 'center', fontWeight: 'bold' }}>
            Página {paginaAtual} de {Math.ceil(historico.length / itensPorPagina)}
          </span>
          <button
            onClick={() => setPaginaAtual(p => Math.min(p + 1, Math.ceil(historico.length / itensPorPagina)))}
            disabled={paginaAtual >= Math.ceil(historico.length / itensPorPagina)}
            style={{ padding: '8px 16px', cursor: paginaAtual >= Math.ceil(historico.length / itensPorPagina) ? 'not-allowed' : 'pointer', opacity: paginaAtual >= Math.ceil(historico.length / itensPorPagina) ? 0.5 : 1 }}
          >
            Próxima ➡
          </button>
        </div>
      )}
    </div>
  );
};

export default CobrancasPendentesPage;

