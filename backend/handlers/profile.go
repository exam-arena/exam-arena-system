package handlers

import (
	"encoding/json"
	"log"
	"net/http"

	"backend/config"
	"backend/middleware"
	"backend/models"
)

// ProfileResponse is returned for the corner user display on the FE.
type ProfileResponse struct {
	Name  string `json:"name"`
	Email string `json:"email"`
}

// Profile loads the authenticated student's display name and email.
// It must be used behind middleware.RequireAuth.
func Profile(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID, ok := middleware.UserID(r)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	var u models.User
	if err := config.DB.Select("user_id", "fullname", "email").Where("user_id = ? AND deleted_at IS NULL", userID).First(&u).Error; err != nil {
		log.Printf("profile: load user %s: %v", userID, err)
		http.Error(w, "not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(ProfileResponse{
		Name:  u.Fullname,
		Email: u.Email,
	})
}
