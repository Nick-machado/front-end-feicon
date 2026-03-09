import { useCallback, useEffect, useState } from 'react';
import apiClient from '../services/api';
import { ApiResponse, Stock } from '../types/api';
import { logger } from '../lib/logger';

interface UseStockReturn {
  stock: Stock[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useStock(): UseStockReturn {
  const [stock, setStock] = useState<Stock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStock = useCallback(async (showLoader = true) => {
    try {
      logger.debug('[useStock] Iniciando carregamento...');
      if (showLoader) {
        setIsLoading(true);
      }
      setError(null);

      const response = await apiClient.get<ApiResponse<Stock[]>>('/stock');
      
      logger.debug('[useStock] Dados recebidos:', response.data);

      if (response.data?.error) {
        throw new Error(response.data.error.message || 'Erro ao buscar estoque');
      }

      const stockData = response.data?.data || [];
      setStock(stockData);
      logger.debug('[useStock] Estoque atualizado:', stockData.length, 'produtos');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido ao buscar estoque';
      logger.error('[useStock] Erro:', message);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStock();
  }, [fetchStock]);

  const refetch = useCallback(async () => {
    await fetchStock(false);
  }, [fetchStock]);

  return {
    stock,
    isLoading,
    error,
    refetch,
  };
}
