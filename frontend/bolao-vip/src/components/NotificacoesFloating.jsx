import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import API_BASE_URL from '../config';
import './NotificacoesFloating.css';

const API = API_BASE_URL;

// Ícones por tipo de notificação
const ICONS = {
  palpite_enviado: '⚽',
  pagamento_confirmado: '💰',
  inicio_rodada: '📢',
  resultado_publicado: '🏆',
  premio_recebido: '🎉',
  sistema: '🔔'
};

const TIPOS_LABELS = {
  palpite_enviado: 'Palpite',
  pagamento_confirmado: 'Pagamento',
  inicio_rodada: 'Rodada',
  resultado_publicado: 'Resultado',
  premio_recebido: 'Prêmio',
  sistema: 'Sistema'
};

function NotificacoesFloating() {
  const [open, setOpen] = useState(false);
  const [notificacoes, setNotificacoes] = useState([]);
  const [totalNaoLidas, setTotalNaoLidas] = useState(0);
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState(null);

  // Monitorar mudanças no token
  useEffect(() => {
    const currentToken = localStorage.getItem('token');
    setToken(currentToken);

    const handleStorageChange = () => {
      const newToken = localStorage.getItem('token');
      setToken(newToken);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('authChange', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('authChange', handleStorageChange);
    };
  }, []);

  // Buscar contador de não lidas
  const buscarContador = useCallback(async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${API}/notificacoes/contador`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('[NotificacoesFloating] Contador atualizado:', res.data.total_nao_lidas);
      setTotalNaoLidas(res.data.total_nao_lidas || 0);
    } catch (err) {
      console.error('[NotificacoesFloating] Erro ao buscar contador:', err);
    }
  }, [token]);

  // Buscar notificações completas (últimas 10, lidas ou não)
  const buscarNotificacoes = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API}/notificacoes/usuario?limite=10`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('[NotificacoesFloating] Notificações recebidas:', res.data.notificacoes);
      setNotificacoes(res.data.notificacoes || []);
      setTotalNaoLidas(res.data.total_nao_lidas || 0);
    } catch (err) {
      console.error('[NotificacoesFloating] Erro ao buscar notificações:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Marcar como lida e ocultar da lista
  const marcarComoLida = async (id) => {
    try {
      await axios.patch(`${API}/notificacoes/${id}/marcar-lida`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Remove da lista local (mas mantém no banco)
      setNotificacoes(prev => prev.filter(n => n.id !== id));
      setTotalNaoLidas(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('[NotificacoesFloating] Erro ao marcar como lida:', err);
    }
  };

  // Marcar todas como lidas
  const marcarTodasLidas = async () => {
    try {
      await axios.patch(`${API}/notificacoes/marcar-todas-lidas`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotificacoes(prev => prev.map(n => ({ ...n, lida: true })));
      setTotalNaoLidas(0);
    } catch (err) {
      console.error('[NotificacoesFloating] Erro ao marcar todas:', err);
    }
  };

  // Deletar notificação
  const deletarNotificacao = async (id) => {
    try {
      await axios.delete(`${API}/notificacoes/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await buscarNotificacoes();
      await buscarContador();
    } catch (err) {
      console.error('[NotificacoesFloating] Erro ao deletar:', err);
    }
  };

  // Limpar todas as lidas (preserva as 10 mais recentes no backend)
  const limparLidas = async () => {
    try {
      await axios.delete(`${API}/notificacoes/limpar-lidas`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await buscarNotificacoes();
      await buscarContador();
    } catch (err) {
      console.error('[NotificacoesFloating] Erro ao limpar lidas:', err);
    }
  };

  // Polling de contador a cada 30s
  useEffect(() => {
    if (!token) {
      console.log('[NotificacoesFloating] Sem token, polling desativado');
      return;
    }
    
    console.log('[NotificacoesFloating] Token encontrado, iniciando polling');
    buscarContador();
    const interval = setInterval(buscarContador, 30000); // 30s
    
    return () => {
      console.log('[NotificacoesFloating] Limpando polling');
      clearInterval(interval);
    };
  }, [token, buscarContador]);

  // Buscar notificações ao abrir modal
  useEffect(() => {
    if (open && token) {
      buscarNotificacoes();
    }
  }, [open, token, buscarNotificacoes]);

  const formatarData = (dataStr) => {
    const data = new Date(dataStr);
    const agora = new Date();
    const diffMs = agora - data;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHoras = Math.floor(diffMs / 3600000);
    const diffDias = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Agora';
    if (diffMins < 60) return `${diffMins}min atrás`;
    if (diffHoras < 24) return `${diffHoras}h atrás`;
    if (diffDias === 1) return 'Ontem';
    if (diffDias < 7) return `${diffDias} dias atrás`;
    
    return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  if (!token) return null;

  return (
    <>
      {/* Botão Flutuante */}
      <button
        className="notif-fab"
        onClick={() => setOpen(true)}
        aria-label="Notificações"
      >
        <span className="notif-icon">🔔</span>
        {totalNaoLidas > 0 && (
          <Badge className="notif-badge" variant="success">
            {totalNaoLidas > 99 ? '99+' : totalNaoLidas}
          </Badge>
        )}
      </button>

      {/* Modal de Notificações */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="notif-modal">
          <DialogHeader>
            <div className="notif-header">
              <DialogTitle>🔔 Notificações</DialogTitle>
              <button 
                className="notif-close-btn" 
                onClick={() => setOpen(false)}
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>
            {notificacoes.length > 0 && (
              <div className="notif-actions">
                {totalNaoLidas > 0 && (
                  <button className="notif-btn-small" onClick={marcarTodasLidas}>
                    ✓ Marcar todas
                  </button>
                )}
                <button className="notif-btn-small" onClick={limparLidas}>
                  🗑️ Limpar lidas
                </button>
              </div>
            )}
          </DialogHeader>

          <ScrollArea className="notif-scroll">
            {loading ? (
              <div className="notif-loading">Carregando...</div>
            ) : notificacoes.length === 0 ? (
              <div className="notif-empty">
                <span className="notif-empty-icon">📭</span>
                <p>Nenhuma notificação</p>
              </div>
            ) : (
              <div className="notif-list">
                {notificacoes.map((notif) => (
                  <div
                    key={notif.id}
                    className={`notif-item ${!notif.lida ? 'notif-unread' : ''}`}
                  >
                    <div className="notif-item-header">
                      <div className="notif-item-icon">
                        {ICONS[notif.tipo] || '🔔'}
                      </div>
                      <div className="notif-item-meta">
                        <Badge variant={notif.lida ? 'outline' : 'default'} className="notif-type-badge">
                          {TIPOS_LABELS[notif.tipo] || 'Sistema'}
                        </Badge>
                        <span className="notif-time">{formatarData(notif.data_criacao)}</span>
                      </div>
                    </div>

                    <h4 className="notif-title">{notif.titulo}</h4>
                    <p className="notif-message">{notif.mensagem}</p>

                    {notif.dados_json && Object.keys(notif.dados_json).length > 0 && (
                      <div className="notif-data">
                        {notif.dados_json.codigo_pix && (
                          <div className="notif-data-item">
                            <strong>Código PIX:</strong>
                            <code>{notif.dados_json.codigo_pix.substring(0, 30)}...</code>
                          </div>
                        )}
                        {notif.dados_json.valor && (
                          <div className="notif-data-item">
                            <strong>Valor:</strong> R$ {Number(notif.dados_json.valor).toFixed(2)}
                          </div>
                        )}
                      </div>
                    )}

                    {!notif.lida && (
                      <button
                        className="notif-mark-read"
                        onClick={() => marcarComoLida(notif.id)}
                      >
                        ✓ Marcar como lida
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default NotificacoesFloating;
