import { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { ExportPanel } from '../components/ExportPanel';
import { Layout } from '../components/Layout';
import { getPraises, getRoomByCode, getStudents } from '../lib/room';
import { getHostToken, getStudentSession } from '../lib/storage';
import type { Praise, Room, Student } from '../types';

export function ExportPage() {
  const { code } = useParams<{ code: string }>();
  const session = code ? getStudentSession(code) : null;
  const isHost = code ? !!getHostToken(code) : false;

  const [room, setRoom] = useState<Room | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [praises, setPraises] = useState<Praise[]>([]);

  useEffect(() => {
    if (!code) return;
    getRoomByCode(code).then(async (r) => {
      if (!r) return;
      setRoom(r);
      setStudents(await getStudents(code));
      setPraises(await getPraises(code));
    });
  }, [code]);

  if (!code) return <Navigate to="/join" />;
  if (!session && !isHost) return <Navigate to={`/join/${code}/select`} />;

  if (room && room.status !== 'ended') {
    return (
      <Layout title="내보내기" backTo={isHost ? `/room/${code}/host` : `/room/${code}`}>
        <p className="notice">활동이 마무리된 후에 저장할 수 있어요.</p>
      </Layout>
    );
  }

  return (
    <Layout title="내보내기" backTo={isHost ? `/room/${code}/host` : `/room/${code}`}>
      {room && (
        <ExportPanel
          room={room}
          students={students}
          praises={praises}
          currentStudentId={session?.studentId}
          isHost={isHost}
        />
      )}
    </Layout>
  );
}
