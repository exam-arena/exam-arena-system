package models

import "time"

type Exam struct {
	ExamID     string     `gorm:"column:exam_id;type:uuid;default:gen_random_uuid();primaryKey" json:"exam_id"`
	RoomID     string     `gorm:"column:room_id;type:uuid;not null;index" json:"room_id"`
	Title      string     `gorm:"column:title;size:255;not null" json:"title"`
	Type       string     `gorm:"column:type;size:100;not null" json:"type"`
	Capacity   int        `gorm:"column:capacity;not null;default:0" json:"capacity"`
	Duration   int        `gorm:"column:duration;not null" json:"duration"`
	StartTime  *time.Time `gorm:"column:start_time" json:"start_time"`
	CreatedAt  time.Time  `gorm:"column:created_at" json:"created_at"`
	UpdatedAt  time.Time  `gorm:"column:updated_at" json:"updated_at"`
	DeletedAt  *time.Time `gorm:"column:deleted_at;index" json:"-"`
}

func (Exam) TableName() string {
	return "exam"
}
