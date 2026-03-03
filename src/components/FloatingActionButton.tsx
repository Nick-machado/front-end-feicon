import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';

interface FloatingActionButtonProps {
  onClick: () => void;
}

export function FloatingActionButton({ onClick }: FloatingActionButtonProps) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.95 }}
      className="fixed bottom-8 right-8 w-14 h-14 rounded bg-hm-green text-hm-black shadow-[0_4px_16px_rgba(188,207,0,0.35)] hover:bg-hm-green-hover hover:shadow-[0_4px_24px_rgba(188,207,0,0.5)] transition-all z-30 flex items-center justify-center group"
    >
      <motion.div
        animate={{ rotate: 0 }}
        whileHover={{ rotate: 90 }}
        transition={{ duration: 0.25 }}
      >
        <Plus className="w-6 h-6" strokeWidth={3} />
      </motion.div>

      {/* Tooltip */}
      <motion.span
        initial={{ opacity: 0, x: 8 }}
        whileHover={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.15 }}
        className="absolute right-16 bg-hm-black text-hm-white px-3 py-1.5 rounded text-xs font-btn font-semibold uppercase tracking-widest whitespace-nowrap pointer-events-none shadow"
      >
        Nova Venda
      </motion.span>
    </motion.button>
  );
}
