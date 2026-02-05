/**
 * Configuração para aplicação web pura
 * Esta versão removeu todas as dependências Capacitor/Mobile
 */

export const config = {
  appId: 'br.com.bolaovip.web',
  appName: 'Bolao VIP - Web',
  apiUrl: process.env.REACT_APP_API_URL || 'http://localhost:3001'
};

