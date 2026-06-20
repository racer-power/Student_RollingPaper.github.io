import type { Praise, Room, Student, StudentStats, RoomBundle } from '../types';
import {
  getDeviceId,
  getHostToken,
  loadRoomBundle,
  saveRoomBundle,
} from './storage';
import { generateHostToken, generateRoomCode } from './utils';
import { ROOM_EXPIRY_HOURS } from './constants';

const API = '/api/rooms';

async function api<T>(
  action: string,
  options: { method?: string; body?: Record<string, unknown>; code?: string } = {},
): Promise<T> {
  const { method = 'GET', body, code } = options;
  const params = new URLSearchParams({ action });
  if (code) params.set('code', code);
  const url = `${API}?${params}`;

  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify({ action, ...body }) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error ?? '요청에 실패했어요');
  }
  return data as T;
}

function isHost(bundle: RoomBundle, code: string): boolean {
  const token = getHostToken(code);
  return !!token && bundle.room.host_token === token;
}

async function fetchBundle(code: string): Promise<RoomBundle> {
  const cached = loadRoomBundle(code);
  if (cached) {
    if (!isHost(cached, code)) {
      api<RoomBundle>('get', { code })
        .then((fresh) => saveRoomBundle(code, fresh))
        .catch(() => {});
    }
    return cached;
  }
  const bundle = await api<RoomBundle>('get', { code });
  saveRoomBundle(code, bundle);
  return bundle;
}

function attachStudentNames(praises: Praise[], students: Student[]): Praise[] {
  const map = new Map(students.map((s) => [s.id, s]));
  return praises.map((p) => ({
    ...p,
    from_student: map.get(p.from_student_id),
    to_student: map.get(p.to_student_id),
  }));
}

function createLocalRoom(className: string, studentNames: string[]): RoomBundle {
  const roomCode = generateRoomCode();
  const roomId = crypto.randomUUID();
  const hostToken = generateHostToken();
  const createdAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + ROOM_EXPIRY_HOURS * 60 * 60 * 1000).toISOString();

  const room: Room = {
    id: roomId,
    code: roomCode,
    class_name: className,
    status: 'ready',
    host_token: hostToken,
    expires_at: expiresAt,
    created_at: createdAt,
  };

  const students: Student[] = studentNames.map((name) => ({
    id: crypto.randomUUID(),
    room_id: roomId,
    name,
    device_id: null,
    created_at: createdAt,
  }));

  return { room, students, praises: [] };
}

export async function createRoom(className: string, studentNames: string[]) {
  try {
    const data = await api<{ room: Room; students: Student[] }>('create', {
      method: 'POST',
      body: { className, studentNames },
    });
    saveRoomBundle(data.room.code, {
      room: data.room,
      students: data.students,
      praises: [],
    });
    return data.room;
  } catch {
    const bundle = createLocalRoom(className, studentNames);
    saveRoomBundle(bundle.room.code, bundle);
    return bundle.room;
  }
}

export async function getRoomByCode(code: string): Promise<Room | null> {
  const cached = loadRoomBundle(code);
  if (cached) return cached.room;
  try {
    const bundle = await api<RoomBundle>('get', { code });
    saveRoomBundle(code, bundle);
    return bundle.room;
  } catch {
    return loadRoomBundle(code)?.room ?? null;
  }
}

export async function getStudents(code: string): Promise<Student[]> {
  const { students } = await fetchBundle(code);
  return students;
}

export async function claimStudentName(
  roomId: string,
  studentId: string,
  deviceId: string,
  code: string,
): Promise<{ ok: true } | { ok: false; reason: 'taken' }> {
  const bundle = loadRoomBundle(code);
  if (bundle) {
    const student = bundle.students.find((s) => s.id === studentId);
    if (student) {
      if (student.device_id && student.device_id !== deviceId) {
        return { ok: false, reason: 'taken' };
      }
      student.device_id = deviceId;
      saveRoomBundle(code, bundle);
    }
  }

  try {
    await api('claim', { method: 'POST', body: { roomId, studentId, deviceId } });
    return { ok: true };
  } catch (err) {
    if (bundle && bundle.students.find((s) => s.id === studentId)?.device_id === deviceId) {
      return { ok: true };
    }
    if (err instanceof Error && err.message.includes('사용 중')) {
      return { ok: false, reason: 'taken' };
    }
    throw err;
  }
}

export async function updateRoomStatus(
  roomId: string,
  hostToken: string,
  status: Room['status'],
  code: string,
) {
  const bundle = loadRoomBundle(code);
  if (!bundle || bundle.room.host_token !== hostToken) {
    throw new Error('교사 권한이 없어요.');
  }

  bundle.room.status = status;
  saveRoomBundle(code, bundle);

  try {
    const { room } = await api<{ room: Room }>('status', {
      method: 'PATCH',
      body: { roomId, hostToken, status },
    });
    bundle.room = room;
    saveRoomBundle(code, bundle);
    return room;
  } catch {
    return bundle.room;
  }
}

export async function getPraises(code: string): Promise<Praise[]> {
  const { praises, students } = await fetchBundle(code);
  return attachStudentNames(praises, students);
}

export async function getPraisesForStudent(code: string, studentId: string): Promise<Praise[]> {
  const all = await getPraises(code);
  return all.filter((p) => p.to_student_id === studentId && !p.deleted);
}

export async function createPraise(
  roomId: string,
  fromStudentId: string,
  toStudentId: string,
  content: string,
  color: string,
  code: string,
) {
  const bundle = loadRoomBundle(code) ?? (await fetchBundle(code));

  const praise: Praise = {
    id: crypto.randomUUID(),
    room_id: roomId,
    from_student_id: fromStudentId,
    to_student_id: toStudentId,
    content,
    color,
    deleted: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  bundle.praises.push(praise);
  saveRoomBundle(code, bundle);

  try {
    const { praise: saved } = await api<{ praise: Praise }>('praise-create', {
      method: 'POST',
      body: { roomId, fromStudentId, toStudentId, content, color },
    });
    const idx = bundle.praises.findIndex((p) => p.id === praise.id);
    if (idx >= 0) bundle.praises[idx] = saved;
    saveRoomBundle(code, bundle);
    return saved;
  } catch {
    return praise;
  }
}

export async function updatePraise(
  praiseId: string,
  content: string,
  color: string,
  roomId: string,
  code: string,
) {
  const bundle = loadRoomBundle(code);
  if (!bundle) throw new Error('학급을 찾을 수 없어요.');

  const praise = bundle.praises.find((p) => p.id === praiseId);
  if (!praise || praise.deleted) throw new Error('칭찬을 찾을 수 없어요.');

  praise.content = content;
  praise.color = color;
  praise.updated_at = new Date().toISOString();
  saveRoomBundle(code, bundle);

  try {
    const { praise: saved } = await api<{ praise: Praise }>('praise-update', {
      method: 'PATCH',
      body: { roomId, praiseId, content, color },
    });
    const idx = bundle.praises.findIndex((p) => p.id === praiseId);
    if (idx >= 0) bundle.praises[idx] = saved;
    saveRoomBundle(code, bundle);
    return saved;
  } catch {
    return praise;
  }
}

export async function deletePraise(praiseId: string, hostToken: string, roomId: string, code: string) {
  const bundle = loadRoomBundle(code);
  if (!bundle || bundle.room.host_token !== hostToken) {
    throw new Error('권한이 없어요.');
  }

  const praise = bundle.praises.find((p) => p.id === praiseId);
  if (praise) {
    praise.deleted = true;
    saveRoomBundle(code, bundle);
  }

  try {
    await api('praise-delete', {
      method: 'POST',
      body: { roomId, praiseId, hostToken },
    });
  } catch {
    /* local already updated */
  }
}

export async function getStudentStats(code: string): Promise<StudentStats[]> {
  const { students, praises } = await fetchBundle(code);
  const active = praises.filter((p) => !p.deleted);
  return students.map((student) => ({
    student,
    writtenCount: active.filter((p) => p.from_student_id === student.id).length,
    receivedCount: active.filter((p) => p.to_student_id === student.id).length,
  }));
}

export async function getWrittenCount(code: string, studentId: string): Promise<number> {
  const { praises } = await fetchBundle(code);
  return praises.filter((p) => p.from_student_id === studentId && !p.deleted).length;
}

export function subscribeToRoom(_code: string, onChange: () => void): () => void {
  const interval = setInterval(onChange, 3000);
  const onStorage = (e: StorageEvent) => {
    if (e.key?.startsWith('rp_bundle_')) onChange();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    clearInterval(interval);
    window.removeEventListener('storage', onStorage);
  };
}

export { getDeviceId };
