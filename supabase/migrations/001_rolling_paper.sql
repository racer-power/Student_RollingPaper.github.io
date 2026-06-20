-- Rolling Paper app schema (applied via Supabase migration)

CREATE TABLE IF NOT EXISTS rp_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(6) UNIQUE NOT NULL,
  class_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ready' CHECK (status IN ('ready', 'active', 'ended')),
  host_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rp_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rp_rooms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  device_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(room_id, name)
);

CREATE TABLE IF NOT EXISTS rp_praises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rp_rooms(id) ON DELETE CASCADE,
  from_student_id UUID NOT NULL REFERENCES rp_students(id) ON DELETE CASCADE,
  to_student_id UUID NOT NULL REFERENCES rp_students(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) >= 10 AND char_length(content) <= 200),
  color TEXT NOT NULL DEFAULT '#FFE066',
  deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(room_id, from_student_id, to_student_id)
);
