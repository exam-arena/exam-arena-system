package handlers

import (
	"net/http"

	"backend/middleware"
	"backend/models"
	"backend/utils"
)

// ProfileResponse is returned for the corner user display on the FE.
type ProfileResponse struct {
	UserID   string `json:"user_id"`
	Username string `json:"username"`
	Fullname string `json:"fullname"`
	Email    string `json:"email"`
	Role     string `json:"role"`
}

func profileResponseFromUser(u models.User) ProfileResponse {
	return ProfileResponse{
		UserID:   u.UserID,
		Username: u.Username,
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

	claims, ok := middleware.AuthClaims(r)
	if !ok {
		utils.SendError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Unauthorized")
		return
	}

	utils.SendSuccess(w, profileResponseFromUser(models.User{
		UserID:   claims.UserID,
		Username: claims.Username,
		Fullname: claims.Fullname,
		Email:    claims.Email,
		Role:     claims.Role,
	}))
}
