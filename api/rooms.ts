import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  assertActive,
  assertHost,
  findStudent,
  getByCode,
  newId,
  nowIso,
  saveBundle,
  store,
  type RoomBundle,
} from './_store';
import { ROOM_EXPIRY_HOURS } from './types';

const CARD_COLORS = ['#FFE066', '#B8E986', '#FFD3E0', '#C7CEEA', '#FFAAA5'];

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function generateHostToken(): string {
  return crypto.randomUUID();
}

function uniqueCode(): string {
  for (let i = 0; i < 20; i++) {
    const code = generateRoomCode();
    if (!store.has(code)) return code;
  }
  throw new Error('CODE_GENERATION_FAILED');
}

function sendError(res: VercelResponse, status: number, message: string) {
  res.status(status).json({ error: message });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const action = (req.query.action as string) ?? req.body?.action;
  const code = ((req.query.code as string) ?? req.body?.code ?? '').toUpperCase();

  try {
    switch (action) {
      case 'create': {
        if (req.method !== 'POST') return sendError(res, 405, 'Method not allowed');
        const { className, studentNames } = req.body ?? {};
        if (!className?.trim()) return sendError(res, 400, '학급 이름을 입력해 주세요.');
        if (!Array.isArray(studentNames) || studentNames.length === 0) {
          return sendError(res, 400, '학생 이름을 1명 이상 입력해 주세요.');
        }

        const roomCode = uniqueCode();
        const roomId = newId();
        const hostToken = generateHostToken();
        const createdAt = nowIso();
        const expiresAt = new Date(Date.now() + ROOM_EXPIRY_HOURS * 60 * 60 * 1000).toISOString();

        const room = {
          id: roomId,
          code: roomCode,
          class_name: className.trim(),
          status: 'ready' as const,
          host_token: hostToken,
          expires_at: expiresAt,
          created_at: createdAt,
        };

        const students = studentNames.map((name: string) => ({
          id: newId(),
          room_id: roomId,
          name: String(name).trim(),
          device_id: null,
          created_at: createdAt,
        }));

        const bundle: RoomBundle = { room, students, praises: [] };
        saveBundle(roomCode, bundle);
        return res.status(201).json({ room, students });
      }

      case 'get': {
        if (req.method !== 'GET') return sendError(res, 405, 'Method not allowed');
        if (!code) return sendError(res, 400, '학급 코드가 필요합니다.');
        const bundle = getByCode(code);
        if (!bundle) return sendError(res, 404, '학급을 찾을 수 없어요.');
        return res.status(200).json(bundle);
      }

      case 'status': {
        if (req.method !== 'PATCH') return sendError(res, 405, 'Method not allowed');
        const { roomId, hostToken, status } = req.body ?? {};
        const bundle = [...store.values()].find((b) => b.room.id === roomId);
        if (!bundle) return sendError(res, 404, '학급을 찾을 수 없어요.');
        assertHost(bundle, hostToken);
        bundle.room.status = status;
        saveBundle(bundle.room.code, bundle);
        return res.status(200).json({ room: bundle.room });
      }

      case 'claim': {
        if (req.method !== 'POST') return sendError(res, 405, 'Method not allowed');
        const { roomId, studentId, deviceId } = req.body ?? {};
        const bundle = [...store.values()].find((b) => b.room.id === roomId);
        if (!bundle) return sendError(res, 404, '학급을 찾을 수 없어요.');
        const student = findStudent(bundle, studentId);
        if (!student) return sendError(res, 404, '학생을 찾을 수 없어요.');
        if (student.device_id && student.device_id !== deviceId) {
          return sendError(res, 409, '이미 사용 중인 이름이에요.');
        }
        if (!student.device_id) student.device_id = deviceId;
        saveBundle(bundle.room.code, bundle);
        return res.status(200).json({ ok: true });
      }

      case 'praise-create': {
        if (req.method !== 'POST') return sendError(res, 405, 'Method not allowed');
        const { roomId, fromStudentId, toStudentId, content, color } = req.body ?? {};
        const bundle = [...store.values()].find((b) => b.room.id === roomId);
        if (!bundle) return sendError(res, 404, '학급을 찾을 수 없어요.');
        assertActive(bundle);
        if (bundle.room.status === 'ready') return sendError(res, 403, '아직 활동이 시작되지 않았어요.');
        if (fromStudentId === toStudentId) return sendError(res, 400, '자기 자신에게는 칭찬할 수 없어요.');
        if (content.length < 10 || content.length > 200) {
          return sendError(res, 400, '칭찬은 10~200자로 작성해 주세요.');
        }
        const exists = bundle.praises.some(
          (p) => p.from_student_id === fromStudentId && p.to_student_id === toStudentId && !p.deleted,
        );
        if (exists) return sendError(res, 409, '이미 이 친구에게 칭찬을 썼어요.');

        const praise = {
          id: newId(),
          room_id: roomId,
          from_student_id: fromStudentId,
          to_student_id: toStudentId,
          content,
          color: color ?? CARD_COLORS[0],
          deleted: false,
          created_at: nowIso(),
          updated_at: nowIso(),
        };
        bundle.praises.push(praise);
        saveBundle(bundle.room.code, bundle);
        return res.status(201).json({ praise });
      }

      case 'praise-update': {
        if (req.method !== 'PATCH') return sendError(res, 405, 'Method not allowed');
        const { roomId, praiseId, content, color } = req.body ?? {};
        const bundle = [...store.values()].find((b) => b.room.id === roomId);
        if (!bundle) return sendError(res, 404, '학급을 찾을 수 없어요.');
        assertActive(bundle);
        const praise = bundle.praises.find((p) => p.id === praiseId);
        if (!praise || praise.deleted) return sendError(res, 404, '칭찬을 찾을 수 없어요.');
        const elapsed = Date.now() - new Date(praise.created_at).getTime();
        if (elapsed > 2 * 60 * 1000) return sendError(res, 403, '수정 시간이 지났어요.');
        praise.content = content;
        praise.color = color;
        praise.updated_at = nowIso();
        saveBundle(bundle.room.code, bundle);
        return res.status(200).json({ praise });
      }

      case 'praise-delete': {
        if (req.method !== 'DELETE' && req.method !== 'POST') return sendError(res, 405, 'Method not allowed');
        const { roomId, praiseId, hostToken } = req.body ?? {};
        const bundle = [...store.values()].find((b) => b.room.id === roomId);
        if (!bundle) return sendError(res, 404, '학급을 찾을 수 없어요.');
        assertHost(bundle, hostToken);
        const praise = bundle.praises.find((p) => p.id === praiseId);
        if (!praise) return sendError(res, 404, '칭찬을 찾을 수 없어요.');
        praise.deleted = true;
        saveBundle(bundle.room.code, bundle);
        return res.status(200).json({ ok: true });
      }

      default:
        return sendError(res, 400, 'Unknown action');
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Server error';
    if (msg === 'UNAUTHORIZED') return sendError(res, 403, '권한이 없어요.');
    if (msg === 'SESSION_ENDED') return sendError(res, 403, '활동이 끝났어요.');
    return sendError(res, 500, msg);
  }
}
