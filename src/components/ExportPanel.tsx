import { useState } from 'react';
import type { Room, Student, Praise } from '../types';
import { exportStudentPdf, exportStudentPng, exportAllZip } from '../lib/export';

interface ExportPanelProps {
  room: Room;
  students: Student[];
  praises: Praise[];
  currentStudentId?: string;
  isHost?: boolean;
}

export function ExportPanel({ room, students, praises, currentStudentId, isHost }: ExportPanelProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const activePraises = praises.filter((p) => !p.deleted);

  async function handleExport(
    key: string,
    fn: () => Promise<void>,
  ) {
    setLoading(key);
    try {
      await fn();
    } finally {
      setLoading(null);
    }
  }

  const currentStudent = currentStudentId
    ? students.find((s) => s.id === currentStudentId)
    : null;

  return (
    <div className="export-panel">
      {currentStudent && (
        <div className="export-panel__section">
          <h3>내 롤링페이퍼 저장</h3>
          <div className="btn-row">
            <button
              type="button"
              className="btn btn-primary"
              disabled={!!loading}
              onClick={() =>
                handleExport('my-pdf', () =>
                  exportStudentPdf(
                    room,
                    currentStudent,
                    activePraises.filter((p) => p.to_student_id === currentStudent.id),
                    students,
                  ),
                )
              }
            >
              {loading === 'my-pdf' ? '생성 중...' : 'PDF 저장'}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={!!loading}
              onClick={() =>
                handleExport('my-png', () =>
                  exportStudentPng(
                    room,
                    currentStudent,
                    activePraises.filter((p) => p.to_student_id === currentStudent.id),
                    students,
                  ),
                )
              }
            >
              {loading === 'my-png' ? '생성 중...' : 'PNG 저장'}
            </button>
          </div>
        </div>
      )}

      {isHost && (
        <div className="export-panel__section">
          <h3>학급 일괄 내보내기</h3>
          <p className="hint">칭찬을 받은 학생별 PDF가 ZIP으로 다운로드됩니다.</p>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!!loading}
            onClick={() => handleExport('zip', () => exportAllZip(room, students, activePraises))}
          >
            {loading === 'zip' ? '생성 중...' : '전체 ZIP 다운로드'}
          </button>
        </div>
      )}
    </div>
  );
}
