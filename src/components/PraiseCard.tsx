import type { Praise } from '../types';

interface PraiseCardProps {
  praise: Praise;
  fromName: string;
  deleted?: boolean;
  large?: boolean;
}

export function PraiseCard({ praise, fromName, deleted, large }: PraiseCardProps) {
  const rotation = ((praise.id.charCodeAt(0) % 7) - 3) * 0.5;

  return (
    <div
      className={`praise-card ${large ? 'praise-card--large' : ''} ${deleted ? 'praise-card--deleted' : ''}`}
      style={{
        backgroundColor: deleted ? '#eee' : praise.color,
        transform: `rotate(${rotation}deg)`,
      }}
    >
      <div className="praise-card__from">from {fromName}</div>
      <div className="praise-card__content">
        {deleted ? '삭제된 메시지' : praise.content}
      </div>
    </div>
  );
}
