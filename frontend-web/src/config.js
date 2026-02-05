/**
 * Configuração central da API - BolaoVip
 * 
 * FASE 1 (ATUAL): Rede Local
 * - Backend em http://192.168.1.23:3001 (IP_HOST_DEV do .env)
 * - Banco MySQL local
 * - APK funciona apenas na mesma WiFi
 * 
 * FASE 2 (FUTURO): Hospedagem Externa
 * - Descomente PRODUCTION_API e atualize para usar em plataformas nativas
 * - Rebuild do React + npx cap sync + novo APK
 */

// Configuração para plataforma Web pura (sem Capacitor)
const getAPIBaseURL = () => {
  console.log('[API Config] 🌐 Plataforma: Web (Navegador)');
  
  // Prioridade 1: Variável de ambiente (definida em .env.development ou .env.production)
  if (process.env.REACT_APP_API_URL) {
    console.log('[API Config] Usando REACT_APP_API_URL:', process.env.REACT_APP_API_URL);
    return process.env.REACT_APP_API_URL;
  }
  
  // Prioridade 2: localhost em desenvolvimento
  if (process.env.NODE_ENV === 'development') {
    console.log('[API Config] Usando localhost em modo desenvolvimento');
    return 'http://localhost:3001';
  }
  
  // Fallback: IP específico para servidor
  console.log('[API Config] Usando IP padrão do servidor');
  return 'http://192.168.56.127:3001';
};

const API_BASE_URL = getAPIBaseURL();

console.log('[API Config] Base URL:', API_BASE_URL);

export default API_BASE_URL;


