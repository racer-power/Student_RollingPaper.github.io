import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { RoomCodeDisplay } from '../components/RoomCodeDisplay';
import { StatusBadge } from '../components/ui';
import {
  deletePraise,
  getPraises,
  getRoomByCode,
  getStudentStats,
  subscribeToRoom,
  updateRoomStatus,
} from '../lib/room';
import { getHostToken } from '../lib/storage';
import type { Praise, Room, StudentStats } from '../types';

export function HostPage() {
  const { code } = useParams<{ code: string }>();
  const [room, setRoom] = useState<Room | null>(null);
  const [stats, setStats] = useState<StudentStats[]>([]);
  const [praises, setPraises] = useState<Praise[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const hostToken = code ? getHostToken(code) : null;
  const joinUrl = `${window.location.origin}/join/${code}`;

  async function load() {
    if (!code) return;
    const r = await getRoomByCode(code);
    setRoom(r);
    if (r) {
      setStats(await getStudentStats(code));
      setPraises(await getPraises(code));
      setError('');
    }
  }

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [code]);

  useEffect(() => {
    if (!room) return;
    return subscribeToRoom(code!, load);
  }, [room?.id, code]);

  async function changeStatus(status: Room['status']) {
    if (!room || !hostToken) {
      setError('교사 권한이 없어요. 이 기기에서 학급을 만든 적이 있는지 확인해 주세요.');
      return;
    }
    try {
      const updated = await updateRoomStatus(room.id, hostToken, status, code!);
      setRoom(updated);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '상태 변경 실패');
    }
  }

  async function handleDeletePraise(praiseId: string) {
    if (!room || !hostToken) return;
    if (!confirm('이 칭찬을 삭제할까요?')) return;
    try {
      await deletePraise(praiseId, hostToken, room.id, code!);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : '삭제 실패');
    }
  }

  if (loading) return <Layout title="교사 대시보드"><p>불러오는 중...</p></Layout>;
  if (!room) return <Layout title="교사 대시보드"><p className="form-error">학급을 찾을 수 없어요.</p></Layout>;

  const notWritten = stats.filter((s) => s.writtenCount === 0);

  return (
    <Layout title={room.class_name} backTo="/">
      <div className="host-header">
        <StatusBadge status={room.status} />
        <RoomCodeDisplay code={room.code} joinUrl={joinUrl} />
      </div>

      {error && <p className="form-error">{error}</p>}

      <div className="host-actions">
        {room.status === 'ready' && (
          <button type="button" className="btn btn-primary" onClick={() => changeStatus('active')}>
            시작하기
          </button>
        )}
        {room.status === 'active' && (
          <button type="button" className="btn btn-primary" onClick={() => changeStatus('ended')}>
            마무리하기
          </button>
        )}
        <Link to={`/room/${code}/display`} className="btn btn-secondary">
          전자칠판 모드
        </Link>
        {room.status === 'ended' && (
          <Link to={`/room/${code}/export`} className="btn btn-secondary">
            내보내기
          </Link>
        )}
      </div>

      {room.status === 'active' && notWritten.length > 0 && (
        <div className="notice">
          아직 칭찬 안 쓴 친구: {notWritten.map((s) => s.student.name).join(', ')}
        </div>
      )}

      <h3>학생별 현황</h3>
      <div className="stats-table">
        <div className="stats-table__head">
          <span>이름</span>
          <span>작성</span>
          <span>수신</span>
        </div>
        {stats.map(({ student, writtenCount, receivedCount }) => (
          <div key={student.id} className="stats-table__row">
            <span>{student.name}</span>
            <span>{writtenCount}</span>
            <span>{receivedCount}</span>
          </div>
        ))}
      </div>

      <h3>전체 칭찬 ({praises.filter((p) => !p.deleted).length})</h3>
      <div className="moderation-list">
        {praises.filter((p) => !p.deleted).map((p) => (
          <div key={p.id} className="moderation-item">
            <span>
              {(p.from_student as { name?: string })?.name ?? '?'} →{' '}
              {(p.to_student as { name?: string })?.name ?? '?'}: {p.content}
            </span>
            <button type="button" className="link-btn link-btn--danger" onClick={() => handleDeletePraise(p.id)}>
              삭제
            </button>
          </div>
        ))}
      </div>
    </Layout>
  );
}
