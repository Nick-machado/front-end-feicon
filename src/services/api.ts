import axios, { AxiosInstance, AxiosError } from 'axios';
import { logger } from '../lib/logger';

const isDev = import.meta.env.DEV;
const baseURL = import.meta.env.VITE_API_URL || (isDev ? '/api' : 'https://api-feicon.onrender.com');

logger.debug('[API] Modo desenvolvimento:', isDev);
logger.debug('[API] Base URL:', baseURL);

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
    logger.debug('[API Response]', response.config.method?.toUpperCase(), response.config.url, response.status);
    return response;
  },
  (error: AxiosError) => {
    logger.error('[API Error]', error.message, error.code);
    
    if (error.response) {
      logger.debug('[API Error Response]', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });
    }

    return Promise.reject(error);
  }
);

export default apiClient;
