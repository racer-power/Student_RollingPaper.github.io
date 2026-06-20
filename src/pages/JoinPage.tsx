import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { getRoomByCode } from '../lib/room';

export function JoinPage() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length !== 6) {
      setError('6자리 학급 코드를 입력해 주세요.');
      return;
    }

    setLoading(true);
    try {
      const room = await getRoomByCode(trimmed);
      if (!room) {
        setError('학급을 찾을 수 없어요. 코드를 다시 확인해 주세요.');
        return;
      }
      navigate(`/join/${room.code}/select`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '참여에 실패했어요');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout title="참여하기" backTo="/">
      <form className="form" onSubmit={handleSubmit}>
        <label className="form-label">
          학급 코드
          <input
            className="form-input form-input--code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ABC123"
            maxLength={6}
            autoComplete="off"
          />
        </label>

        {error && <p className="form-error">{error}</p>}

        <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
          {loading ? '확인 중...' : '다음'}
        </button>
      </form>
    </Layout>
  );
}
