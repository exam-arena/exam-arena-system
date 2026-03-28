package repositories

import (
	"backend/config"
	"backend/models"
)

func CountExamsByRoomID(roomID string) (int64, error) {
	var total int64

	if err := config.DB.Model(&models.Exam{}).Where("room_id = ?", roomID).Count(&total).Error; err != nil {
		return 0, err
	}

	return total, nil
}

func ListExamsByRoomID(roomID string, page, limit int) ([]models.Exam, error) {
	var exams []models.Exam
	offset := (page - 1) * limit
	err := config.DB.
		Select("exam_id", "room_id", "title", "type", "duration", "start_time").
		Where("room_id = ?", roomID).
		Order("start_time DESC NULLS LAST").
		Order("exam_id DESC").
		Limit(limit).
		Offset(offset).
		Find(&exams).Error
	if err != nil {
		return nil, err
	}

	return exams, nil
}
