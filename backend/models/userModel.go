package models

import "time"

type User struct {
	UserID         string     `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"user_id"`
	Username       string     `gorm:"size:50;unique;not null" json:"username"`
	Password       string     `gorm:"size:255;not null" json:"-"`
	Fullname       string     `gorm:"size:100;not null" json:"fullname"`
	Email          string     `gorm:"size:100;unique;not null" json:"email"`
	AvatarProvider string     `gorm:"size:50" json:"avatar_provider"`
	AvatarKey      string     `gorm:"size:255" json:"avatar_key"`
	AvatarURL      string     `gorm:"type:text" json:"avatar_url"`
	Gender         string     `gorm:"size:20" json:"gender"`
	DateOfBirth    *time.Time `gorm:"type:date" json:"date_of_birth"`
	Phone          string     `gorm:"size:20" json:"phone"`
	ProvinceCode   string     `gorm:"size:20" json:"province_code"`
	ProvinceName   string     `gorm:"size:100" json:"province_name"`
	WardCode       string     `gorm:"size:20" json:"ward_code"`
	WardName       string     `gorm:"size:100" json:"ward_name"`
	AddressDetail  string     `gorm:"size:255" json:"address_detail"`
	Role           string     `gorm:"size:20;default:student" json:"role"`
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at"`
	DeletedAt      *time.Time `gorm:"index" json:"-"`
}
