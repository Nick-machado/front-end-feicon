import { User } from '../types/api';

type UserWithPhoto = User & {
  avatarUrl?: string;
  photoUrl?: string;
  image?: string;
  avatar?: string;
  photo?: string;
};

const resolvedAvatarUrlByUuid = new Map<string, string>();

const toPublicObjectBaseUrl = (endpoint?: string): string | undefined => {
  if (!endpoint) return undefined;

  const normalized = endpoint.trim().replace(/\/+$/, '');

  return normalized
    .replace(
      /https:\/\/([^.]+)\.storage\.supabase\.co\/storage\/v1\/s3/i,
      'https://$1.supabase.co/storage/v1/object/public'
    )
    .replace(/\/s3$/, '/object/public');
};

export const getAvatarFallbackUrl = (name: string) =>
  `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
    name
  )}&backgroundColor=BCCF00&textColor=000000`;

export const getResolvedAvatarUrl = (uuid: string) => resolvedAvatarUrlByUuid.get(uuid);

export const hasResolvedAvatarUrl = (uuid: string) => resolvedAvatarUrlByUuid.has(uuid);

export const rememberResolvedAvatarUrl = (uuid: string, url: string) => {
  if (!uuid || !url) return;
  resolvedAvatarUrlByUuid.set(uuid, url);
};

export const buildAvatarCandidates = (user: User): string[] => {
  const userWithPhoto = user as UserWithPhoto;
  const directPhoto =
    userWithPhoto.avatarUrl ||
    userWithPhoto.photoUrl ||
    userWithPhoto.image ||
    userWithPhoto.avatar ||
    userWithPhoto.photo ||
    null;

  const endpoint = (import.meta.env.VITE_SUPABASE_S3_ENDPOINT as string | undefined)?.trim();
  const bucket = (import.meta.env.VITE_SUPABASE_S3_BUCKET as string | undefined)?.trim();
  const baseUrl = toPublicObjectBaseUrl(endpoint);

  const bucketCandidates = Array.from(
    new Set(
      [bucket, bucket?.toLowerCase(), bucket?.toUpperCase()].filter(
        (value): value is string => Boolean(value)
      )
    )
  );

  const keyCandidates = [
    user.uuid,
    `${user.uuid}.jpg`,
    `${user.uuid}.jpeg`,
    `${user.uuid}.png`,
    `${user.uuid}.webp`,
  ];

  const supabaseCandidates = baseUrl
    ? bucketCandidates.flatMap((bucketName) =>
        keyCandidates.map(
          (key) => `${baseUrl}/${encodeURIComponent(bucketName)}/${encodeURIComponent(key)}`
        )
      )
    : [];

  const fallbackUrl = getAvatarFallbackUrl(user.name);

  return Array.from(
    new Set(
      [directPhoto, ...supabaseCandidates, fallbackUrl].filter(
        (value): value is string => Boolean(value)
      )
    )
  );
};

const canUseImagePreload = () => typeof window !== 'undefined' && typeof Image !== 'undefined';

const loadImage = (url: string) =>
  new Promise<boolean>((resolve) => {
    if (!canUseImagePreload()) {
      resolve(false);
      return;
    }

    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });

export const preloadAvatarForUser = async (user: User): Promise<string> => {
  const cached = getResolvedAvatarUrl(user.uuid);
  if (cached) {
    return cached;
  }

  const candidates = buildAvatarCandidates(user);

  for (const candidate of candidates) {
    const loaded = await loadImage(candidate);
    if (loaded) {
      rememberResolvedAvatarUrl(user.uuid, candidate);
      return candidate;
    }
  }

  const fallbackUrl = getAvatarFallbackUrl(user.name);
  rememberResolvedAvatarUrl(user.uuid, fallbackUrl);
  return fallbackUrl;
};

export const preloadAvatarsForUsers = async (users: User[]): Promise<void> => {
  const uniqueUsers = Array.from(new Map(users.map((user) => [user.uuid, user])).values());
  await Promise.all(uniqueUsers.map((user) => preloadAvatarForUser(user)));
};
