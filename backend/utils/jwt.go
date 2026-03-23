package utils

import (
	"backend/models"
	"log"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// Gây lỗi JWT rỗng (khi chạy docker bị ghi đè do dùng lệnh os?)
// Khóa bí mật để ký Token (Nên để trong file .env)
// var jwtKey = []byte(os.Getenv("JWT_SECRET"))

var jwtKey []byte

func InitJWT() {
	key := os.Getenv("JWT_SECRET")
	if key == "" {
		log.Fatal("JWT_SECRET is not set")
	}
	jwtKey = []byte(key)
}

type Claims struct {
	UserID string `json:"user_id"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

// ✅ Hàm GenerateJWT mà Service đang gọi
func GenerateJWT(user *models.User) (string, error) {
	expirationTime := time.Now().Add(2 * time.Hour) // Token có hạn 2h
	claims := &Claims{
		UserID: user.UserID,
		Role:   user.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtKey)
	// return token.SignedString(getJWTKey()) // Luôn gọi os => Không ổn cho chương trình cần chịu tải lớn 
}