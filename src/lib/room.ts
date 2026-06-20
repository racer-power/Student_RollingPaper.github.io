import type { Praise, Room, Student, StudentStats } from '../types';
import { getDeviceId } from './storage';

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

async function getBundle(code: string) {
  return api<{ room: Room; students: Student[]; praises: Praise[] }>('get', { code });
}

function attachStudentNames(praises: Praise[], students: Student[]): Praise[] {
  const map = new Map(students.map((s) => [s.id, s]));
  return praises.map((p) => ({
    ...p,
    from_student: map.get(p.from_student_id),
    to_student: map.get(p.to_student_id),
  }));
}

export async function createRoom(className: string, studentNames: string[]) {
  const { room } = await api<{ room: Room; students: Student[] }>('create', {
    method: 'POST',
    body: { className, studentNames },
  });
  return room;
}

export async function getRoomByCode(code: string): Promise<Room | null> {
  try {
    const { room } = await getBundle(code);
    return room;
  } catch {
    return null;
  }
}

export async function getStudents(code: string): Promise<Student[]> {
  const { students } = await getBundle(code);
  return students;
}

export async function claimStudentName(
  roomId: string,
  studentId: string,
  deviceId: string,
): Promise<{ ok: true } | { ok: false; reason: 'taken' }> {
  try {
    await api('claim', { method: 'POST', body: { roomId, studentId, deviceId } });
    return { ok: true };
  } catch (err) {
    if (err instanceof Error && err.message.includes('사용 중')) {
      return { ok: false, reason: 'taken' };
    }
    throw err;
  }
}

export async function updateRoomStatus(roomId: string, hostToken: string, status: Room['status']) {
  const { room } = await api<{ room: Room }>('status', {
    method: 'PATCH',
    body: { roomId, hostToken, status },
  });
  return room;
}

export async function getPraises(code: string): Promise<Praise[]> {
  const { praises, students } = await getBundle(code);
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
) {
  const { praise } = await api<{ praise: Praise }>('praise-create', {
    method: 'POST',
    body: { roomId, fromStudentId, toStudentId, content, color },
  });
  return praise;
}

export async function updatePraise(praiseId: string, content: string, color: string, roomId: string) {
  const { praise } = await api<{ praise: Praise }>('praise-update', {
    method: 'PATCH',
    body: { roomId, praiseId, content, color },
  });
  return praise;
}

export async function deletePraise(praiseId: string, hostToken: string, roomId: string) {
  await api('praise-delete', {
    method: 'POST',
    body: { roomId, praiseId, hostToken },
  });
}

export async function getStudentStats(code: string): Promise<StudentStats[]> {
  const { students, praises } = await getBundle(code);
  const active = praises.filter((p) => !p.deleted);
  return students.map((student) => ({
    student,
    writtenCount: active.filter((p) => p.from_student_id === student.id).length,
    receivedCount: active.filter((p) => p.to_student_id === student.id).length,
  }));
}

export async function getWrittenCount(code: string, studentId: string): Promise<number> {
  const { praises } = await getBundle(code);
  return praises.filter((p) => p.from_student_id === studentId && !p.deleted).length;
}

export function subscribeToRoom(_code: string, onChange: () => void): () => void {
  const interval = setInterval(onChange, 3000);
  return () => clearInterval(interval);
}

export { getDeviceId };
