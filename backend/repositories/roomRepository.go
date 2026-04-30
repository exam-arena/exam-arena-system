package repositories

import (
	"context"
	"errors"

	"backend/config"
	"backend/models"

	"gorm.io/gorm"
)

type RoomListRow struct {
	RoomID       string
	Name         string
	Type         string
	Price        float64
	TestQuantity int
	Status       string
}

type HotRoomRow struct {
	RoomID       string
	Name         string
	Type         string
	Price        float64
	TestQuantity int
	Status       string
	AttemptCount int64
}

func GetRoomByID(roomID string) (*models.Room, error) {
	var room models.Room

	err := config.DB.Raw(`
		SELECT
			r.room_id,
			r.name,
			r.type,
			r.price,
			COALESCE((
				SELECT COUNT(*)
				FROM exam e
				WHERE e.room_id = r.room_id
				  AND e.deleted_at IS NULL
			), 0) AS test_quantity,
			r.status,
			r.created_at,
			r.updated_at,
			r.deleted_at
		FROM exam_room r
		WHERE r.room_id = ?
		  AND r.deleted_at IS NULL
		LIMIT 1
	`, roomID).Scan(&room).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}

	return &room, nil
}

func ListRooms(ctx context.Context, page, limit int) ([]RoomListRow, error) {
	if ctx == nil {
		ctx = context.Background()
	}

	offset := (page - 1) * limit
	rows := make([]RoomListRow, 0)

	err := config.DB.WithContext(ctx).Raw(`
		WITH page_scope AS (
			SELECT
				r.room_id,
				r.name,
				r.type,
				r.price,
				r.status,
				r.created_at
			FROM exam_room r
			WHERE r.deleted_at IS NULL
			ORDER BY r.created_at DESC, r.room_id DESC
			LIMIT ? OFFSET ?
		),
		exam_counts AS (
			SELECT
				e.room_id,
				COUNT(*) AS test_quantity
			FROM exam e
			WHERE e.deleted_at IS NULL
			  AND e.room_id IN (SELECT room_id FROM page_scope)
			GROUP BY e.room_id
		)
		SELECT
			p.room_id,
			p.name,
			p.type,
			p.price,
			COALESCE(ec.test_quantity, 0) AS test_quantity,
			p.status
		FROM page_scope p
		LEFT JOIN exam_counts ec ON ec.room_id = p.room_id
		ORDER BY p.created_at DESC, p.room_id DESC
	`, limit, offset).Scan(&rows).Error
	if err != nil {
		return nil, err
	}

	return rows, nil
}

func CountRooms(ctx context.Context) (int64, error) {
	if ctx == nil {
		ctx = context.Background()
	}

	var total int64
	err := config.DB.WithContext(ctx).Raw(`
		SELECT COUNT(*)
		FROM exam_room r
		WHERE r.deleted_at IS NULL
	`).Scan(&total).Error
	if err != nil {
		return 0, err
	}

	return total, nil
}

func ListHotRooms(ctx context.Context, limit int) ([]HotRoomRow, error) {
	if ctx == nil {
		ctx = context.Background()
	}

	rows := make([]HotRoomRow, 0)

	err := config.DB.WithContext(ctx).Raw(`
		WITH exam_counts AS (
			SELECT
				e.room_id,
				COUNT(*) AS test_quantity
			FROM exam e
			WHERE e.deleted_at IS NULL
			GROUP BY e.room_id
		)
		SELECT
			r.room_id,
			r.name,
			r.type,
			r.price,
			COALESCE(ec.test_quantity, 0) AS test_quantity,
			r.status,
			COALESCE(rs.attempt_count, 0) AS attempt_count
		FROM exam_room r
		LEFT JOIN exam_counts ec
		  ON ec.room_id = r.room_id
		LEFT JOIN room_activity_stats rs
		  ON rs.room_id = r.room_id
		WHERE r.deleted_at IS NULL
		ORDER BY COALESCE(rs.attempt_count, 0) DESC, r.created_at DESC, r.room_id DESC
		LIMIT ?
	`, limit).Scan(&rows).Error
	if err != nil {
		rows = make([]HotRoomRow, 0)
		legacyErr := config.DB.WithContext(ctx).Raw(`
			SELECT
				r.room_id,
				r.name,
				r.type,
				r.price,
				COUNT(DISTINCT e.exam_id) AS test_quantity,
				r.status,
				COUNT(a.attempt_id) AS attempt_count
			FROM exam_room r
			LEFT JOIN exam e
			  ON e.room_id = r.room_id
			 AND e.deleted_at IS NULL
			LEFT JOIN exam_attempt a
			  ON a.exam_id = e.exam_id
			WHERE r.deleted_at IS NULL
			GROUP BY
				r.room_id,
				r.name,
				r.type,
				r.price,
				r.test_quantity,
				r.status,
				r.created_at
			ORDER BY COUNT(a.attempt_id) DESC, r.created_at DESC, r.room_id DESC
			LIMIT ?
		`, limit).Scan(&rows).Error
		if legacyErr != nil {
			return nil, err
		}
	}

	return rows, nil
}
