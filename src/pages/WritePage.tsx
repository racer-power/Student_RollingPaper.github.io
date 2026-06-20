import { useCallback, useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { ColorPicker } from '../components/ColorPicker';
import { Toast, useRoomGuard } from '../components/ui';
import { CARD_COLORS } from '../lib/constants';
import {
  createPraise,
  getPraises,
  getRoomByCode,
  getStudents,
  subscribeToRoom,
  updatePraise,
} from '../lib/room';
import {
  clearDraft,
  debouncedSaveDraft,
  getStudentSession,
  loadDraft,
} from '../lib/storage';
import { canEditPraise, containsBadWord } from '../lib/utils';
import type { Praise, Room, Student } from '../types';

export function WritePage() {
  const { code } = useParams<{ code: string }>();
  const session = code ? getStudentSession(code) : null;

  const [room, setRoom] = useState<Room | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [existingPraises, setExistingPraises] = useState<Praise[]>([]);
  const [toStudentId, setToStudentId] = useState('');
  const [content, setContent] = useState('');
  const [color, setColor] = useState<string>(CARD_COLORS[0]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');
  const [draftSaved, setDraftSaved] = useState(false);
  const [editingPraiseId, setEditingPraiseId] = useState<string | null>(null);

  const blocked = useRoomGuard(room?.status);

  useEffect(() => {
    if (!code || !session || !room) return;
    const draft = loadDraft(code, session.studentId);
    if (draft) {
      setToStudentId(draft.toStudentId);
      setContent(draft.content);
      setColor(draft.color);
    }
  }, [code, session, room]);

  useEffect(() => {
    if (!code || !session) return;

    async function refresh() {
      const r = await getRoomByCode(code!);
      if (!r) return;
      setRoom(r);
      const [s, p] = await Promise.all([getStudents(code!), getPraises(code!)]);
      setStudents(s);
      setExistingPraises(p.filter((x) => !x.deleted));
    }

    refresh();
    return subscribeToRoom(code, refresh);
  }, [code, session]);

  const saveDraftNow = useCallback(() => {
    if (!code || !session || !toStudentId) return;
    debouncedSaveDraft(code, session.studentId, { toStudentId, content, color, savedAt: Date.now() }, () =>
      setDraftSaved(true),
    );
  }, [code, session, toStudentId, content, color]);

  useEffect(() => {
    saveDraftNow();
  }, [saveDraftNow]);

  if (!code) return <Navigate to="/join" />;
  if (!session) return <Navigate to={`/join/${code}/select`} />;

  const others = students.filter((s) => s.id !== session.studentId);
  const alreadyWritten = new Set(
    existingPraises.filter((p) => p.from_student_id === session.studentId).map((p) => p.to_student_id),
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!room || !session || !code || blocked) return;
    setError('');

    if (!toStudentId) {
      setError('칭찬할 친구를 선택해 주세요.');
      return;
    }
    if (content.length < 10) {
      setError('칭찬은 10자 이상 적어 주세요.');
      return;
    }
    if (content.length > 200) {
      setError('칭찬은 200자 이내로 적어 주세요.');
      return;
    }
    if (containsBadWord(content)) {
      setError('부적절한 표현이 포함되어 있어요.');
      return;
    }

    setLoading(true);
    try {
      if (editingPraiseId) {
        await updatePraise(editingPraiseId, content, color, room.id, code!);
        setToast('칭찬을 수정했어요!');
      } else {
        await createPraise(room.id, session.studentId, toStudentId, content, color, code!);
        setToast('칭찬이 전해졌어요!');
      }
      clearDraft(code, session.studentId);
      setContent('');
      setToStudentId('');
      setEditingPraiseId(null);
      const p = await getPraises(code);
      setExistingPraises(p.filter((x) => !x.deleted));
    } catch (err) {
      setError(err instanceof Error ? err.message : '작성에 실패했어요');
    } finally {
      setLoading(false);
    }
  }

  function startEdit(praise: Praise) {
    if (!canEditPraise(praise.created_at)) return;
    setEditingPraiseId(praise.id);
    setToStudentId(praise.to_student_id);
    setContent(praise.content);
    setColor(praise.color);
  }

  const myPraises = existingPraises.filter((p) => p.from_student_id === session.studentId);

  return (
    <Layout title="칭찬 쓰기" backTo={`/room/${code}`}>
      {blocked && <p className="notice">{blocked}</p>}

      {!blocked && (
        <form className="form" onSubmit={handleSubmit}>
          <label className="form-label">
            칭찬할 친구
            <select
              className="form-input"
              value={toStudentId}
              onChange={(e) => setToStudentId(e.target.value)}
              disabled={!!editingPraiseId}
            >
              <option value="">선택해 주세요</option>
              {others.map((s) => (
                <option key={s.id} value={s.id} disabled={alreadyWritten.has(s.id) && !editingPraiseId}>
                  {s.name}{alreadyWritten.has(s.id) ? ' (작성 완료)' : ''}
                </option>
              ))}
            </select>
          </label>

          <label className="form-label">
            칭찬 내용 ({content.length}/200)
            <textarea
              className="form-textarea"
              value={content}
              onChange={(e) => setContent(e.target.value.slice(0, 200))}
              placeholder="고마웠던 순간, 칭찬하고 싶은 점을 적어 주세요"
              rows={5}
            />
          </label>

          <ColorPicker value={color} onChange={setColor} />

          {draftSaved && content && <p className="hint hint--success">임시 저장됨</p>}
          {error && <p className="form-error">{error}</p>}

          <div className="btn-row">
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? '전송 중...' : editingPraiseId ? '수정하기' : '칭찬 보내기'}
            </button>
            {editingPraiseId && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setEditingPraiseId(null);
                  setContent('');
                  setToStudentId('');
                }}
              >
                취소
              </button>
            )}
          </div>
        </form>
      )}

      {myPraises.length > 0 && (
        <div className="written-list">
          <h3>내가 쓴 칭찬</h3>
          {myPraises.map((p) => {
            const toName = students.find((s) => s.id === p.to_student_id)?.name ?? '?';
            const editable = canEditPraise(p.created_at);
            return (
              <div key={p.id} className="written-item">
                <strong>{toName}</strong>: {p.content}
                {editable && room?.status === 'active' && (
                  <button type="button" className="link-btn" onClick={() => startEdit(p)}>
                    수정
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </Layout>
  );
}
