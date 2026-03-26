// file: config/database.go
package config

import (
	"log"
	"os"
	"strconv"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

func getEnvInt(key string, fallback int) int {
	raw := os.Getenv(key)
	if raw == "" {
		return fallback
	}
	value, err := strconv.Atoi(raw)
	if err != nil || value <= 0 {
		return fallback
	}
	return value
}

func ConnectDatabase() {
	// Lấy chuỗi kết nối từ biến môi trường
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		log.Fatal("❌ Lỗi: Chưa cấu hình DATABASE_URL trong file .env")
	}

	// Cấu hình GORM (Bật log để BE dễ debug câu query SQL sinh ra)
	// Mặc định chỉ log cảnh báo để tránh overhead không cần thiết khi chịu tải cao.
	config := &gorm.Config{
		Logger: logger.Default.LogMode(logger.Warn),
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
	sqlDB.SetMaxOpenConns(getEnvInt("DB_MAX_OPEN_CONNS", 40))
	sqlDB.SetMaxIdleConns(getEnvInt("DB_MAX_IDLE_CONNS", 20))
	sqlDB.SetConnMaxLifetime(5 * time.Minute)
	sqlDB.SetConnMaxIdleTime(2 * time.Minute)

	DB = database
	log.Println("✅ Đã kết nối thành công tới Neon PostgreSQL 17!")
}
