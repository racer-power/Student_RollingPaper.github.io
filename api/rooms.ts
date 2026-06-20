export const config = { runtime: 'edge' };

import { kv } from '@vercel/kv';

type RoomStatus = 'ready' | 'active' | 'ended';

interface Room {
  id: string;
  code: string;
  class_name: string;
  status: RoomStatus;
  host_token: string;
  expires_at: string;
  created_at: string;
}

interface Student {
  id: string;
  room_id: string;
  name: string;
  device_id: string | null;
  created_at: string;
}

interface Praise {
  id: string;
  room_id: string;
  from_student_id: string;
  to_student_id: string;
  content: string;
  color: string;
  deleted: boolean;
  created_at: string;
  updated_at: string;
}

interface RoomBundle {
  room: Room;
  students: Student[];
  praises: Praise[];
}

const ROOM_EXPIRY_HOURS = 24;
const CARD_COLORS = ['#FFE066', '#B8E986', '#FFD3E0', '#C7CEEA', '#FFAAA5'];

// eslint-disable-next-line no-var
declare var __rpStore: Map<string, RoomBundle> | undefined;

function getStore(): Map<string, RoomBundle> {
  if (!globalThis.__rpStore) {
    globalThis.__rpStore = new Map();
  }
  return globalThis.__rpStore;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

function error(message: string, status: number) {
  return json({ error: message }, status);
}

function newId(): string {
  return crypto.randomUUID();
}

function nowIso(): string {
  return new Date().toISOString();
}

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function uniqueCode(store: Map<string, RoomBundle>): string {
  for (let i = 0; i < 20; i++) {
    const code = generateRoomCode();
    if (!store.has(code)) return code;
  }
  throw new Error('CODE_GENERATION_FAILED');
}

function getByCode(store: Map<string, RoomBundle>, code: string): RoomBundle | undefined {
  const bundle = store.get(code.toUpperCase());
  if (!bundle) return undefined;
  if (new Date(bundle.room.expires_at) < new Date()) {
    store.delete(code.toUpperCase());
    return undefined;
  }
  return bundle;
}

function saveBundle(store: Map<string, RoomBundle>, code: string, bundle: RoomBundle) {
  store.set(code.toUpperCase(), bundle);
}

async function persistBundle(code: string, bundle: RoomBundle) {
  saveBundle(getStore(), code, bundle);
  if (!process.env.KV_REST_API_URL) return;
  try {
    const upper = code.toUpperCase();
    await kv.set(`room:${upper}`, bundle, { ex: ROOM_EXPIRY_HOURS * 3600 });
    await kv.set(`roomid:${bundle.room.id}`, upper, { ex: ROOM_EXPIRY_HOURS * 3600 });
  } catch {
    /* KV optional */
  }
}

async function loadBundle(code: string): Promise<RoomBundle | undefined> {
  const upper = code.toUpperCase();
  const cached = getByCode(getStore(), upper);
  if (cached) return cached;

  if (!process.env.KV_REST_API_URL) return undefined;
  try {
    const data = await kv.get<RoomBundle>(`room:${upper}`);
    if (!data) return undefined;
    if (new Date(data.room.expires_at) < new Date()) {
      await kv.del(`room:${upper}`);
      return undefined;
    }
    saveBundle(getStore(), upper, data);
    return data;
  } catch {
    return undefined;
  }
}

async function findBundleByRoomId(roomId: string): Promise<RoomBundle | undefined> {
  const mem = [...getStore().values()].find((b) => b.room.id === roomId);
  if (mem) return mem;

  if (!process.env.KV_REST_API_URL) return undefined;
  try {
    const code = await kv.get<string>(`roomid:${roomId}`);
    if (!code) return undefined;
    return loadBundle(code);
  } catch {
    return undefined;
  }
}

async function uniqueCodeAsync(): Promise<string> {
  const store = getStore();
  for (let i = 0; i < 20; i++) {
    const code = generateRoomCode();
    if (store.has(code)) continue;
    if (process.env.KV_REST_API_URL) {
      const existing = await kv.get(`room:${code}`);
      if (existing) continue;
    }
    return code;
  }
  throw new Error('CODE_GENERATION_FAILED');
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  const url = new URL(req.url);
  let body: Record<string, unknown> = {};
  if (req.method !== 'GET' && req.headers.get('content-type')?.includes('json')) {
    try {
      body = await req.json();
    } catch {
      return error('Invalid JSON body', 400);
    }
  }

  const action = url.searchParams.get('action') ?? (body.action as string);
  const code = (url.searchParams.get('code') ?? (body.code as string) ?? '').toUpperCase();

  try {
    switch (action) {
      case 'create': {
        if (req.method !== 'POST') return error('Method not allowed', 405);
        const className = String(body.className ?? '').trim();
        const studentNames = body.studentNames;
        if (!className) return error('학급 이름을 입력해 주세요.', 400);
        if (!Array.isArray(studentNames) || studentNames.length === 0) {
          return error('학생 이름을 1명 이상 입력해 주세요.', 400);
        }

        const roomCode = await uniqueCodeAsync();
        const roomId = newId();
        const hostToken = newId();
        const createdAt = nowIso();
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

        const students: Student[] = studentNames.map((name: unknown) => ({
          id: newId(),
          room_id: roomId,
          name: String(name).trim(),
          device_id: null,
          created_at: createdAt,
        }));

        const bundle: RoomBundle = { room, students, praises: [] };
        await persistBundle(roomCode, bundle);
        return json({ room, students }, 201);
      }

      case 'get': {
        if (req.method !== 'GET') return error('Method not allowed', 405);
        if (!code) return error('학급 코드가 필요합니다.', 400);
        const bundle = await loadBundle(code);
        if (!bundle) return error('학급을 찾을 수 없어요.', 404);
        return json(bundle);
      }

      case 'status': {
        if (req.method !== 'PATCH') return error('Method not allowed', 405);
        const { roomId, hostToken, status } = body;
        const bundle = await findBundleByRoomId(String(roomId));
        if (!bundle) return error('학급을 찾을 수 없어요.', 404);
        if (bundle.room.host_token !== hostToken) return error('권한이 없어요.', 403);
        bundle.room.status = status as RoomStatus;
        await persistBundle(bundle.room.code, bundle);
        return json({ room: bundle.room });
      }

      case 'claim': {
        if (req.method !== 'POST') return error('Method not allowed', 405);
        const { roomId, studentId, deviceId } = body;
        const bundle = await findBundleByRoomId(String(roomId));
        if (!bundle) return error('학급을 찾을 수 없어요.', 404);
        const student = bundle.students.find((s) => s.id === studentId);
        if (!student) return error('학생을 찾을 수 없어요.', 404);
        if (student.device_id && student.device_id !== deviceId) {
          return error('이미 사용 중인 이름이에요.', 409);
        }
        if (!student.device_id) student.device_id = String(deviceId);
        await persistBundle(bundle.room.code, bundle);
        return json({ ok: true });
      }

      case 'praise-create': {
        if (req.method !== 'POST') return error('Method not allowed', 405);
        const { roomId, fromStudentId, toStudentId, content, color } = body;
        const bundle = await findBundleByRoomId(String(roomId));
        if (!bundle) return error('학급을 찾을 수 없어요.', 404);
        if (bundle.room.status === 'ended') return error('활동이 끝났어요.', 403);
        if (bundle.room.status === 'ready') return error('아직 활동이 시작되지 않았어요.', 403);
        if (fromStudentId === toStudentId) return error('자기 자신에게는 칭찬할 수 없어요.', 400);
        const text = String(content);
        if (text.length < 10 || text.length > 200) {
          return error('칭찬은 10~200자로 작성해 주세요.', 400);
        }
        const exists = bundle.praises.some(
          (p) => p.from_student_id === fromStudentId && p.to_student_id === toStudentId && !p.deleted,
        );
        if (exists) return error('이미 이 친구에게 칭찬을 썼어요.', 409);

        const praise: Praise = {
          id: newId(),
          room_id: String(roomId),
          from_student_id: String(fromStudentId),
          to_student_id: String(toStudentId),
          content: text,
          color: String(color ?? CARD_COLORS[0]),
          deleted: false,
          created_at: nowIso(),
          updated_at: nowIso(),
        };
        bundle.praises.push(praise);
        await persistBundle(bundle.room.code, bundle);
        return json({ praise }, 201);
      }

      case 'praise-update': {
        if (req.method !== 'PATCH') return error('Method not allowed', 405);
        const { roomId, praiseId, content, color } = body;
        const bundle = await findBundleByRoomId(String(roomId));
        if (!bundle) return error('학급을 찾을 수 없어요.', 404);
        if (bundle.room.status === 'ended') return error('활동이 끝났어요.', 403);
        const praise = bundle.praises.find((p) => p.id === praiseId);
        if (!praise || praise.deleted) return error('칭찬을 찾을 수 없어요.', 404);
        const elapsed = Date.now() - new Date(praise.created_at).getTime();
        if (elapsed > 2 * 60 * 1000) return error('수정 시간이 지났어요.', 403);
        praise.content = String(content);
        praise.color = String(color);
        praise.updated_at = nowIso();
        await persistBundle(bundle.room.code, bundle);
        return json({ praise });
      }

      case 'praise-delete': {
        if (req.method !== 'POST' && req.method !== 'DELETE') return error('Method not allowed', 405);
        const { roomId, praiseId, hostToken } = body;
        const bundle = await findBundleByRoomId(String(roomId));
        if (!bundle) return error('학급을 찾을 수 없어요.', 404);
        if (bundle.room.host_token !== hostToken) return error('권한이 없어요.', 403);
        const praise = bundle.praises.find((p) => p.id === praiseId);
        if (!praise) return error('칭찬을 찾을 수 없어요.', 404);
        praise.deleted = true;
        await persistBundle(bundle.room.code, bundle);
        return json({ ok: true });
      }

      default:
        return error('Unknown action', 400);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Server error';
    return error(msg, 500);
  }
}
