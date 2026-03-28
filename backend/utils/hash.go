package utils

import (
	"errors"

	"golang.org/x/crypto/bcrypt"
)

// ⚙️ Cost càng cao → càng bảo mật nhưng chậm hơn
const bcryptCost = 10

// ✅ Hash password (dùng khi signup)
func HashPassword(password string) (string, error) {
	if password == "" {
		return "", errors.New("password cannot be empty")
	}

	hashedBytes, err := bcrypt.GenerateFromPassword([]byte(password), bcryptCost)
	if err != nil {
		return "", err
	}

	return string(hashedBytes), nil
}

// ✅ So sánh password (dùng khi login)
func CheckPassword(password string, hashedPassword string) error {
	if password == "" || hashedPassword == "" {
		return errors.New("password or hash is empty")
	}

	return bcrypt.CompareHashAndPassword(
		[]byte(hashedPassword),
		[]byte(password),
	)
}

// ✅ Optional: Wrapper trả bool cho dễ dùng
func VerifyPassword(password string, hashedPassword string) bool {
	err := CheckPassword(password, hashedPassword)
	return err == nil
}