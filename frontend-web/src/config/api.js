/**
 * Configuração centralizada de API
 * 
 * FASE 1 (ATUAL): Rede Local
 * - Backend em http://192.168.1.23:3001 (IP_HOST_DEV do .env)
 * - Banco MySQL local
 * - APK funciona apenas na mesma WiFi
 * 
 * FASE 2 (FUTURO): Hospedagem Externa
 * - Descomente PRODUCTION_API e atualize LOCAL_API para PRODUCTION_API
 * - Rebuild do React + npx cap sync + novo APK
 */

// Detecta se está rodando em plataforma nativa (APK) ou web (navegador)
let Capacitor;
try {
  Capacitor = require('@capacitor/core').Capacitor;
} catch (e) {
  // Se Capacitor não estiver instalado, assume que é web
  Capacitor = { isNativePlatform: () => false };
}

// FASE 1: URL do backend em rede local (mesmo IP_HOST_DEV do backend/.env)
const LOCAL_API = 'http://192.168.56.127:3001';

// FASE 2: Descomente quando migrar para hospedagem externa
// const PRODUCTION_API = 'https://bolaovip-api.railway.app';
// const PRODUCTION_API = 'https://bolaovip-api.render.com';

/**
 * URL base da API
 * - No APK (mobile): usa LOCAL_API (ou PRODUCTION_API após migração)
 * - No navegador (web): usa IP de desenvolvimento local
 */
export const API_BASE_URL = Capacitor.isNativePlatform() 
  ? LOCAL_API  // Para APK - trocar para PRODUCTION_API quando hospedar
  : 'http://192.168.56.127:3001'; // Para desenvolvimento web (não mexer)

console.log(`[API Config] Plataforma: ${Capacitor.isNativePlatform() ? 'Mobile (APK)' : 'Web (Navegador)'}`);
console.log(`[API Config] API Base URL: ${API_BASE_URL}`);
