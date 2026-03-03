import { useEffect, useState } from 'react';
import { userService } from '../services/userService';
import { saleService } from '../services/saleService';
import { LeaderboardEntry } from '../types/api';

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

  const fetchLeaderboard = async () => {
    try {
      console.log('[useLeaderboard] Iniciando carregamento...');
      setIsLoading(true);
      setError(null);

      // Buscar dados em paralelo
      const [users, sales] = await Promise.all([
        userService.getAll(),
        saleService.getAll(),
      ]);

      console.log('[useLeaderboard] Dados recebidos - Users:', users?.length, 'Sales:', sales?.length);

      // Se não houver usuários, retorna array vazio
      if (!Array.isArray(users) || users.length === 0) {
        console.log('[useLeaderboard] Sem usuários, retornando array vazio');
        setLeaderboard([]);
        setIsLoading(false);
        return;
      }

      // Se não houver vendas, calcula ranking com todos em 0
      const salesArray = Array.isArray(sales) ? sales : [];
      console.log('[useLeaderboard] Processando ranking...');

      // Calcular ranking para cada usuário
      const entries: LeaderboardEntry[] = users
        .map((user) => {
          const userSales = salesArray.filter((sale) => sale.uuid === user.uuid);
          const totalSales = userSales.reduce((sum, s) => sum + s.quantity, 0);
          const totalRevenue = userSales.reduce((sum, s) => sum + s.total, 0);
          const salesCount = userSales.length;
          const confirmedSales = userSales.filter((s) => s.status === true).length;

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
          // Ordenar por totalSales decrescente
          if (b.totalSales !== a.totalSales) {
            return b.totalSales - a.totalSales;
          }
          // Desempate por totalRevenue
          return b.totalRevenue - a.totalRevenue;
        })
        .map((entry, index) => ({
          ...entry,
          rank: index + 1,
        }));

      console.log('[useLeaderboard] Ranking processado:', entries.length, 'entradas');
      setLeaderboard(entries);
      setIsLoading(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar ranking';
      console.error('[useLeaderboard] ERRO:', message, err);
      setError(message);
      setLeaderboard([]);
      setIsLoading(false);
    }
  };

  // Buscar dados ao montar o componente
  useEffect(() => {
    fetchLeaderboard();
  }, []);

  return {
    leaderboard,
    isLoading,
    error,
    refetch: fetchLeaderboard,
  };
}
