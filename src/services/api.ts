import axios, { AxiosInstance, AxiosError } from 'axios';

// Em desenvolvimento, usa proxy local; em produção, usa a URL real
const isDev = import.meta.env.DEV;
const baseURL = isDev ? '/api' : 'https://api-feicon.onrender.com';

console.log('[API] Modo desenvolvimento:', isDev);
console.log('[API] Base URL:', baseURL);

const apiClient: AxiosInstance = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Interceptor de resposta para log e tratamento de erros
apiClient.interceptors.response.use(
  (response) => {
    // Retorna response.data diretamente (dados já extraídos pelo axios)
    console.log('[API Response]', response.config.method?.toUpperCase(), response.config.url, response.status, response.data);
    return response;
  },
  (error: AxiosError) => {
    // Tratamento de erros de rede, timeout, etc
    console.error('[API Error]', error.message, error.code);
    
    // Log detalhado do erro de resposta
    if (error.response) {
      console.error('[API Error Response]', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });
    }

    // Re-lança o erro original do axios para preservar error.response
    // Isso permite que o caller acesse error.response.data com todos os detalhes
    return Promise.reject(error);
  }
);

export default apiClient;
