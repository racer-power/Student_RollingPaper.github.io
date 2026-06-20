import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { PraiseCard } from '../components/PraiseCard';
import { StudentNav } from '../components/ui';
import { getPraisesForStudent, getRoomByCode, getStudents, subscribeToRoom } from '../lib/room';
import { getStudentSession } from '../lib/storage';
import type { Praise, Room, Student } from '../types';

export function MyRollingPaperPage() {
  const { code } = useParams<{ code: string }>();
  const session = code ? getStudentSession(code) : null;
  const [room, setRoom] = useState<Room | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [praises, setPraises] = useState<Praise[]>([]);

  useEffect(() => {
    if (!code || !session) return;
    load();
  }, [code, session]);

  async function load() {
    if (!code || !session) return;
    const r = await getRoomByCode(code);
    if (!r) return;
    setRoom(r);
    const s = await getStudents(code);
    setStudents(s);
    setPraises(await getPraisesForStudent(code, session.studentId));
  }

  useEffect(() => {
    if (!room) return;
    return subscribeToRoom(code!, load);
  }, [room?.id, code]);

  if (!code) return <Navigate to="/join" />;
  if (!session) return <Navigate to={`/join/${code}/select`} />;

  const nameMap = new Map(students.map((s) => [s.id, s.name]));

  return (
    <Layout title="내 롤링페이퍼" backTo={`/room/${code}`}>
      <StudentNav code={code} />

      <p className="hint">
        {session.studentName}에게 온 칭찬 {praises.length}개
      </p>

      {praises.length === 0 ? (
        <p className="empty-state">
          아직 칭찬이 도착하지 않았어요. 친구들이 곧 적어줄 거예요.
        </p>
      ) : (
        <div className="praise-grid">
          {praises.map((p) => (
            <PraiseCard
              key={p.id}
              praise={p}
              fromName={nameMap.get(p.from_student_id) ?? '?'}
            />
          ))}
        </div>
      )}

      {room?.status === 'ended' && (
        <Link to={`/room/${code}/export`} className="btn btn-primary" style={{ marginTop: 24 }}>
          PDF/PNG 저장하기
        </Link>
      )}
    </Layout>
  );
}
