import axios from 'axios';
import storage from './storage';
import fcmService from '../services/fcmService';

let isRefreshing = false;
let isRedirecting = false; // Flag para evitar múltiplos redirecionamentos
let failedQueue = []; // Fila de requisições aguardando refresh

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  
  failedQueue = [];
};

const setupInterceptor = (apiBaseUrl) => {
  console.log('[Interceptor] Configurando interceptor com API:', apiBaseUrl);
  
  // Resetar flag de redirecionamento quando chega na página de login
  if (window.location.pathname === '/login') {
    console.log('[Interceptor] Resetando flag isRedirecting pois está em /login');
    isRedirecting = false;
  }
  
  // Interceptor de requisição para adicionar logs
  axios.interceptors.request.use(
    (config) => {
      const token = storage.getItem('token');
      if (config.url?.includes('/auth/')) {
        console.log('[Interceptor] Requisição de autenticação:', config.url);
      }
      return config;
    },
    (error) => Promise.reject(error)
  );
  
  // Interceptor de resposta para renovar token automaticamente
  axios.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;
      
      console.log('[Interceptor] Erro capturado:', {
        status: error.response?.status,
        url: originalRequest.url,
        isRetry: originalRequest._retry,
        isRefreshing,
        isRedirecting
      });
      
      // Se erro 401 (token expirado) e não é rota de login/refresh
      if (error.response?.status === 401 && !originalRequest._retry) {
        if (originalRequest.url?.includes('/auth/login') || originalRequest.url?.includes('/auth/refresh')) {
          console.log('[Interceptor] Erro em rota de auth, não vai tentar refresh');
          return Promise.reject(error);
        }

        // Se já está na página de login, não tenta refresh nem redireciona
        if (window.location.pathname === '/login') {
          console.log('[Interceptor] Já está em /login, não processa 401');
          return Promise.reject(error);
        }

        if (isRefreshing) {
          // Se já está refreshing, adiciona à fila
          console.log('[Interceptor] Já refreshing, adicionando à fila');
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          })
            .then(token => {
              originalRequest.headers['Authorization'] = 'Bearer ' + token;
              return axios(originalRequest);
            })
            .catch(err => {
              return Promise.reject(err);
            });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        const refreshToken = storage.getItem('refreshToken');
        
        if (!refreshToken) {
          // Sem refresh token, redireciona para login (apenas uma vez)
          console.log('[Interceptor] Sem refreshToken, redirecionando para login');
          if (!isRedirecting) {
            isRedirecting = true;
            fcmService.removerToken(); // Remove FCM token
            storage.removeItem('token');
            storage.removeItem('refreshToken');
            storage.removeItem('grupoId');
            window.dispatchEvent(new Event('authChange'));
            
            console.log('[Interceptor] Cancelando requisições pendentes');
            processQueue(new Error('Sem refresh token'), null);
            
            // Pequeno delay para evitar race condition
            setTimeout(() => {
              console.log('[Interceptor] Redirecionando para /login');
              window.location.href = '/login';
            }, 100);
          }
          return Promise.reject(error);
        }

        try {
          // Tentar renovar o token
          console.log('[Interceptor] Tentando renovar token...');
          const response = await axios.post(`${apiBaseUrl}/auth/refresh`, {
            refreshToken
          });

          const { token } = response.data;
          console.log('[Interceptor] Token renovado com sucesso');
          
          // Salvar novo token
          storage.setItem('token', token);
          
          // Atualizar header da requisição original
          originalRequest.headers['Authorization'] = 'Bearer ' + token;
          
          // Processar fila de requisições pendentes
          console.log('[Interceptor] Processando fila com', failedQueue.length, 'requisições');
          processQueue(null, token);
          
          isRefreshing = false;
          
          // Retry da requisição original
          return axios(originalRequest);
        } catch (refreshError) {
          // Refresh falhou, fazer logout (apenas uma vez)
          console.log('[Interceptor] Falha ao renovar token:', refreshError.message);
          processQueue(refreshError, null);
          isRefreshing = false;
          
          if (!isRedirecting) {
            isRedirecting = true;
            fcmService.removerToken(); // Remove FCM token
            storage.removeItem('token');
            storage.removeItem('refreshToken');
            storage.removeItem('grupoId');
            window.dispatchEvent(new Event('authChange'));
            
            // Pequeno delay para evitar race condition
            setTimeout(() => {
              console.log('[Interceptor] Redirecionando para /login após falha');
              window.location.href = '/login';
            }, 100);
          }
          
          return Promise.reject(refreshError);
        }
      }

      return Promise.reject(error);
    }
  );
};

export default setupInterceptor;
