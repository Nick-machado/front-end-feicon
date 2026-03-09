import { motion } from 'framer-motion';
import { LeaderboardEntry } from '../types/api';
import { Avatar } from './Avatar';
import { RankBadge } from './RankBadge';
import { SalesCounter } from './SalesCounter';
import { Progress } from './Progress';
import { useState, useEffect, useMemo } from 'react';
import { buildAvatarCandidates, getResolvedAvatarUrl } from '../lib/avatar';

interface LeaderboardCardProps {
  entry: LeaderboardEntry;
  delay?: number;
  maxSales?: number;
}

export function LeaderboardCard({
  entry,
  delay = 0,
  maxSales = 347,
}: LeaderboardCardProps) {
  const { user, rank, totalSales } = entry;
  const rankAs123 = (rank as 1 | 2 | 3);
  const percentage = (totalSales / maxSales) * 100;
  const [showProgress, setShowProgress] = useState(false);

  const avatarCandidates = useMemo(() => {
    const candidates = buildAvatarCandidates(user);
    const resolved = getResolvedAvatarUrl(user.uuid);

    if (resolved && candidates.includes(resolved)) {
      return [resolved, ...candidates.filter((candidate) => candidate !== resolved)];
    }

    return candidates;
  }, [user]);

  // 1st place uses dark card; 2nd and 3rd use light card
  const isFirst = rankAs123 === 1;

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowProgress(true);
    }, delay * 1000 + 600);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94], delay }}
    >
      <motion.div
        className={`
          relative
          rounded
          border
          p-5 md:p-7
          flex flex-col md:flex-row md:items-center gap-5
          cursor-pointer
          transition-shadow duration-200
          overflow-hidden
          group
          ${
            isFirst
              ? 'bg-hm-black border-hm-green shadow-[0_4px_24px_rgba(188,207,0,0.15)]'
              : 'bg-hm-white border-hm-bg-card shadow-[0_2px_8px_rgba(0,0,0,0.06)]'
          }
        `}
        whileHover={{
          boxShadow: isFirst
            ? '0 8px_32px_rgba(188,207,0,0.25)'
            : '0 4px 16px rgba(0,0,0,0.10)',
          y: -2,
        }}
      >
        {/* Rank watermark */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none select-none">
          <span
            className={`font-display text-[7rem] font-black leading-none ${
              isFirst ? 'text-hm-green/10' : 'text-hm-gray-900/5'
            }`}
          >
            {rankAs123}
          </span>
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col md:flex-row md:items-center w-full gap-5">
          {/* Avatar + Badge */}
          <div className="flex items-center gap-4 flex-shrink-0">
            <RankBadge rank={rankAs123} />
            <Avatar
              srcCandidates={avatarCandidates}
              cacheKey={user.uuid}
              alt={user.name}
            />
          </div>

          {/* Info */}
          <div className="flex-grow">
            <h3
              className={`font-black text-lg md:text-xl uppercase tracking-tight mb-0.5 ${
                isFirst ? 'text-hm-white' : 'text-hm-gray-900'
              }`}
            >
              {user.name}
            </h3>
            <p
              className={`text-xs uppercase tracking-widest font-medium mb-3 ${
                isFirst ? 'text-hm-gray-300' : 'text-hm-gray-400'
              }`}
            >
              {user.role} &bull; {user.sector}
            </p>

            <motion.div
              initial={{ scaleX: 0, opacity: 0 }}
              animate={showProgress ? { scaleX: 1, opacity: 1 } : { scaleX: 0, opacity: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              style={{ transformOrigin: 'left' }}
            >
              <Progress value={percentage} dark={isFirst} />
            </motion.div>
            <p
              className={`text-xs mt-1.5 uppercase tracking-wide ${
                isFirst ? 'text-hm-gray-400' : 'text-hm-gray-400'
              }`}
            >
              {Math.round(percentage)}% do 1º lugar
            </p>
          </div>

          {/* Counter */}
          <div className="flex-shrink-0 text-center md:text-right">
            <SalesCounter target={totalSales} delay={delay} dark={isFirst} />
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
