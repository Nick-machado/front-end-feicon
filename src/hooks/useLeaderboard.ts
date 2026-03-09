import { useCallback, useEffect, useState } from 'react';
import { userService } from '../services/userService';
import { saleService } from '../services/saleService';
import { LeaderboardEntry } from '../types/api';
import { logger } from '../lib/logger';

interface UseLeaderboardReturn {
  leaderboard: LeaderboardEntry[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useLeaderboard(): UseLeaderboardReturn {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = useCallback(async (showLoader = true) => {
    try {
      logger.debug('[useLeaderboard] Iniciando carregamento...');
      if (showLoader) {
        setIsLoading(true);
      }
      setError(null);

      // Buscar dados em paralelo
      const [users, sales] = await Promise.all([
        userService.getAll(),
        saleService.getAll(),
      ]);

      logger.debug('[useLeaderboard] Dados recebidos - Users:', users?.length, 'Sales:', sales?.length);

      // Se não houver usuários, retorna array vazio
      if (!Array.isArray(users) || users.length === 0) {
        logger.debug('[useLeaderboard] Sem usuários, retornando array vazio');
        setLeaderboard([]);
        setIsLoading(false);
        return;
      }

      // Se não houver vendas, calcula ranking com todos em 0
      const salesArray = Array.isArray(sales) ? sales : [];
      logger.debug('[useLeaderboard] Processando ranking...');

      // Calcular ranking para cada usuário
      const entries: LeaderboardEntry[] = users
        .map((user) => {
          const userSales = salesArray.filter((sale) => sale.uuid === user.uuid);
          const confirmedUserSales = userSales.filter((sale) => sale.status === true);
          const totalSales = confirmedUserSales.reduce((sum, sale) => sum + sale.quantity, 0);
          const totalRevenue = confirmedUserSales.reduce((sum, sale) => sum + sale.total, 0);
          const salesCount = userSales.length;
          const confirmedSales = confirmedUserSales.length;

          return {
            user,
            rank: 0, // Será atribuído após ordenação
            totalSales,
            totalRevenue,
            salesCount,
            confirmedSales,
          };
        })
        .sort((a, b) => {
          if (b.totalSales !== a.totalSales) {
            return b.totalSales - a.totalSales;
          }

          return a.user.name.localeCompare(b.user.name, 'pt-BR', { sensitivity: 'base' });
        })
        .map((entry, index) => ({
          ...entry,
          rank: index + 1,
        }));

      logger.debug('[useLeaderboard] Ranking processado:', entries.length, 'entradas');
      setLeaderboard(entries);
      setIsLoading(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar ranking';
      logger.error('[useLeaderboard] ERRO:', message);
      setError(message);
      setLeaderboard([]);
      setIsLoading(false);
    }
  }, []);

  // Buscar dados ao montar o componente
  useEffect(() => {
    fetchLeaderboard(true);

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchLeaderboard(false);
      }
    }, 30000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchLeaderboard(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchLeaderboard]);

  return {
    leaderboard,
    isLoading,
    error,
    refetch: () => fetchLeaderboard(true),
  };
}
