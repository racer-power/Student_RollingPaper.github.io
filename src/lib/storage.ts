import type { PraiseDraft, RoomBundle } from '../types';
import { DRAFT_DEBOUNCE_MS } from './constants';

const DEVICE_KEY = 'rp_device_id';

export function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

export function setHostToken(code: string, token: string) {
  localStorage.setItem(`rp_host_${code}`, token);
}

export function getHostToken(code: string): string | null {
  return localStorage.getItem(`rp_host_${code}`);
}

export function setStudentSession(code: string, studentId: string, studentName: string) {
  localStorage.setItem(`rp_student_${code}`, JSON.stringify({ studentId, studentName }));
}

export function getStudentSession(code: string): { studentId: string; studentName: string } | null {
  const raw = localStorage.getItem(`rp_student_${code}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearStudentSession(code: string) {
  localStorage.removeItem(`rp_student_${code}`);
}

function draftKey(code: string, studentId: string) {
  return `rp_draft_${code}_${studentId}`;
}

export function saveDraft(code: string, studentId: string, draft: PraiseDraft) {
  localStorage.setItem(draftKey(code, studentId), JSON.stringify(draft));
}

export function loadDraft(code: string, studentId: string): PraiseDraft | null {
  const raw = localStorage.getItem(draftKey(code, studentId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PraiseDraft;
  } catch {
    return null;
  }
}

export function clearDraft(code: string, studentId: string) {
  localStorage.removeItem(draftKey(code, studentId));
}

let draftTimer: ReturnType<typeof setTimeout> | null = null;

export function debouncedSaveDraft(
  code: string,
  studentId: string,
  draft: PraiseDraft,
  onSaved?: () => void,
) {
  if (draftTimer) clearTimeout(draftTimer);
  draftTimer = setTimeout(() => {
    saveDraft(code, studentId, { ...draft, savedAt: Date.now() });
    onSaved?.();
  }, DRAFT_DEBOUNCE_MS);
}

function bundleKey(code: string) {
  return `rp_bundle_${code.toUpperCase()}`;
}

export function saveRoomBundle(code: string, bundle: RoomBundle) {
  localStorage.setItem(bundleKey(code), JSON.stringify(bundle));
}

export function loadRoomBundle(code: string): RoomBundle | null {
  const raw = localStorage.getItem(bundleKey(code));
  if (!raw) return null;
  try {
    const bundle = JSON.parse(raw) as RoomBundle;
    if (new Date(bundle.room.expires_at) < new Date()) {
      localStorage.removeItem(bundleKey(code));
      return null;
    }
    return bundle;
  } catch {
    return null;
  }
}

export function updateRoomBundle(code: string, updater: (bundle: RoomBundle) => RoomBundle) {
  const current = loadRoomBundle(code);
  if (!current) return;
  saveRoomBundle(code, updater(current));
}
