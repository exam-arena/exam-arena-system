package repositories

import (
	"context"
	"time"

	"backend/config"

	"github.com/google/uuid"
)

type AttemptHistoryRow struct {
	AttemptID   string
	StartedAt   time.Time
	SubmittedAt *time.Time
	RoomName    string
	ExamName    string
	Score       string
	TotalCount  int64
}

func ListAttemptHistoryByUser(ctx context.Context, userID string, page, limit int) ([]AttemptHistoryRow, error) {
	rows := make([]AttemptHistoryRow, 0)
	if _, err := uuid.Parse(userID); err != nil {
		return rows, nil
	}
	if ctx == nil {
		ctx = context.Background()
	}

	offset := (page - 1) * limit

	err := config.DB.WithContext(ctx).Raw(`
		SELECT
			ea.attempt_id,
			ea.started_at,
			ea.end_at AS submitted_at,
			r.name AS room_name,
			e.title AS exam_name,
			COALESCE(ea.marks::text, '0') AS score,
			COUNT(*) OVER() AS total_count
		FROM exam_attempt ea
		JOIN exam e ON e.exam_id = ea.exam_id
		JOIN exam_room r ON r.room_id = e.room_id
		WHERE ea.user_id = ?::uuid
		  AND ea.status = 'submitted'
		  AND e.deleted_at IS NULL
		  AND r.deleted_at IS NULL
		ORDER BY ea.end_at DESC NULLS LAST, ea.started_at DESC, ea.attempt_id DESC
		LIMIT ? OFFSET ?
	`, userID, limit, offset).Scan(&rows).Error
	if err != nil {
		return nil, err
	}

	return rows, nil
}

func CountAttemptHistoryByUser(ctx context.Context, userID string) (int64, error) {
	if _, err := uuid.Parse(userID); err != nil {
		return 0, nil
	}
	if ctx == nil {
		ctx = context.Background()
	}

	var total int64
	err := config.DB.WithContext(ctx).Raw(`
		SELECT COUNT(*)
		FROM exam_attempt ea
		JOIN exam e ON e.exam_id = ea.exam_id
		JOIN exam_room r ON r.room_id = e.room_id
		WHERE ea.user_id = ?::uuid
		  AND ea.status = 'submitted'
		  AND e.deleted_at IS NULL
		  AND r.deleted_at IS NULL
	`, userID).Scan(&total).Error
	if err != nil {
		return 0, err
	}

	return total, nil
}
