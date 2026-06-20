import type { RoomBundle } from './types';

declare global {
  // eslint-disable-next-line no-var
  var __rpStore: Map<string, RoomBundle> | undefined;
}

export const store: Map<string, RoomBundle> = globalThis.__rpStore ??= new Map();

export function getByCode(code: string): RoomBundle | undefined {
  const bundle = store.get(code.toUpperCase());
  if (!bundle) return undefined;
  if (new Date(bundle.room.expires_at) < new Date()) {
    store.delete(code.toUpperCase());
    return undefined;
  }
  return bundle;
}

export function saveBundle(code: string, bundle: RoomBundle) {
  store.set(code.toUpperCase(), bundle);
}

export function newId(): string {
  return crypto.randomUUID();
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function findStudent(bundle: RoomBundle, studentId: string) {
  return bundle.students.find((s) => s.id === studentId);
}

export function assertHost(bundle: RoomBundle, hostToken: string) {
  if (bundle.room.host_token !== hostToken) {
    throw new Error('UNAUTHORIZED');
  }
}

export function assertActive(bundle: RoomBundle) {
  if (bundle.room.status === 'ended') {
    throw new Error('SESSION_ENDED');
  }
}
