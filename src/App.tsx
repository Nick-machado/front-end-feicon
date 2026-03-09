import { motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { LeaderboardPodium } from './components/LeaderboardPodium';
import { FloatingActionButton } from './components/FloatingActionButton';
import { CreateSaleModal } from './components/CreateSaleModal';
import { StockMetrics } from './components/StockMetrics';
import { useLeaderboard } from './hooks/useLeaderboard';
import { useUsers } from './hooks/useUsers';
import { useStock } from './hooks/useStock';
import { CreateSalePayload, User } from './types/api';
import { saleService } from './services/saleService';
import { hasResolvedAvatarUrl, preloadAvatarsForUsers } from './lib/avatar';
import './index.css';

function App() {
  const { leaderboard, isLoading: leaderboardLoading, error: leaderboardError, refetch: refetchLeaderboard } = useLeaderboard();
  const { users, isLoading: usersLoading } = useUsers();
  const { stock, isLoading: stockLoading, refetch: refetchStock } = useStock();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAvatarPreloading, setIsAvatarPreloading] = useState(true);
  const dragScrollSensitivity = 2.2;
  const dragScrollState = useRef({
    isDragging: false,
    pointerId: -1,
    lastX: 0,
    lastY: 0,
  });

  const usersForAvatarPreload = useMemo(() => {
    const merged = new Map<string, User>();

    users.forEach((user) => {
      merged.set(user.uuid, user);
    });

    leaderboard.forEach((entry) => {
      merged.set(entry.user.uuid, entry.user);
    });

    return Array.from(merged.values());
  }, [users, leaderboard]);

  useEffect(() => {
    let cancelled = false;

    const preload = async () => {
      if (leaderboardLoading || usersLoading) {
        return;
      }

      if (usersForAvatarPreload.length === 0) {
        if (!cancelled) {
          setIsAvatarPreloading(false);
        }
        return;
      }

      const allResolved = usersForAvatarPreload.every((user) => hasResolvedAvatarUrl(user.uuid));
      if (allResolved) {
        if (!cancelled) {
          setIsAvatarPreloading(false);
        }
        return;
      }

      if (!cancelled) {
        setIsAvatarPreloading(true);
      }

      await preloadAvatarsForUsers(usersForAvatarPreload);

      if (!cancelled) {
        setIsAvatarPreloading(false);
      }
    };

    preload();

    return () => {
      cancelled = true;
    };
  }, [leaderboardLoading, usersLoading, usersForAvatarPreload]);

  useEffect(() => {
    const isInteractiveElement = (target: EventTarget | null) => {
      if (!(target instanceof Element)) {
        return false;
      }

      return Boolean(
        target.closest('input, textarea, select, button, a, label, [role="button"], [contenteditable="true"], [data-drag-scroll="off"]'),
      );
    };

    const stopDragging = () => {
      if (!dragScrollState.current.isDragging) {
        return;
      }

      dragScrollState.current.isDragging = false;
      dragScrollState.current.pointerId = -1;
      document.body.classList.remove('drag-scroll-active');
      document.documentElement.classList.remove('drag-scroll-active');
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse' || event.button !== 0 || isInteractiveElement(event.target)) {
        return;
      }

      dragScrollState.current.isDragging = true;
      dragScrollState.current.pointerId = event.pointerId;
      dragScrollState.current.lastX = event.clientX;
      dragScrollState.current.lastY = event.clientY;
      document.body.classList.add('drag-scroll-active');
      document.documentElement.classList.add('drag-scroll-active');
      event.preventDefault();
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!dragScrollState.current.isDragging || dragScrollState.current.pointerId !== event.pointerId) {
        return;
      }

      const deltaX = event.clientX - dragScrollState.current.lastX;
      const deltaY = event.clientY - dragScrollState.current.lastY;

      window.scrollBy({
        left: -deltaX * dragScrollSensitivity,
        top: -deltaY * dragScrollSensitivity,
      });

      dragScrollState.current.lastX = event.clientX;
      dragScrollState.current.lastY = event.clientY;
      event.preventDefault();
    };

    const handlePointerUp = (event: PointerEvent) => {
      if (dragScrollState.current.pointerId !== event.pointerId) {
        return;
      }

      stopDragging();
    };

    window.addEventListener('pointerdown', handlePointerDown, { passive: false });
    window.addEventListener('pointermove', handlePointerMove, { passive: false });
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    window.addEventListener('blur', stopDragging);

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
      window.removeEventListener('blur', stopDragging);
      document.body.classList.remove('drag-scroll-active');
      document.documentElement.classList.remove('drag-scroll-active');
    };
  }, []);

  const isLoading = leaderboardLoading || usersLoading || isAvatarPreloading;
  const error = leaderboardError;

  const handleCreateSale = async (data: CreateSalePayload) => {
    const result = await saleService.create(data);
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

        {/* Stock Metrics */}
        {!isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <StockMetrics stock={stock} isLoading={stockLoading} />
          </motion.div>
        )}

        {/* Leaderboard */}
        {!isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
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
        onLeaderboardUpdate={refetchLeaderboard}
        onStockUpdate={refetchStock}
      />
    </div>
  );
}

export default App;
