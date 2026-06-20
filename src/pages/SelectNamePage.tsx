import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { claimStudentName, getDeviceId, getRoomByCode, getStudents } from '../lib/room';
import { setStudentSession } from '../lib/storage';
import type { Room, Student } from '../types';

export function SelectNamePage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [room, setRoom] = useState<Room | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);

  useEffect(() => {
    if (!code) return;
    getRoomByCode(code)
      .then(async (r) => {
        if (!r) {
          setError('학급이 종료됐어요. 선생님께 새 코드를 요청하세요.');
          return;
        }
        setRoom(r);
        setStudents(await getStudents(r.code));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [code]);

  async function handleSelect(student: Student) {
    if (!room || !code) return;
    setClaiming(student.id);
    setError('');

    try {
      const result = await claimStudentName(room.id, student.id, getDeviceId());
      if (!result.ok) {
        setError('이미 사용 중인 이름이에요. 다른 이름을 선택하거나 선생님께 말씀해 주세요.');
        return;
      }
      setStudentSession(code, student.id, student.name);
      navigate(`/room/${code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '선택에 실패했어요');
    } finally {
      setClaiming(null);
    }
  }

  if (loading) return <Layout title="이름 선택" backTo="/join"><p>불러오는 중...</p></Layout>;

  return (
    <Layout title={room ? `${room.class_name} — 이름 선택` : '이름 선택'} backTo="/join">
      {error && <p className="form-error">{error}</p>}
      {room && (
        <>
          <p className="hint">본인 이름을 선택해 주세요.</p>
          <div className="name-grid">
            {students.map((student) => {
              const taken = student.device_id && student.device_id !== getDeviceId();
              return (
                <button
                  key={student.id}
                  type="button"
                  className={`name-card ${taken ? 'name-card--taken' : ''}`}
                  disabled={!!taken || claiming === student.id}
                  onClick={() => handleSelect(student)}
                >
                  {student.name}
                  {taken && <span className="name-card__badge">사용 중</span>}
                </button>
              );
            })}
          </div>
        </>
      )}
    </Layout>
  );
}
