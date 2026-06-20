export const CARD_COLORS = ['#FFE066', '#B8E986', '#FFD3E0', '#C7CEEA', '#FFAAA5'] as const;

export const BAD_WORDS = ['바보', '멍청', '죽', '똥', '병신', '시발', '개새'];

export const EDIT_WINDOW_MS = 2 * 60 * 1000;

export const DRAFT_DEBOUNCE_MS = 3000;

export const ROOM_EXPIRY_HOURS = 24;

export const DISPLAY_SLIDE_MS = 5000;

/** Student join links / QR always use this origin when set (avoids preview URL 403). */
export function getPublicJoinOrigin(): string {
  const fromEnv = import.meta.env.VITE_PUBLIC_APP_ORIGIN as string | undefined;
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  return window.location.origin;
}
