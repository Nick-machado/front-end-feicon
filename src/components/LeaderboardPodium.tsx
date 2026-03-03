import { motion } from 'framer-motion';
import { LeaderboardCard } from './LeaderboardCard';
import { LeaderboardEntry } from '../types/api';
import { RotateCw } from 'lucide-react';

interface LeaderboardPodiumProps {
  leaderboard: LeaderboardEntry[];
  isLoading: boolean;
  error: string | null;
  onRefetch?: () => Promise<void>;
}

export function LeaderboardPodium({ leaderboard, isLoading, error, onRefetch }: LeaderboardPodiumProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        {[1, 2, 3].map((i) => (
          <motion.div
            key={i}
            className="h-28 bg-hm-white rounded animate-pulse border border-hm-bg-card"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-red-50 border border-red-300 rounded p-6 text-center"
      >
        <p className="text-red-700 font-bold text-sm uppercase mb-1">⚠️ Erro ao conectar à API</p>
        <p className="text-red-600 text-sm mb-4">{error}</p>
        <div className="flex gap-2 justify-center flex-wrap">
          <button
            onClick={onRefetch}
            className="flex items-center gap-2 px-5 py-2 bg-hm-green text-hm-black rounded font-btn font-600 text-sm uppercase tracking-wide hover:bg-hm-green-hover transition"
          >
            <RotateCw className="w-4 h-4" />
            Tentar Novamente
          </button>
          <a
            href="https://api-feicon.onrender.com"
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-2 bg-hm-black text-hm-white rounded border border-hm-green text-sm uppercase tracking-wide hover:bg-hm-gray-900 transition"
          >
            Verificar API
          </a>
        </div>
        <p className="text-hm-gray-400 text-xs mt-4">
          💡 Tip: Se a API estiver no Render, a primeira requisição pode levar 20-40s (cold start).
        </p>
      </motion.div>
    );
  }

  if (leaderboard.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center py-12 bg-hm-white rounded border border-hm-bg-card"
      >
        <p className="text-hm-gray-400 text-sm uppercase tracking-widest">📊 Nenhum vendedor cadastrado</p>
        <p className="text-hm-gray-300 text-xs mt-2">Crie uma venda para aparecer no ranking.</p>
      </motion.div>
    );
  }

  const maxSales = leaderboard[0]?.totalSales || 1;

  return (
    <div className="flex flex-col gap-4">
      {leaderboard.map((entry, index) => (
        <LeaderboardCard
          key={entry.user.uuid}
          entry={entry}
          delay={index * 0.15}
          maxSales={maxSales}
        />
      ))}
    </div>
  );
}
