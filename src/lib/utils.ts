import { BAD_WORDS } from './constants';

export function containsBadWord(text: string): boolean {
  const lower = text.toLowerCase();
  return BAD_WORDS.some((word) => lower.includes(word));
}

export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function generateHostToken(): string {
  return crypto.randomUUID();
}

export function parseStudentNames(text: string): string[] {
  return text
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
}

export function isRoomExpired(expiresAt: string): boolean {
  return new Date(expiresAt) < new Date();
}

export function canEditPraise(createdAt: string): boolean {
  return Date.now() - new Date(createdAt).getTime() < 2 * 60 * 1000;
}
