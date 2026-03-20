package controllers

import (
	"encoding/json"
	"errors"
	"net/http"

	"backend/services"
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

// 🎯 Response chuẩn
type APIResponse struct {
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

// ✅ API Signup
func Register(w http.ResponseWriter, r *http.Request) {

	// ===== 1. Check method =====
	if r.Method != http.MethodPost {
		respondJSON(w, http.StatusMethodNotAllowed, "method not allowed", nil)
		return
	}

	// ===== 2. Parse JSON =====
	var req RegisterRequest
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		respondJSON(w, http.StatusBadRequest, "invalid JSON", nil)
		return
	}

	// ===== 3. Gọi service =====
	input := services.RegisterInput{
		Username: req.Username,
		Email:    req.Email,
		Password: req.Password,
		Fullname: req.Fullname,
	}

	err = services.RegisterUser(input)
	if err != nil {

		// ===== 4. Map lỗi → HTTP status =====
		switch {
		case errors.Is(err, services.ErrMissingFields),
			errors.Is(err, services.ErrInvalidEmail),
			errors.Is(err, services.ErrInvalidPassword),
			errors.Is(err, services.ErrInvalidUsername):
			respondJSON(w, http.StatusBadRequest, err.Error(), nil)

		case errors.Is(err, services.ErrEmailExists),
			errors.Is(err, services.ErrUsernameExists):
			respondJSON(w, http.StatusConflict, err.Error(), nil)

		default:
			respondJSON(w, http.StatusInternalServerError, "internal server error", nil)
		}
		return
	}

	// ===== 5. Success =====
	respondJSON(w, http.StatusCreated, "User registered successfully", nil)
}

func Login(w http.ResponseWriter, r *http.Request) {

	// ===== 1. Check method =====
	if r.Method != http.MethodPost {
		respondJSON(w, http.StatusMethodNotAllowed, "method not allowed", nil)
		return
	}

	// ===== 2. Parse JSON =====
	var req LoginRequest
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		respondJSON(w, http.StatusBadRequest, "invalid JSON", nil)
		return
	}

	// ===== 3. Gọi service =====
	input := services.LoginInput{
		Identifier: req.Identifier,
		Password:   req.Password,
	}

	result, err := services.LoginUser(input)
	if err != nil {

		// ===== 4. Map lỗi =====
		switch {
		case errors.Is(err, services.ErrMissingFields):
			respondJSON(w, http.StatusBadRequest, err.Error(), nil)

		case errors.Is(err, services.ErrInvalidCredentials):
			respondJSON(w, http.StatusUnauthorized, err.Error(), nil)

		default:
			respondJSON(w, http.StatusInternalServerError, "internal server error", nil)
		}
		return
	}

	// ===== 5. Success =====
	respondJSON(w, http.StatusOK, "login successful", result)
}

// 🔧 Helper trả JSON
func respondJSON(w http.ResponseWriter, status int, message string, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)

	json.NewEncoder(w).Encode(APIResponse{
		Message: message,
		Data:    data,
	})
}