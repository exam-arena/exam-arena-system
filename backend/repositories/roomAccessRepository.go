package repositories

import (
	"context"
	"time"

	"backend/config"

	"github.com/google/uuid"
)

type RoomAccessRow struct {
	UserID          string
	RoomID          string
	GrantedAt       time.Time
	ExpiredAt       *time.Time
	SourceType      string
	SourceRefID     *string
	GrantedByUserID *string
	Status          string
	Note            *string
	UpdatedAt       time.Time
}

type GrantRoomAccessInput struct {
	UserID          string
	RoomID          string
	ExpiredAt       *time.Time
	SourceType      string
	SourceRefID     *string
	GrantedByUserID *string
	Note            *string
}

type RoomAccessKeyRow struct {
	RoomID string
}

func GetValidRoomAccess(ctx context.Context, userID, roomID string) (*RoomAccessRow, error) {
	if _, err := uuid.Parse(userID); err != nil {
		return nil, nil
	}
	if _, err := uuid.Parse(roomID); err != nil {
		return nil, nil
	}
	if ctx == nil {
		ctx = context.Background()
	}

	var row RoomAccessRow
	err := config.DB.WithContext(ctx).Raw(`
		SELECT
			user_id,
			room_id,
			granted_at,
			expired_at,
			source_type,
			source_ref_id,
			granted_by_user_id,
			status,
			note,
			updated_at
		FROM user_room_access
		WHERE user_id = ?::uuid
		  AND room_id = ?::uuid
		  AND status = 'active'
		  AND (expired_at IS NULL OR expired_at > CURRENT_TIMESTAMP)
		LIMIT 1
	`, userID, roomID).Scan(&row).Error
	if err != nil {
		return nil, err
	}
	if row.UserID == "" {
		return nil, nil
	}

	return &row, nil
}

func GrantRoomAccess(ctx context.Context, input GrantRoomAccessInput) (*RoomAccessRow, error) {
	if _, err := uuid.Parse(input.UserID); err != nil {
		return nil, nil
	}
	if _, err := uuid.Parse(input.RoomID); err != nil {
		return nil, nil
	}
	if input.SourceType == "" {
		input.SourceType = "system"
	}
	if ctx == nil {
		ctx = context.Background()
	}

	var row RoomAccessRow
	err := config.DB.WithContext(ctx).Raw(`
		INSERT INTO user_room_access (
			user_id,
			room_id,
			granted_at,
			expired_at,
			source_type,
			source_ref_id,
			granted_by_user_id,
			status,
			note,
			updated_at
		)
		VALUES (
			?::uuid,
			?::uuid,
			CURRENT_TIMESTAMP,
			?,
			?,
			?::uuid,
			?::uuid,
			'active',
			?,
			CURRENT_TIMESTAMP
		)
		ON CONFLICT (user_id, room_id)
		DO UPDATE SET
			granted_at = CURRENT_TIMESTAMP,
			expired_at = EXCLUDED.expired_at,
			source_type = EXCLUDED.source_type,
			source_ref_id = EXCLUDED.source_ref_id,
			granted_by_user_id = EXCLUDED.granted_by_user_id,
			status = 'active',
			note = EXCLUDED.note,
			updated_at = CURRENT_TIMESTAMP
		RETURNING
			user_id,
			room_id,
			granted_at,
			expired_at,
			source_type,
			source_ref_id,
			granted_by_user_id,
			status,
			note,
			updated_at
	`, input.UserID, input.RoomID, input.ExpiredAt, input.SourceType, input.SourceRefID, input.GrantedByUserID, input.Note).Scan(&row).Error
	if err != nil {
		return nil, err
	}
	if row.UserID == "" {
		return nil, nil
	}

	return &row, nil
}

func ListAccessibleRoomIDs(ctx context.Context, userID string, roomIDs []string) (map[string]struct{}, error) {
	if _, err := uuid.Parse(userID); err != nil {
		return map[string]struct{}{}, nil
	}
	if len(roomIDs) == 0 {
		return map[string]struct{}{}, nil
	}
	if ctx == nil {
		ctx = context.Background()
	}

	rows := make([]RoomAccessKeyRow, 0, len(roomIDs))
	err := config.DB.WithContext(ctx).
		Table("user_room_access").
		Select("room_id").
		Where("user_id = ? AND status = 'active' AND (expired_at IS NULL OR expired_at > CURRENT_TIMESTAMP) AND room_id IN ?", userID, roomIDs).
		Scan(&rows).Error
	if err != nil {
		return nil, err
	}

	result := make(map[string]struct{}, len(rows))
	for _, row := range rows {
		if row.RoomID != "" {
			result[row.RoomID] = struct{}{}
		}
	}

	return result, nil
}
