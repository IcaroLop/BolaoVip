import React, { useEffect, useState, useCallback, useMemo } from 'react';
import axios from 'axios';
import API_BASE_URL from '../config';
import './CobrancasPendentesPage.css';

const CobrancasPendentesPage = () => {
  const [cobrancas, setCobrancas] = useState([]);
  const [historico, setHistorico] = useState([]);
  const [mensagemPremiacoes, setMensagemPremiacoes] = useState('');
  const [mensagemCobrancas, setMensagemCobrancas] = useState('');
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [itensPorPagina] = useState(20);
  const [premiacoes, setPremiacoes] = useState([]);
  const [perfisUsuario, setPerfisUsuario] = useState([]);
  const token = localStorage.getItem('token');
  const authHeader = useMemo(() => (token ? { headers: { Authorization: `Bearer ${token}` } } : {}), [token]);
  const nomesPerfis = (perfisUsuario || []).map((p) => (p.nome || '').toLowerCase());
  const isAdminFinance = nomesPerfis.includes('administrador') || nomesPerfis.includes('financeiro');

  const buscarCobrancasPendentes = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/admin/pagamentos/cobrancas/pendentes`, authHeader);
      setCobrancas(res.data);
    } catch (err) {
      console.error('Erro ao buscar cobranças pendentes:', err);
        setMensagemCobrancas('Erro ao carregar cobranças pendentes.');
    }
  }, [authHeader]);

  const buscarHistoricoCobrancas = useCallback(async () => {
    try {
      const [resCobrancas, resPremios] = await Promise.all([
        axios.get(`${API_BASE_URL}/admin/pagamentos/cobrancas/historico`, authHeader),
        axios.get(`${API_BASE_URL}/admin/pagamentos/premios/historico`, authHeader)
      ]);
      
      const cobrancasHist = (resCobrancas.data || []).map(c => ({
        ...c,
        tipo: 'Cobrança',
        rodada: c.rodada || '-',
        data_ref: c.calendario_criacao || c.data_pagamento,
        status: c.status_pagamento
      }));
      
      const premiosHist = (resPremios.data || []).map(p => ({
        ...p,
        tipo: p.tipo_operacao || 'Premiação',
        rodada: p.rodada || '-',
        data_ref: p.data_pagamento,
        status: p.status_pagamento,
        nome_usuario: p.nome_usuario
      }));
      
      const historicoCompleto = [...cobrancasHist, ...premiosHist].sort((a, b) => 
        new Date(b.data_ref) - new Date(a.data_ref)
      );
      
      setHistorico(historicoCompleto);
    } catch (err) {
      console.error('Erro ao buscar histórico:', err);
        setMensagemCobrancas('Erro ao carregar histórico de pagamentos.');
    }
  }, [authHeader]);

  const carregarUsuario = useCallback(async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${API_BASE_URL}/usuarios/me`, authHeader);
      if (res.data) {
        if (Array.isArray(res.data.perfis)) setPerfisUsuario(res.data.perfis);
      }
    } catch (err) {
      console.error('Erro ao carregar usuário:', err);
    }
  }, [authHeader, token]);

  const buscarPremiacoesPendentes = useCallback(async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${API_BASE_URL}/premiacoes/pendentes-confirmacao`, authHeader);
      setPremiacoes(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Erro ao buscar premiações pendentes:', err);
    }
  }, [authHeader, token]);

  useEffect(() => {
    const init = async () => {
      await carregarUsuario();
      await Promise.all([
        buscarCobrancasPendentes(),
        buscarHistoricoCobrancas(),
        buscarPremiacoesPendentes()
      ]);
    };
    init();
  }, [buscarCobrancasPendentes, buscarHistoricoCobrancas, buscarPremiacoesPendentes, carregarUsuario]);

  useEffect(() => {
    setPaginaAtual(1); // Reset página quando histórico muda
  }, [historico]);

  const copiarCodigoPix = (codigo) => {
    // Tenta usar navigator.clipboard (Chrome, Edge moderno, Firefox)
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(codigo)
          .then(() => setMensagemCobrancas('Código Pix copiado!'))
        .catch(() => {
          // Fallback para método antigo
          copiarCodigoPlan(codigo);
        });
    } else {
      // Fallback para navegadores antigos ou contexto inseguro
      copiarCodigoPlan(codigo);
    }
  };

  const copiarCodigoPlan = (codigo) => {
    const textarea = document.createElement('textarea');
    textarea.value = codigo;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    try {
      textarea.select();
      const sucesso = document.execCommand('copy');
      if (sucesso) {
            setMensagemCobrancas('Código Pix copiado!');
      } else {
            setMensagemCobrancas('Erro ao copiar código Pix.');
      }
    } catch (err) {
      console.error('Erro ao copiar:', err);
          setMensagemCobrancas('Erro ao copiar código Pix.');
    } finally {
      document.body.removeChild(textarea);
    }
  };

  const gerarPix = async (codigo_envio) => {
    try {
      setMensagemCobrancas('Gerando PIX...');
      const res = await axios.post(`${API_BASE_URL}/admin/pagamentos/cobrancas/${codigo_envio}/gerar-pix`, {}, authHeader);
      
      if (res.data.pix_copiaecola) {
        setMensagemCobrancas('PIX gerado com sucesso! Código disponível para copiar.');
        await buscarCobrancasPendentes(); // Atualiza lista
      }
    } catch (err) {
      console.error('Erro ao gerar PIX:', err);
      
      // Verificar se o erro é PIX ainda válido
      if (err.response?.data?.pix_valido) {
        const dados = err.response.data;
        const expiracao = new Date(dados.calendario_expiracao);
        setMensagemCobrancas(
          `PIX ainda válido até ${expiracao.toLocaleString('pt-BR')}. ` +
          `Novo PIX em ${Math.ceil(dados.segundos_restantes / 60)} minutos.`
        );
      } else {
        setMensagemCobrancas(err?.response?.data?.erro || 'Erro ao gerar PIX.');
      }
    }
  };

  const marcarComoPago = async (codigo_envio) => {
    try {
      await axios.post(`${API_BASE_URL}/admin/pagamentos/cobrancas/${codigo_envio}/pagar`, {}, authHeader);
        setMensagemCobrancas('Cobrança marcada como paga.');

      // Atualiza status localmente
      setCobrancas(prev =>
        prev.map(cob =>
          cob.codigo_envio === codigo_envio ? { ...cob, status_pagamento: 'PAGO' } : cob
        )
      );
    } catch (err) {
      console.error('Erro ao marcar como pago:', err);
        setMensagemCobrancas('Erro ao marcar cobrança como paga.');
    }
  };

  const pagarPremiacao = async (premioId) => {
    if (!isAdminFinance) {
      setMensagemPremiacoes('Somente Administrador ou Financeiro podem pagar premiações.');
      return;
    }
    try {
      setMensagemPremiacoes('Creditando premiação no saldo...');
      await axios.post(`${API_BASE_URL}/admin/pagamentos/premios/${premioId}/pagar`, {}, authHeader);
      setMensagemPremiacoes('Premiação marcada como paga no saldo.');
      await buscarPremiacoesPendentes();
    } catch (err) {
      console.error('Erro ao pagar premiação:', err);
      setMensagemPremiacoes(err?.response?.data?.message || 'Erro ao pagar premiação.');
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
      <h2 className="title">🧾 Premiações Pendentes</h2>

      {premiacoes.length === 0 ? (
        <div className="empty-state prem-empty">
          <p>Nenhuma premiação pendente.</p>
        </div>
      ) : (
        <div className="premiacoes-grid">
          {premiacoes.map((item) => {
            const valorTotal = Number(item.valor_total || 0);
            const tipoOperacao = item.tipo_operacao || 'Premiação';
            
            // Filtrar apenas premiações (ignorar cobranças)
            if (tipoOperacao === 'Cobrança') {
              return null;
            }
            
            return (
              <div key={item.id} className="premiacao-card">
                <div className="premiacao-meta">
                  <div className="rodada">Rodada {item.rodada}</div>
                  <div className="tipo">{item.tipo_premio}</div>
                </div>
                {isAdminFinance && (
                  <div className="premiacao-usuario">{item.nome_usuario || 'Usuário'}</div>
                )}
                <div className="premiacao-values">
                  <div>Valor prêmio: <strong>R$ {valorTotal.toFixed(2)}</strong></div>
                </div>
                {isAdminFinance && (
                  <div className="premiacao-actions">
                    <button onClick={() => pagarPremiacao(item.id)} className="btn btn-success">
                      Creditar premiação no saldo
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {mensagemPremiacoes && <p className="mensagem">{mensagemPremiacoes}</p>}

      <h2 className="title" style={{ marginTop: '32px' }}>💰 Cobranças Pendentes</h2>

      <div className="resumo">
        <p><strong>Total R$:</strong> {total.toFixed(2)}</p>
        <p><strong>Pendentes:</strong> {pendentes}</p>
        <p><strong>Pagas (marcadas manualmente):</strong> {pagas}</p>
      </div>

      {mensagemCobrancas && <p className="mensagem">{mensagemCobrancas}</p>}

      {cobrancas.length === 0 ? (
        <div className="empty-state">
          <p>Nenhuma cobrança pendente.</p>
        </div>
      ) : (
        <table className="cobrancas-table">
          <thead>
            <tr>
              <th data-label="Usuário">Usuário</th>
              <th data-label="Valor">Valor (R$)</th>
              <th data-label="Expiração">Expiração</th>
              <th data-label="Status">Status</th>
              <th data-label="Ações">Ações</th>
            </tr>
          </thead>
          <tbody>
            {cobrancas.map((cob) => (
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
                      {cob.pix_copiaecola && (
                        <>
                          <button onClick={() => copiarCodigoPix(cob.pix_copiaecola)}>📋 Copiar Código PIX</button>
                          <br />
                        </>
                      )}
                      
                      {/* Botão Gerar PIX com lógica de validação */}
                      {cob.pode_gerar_pix ? (
                        <button 
                          onClick={() => gerarPix(cob.codigo_envio)}
                          className="btn-gerar-pix"
                        >
                          💳 Gerar PIX
                        </button>
                      ) : cob.pix_status === 'valido' ? (
                        <div className="pix-bloqueado-info">
                          <button 
                            disabled 
                            className="btn-gerar-pix-disabled"
                            title={`PIX válido até ${cob.proximo_pix_em ? new Date(cob.proximo_pix_em).toLocaleString('pt-BR') : 'data não disponível'}`}
                          >
                            ⏳ PIX Válido
                          </button>
                          <small className="pix-info-texto">
                            Válido até {cob.proximo_pix_em ? new Date(cob.proximo_pix_em).toLocaleString('pt-BR', { 
                              day: '2-digit', 
                              month: '2-digit', 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            }) : 'N/A'}
                            <br />
                            Novo PIX em {Math.ceil(cob.segundos_restantes / 60)} min
                          </small>
                          {cob.pix_copiaecola && (
                            <button 
                              onClick={() => copiarCodigoPix(cob.pix_copiaecola)}
                              className="btn-copiar-pix-atual"
                            >
                              📋 Copiar PIX Atual
                            </button>
                          )}
                        </div>
                      ) : null}
                      
                      <br />
                      <button onClick={() => marcarComoPago(cob.codigo_envio)}>✅ Marcar Pago</button>
                    </>
                  ) : (
                    <span style={{ color: '#00AA00', fontWeight: 'bold' }}>✓ Pago</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2 className="title" style={{ marginTop: '40px' }}>📜 Histórico de Pagamentos</h2>

      {historico.length === 0 ? (
        <div className="empty-state">
          <p>Nenhum pagamento concluído.</p>
        </div>
      ) : (
        <table className="cobrancas-table">
          <thead>
            <tr>
              <th data-label="Tipo">Tipo</th>
              <th data-label="Usuário">Usuário</th>
              <th data-label="Rodada">Rodada</th>
              <th data-label="Valor">Valor (R$)</th>
              <th data-label="Data">Data</th>
          </tr>
        </thead>
        <tbody>
          {(() => {
            const indiceInicio = (paginaAtual - 1) * itensPorPagina;
            const indiceFim = indiceInicio + itensPorPagina;
            const historicoPaginado = historico.slice(indiceInicio, indiceFim);
            return historicoPaginado.map((hist, idx) => (
              <tr key={`${hist.tipo}-${hist.id || hist.codigo_envio || idx}`}>
                  <td>{hist.tipo}</td>
                  <td>{hist.nome_usuario || 'Desconhecido'}</td>
                  <td>{hist.rodada}</td>
                  <td>
                    <div>R$ {Number(hist.valor || hist.valor_original || 0).toFixed(2)}</div>
                    <span className={`badge ${(hist.status || '').toLowerCase()}`} style={{ marginTop: '4px', display: 'inline-block' }}>
                      {hist.status}
                    </span>
                  </td>
                  <td>
                    {hist.data_ref
                      ? new Date(hist.data_ref).toLocaleString('pt-BR', { 
                          day: '2-digit', 
                          month: '2-digit', 
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : 'Sem data'}
                  </td>
                </tr>
              ));
            })()}
        </tbody>
        </table>
      )}

      {historico.length > itensPorPagina && (
        <div className="nav-buttons">
          <button
            onClick={() => setPaginaAtual(p => Math.max(p - 1, 1))}
            disabled={paginaAtual === 1}
            className="nav-button"
          >
            ← Anterior
          </button>
          <span className="page-info">
            Página {paginaAtual} de {Math.ceil(historico.length / itensPorPagina)}
          </span>
          <button
            onClick={() => setPaginaAtual(p => Math.min(p + 1, Math.ceil(historico.length / itensPorPagina)))}
            disabled={paginaAtual >= Math.ceil(historico.length / itensPorPagina)}
            className="nav-button"
          >
            Próxima →
          </button>
        </div>
      )}
    </div>
  );
};

export default CobrancasPendentesPage;

