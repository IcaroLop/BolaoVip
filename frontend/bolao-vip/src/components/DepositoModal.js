import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import axios from 'axios';
import API_BASE_URL from '../config';
import './DepositoModal.css';
import * as QRCodeLib from 'qrcode';

function DepositoModal({ isOpen, onClose, onDepositoSucesso }) {
  const [etapa, setEtapa] = useState('valor'); // 'valor', 'qrcode', 'aguardando'
  const [valor, setValor] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  
  // Dados do PIX gerado
  const [depositoData, setDepositoData] = useState(null);
  const [statusPolling, setStatusPolling] = useState('ativo');
  const [mensagemPolling, setMensagemPolling] = useState('Aguardando pagamento...');
  const [qrDataUrl, setQrDataUrl] = useState('');
  
  // Polling interval
  const pollingIntervalRef = useRef(null);
  const [isSandbox, setIsSandbox] = useState(false);
  const [pollAttempts, setPollAttempts] = useState(0);
  const [pixExpirado, setPixExpirado] = useState(false);
  const [tempoDecorrido, setTempoDecorrido] = useState(0);

  useEffect(() => {
    async function carregarAmbiente() {
      try {
        const token = localStorage.getItem('token');
        const resp = await axios.get(`${API_BASE_URL}/pix/ambiente`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const ambienteSandbox = Boolean(resp.data?.sandbox);
        setIsSandbox(ambienteSandbox);
        console.log('[DepositoModal] 🌍 Ambiente PIX carregado:', {
          sandbox: ambienteSandbox,
          baseUrl: resp.data?.baseUrl,
          raw: resp.data
        });
      } catch (e) {
        console.warn('[DepositoModal] ⚠️ Não foi possível obter ambiente PIX:', e?.message);
        console.warn('[DepositoModal] 📍 Assumindo ambiente PRODUCAO por padrão');
        setIsSandbox(false);
      }
    }
    if (isOpen) carregarAmbiente();
  }, [isOpen]);

  // Copiar para clipboard
  const copiarParaClipboard = (texto) => {
    navigator.clipboard.writeText(texto).then(() => {
      alert('✅ Código PIX copiado para a área de transferência!');
    });
  };

  // Solicitar depósito PIX
  const handleSolicitarDeposito = async (e) => {
    e.preventDefault();
    setErro('');
    setSucesso('');

    if (!valor || parseFloat(valor) <= 0) {
      setErro('Por favor, insira um valor válido (maior que 0)');
      return;
    }

    if (parseFloat(valor) < 10) {
      setErro('Valor mínimo de depósito é R$ 10,00');
      return;
    }

    if (parseFloat(valor) > 50000) {
      setErro('Valor máximo de depósito é R$ 50.000,00');
      return;
    }

    setCarregando(true);
    try {
      const token = localStorage.getItem('token');
      
      console.log('[DepositoModal] Solicitando depósito PIX...', { valor: parseFloat(valor) });
      
      const response = await axios.post(`${API_BASE_URL}/saldo/deposito`, {
        valor: parseFloat(valor)
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      console.log('[DepositoModal] ✅ Depósito PIX gerado com sucesso:', response.data);
      console.log('[DepositoModal] Estrutura recebida:', {
        sucesso: response.data.sucesso,
        deposito_id: response.data.deposito_id,
        txid: response.data.txid,
        valor: response.data.valor,
        pix_copiaecola: response.data.pix_copiaecola ? `✅ (${response.data.pix_copiaecola.length} chars)` : '❌ MISSING',
        qrcode_url: response.data.qrcode_url ? `✅ (${response.data.qrcode_url.length} chars)` : '❌ MISSING',
        calendario_expiracao: response.data.calendario_expiracao
      });
      
      console.log('[DepositoModal] Atualizando estado: depositoData e etapa=qrcode');
      setDepositoData(response.data);
      setEtapa('qrcode');
      
      console.log('[DepositoModal] Estados atualizados. Iniciando polling...');
      // Iniciar polling para verificar confirmação
      iniciarPolling(response.data.deposito_id, token);
      
    } catch (err) {
      console.error('[DepositoModal] ❌ Erro ao solicitar depósito:', err);
      setErro(err.response?.data?.erro || 'Erro ao solicitar depósito. Tente novamente.');
    } finally {
      setCarregando(false);
    }
  };

  // Função para verificar status do depósito (polling)
  const verificarStatusDeposito = async (depositoId, token) => {
    try {
      // Verificar se PIX expirou (3600 segundos = 1 hora)
      if (depositoData && tempoDecorrido >= depositoData.calendario_expiracao) {
        console.log('[DepositoModal] ⏰ PIX EXPIRADO após', tempoDecorrido, 'segundos');
        setPixExpirado(true);
        setStatusPolling('ativo');
        setMensagemPolling('⚠️ PIX expirado! Gere um novo para continuar.');
        
        // Parar polling
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        
        // Notificar backend sobre expiração
        try {
          await axios.post(
            `${API_BASE_URL}/saldo/notificar-pix-expirado/${depositoId}`,
            {},
            { headers: { Authorization: `Bearer ${token}` } }
          );
          console.log('[DepositoModal] ✅ Backend notificado sobre PIX expirado');
        } catch (notifError) {
          console.error('[DepositoModal] Erro ao notificar expiração:', notifError);
        }
        
        return;
      }
      
      setStatusPolling('atualizando');
      setMensagemPolling('Verificando pagamento...');

      // Consultar o endpoint específico para verificar o depósito
      const response = await axios.post(
        `${API_BASE_URL}/saldo/verificar-deposito-pix/${depositoId}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      console.log('[DepositoModal] Polling response:', response.data);

      if (response.data.confirmado) {
        // Depósito confirmado! Parar polling e mostrar mensagem de sucesso
        setStatusPolling('ativo');
        
        // Verificar se foi auto-confirmado no SANDBOX
        if (response.data.autoConfirmSandbox) {
          setMensagemPolling('✅ Depósito auto-confirmado! (SANDBOX) Saldo creditado.');
        } else {
          setMensagemPolling('✅ Depósito confirmado! Saldo creditado.');
        }
        
        setPollAttempts(0);
        
        // Chamar callback para atualizar saldo do pai
        if (onDepositoSucesso) {
          onDepositoSucesso();
        }
        
        // Aguardar 3 segundos e fechar modal (tempo para o usuário ver a mensagem)
        setTimeout(() => handleFecharModal(), 3000);
      } else {
        // Ainda pendente
        setStatusPolling('ativo');
        setMensagemPolling('⏳ Aguardando confirmação do pagamento...');

        // Incrementar tentativas de polling
        const novasTentativas = pollAttempts + 1;
        setPollAttempts(novasTentativas);
        
        console.log(`[DepositoModal] 🔍 DEBUG Auto-Confirm: isSandbox=${isSandbox}, pollAttempts=${pollAttempts}, novasTentativas=${novasTentativas}, depositoId=${depositoId}`);

        // Em SANDBOX, após 2 tentativas ainda pendente → auto-confirmar
        if (isSandbox && novasTentativas >= 2) {
          console.log('[DepositoModal] 🤖 ACIONANDO AUTO-CONFIRM (SANDBOX) - 2 tentativas atingidas');
          try {
            setStatusPolling('atualizando');
            setMensagemPolling('Confirmando depósito automaticamente (SANDBOX)...');
            const resp = await axios.post(
              `${API_BASE_URL}/saldo/deposito-pix-confirmar/${depositoId}`,
              {},
              { headers: { Authorization: `Bearer ${token}` } }
            );
            console.log('[DepositoModal] ✅ Resposta do auto-confirm:', resp.data);
            if (resp.data?.sucesso) {
              setStatusPolling('ativo');
              setMensagemPolling('✅ Depósito confirmado! Saldo creditado.');
              setPollAttempts(0);
              setTimeout(() => handleFecharModal(), 2000);
            } else {
              setStatusPolling('ativo');
              setMensagemPolling('⚠️ Aguardando confirmação do PIX...');
            }
          } catch (e) {
            console.error('[DepositoModal] ❌ Erro ao auto-confirmar (SANDBOX):', e?.message || e);
            setStatusPolling('ativo');
          }
        } else {
          console.log(`[DepositoModal] ⏸️ Auto-confirm não acionado: isSandbox=${isSandbox}, tentativas=${novasTentativas}/2`);
        }
      }
      
    } catch (error) {
      console.error('[DepositoModal] Erro no polling:', error.message);
      setStatusPolling('ativo');
      setMensagemPolling('Aguardando confirmação...');
    }
  };

  // Iniciar polling a cada 30 segundos
  const iniciarPolling = (depositoId, token) => {
    console.log('[DepositoModal] Iniciando polling a cada 30s até expiração do PIX...');
    setPollAttempts(0);
    setTempoDecorrido(0);
    setPixExpirado(false);

    // Mantém etapa 'qrcode' para exibir QR e CopiaECola; mudança para 'aguardando'
    // só ocorre quando o usuário clicar em "Já Pagou - Aguardar"

    // Primeiro polling imediato
    verificarStatusDeposito(depositoId, token);

    // Polling a cada 30 segundos com incremento de tempo
    const id = setInterval(() => {
      setTempoDecorrido(prev => {
        const novoTempo = prev + 30;
        console.log(`[DepositoModal] ⏱️ Tempo decorrido: ${novoTempo}s / ${depositoData?.calendario_expiracao || 3600}s`);
        return novoTempo;
      });
      verificarStatusDeposito(depositoId, token);
    }, 30000); // 30 segundos

    pollingIntervalRef.current = id;
  };

  // Monitorar mudanças de etapa
  useEffect(() => {
    console.log(`[DepositoModal] ETAPA MUDOU: ${etapa}`);
    console.log(`[DepositoModal] depositoData atual:`, depositoData);
  }, [etapa, depositoData]);

  // Parar polling quando modal fecha
  useEffect(() => {
    if (!isOpen && pollingIntervalRef.current) {
      console.log('[DepositoModal] Modal fechado - limpando polling');
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, [isOpen]);

  // Gerar QRCode client-side a partir do Copia-e-Cola
  useEffect(() => {
    async function gerarQr() {
      console.log('[DepositoModal] Iniciando geração de QRCode...');
      console.log('[DepositoModal] depositoData:', depositoData);
      console.log('[DepositoModal] pix_copiaecola disponível?', !!depositoData?.pix_copiaecola);
      
      try {
        if (depositoData?.pix_copiaecola) {
          console.log('[DepositoModal] Tentando gerar data URL com qrcode.toDataURL()...');
          const url = await QRCodeLib.toDataURL(depositoData.pix_copiaecola, { width: 220, margin: 2 });
          console.log('[DepositoModal] ✅ QRCode data URL gerado com sucesso. Comprimento:', url.length);
          setQrDataUrl(url);
        } else {
          console.warn('[DepositoModal] ⚠️ pix_copiaecola não disponível');
          setQrDataUrl('');
        }
      } catch (e) {
        console.error('[DepositoModal] ❌ Erro ao gerar QRCode:', e?.message || e);
        console.error('[DepositoModal] Stack:', e?.stack);
        setQrDataUrl('');
      }
    }
    gerarQr();
  }, [depositoData?.pix_copiaecola]);

  const handleFecharModal = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    setPollAttempts(0);
    setTempoDecorrido(0);
    setPixExpirado(false);
    
    // Resetar estados
    setEtapa('valor');
    setValor('');
    setErro('');
    setSucesso('');
    setDepositoData(null);
    setStatusPolling('ativo');
    setMensagemPolling('Aguardando pagamento...');
    
    // Chamar callback para atualizar saldo
    if (onDepositoSucesso && depositoData) {
      onDepositoSucesso(depositoData.deposito_id);
    }
    
    onClose();
  };

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="modal-overlay" onClick={() => {}}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>💰 Depositar Saldo via PIX</h2>
          <button className="close-button" onClick={handleFecharModal}>&times;</button>
        </div>

        {/* ETAPA 1: Inserir Valor */}
        {etapa === 'valor' && (
          <form onSubmit={handleSolicitarDeposito}>
            <div className="form-group">
              <label htmlFor="valor">Valor do Depósito (R$)</label>
              <div className="input-wrapper">
                <span className="currency-prefix">R$</span>
                <input
                  id="valor"
                  type="number"
                  min="10"
                  max="50000"
                  step="0.01"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  placeholder="0,00"
                  disabled={carregando}
                  autoFocus
                />
              </div>
              <small className="input-hint">Mínimo: R$ 10,00 | Máximo: R$ 50.000,00</small>
            </div>

            {erro && <div className="alert alert-error">{erro}</div>}
            {sucesso && <div className="alert alert-success">{sucesso}</div>}

            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={handleFecharModal} disabled={carregando}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary" disabled={carregando}>
                {carregando ? 'Gerando QRCode...' : 'Gerar PIX'}
              </button>
            </div>

            <div className="info-box">
              <p>
                <strong>ℹ️ Como funciona:</strong><br />
                1. Digite o valor desejado<br />
                2. Clique em "Gerar PIX"<br />
                3. Escanneie o QRCode com seu banco<br />
                4. Confirme o pagamento<br />
                5. Seu saldo será creditado automaticamente (em até 2 minutos)
              </p>
            </div>
          </form>
        )}

        {etapa === 'qrcode' && depositoData && (
          <div className="deposito-qrcode-container">
            <div className="deposito-info">
              <p><strong>Valor:</strong> R$ {depositoData.valor.toFixed(2)}</p>
              <p><strong>Válido por:</strong> {depositoData.calendario_expiracao} segundos</p>
              {isSandbox && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={async () => {
                    try {
                      const token = localStorage.getItem('token');
                      setStatusPolling('atualizando');
                      setMensagemPolling('Confirmando depósito manualmente (SANDBOX)...');
                      const response = await axios.post(
                        `${API_BASE_URL}/saldo/deposito-pix-confirmar/${depositoData.deposito_id}`,
                        {},
                        { headers: { Authorization: `Bearer ${token}` } }
                      );
                      if (response.data.sucesso) {
                        setStatusPolling('ativo');
                        setMensagemPolling('✅ Depósito confirmado! Saldo creditado.');
                        setTimeout(() => handleFecharModal(), 2000);
                      } else {
                        setStatusPolling('ativo');
                        setMensagemPolling('⚠️ Depósito ainda pendente na EFI');
                      }
                    } catch (e) {
                      console.error('[DepositoModal] Erro ao confirmar manualmente:', e?.message || e);
                      setStatusPolling('ativo');
                      setMensagemPolling('❌ Erro ao confirmar');
                    }
                  }}
                  style={{ backgroundColor: '#FF9800' }}
                >
                  ✅ Confirmar (SANDBOX)
                </button>
              )}
            </div>

            {/* QRCode - renderiza localmente a partir do Copia-e-Cola */}
            <div className="qrcode-section">
              <h3>📷 Escaneie o QRCode:</h3>
              <div className="qrcode-display">
                {qrDataUrl ? (
                  <>
                    <img src={qrDataUrl} alt="QRCode PIX" className="qrcode-image" />
                    <p style={{ marginTop: '10px', color: '#3DF29D', fontSize: '0.9em' }}>✅ QRCode carregado</p>
                  </>
                ) : (
                  <>
                    <p style={{ color: '#FFB84D', marginBottom: '10px' }}>⚠️ Não foi possível gerar o QRCode.</p>
                    <p style={{ color: '#888', fontSize: '0.85em' }}>Use o código Copia-e-Cola abaixo ou o botão para abrir no navegador.</p>
                  </>
                )}
              </div>
              {/* Fallback: botão para abrir no navegador a URL da EFI */}
              {depositoData.qrcode_url && (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '10px' }}>
                  <a
                    href={`https://${depositoData.qrcode_url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary"
                    style={{
                      padding: '10px 16px',
                      backgroundColor: '#3DF29D',
                      color: '#0A1628',
                      textDecoration: 'none',
                      borderRadius: '8px',
                      fontWeight: 'bold',
                      fontSize: '0.9em'
                    }}
                  >
                    🌐 Abrir QRCode no navegador
                  </a>
                </div>
              )}
            </div>

            {/* CopiaECola */}
            <div className="copiaecola-section">
              <h3>📋 Copie o código PIX:</h3>
              <div className="copiaecola-container">
                <textarea
                  value={depositoData.pix_copiaecola || ''}
                  readOnly
                  className="copiaecola-input"
                  rows="4"
                />
                <button
                  type="button"
                  className="btn btn-copy"
                  onClick={() => copiarParaClipboard(depositoData.pix_copiaecola)}
                >
                  📋 Copiar Código
                </button>
              </div>
            </div>

            {/* Botões de ação */}
            <div className="modal-actions">
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={handleFecharModal}
              >
                ← Fechar
              </button>
              <button 
                type="button" 
                className="btn btn-primary" 
                onClick={() => setEtapa('aguardando')}
              >
                ✅ Já Pagou - Aguardar
              </button>
            </div>

            <div className="info-box">
              <p>
                <strong>💡 Dica:</strong><br />
                Cole o código PIX no seu aplicativo bancário e confirme o pagamento.
                O sistema verificará automaticamente a cada 30 segundos.
              </p>
            </div>
          </div>
        )}

        {/* ETAPA 3: Aguardando Confirmação */}
        {etapa === 'aguardando' && (
          <div className="deposito-aguardando-container">
            {/* Indicador de PIX Expirado */}
            {pixExpirado ? (
              <>
                <div className="polling-indicator">
                  <div className="spinner" style={{ borderTopColor: '#FFC107' }}></div>
                  <p style={{ color: '#FFC107' }}>⚠️ PIX Expirado!</p>
                </div>

                <div className="deposito-info" style={{ borderLeftColor: '#FFC107', background: 'rgba(255, 193, 7, 0.1)' }}>
                  <p><strong>Valor do Depósito:</strong> R$ {depositoData?.valor.toFixed(2)}</p>
                  <p><strong>Status:</strong> <span style={{ color: '#FFC107' }}>Expirado</span></p>
                  <p style={{ fontSize: '0.9em', color: '#FFC107', marginTop: '10px' }}>
                    ⚠️ O QRCode PIX expirou após 1 hora sem pagamento.
                  </p>
                </div>

                <div className="modal-actions">
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={handleFecharModal}
                  >
                    Fechar
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      // Resetar estados e voltar para gerar novo PIX
                      if (pollingIntervalRef.current) {
                        clearInterval(pollingIntervalRef.current);
                        pollingIntervalRef.current = null;
                      }
                      setEtapa('valor');
                      setValor('');
                      setDepositoData(null);
                      setPixExpirado(false);
                      setTempoDecorrido(0);
                      setPollAttempts(0);
                    }}
                  >
                    🔄 Gerar Novo PIX
                  </button>
                </div>

                <div className="info-box info-warning">
                  <p>
                    <strong>💡 Importante:</strong><br />
                    • Você recebeu uma notificação sobre a expiração<br />
                    • Clique em "Gerar Novo PIX" para criar uma nova cobrança<br />
                    • O novo PIX terá validade de 1 hora
                  </p>
                </div>
              </>
            ) : (
              <>
                {/* UI Normal de Aguardando */}
                <div className="polling-indicator">
                  <div className={`spinner ${statusPolling === 'atualizando' ? 'atualizando' : ''}`}></div>
                  <p>{mensagemPolling}</p>
                </div>

                <div className="deposito-info">
                  <p><strong>Valor do Depósito:</strong> R$ {depositoData?.valor.toFixed(2)}</p>
                  <p><strong>Status:</strong> Aguardando Confirmação...</p>
                  <p><strong>Tempo decorrido:</strong> {Math.floor(tempoDecorrido / 60)}min {tempoDecorrido % 60}s / {Math.floor((depositoData?.calendario_expiracao || 3600) / 60)}min</p>
                  
                  {/* DEBUG INFO - Remover após teste */}
                  <div style={{ 
                    background: 'rgba(255, 193, 7, 0.15)', 
                    border: '1px solid rgba(255, 193, 7, 0.3)',
                    padding: '10px', 
                    margin: '10px 0', 
                    borderRadius: '5px', 
                    fontSize: '0.8em',
                    color: '#FFC107'
                  }}>
                    <p style={{ margin: '5px 0' }}><strong>🔍 DEBUG:</strong></p>
                    <p style={{ margin: '3px 0' }}>Ambiente: {isSandbox ? '🟡 SANDBOX' : '🟢 PRODUÇÃO'}</p>
                    <p style={{ margin: '3px 0' }}>Tentativas: {pollAttempts}/2</p>
                    <p style={{ margin: '3px 0' }}>Auto-confirm: {isSandbox && pollAttempts >= 2 ? '✅ SERÁ ACIONADO' : '⏸️ Não acionado'}</p>
                  </div>
                  
                  <p style={{ fontSize: '0.9em', color: '#666', marginTop: '10px' }}>
                    ℹ️ <strong>Como funciona:</strong>
                  </p>
                  <ul style={{ fontSize: '0.85em', color: '#555', textAlign: 'left', marginTop: '5px' }}>
                    <li>Após pagar o PIX, o sistema detecta automaticamente</li>
                    <li>Verificação a cada <strong>30 segundos</strong> até expirar</li>
                    <li>Saldo creditado automaticamente quando confirmado</li>
                    <li>Você pode clicar em "Verificar agora" para consulta imediata</li>
                  </ul>
                </div>

                <div className="modal-actions">
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={handleFecharModal}
                  >
                    Fechar
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={async () => {
                      try {
                        const token = localStorage.getItem('token');
                        await verificarStatusDeposito(depositoData.deposito_id, token);
                      } catch (e) {
                        console.error('[DepositoModal] Erro ao verificar:', e?.message || e);
                      }
                    }}
                  >
                    🔄 Verificar agora
                  </button>
                  {/* Botão REMOVIDO: Confirmar SANDBOX - Desnecessário em produção com fallback automático */}
                </div>

                <div className="info-box info-warning">
                  <p>
                    <strong>⏳ Importante:</strong><br />
                    • Verificação automática a cada 30 segundos<br />
                    • Você pode fechar este modal<br />
                    • Receberá uma notificação quando confirmado<br />
                    • Se o PIX expirar, você será notificado
                  </p>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

export default DepositoModal;
