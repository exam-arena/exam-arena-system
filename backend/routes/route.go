package routes

import (
	"net/http"

	"backend/handlers"
	"backend/middleware"
)

// SetupRoutes registers HTTP routes.
func SetupRoutes() {
	http.HandleFunc("/api/v1/auth/register", middleware.RegisterRateLimit(handlers.Register))
	http.HandleFunc("/api/v1/auth/login", middleware.LoginRateLimit(handlers.Login))
	http.HandleFunc("/api/v1/auth/logout", handlers.Logout)
	http.HandleFunc("/api/v1/auth/me", middleware.RequireAuth(handlers.Profile))
	http.HandleFunc("GET /api/v1/rooms", middleware.GetRoomsRateLimit(handlers.GetRooms))
	http.HandleFunc("GET /api/v1/rooms/hot", middleware.GetHotRoomsRateLimit(handlers.GetHotRooms))
	http.HandleFunc("GET /api/v1/exams", middleware.GetExamsRateLimit(handlers.GetExams))
	http.HandleFunc("GET /api/v1/exams/latest", middleware.GetLatestExamsRateLimit(handlers.GetLatestExams))
	http.HandleFunc("GET /api/v1/exams/{examId}", middleware.GetExamRateLimit(handlers.GetExamByID))
	http.HandleFunc("POST /api/v1/exams/{examId}/attempts", middleware.RequireAuth(middleware.StartAttemptRateLimit(handlers.StartAttempt)))
	http.HandleFunc("GET /api/v1/attempts/{attemptId}", middleware.RequireAuth(middleware.GetAttemptRateLimit(handlers.GetAttempt)))
	http.HandleFunc("GET /api/v1/attempts/{attemptId}/review", middleware.RequireAuth(middleware.ReviewAttemptRateLimit(handlers.GetAttemptReview)))
	http.HandleFunc("GET /api/v1/attempts/{attemptId}/result", middleware.RequireAuth(middleware.ResultAttemptRateLimit(handlers.GetAttemptResult)))
	http.HandleFunc("PUT /api/v1/attempts/{attemptId}/answers", middleware.RequireAuth(middleware.SaveAttemptAnswersRateLimit(handlers.SaveAttemptAnswers)))
	http.HandleFunc("POST /api/v1/attempts/{attemptId}/submit", middleware.RequireAuth(middleware.SubmitAttemptRateLimit(handlers.SubmitAttempt)))
	http.HandleFunc("GET /api/v1/rooms/{roomId}/exams", middleware.GetRoomExamsRateLimit(handlers.GetRoomExams))
}
