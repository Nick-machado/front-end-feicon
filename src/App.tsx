import { motion } from 'framer-motion';
import { useState } from 'react';
import { LeaderboardPodium } from './components/LeaderboardPodium';
import { FloatingActionButton } from './components/FloatingActionButton';
import { CreateSaleModal } from './components/CreateSaleModal';
import { useLeaderboard } from './hooks/useLeaderboard';
import { useUsers } from './hooks/useUsers';
import { CreateSalePayload } from './types/api';
import { saleService } from './services/saleService';
import './index.css';

function App() {
  const { leaderboard, isLoading: leaderboardLoading, error: leaderboardError, refetch: refetchLeaderboard } = useLeaderboard();
  const { users } = useUsers();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const isLoading = leaderboardLoading;
  const error = leaderboardError;

  const handleCreateSale = async (data: CreateSalePayload) => {
    const result = await saleService.create(data);
    // Refetch leaderboard para atualizar
    await refetchLeaderboard();
    return result;
  };

  return (
    <div className="min-h-screen bg-hm-bg-soft text-hm-gray-700">

      {/* ── HEADER ── */}
      <header className="bg-hm-black">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <span className="text-hm-green font-display text-xl tracking-widest uppercase">HM RUBBER</span>
          <span className="text-hm-gray-400 text-sm hidden sm:block">|</span>
          <span className="text-hm-gray-400 text-xs uppercase tracking-widest hidden sm:block">Leaderboard de Vendas</span>
        </div>
      </header>

      {/* ── HERO ── */}
      <div className="bg-hm-black pb-10 pt-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <p className="text-hm-green font-bold text-xs uppercase tracking-widest mb-2">Ranking</p>
          <h1 className="text-hm-white font-black text-3xl md:text-4xl uppercase tracking-tight">
            Leaderboard de Vendas
          </h1>
          <p className="text-hm-gray-400 text-sm mt-1 uppercase tracking-wide">
            Atualizado em tempo real
          </p>
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 pb-24">

        {/* Loading State */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          >
            <div className="bg-hm-white rounded p-8 border border-hm-gray-400/20 flex items-center gap-4 shadow-lg">
              <div className="w-8 h-8 border-2 border-hm-green border-t-transparent rounded-full animate-spin" />
              <span className="text-hm-gray-700 font-display text-sm uppercase tracking-wide">Carregando ranking...</span>
            </div>
          </motion.div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-50 border border-red-300 rounded"
          >
            <p className="text-red-700 font-bold text-sm uppercase">⚠️ Erro ao carregar ranking:</p>
            <p className="text-red-600 text-sm mt-1">{error}</p>
            <p className="text-red-500 text-xs mt-2">Verifique a conexão ou tente atualizar a página.</p>
          </motion.div>
        )}

        {/* Leaderboard */}
        {!isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <LeaderboardPodium
              leaderboard={leaderboard}
              isLoading={leaderboardLoading}
              error={leaderboardError}
              onRefetch={refetchLeaderboard}
            />
          </motion.div>
        )}
      </div>

      {/* Floating Action Button */}
      <FloatingActionButton onClick={() => setIsModalOpen(true)} />

      {/* Create Sale Modal */}
      <CreateSaleModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateSale}
        users={users}
      />
    </div>
  );
}

export default App;
