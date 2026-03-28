package services

import (
	"errors"
	"strings"

	"backend/models"
	"backend/repositories"
	"backend/utils"
)

// ================== INPUT ==================

type RegisterInput struct {
	Username string
	Email    string
	Password string
	Fullname string
}

type LoginInput struct {
	Identifier string
	Password   string
}

// ================== RESPONSE ==================

type LoginResponse struct {
	Token string       `json:"token"`
	User  UserResponse `json:"user"`
}

type UserResponse struct {
	UserID   string `json:"user_id"`
	Username string `json:"username"`
	Fullname string `json:"fullname"`
	Email    string `json:"email"`
	Role     string `json:"role"`
}

// ================== ERRORS ==================

var (
	ErrMissingFields      = errors.New("Vui lòng điền đầy đủ thông tin")
	ErrInvalidEmail       = errors.New("Định dạng email không hợp lệ")
	ErrInvalidPassword    = errors.New("Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường và số")
	ErrInvalidUsername    = errors.New("Tên tài khoản không hợp lệ")
	ErrInvalidFullname    = errors.New("Họ và tên không hợp lệ")
	ErrEmailExists        = errors.New("Email đã được sử dụng")
	ErrUsernameExists     = errors.New("Tên tài khoản đã tồn tại")
	ErrInvalidCredentials = errors.New("Tài khoản hoặc mật khẩu không đúng")
	ErrInternal           = errors.New("Đã xảy ra lỗi, vui lòng thử lại")
)

// ================== REGISTER ==================

func RegisterUser(input RegisterInput) error {

	// ===== 1. Normalize =====
	input.Email = strings.TrimSpace(strings.ToLower(input.Email))
	input.Username = strings.TrimSpace(input.Username)
	input.Fullname = strings.TrimSpace(input.Fullname)
	// ❗ KHÔNG TRIM PASSWORD

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
		return ErrInvalidFullname
	}

	// ===== 3. Check email tồn tại =====
	emailExists, err := repositories.IsEmailExists(input.Email)
	if err != nil {
		return ErrInternal
	}
	if emailExists {
		return ErrEmailExists
	}

	// ===== 4. Check username tồn tại =====
	usernameExists, err := repositories.IsUsernameExists(input.Username)
	if err != nil {
		return ErrInternal
	}
	if usernameExists {
		return ErrUsernameExists
	}

	// ===== 5. Hash password =====
	hashedPassword, err := utils.HashPassword(input.Password)
	if err != nil {
		return ErrInternal
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
		return ErrInternal
	}

	return nil
}

// ================== LOGIN ==================

func LoginUser(input LoginInput) (*LoginResponse, error) {

	// ===== 1. Normalize =====
	identifier := strings.TrimSpace(input.Identifier)
	password := input.Password //  KHÔNG TRIM

	if identifier == "" || password == "" {
		return nil, ErrMissingFields
	}

	// ===== 2. Tìm user =====
	user, err := repositories.GetUserByIdentifier(identifier)
	if err != nil {
		return nil, ErrInternal
	}

	// Không leak info
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
		return nil, ErrInternal
	}

	// ===== 5. Return đúng contract =====
	return &LoginResponse{
		Token: token,
		User: UserResponse{
			UserID:   user.UserID,
			Username: user.Username,
			Fullname: user.Fullname,
			Email:    user.Email,
			Role:     user.Role,
		},
	}, nil
}
