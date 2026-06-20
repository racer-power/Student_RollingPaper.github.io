import { getSupabase } from './supabase';
import type { Praise, Room, Student, StudentStats } from '../types';
import { generateHostToken, generateRoomCode, isRoomExpired } from './utils';
import { ROOM_EXPIRY_HOURS } from './constants';
import { getDeviceId } from './storage';

export async function createRoom(className: string, studentNames: string[]) {
  let code = generateRoomCode();
  let attempts = 0;

  while (attempts < 10) {
    const { data: existing } = await getSupabase().from('rp_rooms').select('id').eq('code', code).maybeSingle();
    if (!existing) break;
    code = generateRoomCode();
    attempts++;
  }

  const hostToken = generateHostToken();
  const expiresAt = new Date(Date.now() + ROOM_EXPIRY_HOURS * 60 * 60 * 1000).toISOString();

  const { data: room, error } = await getSupabase()
    .from('rp_rooms')
    .insert({ code, class_name: className, host_token: hostToken, expires_at: expiresAt })
    .select()
    .single();

  if (error || !room) throw new Error(error?.message ?? '학급 생성에 실패했어요');

  const students = studentNames.map((name) => ({ room_id: room.id, name }));
  const { error: studentError } = await getSupabase().from('rp_students').insert(students);
  if (studentError) throw new Error(studentError.message);

  return room as Room;
}

export async function getRoomByCode(code: string): Promise<Room | null> {
  const { data, error } = await getSupabase()
    .from('rp_rooms')
    .select('*')
    .eq('code', code.toUpperCase())
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  if (isRoomExpired(data.expires_at)) return null;
  return data as Room;
}

export async function getStudents(roomId: string): Promise<Student[]> {
  const { data, error } = await getSupabase()
    .from('rp_students')
    .select('*')
    .eq('room_id', roomId)
    .order('name');

  if (error) throw new Error(error.message);
  return (data ?? []) as Student[];
}

export async function claimStudentName(
  roomId: string,
  studentId: string,
  deviceId: string,
): Promise<{ ok: true } | { ok: false; reason: 'taken' }> {
  const { data: student } = await getSupabase()
    .from('rp_students')
    .select('*')
    .eq('id', studentId)
    .eq('room_id', roomId)
    .maybeSingle();

  if (!student) throw new Error('학생을 찾을 수 없어요');

  if (student.device_id && student.device_id !== deviceId) {
    return { ok: false, reason: 'taken' };
  }

  if (!student.device_id) {
    const { error } = await getSupabase()
      .from('rp_students')
      .update({ device_id: deviceId })
      .eq('id', studentId)
      .is('device_id', null);

    if (error) {
      const { data: refreshed } = await getSupabase().from('rp_students').select('device_id').eq('id', studentId).single();
      if (refreshed?.device_id && refreshed.device_id !== deviceId) {
        return { ok: false, reason: 'taken' };
      }
    }
  }

  return { ok: true };
}

export async function updateRoomStatus(roomId: string, hostToken: string, status: Room['status']) {
  const { data, error } = await getSupabase()
    .from('rp_rooms')
    .update({ status })
    .eq('id', roomId)
    .eq('host_token', hostToken)
    .select()
    .single();

  if (error || !data) throw new Error('상태 변경 권한이 없어요');
  return data as Room;
}

export async function getPraises(roomId: string): Promise<Praise[]> {
  const { data, error } = await getSupabase()
    .from('rp_praises')
    .select('*, from_student:rp_students!from_student_id(*), to_student:rp_students!to_student_id(*)')
    .eq('room_id', roomId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as Praise[];
}

export async function getPraisesForStudent(roomId: string, studentId: string): Promise<Praise[]> {
  const all = await getPraises(roomId);
  return all.filter((p) => p.to_student_id === studentId && !p.deleted);
}

export async function createPraise(
  roomId: string,
  fromStudentId: string,
  toStudentId: string,
  content: string,
  color: string,
) {
  const { data, error } = await getSupabase()
    .from('rp_praises')
    .insert({
      room_id: roomId,
      from_student_id: fromStudentId,
      to_student_id: toStudentId,
      content,
      color,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') throw new Error('이미 이 친구에게 칭찬을 썼어요');
    throw new Error(error.message);
  }
  return data as Praise;
}

export async function updatePraise(praiseId: string, content: string, color: string) {
  const { data, error } = await getSupabase()
    .from('rp_praises')
    .update({ content, color, updated_at: new Date().toISOString() })
    .eq('id', praiseId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Praise;
}

export async function deletePraise(praiseId: string, hostToken: string, roomId: string) {
  const { data: room } = await getSupabase().from('rp_rooms').select('host_token').eq('id', roomId).single();
  if (!room || room.host_token !== hostToken) throw new Error('삭제 권한이 없어요');

  const { error } = await getSupabase().from('rp_praises').update({ deleted: true }).eq('id', praiseId);
  if (error) throw new Error(error.message);
}

export async function getStudentStats(roomId: string): Promise<StudentStats[]> {
  const students = await getStudents(roomId);
  const praises = await getPraises(roomId);
  const active = praises.filter((p) => !p.deleted);

  return students.map((student) => ({
    student,
    writtenCount: active.filter((p) => p.from_student_id === student.id).length,
    receivedCount: active.filter((p) => p.to_student_id === student.id).length,
  }));
}

export async function getWrittenCount(roomId: string, studentId: string): Promise<number> {
  const { count, error } = await getSupabase()
    .from('rp_praises')
    .select('*', { count: 'exact', head: true })
    .eq('room_id', roomId)
    .eq('from_student_id', studentId)
    .eq('deleted', false);

  if (error) throw new Error(error.message);
  return count ?? 0;
}

export function subscribeToRoom(
  roomId: string,
  onChange: () => void,
): () => void {
  const channel = getSupabase()
    .channel(`room-${roomId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'rp_praises', filter: `room_id=eq.${roomId}` }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'rp_rooms', filter: `id=eq.${roomId}` }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'rp_students', filter: `room_id=eq.${roomId}` }, onChange)
    .subscribe();

  return () => {
    getSupabase().removeChannel(channel);
  };
}

export { getDeviceId };
