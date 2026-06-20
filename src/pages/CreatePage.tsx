import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { createRoom, syncRoomToServer } from '../lib/room';
import { parseStudentNames } from '../lib/utils';
import { setHostToken } from '../lib/storage';

export function CreatePage() {
  const navigate = useNavigate();
  const [className, setClassName] = useState('');
  const [namesText, setNamesText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const names = parseStudentNames(namesText);
    if (!className.trim()) {
      setError('학급 이름을 입력해 주세요.');
      return;
    }
    if (names.length === 0) {
      setError('학생 이름을 1명 이상 입력해 주세요.');
      return;
    }

    setLoading(true);
    try {
      const room = await createRoom(className.trim(), names);
      setHostToken(room.code, room.host_token);
      await syncRoomToServer(room.code).catch(() => {});
      navigate(`/room/${room.code}/host`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '생성에 실패했어요');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout title="학급 만들기" backTo="/">
      <form className="form" onSubmit={handleSubmit}>
        <label className="form-label">
          학급 이름
          <input
            className="form-input"
            value={className}
            onChange={(e) => setClassName(e.target.value)}
            placeholder="예: 3학년 2반"
          />
        </label>

        <label className="form-label">
          학생 명단
          <span className="form-hint">한 줄에 한 이름씩, 또는 쉼표로 구분</span>
          <textarea
            className="form-textarea"
            value={namesText}
            onChange={(e) => setNamesText(e.target.value)}
            placeholder={'김민수\n이지우\n박현서'}
            rows={10}
          />
        </label>

        {error && <p className="form-error">{error}</p>}

        <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
          {loading ? '만드는 중...' : '학급 만들기'}
        </button>
      </form>
    </Layout>
  );
}
