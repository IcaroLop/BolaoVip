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

// Detecta se está rodando em plataforma nativa (APK) ou web (navegador)
let Capacitor;
try {
  Capacitor = require('@capacitor/core').Capacitor;
} catch (e) {
  // Se Capacitor não estiver instalado ainda, assume que é web
  Capacitor = { isNativePlatform: () => false };
}

// FASE 1: URL do backend em rede local (mesmo IP_HOST_DEV do backend/.env)
const LOCAL_API = 'http://192.168.56.127:3001';

// FASE 2: URL de produção com domínio hospedado
const PRODUCTION_API = 'https://bolaovip.csprojectia.com.br';

const getAPIBaseURL = () => {
  // Se estiver rodando no APK (plataforma nativa)
  if (Capacitor.isNativePlatform()) {
    console.log('[API Config] 📱 Plataforma: Mobile (APK)');
    // Em produção usa PRODUCTION_API, em desenvolvimento usa LOCAL_API
    const isProduction = process.env.NODE_ENV === 'production' || process.env.REACT_APP_BUILD_TYPE === 'production';
    return isProduction ? PRODUCTION_API : LOCAL_API;
  }
  
  // Se estiver rodando no navegador (web)
  console.log('[API Config] 🌐 Plataforma: Web (Navegador)');
  
  // Prioridade 1: Variável de ambiente
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  
  // Prioridade 2: localhost em desenvolvimento
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3001';
  }
  
  // Fallback: IP específico para desenvolvimento web
  return 'http://192.168.56.127:3001';
};

const API_BASE_URL = getAPIBaseURL();

console.log('[API Config] Base URL:', API_BASE_URL);

export default API_BASE_URL;


