package routes

import (
	"net/http"

	"backend/controllers"
)

// ✅ Setup tất cả routes
func SetupRoutes() {

	// ===== AUTH =====
	http.HandleFunc("/api/v1/auth/register", controllers.Register)

	// Sau này thêm:
	http.HandleFunc("/api/v1/auth/login", controllers.Login)
}