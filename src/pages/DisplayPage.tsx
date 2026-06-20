import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { PraiseCard } from '../components/PraiseCard';
import { DISPLAY_SLIDE_MS } from '../lib/constants';
import { getPraises, getPraisesForStudent, getRoomByCode, getStudents } from '../lib/room';
import type { Praise, Room, Student } from '../types';

export function DisplayPage() {
  const { code } = useParams<{ code: string }>();
  const [room, setRoom] = useState<Room | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [praises, setPraises] = useState<Praise[]>([]);
  const [mode, setMode] = useState<'slide' | 'overview'>('slide');
  const [allPraises, setAllPraises] = useState<Praise[]>([]);

  useEffect(() => {
    if (!code) return;
    getRoomByCode(code).then(async (r) => {
      if (!r) return;
      setRoom(r);
      setStudents(await getStudents(code));
      setAllPraises((await getPraises(code)).filter((p) => !p.deleted));
    });
  }, [code]);

  const currentStudent = students[currentIndex];

  useEffect(() => {
    if (!room || !currentStudent) {
      setPraises([]);
      return;
    }
    getPraisesForStudent(code!, currentStudent.id).then(setPraises);
  }, [room, currentStudent]);

  useEffect(() => {
    if (mode !== 'slide' || students.length === 0) return;
    const timer = setInterval(() => {
      setCurrentIndex((i) => (i + 1) % students.length);
    }, DISPLAY_SLIDE_MS);
    return () => clearInterval(timer);
  }, [mode, students.length]);

  if (!room || !currentStudent) {
    return <div className="display display--loading">불러오는 중...</div>;
  }

  const nameMap = new Map(students.map((s) => [s.id, s.name]));

  return (
    <div className="display">
      <div className="display__toolbar">
        <span>{room.class_name}</span>
        <div className="display__mode-btns">
          <button
            type="button"
            className={mode === 'slide' ? 'active' : ''}
            onClick={() => setMode('slide')}
          >
            슬라이드
          </button>
          <button
            type="button"
            className={mode === 'overview' ? 'active' : ''}
            onClick={() => setMode('overview')}
          >
            전체 현황
          </button>
        </div>
        <span className="display__hint">F11로 전체화면</span>
      </div>

      {mode === 'slide' ? (
        <div className="display__slide">
          <h1 className="display__name">{currentStudent.name}에게 온 칭찬</h1>
          <div className="display__grid">
            {praises.length === 0 ? (
              <p className="display__empty">아직 칭찬이 없어요</p>
            ) : (
              praises.map((p) => (
                <PraiseCard
                  key={p.id}
                  praise={p}
                  fromName={nameMap.get(p.from_student_id) ?? '?'}
                  large
                />
              ))
            )}
          </div>
          <div className="display__dots">
            {students.map((s, i) => (
              <button
                key={s.id}
                type="button"
                className={`display__dot ${i === currentIndex ? 'display__dot--active' : ''}`}
                onClick={() => setCurrentIndex(i)}
                aria-label={s.name}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="display__overview">
          {students.map((s) => {
            const count = allPraises.filter((p) => p.to_student_id === s.id).length;
            return (
              <div key={s.id} className="display__overview-card">
                <h2>{s.name}</h2>
                <p>{count > 0 ? `칭찬 ${count}개` : '아직 칭찬 없음'}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
