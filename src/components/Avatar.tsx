import { useEffect, useMemo, useState } from 'react';

interface AvatarProps {
  src?: string;
  srcCandidates?: string[];
  cacheKey?: string;
  alt: string;
}

const successfulAvatarUrlByKey = new Map<string, string>();

export function Avatar({ src, srcCandidates = [], cacheKey, alt }: AvatarProps) {
  const normalizedCandidates = useMemo(
    () => (srcCandidates.length > 0 ? srcCandidates : src ? [src] : []),
    [src, srcCandidates]
  );
  const candidateSignature = normalizedCandidates.join('|');
  const fallbackUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
    alt
  )}&backgroundColor=BCCF00&textColor=000000`;
  const cachedUrl = cacheKey ? successfulAvatarUrlByKey.get(cacheKey) : undefined;
  const initialUrl =
    cachedUrl && normalizedCandidates.includes(cachedUrl)
      ? cachedUrl
      : normalizedCandidates[0] || fallbackUrl;
  const initialIndex = Math.max(0, normalizedCandidates.indexOf(initialUrl));
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [imageSrc, setImageSrc] = useState(initialUrl);

  useEffect(() => {
    setCandidateIndex(initialIndex);
    setImageSrc(initialUrl);
  }, [candidateSignature, fallbackUrl, cacheKey]);

  const isFallback = imageSrc === fallbackUrl;

  return (
    <div
      className={`
        w-16 h-16 sm:w-20 sm:h-20
        rounded-full
        overflow-hidden
        flex-shrink-0
        ${isFallback ? 'border-2 border-hm-green' : ''}
      `}
    >
      <img
        src={imageSrc}
        alt={alt}
        className="w-full h-full object-cover"
        loading="eager"
        decoding="async"
        onLoad={() => {
          if (cacheKey && imageSrc !== fallbackUrl) {
            successfulAvatarUrlByKey.set(cacheKey, imageSrc);
          }
        }}
        onError={() => {
          if (imageSrc === fallbackUrl) {
            return;
          }

          const nextIndex = candidateIndex + 1;
          if (nextIndex < normalizedCandidates.length) {
            setCandidateIndex(nextIndex);
            setImageSrc(normalizedCandidates[nextIndex]);
            return;
          }
          setImageSrc(fallbackUrl);
        }}
      />
    </div>
  );
}
