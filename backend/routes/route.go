package routes

import (
	"net/http"

	"backend/controllers"
)

// ✅ Setup tất cả routes
func SetupRoutes() {

	// ===== AUTH =====
	http.HandleFunc("/api/auth/register", controllers.Register)

	// Sau này thêm:
	http.HandleFunc("/api/auth/login", controllers.Login)
}