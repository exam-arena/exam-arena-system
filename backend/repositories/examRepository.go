package repositories

import (
	"context"
	"time"

	"backend/config"
)

type RoomExamListRow struct {
	ExamID       string
	RoomID       string
	Title        string
	Type         string
	Duration     int
	StartTime    *time.Time
	HasCompleted bool
	TotalCount   int64
}

type RoomExamMetaRow struct {
	RoomExists bool
	TotalCount int64
}

func CountExamsByRoomID(ctx context.Context, roomID string) (int64, error) {
	if ctx == nil {
		ctx = context.Background()
	}

	var total int64
	err := config.DB.WithContext(ctx).Raw(`
		SELECT COUNT(*)
		FROM exam e
		WHERE e.room_id = ?
		  AND e.deleted_at IS NULL
	`, roomID).Scan(&total).Error
	if err != nil {
		return 0, err
	}

	return total, nil
}

func ListExamsByRoomID(ctx context.Context, userID, roomID string, page, limit int) ([]RoomExamListRow, error) {
	if ctx == nil {
		ctx = context.Background()
	}

	rows := make([]RoomExamListRow, 0)
	offset := (page - 1) * limit

	err := config.DB.WithContext(ctx).Raw(`
		SELECT
			e.exam_id,
			e.room_id,
			e.title,
			e.type,
			e.duration,
			e.start_time,
			(
				e.type IN ('mock_test', 'official') AND
				EXISTS (
					SELECT 1
					FROM exam_attempt ea
					WHERE ea.exam_id = e.exam_id
					  AND ea.user_id = ?
					  AND ea.status = 'submitted'
				)
			) AS has_completed,
			COUNT(*) OVER() AS total_count
		FROM exam e
		JOIN exam_room r
		  ON r.room_id = e.room_id
		 AND r.deleted_at IS NULL
		 AND r.status = 'active'
		WHERE e.room_id = ?
		  AND e.deleted_at IS NULL
		ORDER BY e.start_time DESC NULLS LAST, e.exam_id DESC
		LIMIT ? OFFSET ?
	`, userID, roomID, limit, offset).Scan(&rows).Error
	if err != nil {
		return nil, err
	}

	return rows, nil
}

func GetRoomExamMeta(ctx context.Context, roomID string) (*RoomExamMetaRow, error) {
	if ctx == nil {
		ctx = context.Background()
	}

	var row RoomExamMetaRow

	err := config.DB.WithContext(ctx).Raw(`
		WITH room_scope AS (
			SELECT r.room_id
			FROM exam_room r
			WHERE r.room_id = ?
			  AND r.deleted_at IS NULL
			  AND r.status = 'active'
		)
		SELECT
			EXISTS(SELECT 1 FROM room_scope) AS room_exists,
			(
				SELECT COUNT(*)
				FROM exam e
				WHERE e.room_id IN (SELECT room_id FROM room_scope)
				  AND e.deleted_at IS NULL
			) AS total_count
	`, roomID).Scan(&row).Error
	if err != nil {
		return nil, err
	}

	return &row, nil
}
