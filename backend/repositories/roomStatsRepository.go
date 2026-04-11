package repositories

import (
	"context"

	"backend/config"

	"github.com/google/uuid"
)

func IncrementRoomAttemptCount(ctx context.Context, roomID string) error {
	if _, err := uuid.Parse(roomID); err != nil {
		return nil
	}
	if ctx == nil {
		ctx = context.Background()
	}

	return config.DB.WithContext(ctx).Exec(`
		INSERT INTO room_activity_stats (
			room_id,
			attempt_count,
			updated_at
		)
		VALUES (
			?::uuid,
			1,
			CURRENT_TIMESTAMP
		)
		ON CONFLICT (room_id)
		DO UPDATE SET
			attempt_count = room_activity_stats.attempt_count + 1,
			updated_at = CURRENT_TIMESTAMP
	`, roomID).Error
}
