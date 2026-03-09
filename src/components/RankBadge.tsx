interface RankBadgeProps {
  rank: number;
}

const styles = {
  1: { bg: 'bg-hm-green',   text: 'text-hm-black', label: '1º' },
  2: { bg: 'bg-hm-gray-700', text: 'text-hm-white',  label: '2º' },
  3: { bg: 'bg-hm-gray-400', text: 'text-hm-white',  label: '3º' },
};

export function RankBadge({ rank }: RankBadgeProps) {
  const s = styles[rank as 1 | 2 | 3] ?? { bg: 'bg-hm-gray-300', text: 'text-hm-gray-700', label: `${rank}º` };

  return (
    <div
      className={`
        flex items-center justify-center
        w-12 h-12 rounded
        ${s.bg} ${s.text}
        font-display font-black text-xl
        flex-shrink-0
      `}
    >
      {rank}
    </div>
  );
}
