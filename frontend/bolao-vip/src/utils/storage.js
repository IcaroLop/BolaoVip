/**
 * Gerenciador de storage robusto com fallbacks para Simple Browser, mobile e contextos restritos
 * Ordem de tentativas: localStorage → sessionStorage → memória
 * Especialmente otimizado para Edge (modo privado, policies restritivas)
 */

// Cache em memória como último fallback
const memoryStorage = new Map();

// Detecta disponibilidade de storage (com suporte a Edge em modo privado)
const isStorageAvailable = (type) => {
  try {
    const storage = type === 'localStorage' ? window.localStorage : window.sessionStorage;
    if (!storage) return false;
    
    const test = '__storage_test__' + Date.now(); // Unique key para Edge
    const value = Math.random().toString();
    
    // Tenta escrever
    storage.setItem(test, value);
    
    // Tenta ler (importante: Edge pode bloquear aqui)
    const readValue = storage.getItem(test);
    if (readValue !== value) return false;
    
    // Tenta remover
    storage.removeItem(test);
    
    return true;
  } catch (e) {
    // Edge em modo privado, Safari private mode, etc.
    console.warn(`[Storage] ${type} indisponível:`, e.message);
    return false;
  }
};

const hasLocalStorage = isStorageAvailable('localStorage');
const hasSessionStorage = isStorageAvailable('sessionStorage');

console.log(`[Storage] Inicialização - localStorage: ${hasLocalStorage}, sessionStorage: ${hasSessionStorage}, memória: sempre disponível`);

/**
 * Define um item no storage com fallbacks automáticos
 */
export const setItem = (key, value) => {
  const strValue = String(value);
  
  // Tenta localStorage
  if (hasLocalStorage) {
    try {
      localStorage.setItem(key, strValue);
      return true;
    } catch (e) {
      console.warn(`[Storage] localStorage falhou ao salvar ${key}:`, e.message);
    }
  }
  
  // Tenta sessionStorage
  if (hasSessionStorage) {
    try {
      sessionStorage.setItem(key, strValue);
      return true;
    } catch (e) {
      console.warn(`[Storage] sessionStorage falhou ao salvar ${key}:`, e.message);
    }
  }
  
  // Fallback para memória
  memoryStorage.set(key, strValue);
  return true;
};

/**
 * Obtém um item do storage com fallbacks automáticos
 */
export const getItem = (key) => {
  // Tenta localStorage
  if (hasLocalStorage) {
    try {
      const value = localStorage.getItem(key);
      if (value !== null) {
        return value;
      }
    } catch (e) {
      console.warn(`[Storage] localStorage falhou ao ler ${key}:`, e.message);
    }
  }
  
  // Tenta sessionStorage
  if (hasSessionStorage) {
    try {
      const value = sessionStorage.getItem(key);
      if (value !== null) {
        return value;
      }
    } catch (e) {
      console.warn(`[Storage] sessionStorage falhou ao ler ${key}:`, e.message);
    }
  }
  
  // Fallback para memória
  if (memoryStorage.has(key)) {
    return memoryStorage.get(key);
  }
  
  return null;
};

/**
 * Remove um item do storage
 */
export const removeItem = (key) => {
  if (hasLocalStorage) {
    try { localStorage.removeItem(key); } catch (e) {}
  }
  
  if (hasSessionStorage) {
    try { sessionStorage.removeItem(key); } catch (e) {}
  }
  
  memoryStorage.delete(key);
};

/**
 * Hook customizado para sincronização cross-tab (quando disponível)
 */
export const onStorageChange = (callback) => {
  if (!hasLocalStorage) {
    console.warn('[Storage] Storage events indisponível (mode privado ou restrito) - cross-tab desabilitado');
    return () => {}; // Retorna cleanup vazio
  }
  
  const handler = (e) => {
    if (e.storageArea === localStorage) {
      console.log('[Storage] Storage event detectado:', e.key);
      callback(e);
    }
  };
  
  window.addEventListener('storage', handler);
  return () => window.removeEventListener('storage', handler);
};

/**
 * Força sincronização manual (polling) - essencial para Simple Browser, Edge e mobile
 */
export const createStorageWatcher = (key, callback, intervalMs = 250) => {
  let lastValue = getItem(key);
  
  const interval = setInterval(() => {
    const currentValue = getItem(key);
    if (currentValue !== lastValue) {
      lastValue = currentValue;
      callback(currentValue);
    }
  }, intervalMs);
  
  return () => {
    clearInterval(interval);
  };
};

const storageManager = {
  setItem,
  getItem,
  removeItem,
  onStorageChange,
  createStorageWatcher,
  hasLocalStorage,
  hasSessionStorage
};

export default storageManager;
