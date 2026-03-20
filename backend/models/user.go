package models

import "time"

type User struct {
	UserID    string     `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	Username  string     `gorm:"size:50;unique;not null"`
	Password  string     `gorm:"size:255;not null"`
	Fullname  string     `gorm:"size:100;not null"`
	Email     string     `gorm:"size:100;unique;not null"`
	Role      string     `gorm:"size:20;default:student"`
	CreatedAt time.Time
	UpdatedAt time.Time
	DeletedAt *time.Time `gorm:"index"`
}