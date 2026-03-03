import { useEffect, useState } from 'react';
import { saleService } from '../services/saleService';
import { Sale, CreateSalePayload, CreateSaleResult } from '../types/api';
import { logger } from '../lib/logger';

interface UseSalesReturn {
  sales: Sale[];
  isLoading: boolean;
  error: string | null;
  createSale: (data: CreateSalePayload) => Promise<CreateSaleResult>;
  deleteSale: (id: number) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useSales(): UseSalesReturn {
  const [sales, setSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSales = async () => {
    try {
      logger.debug('[useSales] Iniciando carregamento...');
      setIsLoading(true);
      setError(null);
      const data = await saleService.getAll();
      logger.debug('[useSales] Dados recebidos:', data?.length, 'vendas');
      
      // Garantir que é sempre um array
      const salesData = Array.isArray(data) ? data : [];
      setSales(salesData);
      setIsLoading(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar vendas';
      logger.error('[useSales] ERRO:', message);
      setError(message);
      setSales([]);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, []);

  const createSale = async (data: CreateSalePayload): Promise<CreateSaleResult> => {
    try {
      const result = await saleService.create(data);
      setSales((prev) => [...prev, result.sale]);
      return result;
    } catch (err) {
      throw err;
    }
  };

  const deleteSale = async (id: number): Promise<void> => {
    try {
      await saleService.remove(id);
      setSales((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      throw err;
    }
  };

  return {
    sales,
    isLoading,
    error,
    createSale,
    deleteSale,
    refetch: fetchSales,
  };
}
