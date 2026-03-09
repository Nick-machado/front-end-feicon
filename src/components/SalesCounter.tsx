import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface SalesCounterProps {
  target: number;
  delay?: number;
  dark?: boolean;
}

export function SalesCounter({ target, delay = 0, dark = false }: SalesCounterProps) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const startTime = Date.now();
    const duration = 1800;

    const animateCount = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(target * easeOut));
      if (progress < 1) requestAnimationFrame(animateCount);
    };

    const timer = setTimeout(() => { animateCount(); }, delay * 1000);
    return () => clearTimeout(timer);
  }, [target, delay]);

  return (
    <motion.div className="flex flex-col items-center gap-1">
      <div className="font-display text-5xl font-black text-hm-green">
        {count.toLocaleString('pt-BR')}
      </div>
      <p className={`text-sm uppercase tracking-widest font-bold ${
        dark ? 'text-hm-gray-300' : 'text-hm-gray-400'
      }`}>
        produtos
      </p>
    </motion.div>
  );
}
