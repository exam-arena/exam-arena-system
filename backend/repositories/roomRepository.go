package repositories

import (
	"errors"

	"backend/config"
	"backend/models"

	"gorm.io/gorm"
)

func GetRoomByID(roomID string) (*models.Room, error) {
	var room models.Room

	err := config.DB.Where("room_id = ?", roomID).First(&room).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}

	return &room, nil
}
