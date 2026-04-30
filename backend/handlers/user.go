package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"backend/middleware"
	"backend/services"
	"backend/utils"
)

const maxAuthBodyBytes int64 = 4 << 10

type RegisterRequest struct {
	Username string `json:"username"`
	Email    string `json:"email"`
	Password string `json:"password"`
	Fullname string `json:"fullname"`
}

type LoginRequest struct {
	Identifier string `json:"identifier"`
	Password   string `json:"password"`
}

func Register(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		utils.SendError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method not allowed")
		return
	}

	var req RegisterRequest
	if err := decodeAuthRequest(w, r, &req); err != nil {
		return
	}

	if allowed, reason := middleware.CheckRegisterIdentifiersAccess(r.Context(), req.Email, req.Username); !allowed {
		message := "Too many register attempts for this account data"
		if reason == "cooldown" {
			message = "Registration is temporarily blocked for this email or username"
		}

		utils.SendError(w, http.StatusTooManyRequests, "TOO_MANY_REQUESTS", message)
		return
	}

	input := services.RegisterInput{
		Username: req.Username,
		Email:    req.Email,
		Password: req.Password,
		Fullname: req.Fullname,
	}

	err := services.RegisterUser(r.Context(), input)
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
			middleware.RegisterRegisterAttemptFailure(r.Context(), req.Email, req.Username)
			utils.SendError(w, http.StatusConflict, "CONFLICT", "Email hoặc tên tài khoản đã tồn tại")
		default:
			utils.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Đã xảy ra lỗi, vui lòng thử lại")
		}
		return
	}

	middleware.ClearRegisterAttemptFailures(r.Context(), req.Email, req.Username)
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
	if err := decodeAuthRequest(w, r, &req); err != nil {
		return
	}

	if allowed, reason := middleware.CheckLoginIdentifierAccess(r.Context(), req.Identifier); !allowed {
		message := "Too many login attempts for this account"
		if reason == "cooldown" {
			message = "Account is temporarily locked due to repeated failed logins"
		}

		utils.SendError(w, http.StatusTooManyRequests, "TOO_MANY_REQUESTS", message)
		return
	}

	input := services.LoginInput{
		Identifier: req.Identifier,
		Password:   req.Password,
	}

	result, err := services.LoginUser(r.Context(), input)
	if err != nil {
		switch {
		case errors.Is(err, services.ErrMissingFields):
			utils.SendValidationError(w, []utils.ValidationError{
				{Field: "input", Message: err.Error()},
			})
		case errors.Is(err, services.ErrInvalidCredentials):
			middleware.RegisterLoginAttemptFailure(r.Context(), req.Identifier)
			utils.SendError(w, http.StatusUnauthorized, "INVALID_CREDENTIALS", "Tài khoản hoặc mật khẩu không đúng")
		default:
			utils.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Đã xảy ra lỗi, vui lòng thử lại")
		}
		return
	}

	middleware.ClearLoginAttemptFailures(r.Context(), req.Identifier)
	setAuthCookie(w, r, result.Token)
	utils.SendSuccess(w, result)
}

func Logout(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		utils.SendError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method not allowed")
		return
	}

	clearAuthCookie(w, r)
	utils.SendSuccess(w, map[string]interface{}{
		"message": "Logged out",
	})
}

func setAuthCookie(w http.ResponseWriter, r *http.Request, token string) {
	if token == "" {
		return
	}

	cookie := buildAuthCookie(r)
	cookie.Value = token
	cookie.MaxAge = 2 * 60 * 60

	http.SetCookie(w, cookie)
}

func clearAuthCookie(w http.ResponseWriter, r *http.Request) {
	cookie := buildAuthCookie(r)
	cookie.Value = ""
	cookie.MaxAge = -1
	cookie.Expires = time.Unix(0, 0)

	http.SetCookie(w, cookie)
}

func buildAuthCookie(r *http.Request) *http.Cookie {
	sameSite := http.SameSiteLaxMode
	secure := r.TLS != nil
	domain := strings.TrimSpace(os.Getenv("COOKIE_DOMAIN"))

	if raw := os.Getenv("COOKIE_SECURE"); raw != "" {
		if v, err := strconv.ParseBool(raw); err == nil {
			secure = v
		}
	}

	return &http.Cookie{
		Name:     "access_token",
		Path:     "/",
		Domain:   domain,
		HttpOnly: true,
		SameSite: sameSite,
		Secure:   secure,
	}
}

func decodeAuthRequest(w http.ResponseWriter, r *http.Request, dest any) error {
	r.Body = http.MaxBytesReader(w, r.Body, maxAuthBodyBytes)

	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()

	if err := decoder.Decode(dest); err != nil {
		var maxBytesErr *http.MaxBytesError
		if errors.As(err, &maxBytesErr) {
			utils.SendError(w, http.StatusRequestEntityTooLarge, "REQUEST_TOO_LARGE", "Payload is too large")
			return err
		}

		utils.SendError(w, http.StatusBadRequest, "BAD_REQUEST", "Dữ liệu gửi lên không hợp lệ")
		return err
	}

	if decoder.More() {
		utils.SendError(w, http.StatusBadRequest, "BAD_REQUEST", "Dữ liệu gửi lên không hợp lệ")
		return errors.New("unexpected trailing data")
	}

	return nil
}
