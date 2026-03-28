package routes

import (
	"net/http"

	"backend/controllers"
	"backend/handlers"
	"backend/middleware"
)

// SetupRoutes registers HTTP routes.
func SetupRoutes() {
	http.HandleFunc("/api/v1/auth/register", controllers.Register)
	http.HandleFunc("/api/v1/auth/login", middleware.LoginRateLimit(controllers.Login))
	http.HandleFunc("/api/v1/auth/me", middleware.RequireAuth(handlers.Profile))
	http.HandleFunc("GET /api/v1/rooms/{roomId}/exams", controllers.GetRoomExams)
}
