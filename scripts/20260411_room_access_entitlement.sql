ALTER TABLE IF EXISTS user_room_access
    ADD COLUMN IF NOT EXISTS source_type VARCHAR(50) NOT NULL DEFAULT 'system';

ALTER TABLE IF EXISTS user_room_access
    ADD COLUMN IF NOT EXISTS source_ref_id UUID;

ALTER TABLE IF EXISTS user_room_access
    ADD COLUMN IF NOT EXISTS granted_by_user_id UUID REFERENCES users(user_id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS user_room_access
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active';

ALTER TABLE IF EXISTS user_room_access
    ADD COLUMN IF NOT EXISTS note VARCHAR(255);

ALTER TABLE IF EXISTS user_room_access
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

UPDATE user_room_access
SET
    source_type = COALESCE(NULLIF(source_type, ''), 'legacy'),
    status = COALESCE(NULLIF(status, ''), 'active'),
    updated_at = COALESCE(updated_at, granted_at, CURRENT_TIMESTAMP)
WHERE
    source_type IS NULL
    OR source_type = ''
    OR status IS NULL
    OR status = ''
    OR updated_at IS NULL;

DROP TRIGGER IF EXISTS update_user_room_access_modtime ON user_room_access;
CREATE TRIGGER update_user_room_access_modtime
BEFORE UPDATE ON user_room_access
FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

CREATE INDEX IF NOT EXISTS idx_user_room_access_user ON user_room_access(user_id);
CREATE INDEX IF NOT EXISTS idx_user_room_access_user_status_expiry ON user_room_access(user_id, status, expired_at);
CREATE INDEX IF NOT EXISTS idx_user_room_access_room_status ON user_room_access(room_id, status);
CREATE INDEX IF NOT EXISTS idx_user_room_access_source ON user_room_access(source_type, source_ref_id);
