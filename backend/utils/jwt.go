package utils

import (
	"os"
	"time"
	"github.com/golang-jwt/jwt/v5"
	"backend/models"
)

// Khóa bí mật để ký Token (Nên để trong file .env)
var jwtKey = []byte(os.Getenv("JWT_SECRET"))

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
}