package handlers

import (
	"errors"
	"log"
	"net/http"

	"backend/config"
	"backend/middleware"
	"backend/models"
	"backend/utils"

	"gorm.io/gorm"
)

// ProfileResponse is returned for the corner user display on the FE.
type ProfileResponse struct {
	UserID   string `json:"user_id"`
	Fullname string `json:"fullname"`
	Email    string `json:"email"`
	Role     string `json:"role"`
}

func profileResponseFromUser(u models.User) ProfileResponse {
	return ProfileResponse{
		UserID:   u.UserID,
		Fullname: u.Fullname,
		Email:    u.Email,
		Role:     u.Role,
	}
}

// Profile loads the authenticated student's display name and email.
// It must be used behind middleware.RequireAuth.
func Profile(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		utils.SendError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method not allowed")
		return
	}

	userID, ok := middleware.UserID(r)
	if !ok {
		utils.SendError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Unauthorized")
		return
	}

	var u models.User
	if err := config.DB.Select("user_id", "fullname", "email", "role").Where("user_id = ? AND deleted_at IS NULL", userID).First(&u).Error; err != nil {
		log.Printf("profile: load user %s: %v", userID, err)
		if errors.Is(err, gorm.ErrRecordNotFound) {
			utils.SendError(w, http.StatusNotFound, "NOT_FOUND", "User not found")
			return
		}
		utils.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Something went wrong")
		return
	}

	utils.SendSuccess(w, profileResponseFromUser(u))
}
