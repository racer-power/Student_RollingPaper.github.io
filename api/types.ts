export type RoomStatus = 'ready' | 'active' | 'ended';

export interface Room {
  id: string;
  code: string;
  class_name: string;
  status: RoomStatus;
  host_token: string;
  expires_at: string;
  created_at: string;
}

export interface Student {
  id: string;
  room_id: string;
  name: string;
  device_id: string | null;
  created_at: string;
}

export interface Praise {
  id: string;
  room_id: string;
  from_student_id: string;
  to_student_id: string;
  content: string;
  color: string;
  deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface RoomBundle {
  room: Room;
  students: Student[];
  praises: Praise[];
}

export const ROOM_EXPIRY_HOURS = 24;
