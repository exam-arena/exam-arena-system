// file: config/database.go
package config

import (
	"log"
	"os"
	"time"

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
	// Sau này cần đổi dòng này đi vì nó làm tốn tài nguyên CPU
	config := &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	}

	// Mở kết nối
	database, err := gorm.Open(postgres.Open(dsn), config)
	if err != nil {
		log.Fatal("❌ Lỗi không thể kết nối tới Database Neon: ", err)
	}

	// Bổ sung connection pool -> Chỉ giúp tránh crash
	sqlDB, err := database.DB()
	if err != nil {
		log.Fatal("❌ Không thể lấy sql.DB từ GORM: ", err)
	}

	// Cấu hình connection pool
	sqlDB.SetMaxOpenConns(40)                // tối đa connection
	sqlDB.SetMaxIdleConns(20)                // connection idle
	sqlDB.SetConnMaxLifetime(5 * time.Minute) // reset connection
	sqlDB.SetConnMaxIdleTime(2 * time.Minute)

	DB = database
	log.Println("✅ Đã kết nối thành công tới Neon PostgreSQL 17!")
}