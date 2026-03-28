package models

import "time"

type Room struct {
	RoomID       string     `gorm:"column:room_id;type:uuid;default:gen_random_uuid();primaryKey" json:"room_id"`
	Name         string     `gorm:"column:name;size:255;not null" json:"name"`
	Type         string     `gorm:"column:type;size:100;not null" json:"type"`
	Price        float64    `gorm:"column:price;type:decimal(10,2);not null;default:0" json:"price"`
	TestQuantity int        `gorm:"column:test_quantity;not null;default:0" json:"test_quantity"`
	Status       string     `gorm:"column:status;size:50;not null;default:active" json:"status"`
	CreatedAt    time.Time  `gorm:"column:created_at" json:"created_at"`
	UpdatedAt    time.Time  `gorm:"column:updated_at" json:"updated_at"`
	DeletedAt    *time.Time `gorm:"column:deleted_at;index" json:"-"`
}

func (Room) TableName() string {
	return "exam_room"
}
