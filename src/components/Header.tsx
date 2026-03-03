import { motion } from 'framer-motion';
import { Trophy } from 'lucide-react';
import { ApiStatus } from './ApiStatus';

export function Header() {
  return (
    <motion.div
      initial={{ opacity: 0, x: -40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="flex items-start justify-between gap-4"
    >
      <div>
        <div className="flex items-center gap-3 mb-2">
          <Trophy className="w-8 h-8 text-podium-gold" strokeWidth={2.5} />
          <h1 className="font-display text-4xl md:text-5xl font-bold text-podium-text">
            Sales Leaderboard
          </h1>
        </div>
        <p className="text-podium-secondary text-base md:text-lg">
          Ranking de vendas — Março 2026
        </p>
      </div>
      <ApiStatus />
    </motion.div>
  );
}
