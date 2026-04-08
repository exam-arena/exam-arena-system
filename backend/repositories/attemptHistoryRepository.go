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
}

func ListAttemptHistoryByUser(ctx context.Context, userID string, cursorSubmittedAt *time.Time, cursorAttemptID string, limit int) ([]AttemptHistoryRow, error) {
	rows := make([]AttemptHistoryRow, 0)
	if _, err := uuid.Parse(userID); err != nil {
		return rows, nil
	}
	if cursorAttemptID != "" {
		if _, err := uuid.Parse(cursorAttemptID); err != nil {
			return rows, nil
		}
	}
	if ctx == nil {
		ctx = context.Background()
	}

	query := `
		SELECT
			ea.attempt_id,
			ea.started_at,
			ea.end_at AS submitted_at,
			r.name AS room_name,
			e.title AS exam_name,
			COALESCE(ea.marks::text, '0') AS score
		FROM exam_attempt ea
		JOIN exam e ON e.exam_id = ea.exam_id
		JOIN exam_room r ON r.room_id = e.room_id
		WHERE ea.user_id = ?::uuid
		  AND ea.status = 'submitted'
		  AND e.deleted_at IS NULL
		  AND r.deleted_at IS NULL
	`

	args := make([]interface{}, 0, 4)
	args = append(args, userID)

	if cursorSubmittedAt != nil && cursorAttemptID != "" {
		query += `
		  AND (
			ea.end_at < ?
			OR (ea.end_at = ? AND ea.attempt_id < ?::uuid)
		  )
		`
		args = append(args, *cursorSubmittedAt, *cursorSubmittedAt, cursorAttemptID)
	}

	query += `
		ORDER BY ea.end_at DESC NULLS LAST, ea.attempt_id DESC
		LIMIT ?
	`
	args = append(args, limit+1)

	err := config.DB.WithContext(ctx).Raw(query, args...).Scan(&rows).Error
	if err != nil {
		return nil, err
	}

	return rows, nil
}
