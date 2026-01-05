import React, { useState, useEffect } from 'react';
import axios from 'axios';

const DebugPollingPage = () => {
  const [logs, setLogs] = useState([]);
  const [pollingStatus, setPollingStatus] = useState('Verificando...');
  const [token, setToken] = useState('');

  useEffect(() => {
    // Pegar token do localStorage
    const storedToken = localStorage.getItem('token');
    setToken(storedToken || 'Nenhum token encontrado');

    addLog('🔍 Página de Debug iniciada', 'info');
    
    if (storedToken) {
      testConnection(storedToken);
    }
  }, []);

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [{
      timestamp,
      message,
      type
    }, ...prev].slice(0, 50)); // Manter últimos 50 logs
  };

  const testConnection = async (token) => {
    try {
      addLog('📡 Testando conexão com servidor...', 'info');
      setPollingStatus('Testando...');

      const res = await axios.get('http://191.243.196.240:3001/notificacoes/usuario?limite=5', {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 5000
      });

      addLog('✅ Conexão OK!', 'success');
      addLog(`📦 ${res.data.notificacoes.length} notificações recebidas`, 'success');
      addLog(`📬 ${res.data.total_nao_lidas} não lidas`, 'info');
      
      setPollingStatus('✅ Conectado');

      if (res.data.notificacoes.length > 0) {
        addLog('📋 Últimas notificações:', 'info');
        res.data.notificacoes.slice(0, 3).forEach((notif, idx) => {
          addLog(`  ${idx + 1}. [${notif.tipo}] ${notif.titulo}`, 'info');
        });
      }
    } catch (err) {
      addLog(`❌ Erro: ${err.message}`, 'error');
      addLog(`Status: ${err.response?.status || 'N/A'}`, 'error');
      setPollingStatus('❌ Erro de conexão');
    }
  };

  return (
    <div style={{
      padding: '15px',
      backgroundColor: '#1e1e1e',
      color: '#d4d4d4',
      minHeight: '100vh',
      fontFamily: 'monospace',
      fontSize: '12px'
    }}>
      <h2 style={{ color: '#4EC9B0', marginBottom: '15px' }}>🔍 Debug - Polling de Notificações</h2>

      {/* Status */}
      <div style={{
        backgroundColor: '#2d2d2d',
        padding: '10px',
        borderRadius: '4px',
        marginBottom: '15px',
        borderLeft: '4px solid #4EC9B0'
      }}>
        <div><strong>Status Polling:</strong> {pollingStatus}</div>
        <div style={{ fontSize: '11px', color: '#999', marginTop: '5px' }}>
          Token: {token.substring(0, 30)}...
        </div>
      </div>

      {/* Botões */}
      <div style={{ marginBottom: '15px' }}>
        <button
          onClick={() => {
            setLogs([]);
            addLog('🗑️ Logs limpos', 'info');
          }}
          style={{
            padding: '8px 12px',
            backgroundColor: '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginRight: '10px',
            fontSize: '12px'
          }}
        >
          Limpar Logs
        </button>

        <button
          onClick={() => testConnection(token)}
          style={{
            padding: '8px 12px',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          Testar Agora
        </button>
      </div>

      {/* Logs */}
      <div style={{
        backgroundColor: '#0d0d0d',
        padding: '10px',
        borderRadius: '4px',
        maxHeight: '400px',
        overflowY: 'auto',
        border: '1px solid #2d2d2d'
      }}>
        {logs.length === 0 ? (
          <div style={{ color: '#666' }}>Nenhum log</div>
        ) : (
          logs.map((log, idx) => (
            <div
              key={idx}
              style={{
                color: log.type === 'error' ? '#f48771' : (log.type === 'success' ? '#4EC9B0' : '#d4d4d4'),
                marginBottom: '4px',
                lineHeight: '1.4'
              }}
            >
              <span style={{ color: '#666' }}>[{log.timestamp}]</span> {log.message}
            </div>
          ))
        )}
      </div>

      {/* Instruções */}
      <div style={{
        marginTop: '15px',
        padding: '10px',
        backgroundColor: '#2d3a2d',
        borderLeft: '4px solid #4CAF50',
        fontSize: '11px',
        lineHeight: '1.6'
      }}>
        <strong>📝 Como usar:</strong>
        <div>1. Clique "Testar Agora" para verificar conexão com o servidor</div>
        <div>2. Se aparecer erro, significa que o APK não consegue conectar</div>
        <div>3. Se OK, o polling service deveria estar funcionando</div>
        <div>4. Aguarde 12:17 (Manaus) para notificação aparecer</div>
      </div>
    </div>
  );
};

export default DebugPollingPage;
