import React, { useState, useEffect } from 'react';
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
  const [intervalId, setIntervalId] = useState(null);
  const [isSandbox, setIsSandbox] = useState(false);
  const [pollAttempts, setPollAttempts] = useState(0);

  useEffect(() => {
    async function carregarAmbiente() {
      try {
        const token = localStorage.getItem('token');
        const resp = await axios.get(`${API_BASE_URL}/pix/ambiente`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setIsSandbox(Boolean(resp.data?.sandbox));
        console.log('[DepositoModal] Ambiente PIX:', resp.data);
      } catch (e) {
        console.warn('[DepositoModal] Não foi possível obter ambiente PIX:', e?.message);
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
        setMensagemPolling('✅ Depósito confirmado! Saldo creditado.');
        setPollAttempts(0);
        
        // Aguardar 2 segundos e fechar modal
        setTimeout(() => handleFecharModal(), 2000);
      } else {
        // Ainda pendente
        setStatusPolling('ativo');
        setMensagemPolling('⏳ Aguardando confirmação do pagamento...');

        // Incrementar tentativas de polling
        setPollAttempts(prev => prev + 1);

        // Em SANDBOX, após 2 tentativas ainda pendente → auto-confirmar
        if (isSandbox && pollAttempts + 1 >= 2) {
          try {
            setStatusPolling('atualizando');
            setMensagemPolling('Confirmando depósito automaticamente (SANDBOX)...');
            const resp = await axios.post(
              `${API_BASE_URL}/saldo/deposito-pix-confirmar/${depositoId}`,
              {},
              { headers: { Authorization: `Bearer ${token}` } }
            );
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
            console.error('[DepositoModal] Erro ao auto-confirmar (SANDBOX):', e?.message || e);
            setStatusPolling('ativo');
          }
        }
      }
      
    } catch (error) {
      console.error('[DepositoModal] Erro no polling:', error.message);
      setStatusPolling('ativo');
      setMensagemPolling('Aguardando confirmação...');
    }
  };

  // Iniciar polling a cada 10 segundos
  const iniciarPolling = (depositoId, token) => {
    console.log('[DepositoModal] Iniciando polling para verificar confirmação...');
    setPollAttempts(0);

    // Mantém etapa 'qrcode' para exibir QR e CopiaECola; mudança para 'aguardando'
    // só ocorre quando o usuário clicar em "Já Pagou - Aguardar"

    // Primeiro polling imediato
    verificarStatusDeposito(depositoId, token);

    // Polling a cada 10 segundos
    const id = setInterval(() => {
      verificarStatusDeposito(depositoId, token);
    }, 10000);

    setIntervalId(id);
  };

  // Monitorar mudanças de etapa
  useEffect(() => {
    console.log(`[DepositoModal] ETAPA MUDOU: ${etapa}`);
    console.log(`[DepositoModal] depositoData atual:`, depositoData);
  }, [etapa, depositoData]);

  // Parar polling quando modal fecha
  useEffect(() => {
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [intervalId]);

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
    if (intervalId) {
      clearInterval(intervalId);
      setIntervalId(null);
    }
    setPollAttempts(0);
    
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
                O sistema verificará a cada 2 minutos automaticamente.
              </p>
            </div>
          </div>
        )}

        {/* ETAPA 3: Aguardando Confirmação */}
        {etapa === 'aguardando' && (
          <div className="deposito-aguardando-container">
            <div className="polling-indicator">
              <div className={`spinner ${statusPolling === 'atualizando' ? 'atualizando' : ''}`}></div>
              <p>{mensagemPolling}</p>
            </div>

            <div className="deposito-info">
              <p><strong>Valor do Depósito:</strong> R$ {depositoData?.valor.toFixed(2)}</p>
              <p><strong>Status:</strong> Aguardando Confirmação...</p>
              <p style={{ fontSize: '0.9em', color: '#666', marginTop: '10px' }}>
                ℹ️ <strong>Como funciona:</strong>
              </p>
              <ul style={{ fontSize: '0.85em', color: '#555', textAlign: 'left', marginTop: '5px' }}>
                <li>Após pagar o PIX, o sistema detecta automaticamente</li>
                <li>Verificação a cada <strong>2 minutos</strong> via fallback</li>
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
                • Pode levar até 2 minutos para confirmar<br />
                • Você pode fechar este modal<br />
                • Receberá uma notificação quando confirmado<br />
                • Seu saldo será creditado automaticamente
              </p>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

export default DepositoModal;
