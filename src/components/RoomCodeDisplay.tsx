import { QRCodeSVG } from 'qrcode.react';

interface RoomCodeDisplayProps {
  code: string;
  joinUrl: string;
}

export function RoomCodeDisplay({ code, joinUrl }: RoomCodeDisplayProps) {
  return (
    <div className="room-code-display">
      <div className="room-code-display__code">{code}</div>
      <p className="room-code-display__hint">학생들에게 이 코드를 알려주세요</p>
      <div className="room-code-display__qr">
        <QRCodeSVG value={joinUrl} size={160} />
      </div>
      <p className="room-code-display__url">{joinUrl}</p>
    </div>
  );
}
