package controllers

import (
	"encoding/json"
	"errors"
	"net/http"

	"backend/services"
	"backend/utils"
)

// 🎯 Request từ client
type RegisterRequest struct {
	Username string `json:"username"`
	Email    string `json:"email"`
	Password string `json:"password"`
	Fullname string `json:"fullname"`
}

type LoginRequest struct {
	Identifier string `json:"identifier"` // email hoặc username
	Password   string `json:"password"`
}

// API Signup
func Register(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		utils.SendError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method not allowed")
		return
	}

	var req RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.SendError(w, http.StatusBadRequest, "BAD_REQUEST", "Dữ liệu gửi lên không hợp lệ")
		return
	}

	input := services.RegisterInput{
		Username: req.Username,
		Email:    req.Email,
		Password: req.Password,
		Fullname: req.Fullname,
	}

	err := services.RegisterUser(input)
	if err != nil {
		switch {
		case errors.Is(err, services.ErrMissingFields),
			errors.Is(err, services.ErrInvalidEmail),
			errors.Is(err, services.ErrInvalidPassword),
			errors.Is(err, services.ErrInvalidUsername):

			utils.SendValidationError(w, []utils.ValidationError{
				{Field: "input", Message: err.Error()},
			})

		case errors.Is(err, services.ErrEmailExists),
			errors.Is(err, services.ErrUsernameExists):

			utils.SendError(w, http.StatusConflict, "CONFLICT", "Email hoặc tên tài khoản đã tồn tại")

		default:
			utils.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Đã xảy ra lỗi, vui lòng thử lại")
		}
		return
	}

	utils.SendCreated(w, map[string]interface{}{
		"message": "User registered successfully",
	})
}

func Login(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		utils.SendError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Phương thức không được hỗ trợ")
		return
	}

	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.SendError(w, http.StatusBadRequest, "BAD_REQUEST", "Dữ liệu gửi lên không hợp lệ")
		return
	}

	input := services.LoginInput{
		Identifier: req.Identifier, // email hoặc username
		Password:   req.Password,
	}

	result, err := services.LoginUser(input)
	if err != nil {
		switch {
		case errors.Is(err, services.ErrMissingFields):
			utils.SendValidationError(w, []utils.ValidationError{
				{Field: "input", Message: err.Error()},
			})

		case errors.Is(err, services.ErrInvalidCredentials):
			utils.SendError(w, http.StatusUnauthorized, "INVALID_CREDENTIALS", "Tài khoản hoặc mật khẩu không đúng")

		default:
			utils.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Đã xảy ra lỗi, vui lòng thử lại")
		}
		return
	}

	utils.SendSuccess(w, result)
}
