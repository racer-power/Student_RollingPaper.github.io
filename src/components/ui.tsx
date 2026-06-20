import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

export function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  return <div className="toast">{message}</div>;
}

export function StatusBadge({ status }: { status: 'ready' | 'active' | 'ended' }) {
  const labels = { ready: '준비', active: '진행 중', ended: '마무리' };
  return <span className={`status-badge status-badge--${status}`}>{labels[status]}</span>;
}

export function StudentNav({ code }: { code: string }) {
  return (
    <nav className="student-nav">
      <Link to={`/room/${code}/write`} className="student-nav__link">
        칭찬 쓰기
      </Link>
      <Link to={`/room/${code}/me`} className="student-nav__link">
        내 롤링페이퍼
      </Link>
    </nav>
  );
}

const STATUS_RANK: Record<string, number> = { ready: 0, active: 1, ended: 2 };

export function useRoomGuard(status: string | undefined, allowEnded = false) {
  const [blocked, setBlocked] = useState<string | null>(null);
  const peakStatus = useRef(0);

  useEffect(() => {
    if (status && status in STATUS_RANK) {
      peakStatus.current = Math.max(peakStatus.current, STATUS_RANK[status]);
    }

    const showReadyBlock = status === 'ready' && peakStatus.current < STATUS_RANK.active;

    if (showReadyBlock) {
      setBlocked('아직 활동이 시작되지 않았어요. 선생님께 시작을 요청하세요.');
    } else if (status === 'ended' && !allowEnded) {
      setBlocked('활동이 끝났어요. 받은 칭찬을 확인해 보세요.');
    } else {
      setBlocked(null);
    }
  }, [status, allowEnded]);

  return blocked;
}
