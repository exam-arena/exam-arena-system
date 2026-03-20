package services

import (
	"errors"
	"strings"

	"backend/models"
	"backend/repositories"
	"backend/utils"
)

// 🎯 Struct nhận từ controller
type RegisterInput struct {
	Username string
	Email    string
	Password string
	Fullname string
}

// 🎯 Input login (email hoặc username)
type LoginInput struct {
	Identifier string
	Password   string
}

// 🎯 Response login
type LoginResponse struct {
	Token string
}

// 🎯 Custom errors (chuẩn hơn cho production)
var (
	ErrMissingFields   = errors.New("missing required fields")
	ErrInvalidEmail    = errors.New("invalid email format")
	ErrInvalidPassword = errors.New("password must be at least 6 characters")
	ErrInvalidUsername = errors.New("invalid username")
	ErrEmailExists     = errors.New("email already exists")
	ErrUsernameExists  = errors.New("username already exists")
)

// ✅ Service đăng ký user
func RegisterUser(input RegisterInput) error {

	// ===== 1. Normalize =====
	input.Email = strings.TrimSpace(strings.ToLower(input.Email))
	input.Username = strings.TrimSpace(input.Username)
	input.Fullname = strings.TrimSpace(input.Fullname)

	// ===== 2. Validate =====
	if input.Email == "" || input.Password == "" || input.Username == "" || input.Fullname == "" {
		return ErrMissingFields
	}

	if !utils.IsValidEmail(input.Email) {
		return ErrInvalidEmail
	}

	if !utils.IsValidPassword(input.Password) {
		return ErrInvalidPassword
	}

	if !utils.IsValidUsername(input.Username) {
		return ErrInvalidUsername
	}

	if !utils.IsValidFullname(input.Fullname) {
		return errors.New("invalid fullname")
	}

	// ===== 3. Check email tồn tại =====
	emailExists, err := repositories.IsEmailExists(input.Email)
	if err != nil {
		return err
	}
	if emailExists {
		return ErrEmailExists
	}

	// ===== 4. Check username tồn tại =====
	usernameExists, err := repositories.IsUsernameExists(input.Username)
	if err != nil {
		return err
	}
	if usernameExists {
		return ErrUsernameExists
	}

	// ===== 5. Hash password =====
	hashedPassword, err := utils.HashPassword(input.Password)
	if err != nil {
		return err
	}

	// ===== 6. Tạo user =====
	user := models.User{
		Username: input.Username,
		Email:    input.Email,
		Password: hashedPassword,
		Fullname: input.Fullname,
		Role:     "student",
	}

	// ===== 7. Lưu DB =====
	if err := repositories.CreateUser(&user); err != nil {
		return err
	}
	return nil
}

var ErrInvalidCredentials = errors.New("invalid credentials")

// ✅ Service login
func LoginUser(input LoginInput) (*LoginResponse, error) {

	// ===== 1. Normalize =====
	identifier := strings.TrimSpace(input.Identifier)
	password := strings.TrimSpace(input.Password)

	if identifier == "" || password == "" {
		return nil, ErrMissingFields
	}

	// ===== 2. Tìm user =====
	user, err := repositories.GetUserByIdentifier(identifier)
	if err != nil {
		return nil, err
	}

	// 👉 QUAN TRỌNG: không phân biệt user tồn tại hay không
	if user == nil {
		return nil, ErrInvalidCredentials
	}

	// ===== 3. Check password =====
	if err := utils.CheckPassword(password, user.Password); err != nil {
		return nil, ErrInvalidCredentials
	}

	// ===== 4. Generate JWT =====
	token, err := utils.GenerateJWT(user)
	if err != nil {
		return nil, err
	}

	return &LoginResponse{
		Token: token,
	}, nil
}

