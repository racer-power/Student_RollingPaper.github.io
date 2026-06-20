import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { StatusBadge, StudentNav } from '../components/ui';
import { refreshRoomData, subscribeToRoom } from '../lib/room';
import { getStudentSession } from '../lib/storage';
import type { Room } from '../types';

export function StudentHomePage() {
  const { code } = useParams<{ code: string }>();
  const session = code ? getStudentSession(code) : null;
  const [room, setRoom] = useState<Room | null>(null);
  const [writtenCount, setWrittenCount] = useState(0);

  useEffect(() => {
    if (!code || !session) return;

    async function refresh() {
      const data = await refreshRoomData(code!);
      if (!data) return;
      setRoom(data.room);
      setWrittenCount(
        data.praises.filter((p) => p.from_student_id === session!.studentId && !p.deleted).length,
      );
    }

    refresh();
    return subscribeToRoom(code, refresh);
  }, [code, session]);

  if (!code) return <Navigate to="/join" />;
  if (!session) return <Navigate to={`/join/${code}/select`} />;

  return (
    <Layout title={room?.class_name ?? '학급'} backTo="/">
      <div className="student-home">
        <div className="student-home__header">
          <p>안녕, <strong>{session.studentName}</strong>!</p>
          {room && <StatusBadge status={room.status} />}
        </div>

        <StudentNav code={code} />

        <div className="stat-card">
          <span className="stat-card__number">{writtenCount}</span>
          <span className="stat-card__label">명에게 칭찬했어요</span>
        </div>

        {room?.status === 'ready' && (
          <p className="notice">선생님이 활동을 시작하면 칭찬을 쓸 수 있어요.</p>
        )}

        {room?.status === 'active' && (
          <p className="hint">친구 2~3명에게 칭찬을 써 보세요!</p>
        )}

        {room?.status === 'ended' && (
          <Link to={`/room/${code}/export`} className="btn btn-primary">
            내 롤링페이퍼 저장하기
          </Link>
        )}
      </div>
    </Layout>
  );
}
