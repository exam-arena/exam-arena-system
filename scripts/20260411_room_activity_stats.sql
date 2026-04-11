CREATE TABLE IF NOT EXISTS room_activity_stats (
    room_id UUID PRIMARY KEY REFERENCES exam_room(room_id) ON DELETE CASCADE,
    attempt_count BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_room_activity_stats_attempt_count
ON room_activity_stats(attempt_count DESC, updated_at DESC);

INSERT INTO room_activity_stats (room_id, attempt_count, updated_at)
SELECT
    e.room_id,
    COUNT(*) AS attempt_count,
    CURRENT_TIMESTAMP
FROM exam_attempt ea
JOIN exam e ON e.exam_id = ea.exam_id
GROUP BY e.room_id
ON CONFLICT (room_id)
DO UPDATE SET
    attempt_count = EXCLUDED.attempt_count,
    updated_at = CURRENT_TIMESTAMP;
