interface AvatarProps {
  src: string;
  alt: string;
  rank: 1 | 2 | 3;
}

const borderColors = {
  1: 'border-hm-green',
  2: 'border-hm-gray-600',
  3: 'border-hm-gray-400',
};

export function Avatar({ src, alt, rank }: AvatarProps) {
  return (
    <div
      className={`
        w-16 h-16
        rounded
        overflow-hidden
        border-2 ${borderColors[rank]}
        flex-shrink-0
      `}
    >
      <img src={src} alt={alt} className="w-full h-full object-cover" />
    </div>
  );
}
