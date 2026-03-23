package models

import "time"

type User struct {
    UserID    string     `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"user_id"`
    Username  string     `gorm:"size:50;unique;not null" json:"username"`
    Password  string     `gorm:"size:255;not null" json:"-"`
    Fullname  string     `gorm:"size:100;not null" json:"fullname"`
    Email     string     `gorm:"size:100;unique;not null" json:"email"`
    Role      string     `gorm:"size:20;default:student" json:"role"`
    CreatedAt time.Time  `json:"created_at"`
    UpdatedAt time.Time  `json:"updated_at"`
    DeletedAt *time.Time `gorm:"index" json:"-"`
}