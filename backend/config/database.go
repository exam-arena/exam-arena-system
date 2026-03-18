// file: config/database.go
package config

import (
	"log"
	"os"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)


var DB *gorm.DB

func ConnectDatabase() {
	// Lấy chuỗi kết nối từ biến môi trường
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		log.Fatal("❌ Lỗi: Chưa cấu hình DATABASE_URL trong file .env")
	}

	// Cấu hình GORM (Bật log để BE dễ debug câu query SQL sinh ra)
	config := &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	}

	// Mở kết nối
	database, err := gorm.Open(postgres.Open(dsn), config)
	if err != nil {
		log.Fatal("❌ Lỗi không thể kết nối tới Database Neon: ", err)
	}

	DB = database
	log.Println("✅ Đã kết nối thành công tới Neon PostgreSQL 17!")
}