import React, { useState, useEffect } from 'react';
import axios from 'axios';

const TestNotificationPolling = () => {
  const [logs, setLogs] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [token, setToken] = useState('');
  const [lastCheckId, setLastCheckId] = useState(0);
  const [notificacoes, setNotificacoes] = useState([]);
  const [apiUrl] = useState('http://191.243.196.240:3001');

  // Adicionar log
  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { message, type, timestamp }]);
  };

  // Iniciar polling
  const startPolling = async () => {
    if (!token) {
      addLog('❌ Token não fornecido!', 'error');
      return;
    }

    setIsRunning(true);
    addLog(`✅ Iniciado polling (API: ${apiUrl})`, 'success');

    // Fazer primeira verificação imediata
    await checkNotifications();

    // Depois a cada 30 segundos
    const interval = setInterval(checkNotifications, 30000);

    return () => clearInterval(interval);
  };

  // Verificar notificações
  const checkNotifications = async () => {
    try {
      addLog(`🔄 Verificando notificações em ${apiUrl}...`, 'info');

      const res = await axios.get(`${apiUrl}/notificacoes/usuario?limite=10`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 5000
      });

      const notificacoesRecebidas = res.data.notificacoes || [];
      addLog(`📦 Recebidas ${notificacoesRecebidas.length} notificações`, 'info');

      // Filtrar novas
      const novas = notificacoesRecebidas.filter(n => n.id > lastCheckId && !n.lida);

      if (novas.length > 0) {
        addLog(`📬 ${novas.length} novas notificações detectadas!`, 'success');
        setLastCheckId(Math.max(...novas.map(n => n.id)));

        // Simulear disparo nativo
        for (const notif of novas) {
          addLog(
            `📲 Disparando nativa: "${notif.titulo}" - "${notif.mensagem}"`,
            'success'
          );
          setNotificacoes(prev => [...prev, notif]);
        }
      } else {
        addLog(`✓ Nenhuma notificação nova`, 'info');
      }
    } catch (err) {
      const errorMsg = err.response?.statusText || err.message;
      const errorStatus = err.response?.status || 'N/A';
      addLog(
        `❌ Erro ao verificar: ${errorStatus} ${errorMsg}`,
        'error'
      );
      addLog(`   URL: ${apiUrl}/notificacoes/usuario`, 'error');
      addLog(`   Dica: Verificar firewall, porta 3001, token válido`, 'error');
    }
  };

  // Parar polling
  const stopPolling = () => {
    setIsRunning(false);
    addLog('⏹️ Polling parado', 'info');
  };

  // Limpar logs
  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>🔔 Teste de Polling de Notificações</h1>

      {/* Seção de Configuração */}
      <div style={{ 
        backgroundColor: '#f5f5f5', 
        padding: '15px', 
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <h2>⚙️ Configuração</h2>
        
        <div style={{ marginBottom: '10px' }}>
          <label>Token JWT: </label>
          <input
            type="text"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Cole seu token aqui"
            style={{
              width: '100%',
              padding: '8px',
              marginTop: '5px',
              fontSize: '12px'
            }}
          />
          <small>👉 Vá para o app, abra DevTools (F12), vá até localStorage e copie o valor de 'token'</small>
        </div>

        <div style={{ marginBottom: '10px' }}>
          <label>API URL: </label>
          <input
            type="text"
            value={apiUrl}
            readOnly
            style={{
              width: '100%',
              padding: '8px',
              marginTop: '5px',
              backgroundColor: '#e8e8e8'
            }}
          />
        </div>

        <div style={{ marginBottom: '10px' }}>
          <button
            onClick={startPolling}
            disabled={isRunning || !token}
            style={{
              padding: '10px 20px',
              marginRight: '10px',
              backgroundColor: isRunning ? '#ccc' : '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isRunning ? 'not-allowed' : 'pointer'
            }}
          >
            ▶️ Iniciar Polling
          </button>

          <button
            onClick={stopPolling}
            disabled={!isRunning}
            style={{
              padding: '10px 20px',
              marginRight: '10px',
              backgroundColor: !isRunning ? '#ccc' : '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: !isRunning ? 'not-allowed' : 'pointer'
            }}
          >
            ⏹️ Parar
          </button>

          <button
            onClick={clearLogs}
            style={{
              padding: '10px 20px',
              backgroundColor: '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            🗑️ Limpar Logs
          </button>
        </div>

        <p>
          Status: {isRunning ? (
            <span style={{ color: '#4CAF50' }}>🟢 Rodando</span>
          ) : (
            <span style={{ color: '#f44336' }}>🔴 Parado</span>
          )}
        </p>
      </div>

      {/* Seção de Notificações Recebidas */}
      {notificacoes.length > 0 && (
        <div style={{
          backgroundColor: '#e8f5e9',
          padding: '15px',
          borderRadius: '8px',
          marginBottom: '20px',
          border: '2px solid #4CAF50'
        }}>
          <h2>✅ Notificações Disparadas ({notificacoes.length})</h2>
          {notificacoes.map((notif, idx) => (
            <div key={idx} style={{
              backgroundColor: 'white',
              padding: '10px',
              marginBottom: '10px',
              borderLeft: '4px solid #4CAF50',
              borderRadius: '4px'
            }}>
              <strong>📲 {notif.titulo}</strong>
              <div>{notif.mensagem}</div>
              <small style={{ color: '#666' }}>ID: {notif.id} | Tipo: {notif.tipo}</small>
            </div>
          ))}
        </div>
      )}

      {/* Seção de Logs */}
      <div style={{
        backgroundColor: '#1e1e1e',
        color: '#d4d4d4',
        padding: '15px',
        borderRadius: '8px',
        maxHeight: '500px',
        overflowY: 'auto',
        fontSize: '12px',
        lineHeight: '1.6'
      }}>
        <h2 style={{ color: '#4EC9B0' }}>📋 Logs em Tempo Real</h2>
        {logs.length === 0 ? (
          <div style={{ color: '#999' }}>Nenhum log ainda. Clique em "Iniciar Polling" para começar!</div>
        ) : (
          logs.map((log, idx) => (
            <div
              key={idx}
              style={{
                color: log.type === 'error' ? '#f48771' : (log.type === 'success' ? '#4EC9B0' : '#d4d4d4'),
                marginBottom: '5px'
              }}
            >
              <span style={{ color: '#858585' }}>[{log.timestamp}]</span> {log.message}
            </div>
          ))
        )}
      </div>

      {/* Instruções */}
      <div style={{
        backgroundColor: '#fff3cd',
        padding: '15px',
        borderRadius: '8px',
        marginTop: '20px',
        borderLeft: '4px solid #ffc107'
      }}>
        <h3>📝 Como Usar:</h3>
        <ol>
          <li>Abra o app no celular e faça login</li>
          <li>Abra DevTools do navegador (F12) e vá até <strong>Console</strong></li>
          <li>Cole isto no console:
            <pre style={{ backgroundColor: '#f8f9fa', padding: '10px', overflowX: 'auto' }}>
              copy(localStorage.getItem('token'))
            </pre>
          </li>
          <li>Cole o token no campo acima</li>
          <li>Clique em "Iniciar Polling"</li>
          <li>Você verá em tempo real se as notificações estão sendo recebidas!</li>
        </ol>
      </div>
    </div>
  );
};

export default TestNotificationPolling;
